import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const fail = (message: string, status = 400, code?: string) => json({ error: message, ...(code ? { code } : {}) }, status);

function clients() {
  const url = Deno.env.get('SUPABASE_URL');
  const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
  const secretKey = secretKeys.default;
  if (!url || !secretKey) throw new Error('Supabase function credentials are not configured.');
  return createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function paystack(path: string, method: 'GET' | 'POST', body?: unknown) {
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!secret) throw Object.assign(new Error('Paystack is not configured.'), { status: 503 });
  const response = await fetch(`https://api.paystack.co${path}`, {
    method,
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.status === false) {
    throw Object.assign(new Error(result.message || 'Paystack request failed.'), { status: 502 });
  }
  return result;
}

function periodActive(sub: any) {
  return ['active', 'trialing'].includes(sub.status) ||
    (sub.status === 'non_renewing' && new Date(sub.current_period_end) > new Date());
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return fail('Method not allowed.', 405);

  try {
    const authorization = request.headers.get('Authorization') || '';
    const token = authorization.replace(/^Bearer\s+/i, '');
    if (!token || token === authorization) return fail('Authentication required.', 401);

    const admin = clients();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return fail('Authentication required.', 401);
    const user = authData.user;
    const body = await request.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'plans') {
      const { data: plans, error } = await admin.from('subscription_plans')
        .select('id, code, name, description, amount_kobo, currency, interval, is_active, display_order')
        .eq('is_active', true).order('display_order');
      if (error) throw error;
      const { data: entitlements, error: entitlementError } = await admin.from('plan_entitlements')
        .select('plan_id, feature_code, is_enabled, limit_value, feature_definitions(name, description, category)');
      if (entitlementError) throw entitlementError;
      return json({ plans: (plans || []).map((plan: any) => ({
        id: plan.id, code: plan.code, name: plan.name, description: plan.description,
        amount: plan.amount_kobo / 100, amountKobo: plan.amount_kobo, currency: plan.currency,
        interval: plan.interval, displayOrder: plan.display_order,
        entitlements: (entitlements || []).filter((item: any) => item.plan_id === plan.id).map((item: any) => ({
          featureCode: item.feature_code, featureName: item.feature_definitions?.name,
          isEnabled: item.is_enabled, limit: item.limit_value,
        })),
      })) });
    }

    const { data: subscriptions, error: subError } = await admin.from('user_subscriptions')
      .select('id, user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end, authorization_reference, paystack_customer_code, paystack_subscription_code, paystack_email_token, subscription_plans(id, code, name, amount_kobo, currency, interval)')
      .eq('user_id', user.id).order('created_at', { ascending: true }).limit(1);
    if (subError) throw subError;

    let sub = subscriptions?.[0];
    if (!sub) {
      const { data: basic } = await admin.from('subscription_plans').select('id').eq('code', 'basic').single();
      if (!basic) throw new Error('Basic plan is not configured.');
      const { data: created, error } = await admin.from('user_subscriptions').insert({
        id: `sub_${user.id}`, user_id: user.id, plan_id: basic.id,
        status: 'active', current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 86400000).toISOString(),
      }).select('id, user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end, authorization_reference, paystack_customer_code, paystack_subscription_code, paystack_email_token, subscription_plans(id, code, name, amount_kobo, currency, interval)').single();
      if (error) throw error;
      sub = created;
    }

    if (action === 'subscription') {
      const plan = sub.subscription_plans;
      const expired = plan.code !== 'basic' && new Date(sub.current_period_end) < new Date() && ['active', 'non_renewing'].includes(sub.status);
      if (expired) {
        const { error } = await admin.from('user_subscriptions').update({ status: 'expired' }).eq('id', sub.id);
        if (error) throw error;
        sub.status = 'expired';
      }
      return json({ subscription: {
        id: sub.id, userId: sub.user_id, planId: sub.plan_id, planCode: plan.code,
        planName: plan.name, amount: plan.amount_kobo / 100, amountKobo: plan.amount_kobo,
        currency: plan.currency, interval: plan.interval, status: sub.status,
        isActive: periodActive(sub), currentPeriodStart: sub.current_period_start,
        currentPeriodEnd: sub.current_period_end, cancelAtPeriodEnd: sub.cancel_at_period_end,
        authorizationReference: sub.authorization_reference,
      } });
    }

    if (action === 'entitlements') {
      const active = periodActive(sub);
      const effectiveCode = active ? sub.subscription_plans.code : 'basic';
      const { data: plan, error: planError } = await admin.from('subscription_plans').select('id, code, name').eq('code', effectiveCode).single();
      if (planError) throw planError;
      const { data: entries, error: entriesError } = await admin.from('plan_entitlements')
        .select('feature_code, is_enabled, limit_value').eq('plan_id', plan.id);
      if (entriesError) throw entriesError;
      const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      const periodStart = start.toISOString().slice(0, 10);
      const { data: usageRows, error: usageError } = await admin.from('subscription_usage')
        .select('feature_code, usage_count').eq('user_id', user.id).eq('period_start', periodStart);
      if (usageError) throw usageError;
      const usageMap = Object.fromEntries((usageRows || []).map((row: any) => [row.feature_code, row.usage_count]));
      const features: Record<string, boolean> = {}, limits: Record<string, number | null> = {};
      const usage: Record<string, number> = {}, remaining: Record<string, number | null> = {};
      for (const entry of entries || []) {
        const count = usageMap[entry.feature_code] || 0;
        features[entry.feature_code] = Boolean(entry.is_enabled);
        limits[entry.feature_code] = entry.limit_value;
        usage[entry.feature_code] = count;
        remaining[entry.feature_code] = entry.limit_value == null ? null : Math.max(0, entry.limit_value - count);
      }
      return json({ entitlements: {
        plan: { code: sub.subscription_plans.code, effectiveCode: plan.code,
          name: sub.subscription_plans.name, amount: sub.subscription_plans.amount_kobo / 100,
          currency: sub.subscription_plans.currency, interval: sub.subscription_plans.interval },
        status: sub.status, isActive: active, currentPeriodStart: sub.current_period_start,
        currentPeriodEnd: sub.current_period_end, cancelAtPeriodEnd: sub.cancel_at_period_end,
        features, limits, usage, remaining,
      } });
    }

    if (action === 'checkout') {
      const planCode = String(body.planCode || '').toLowerCase().trim();
      if (!planCode) return fail('Plan code is required.');
      if (planCode === 'basic') return fail('The Basic plan is free and does not require checkout.');
      const { data: plan, error } = await admin.from('subscription_plans')
        .select('id, code, name, amount_kobo, currency, paystack_plan_code, is_active')
        .eq('code', planCode).maybeSingle();
      if (error) throw error;
      if (!plan || !plan.is_active) return fail('Invalid or inactive subscription plan selected.', 404);
      if (periodActive(sub) && sub.subscription_plans.code === plan.code && !sub.cancel_at_period_end) {
        return fail(`You already have an active ${plan.name} subscription.`, 409, 'SUBSCRIPTION_ALREADY_ACTIVE');
      }
      const expectedPlanEnv = ({ student: 'PAYSTACK_PLAN_STUDENT_CODE', pro: 'PAYSTACK_PLAN_PRO_CODE', premium: 'PAYSTACK_PLAN_PREMIUM_CODE' } as Record<string, string>)[plan.code];
      const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY') || '';
      if (!paystackSecret || !expectedPlanEnv || !Deno.env.get(expectedPlanEnv) || plan.paystack_plan_code !== Deno.env.get(expectedPlanEnv)) {
        return fail(`Paystack recurring plan is not configured for ${plan.name}.`, 503, 'PAYSTACK_PLAN_NOT_CONFIGURED');
      }
      const email = user.email;
      if (!email) return fail('User account has no email address.', 400);
      const reference = `STUDORA_${crypto.randomUUID().replaceAll('-', '').toUpperCase()}`;
      const transactionId = `tx_${crypto.randomUUID()}`;
      const callbackUrl = body.callbackUrl;
      if (callbackUrl) {
        const callback = new URL(callbackUrl);
        const origin = request.headers.get('Origin');
        if (!origin || callback.origin !== origin) return fail('Callback URL must use the current application origin.');
      }
      const { error: insertError } = await admin.from('payment_transactions').insert({
        id: transactionId, user_id: user.id, plan_id: plan.id, provider: 'paystack',
        reference, amount_kobo: plan.amount_kobo, currency: plan.currency, status: 'pending',
        metadata: { userId: user.id, planCode: plan.code, email },
      });
      if (insertError) throw insertError;
      try {
        const initialized = await paystack('/transaction/initialize', 'POST', {
          email, amount: plan.amount_kobo, plan: plan.paystack_plan_code || undefined, reference,
          callback_url: callbackUrl || `${request.headers.get('Origin') || ''}/billing/callback`,
          metadata: { userId: user.id, planCode: plan.code, planId: plan.id, transactionId },
        });
        return json({ authorizationUrl: initialized.data?.authorization_url || `/billing/callback?reference=${reference}`,
          accessCode: initialized.data?.access_code, reference,
          plan: { code: plan.code, name: plan.name, amount: plan.amount_kobo / 100,
            amountKobo: plan.amount_kobo, currency: plan.currency } });
      } catch (error) {
        await admin.from('payment_transactions').update({ status: 'failed' }).eq('reference', reference).eq('status', 'pending');
        throw error;
      }
    }

    if (action === 'verify') {
      const reference = String(body.reference || '').trim();
      if (!reference) return fail('Payment reference is required.');
      const { data: transaction, error } = await admin.from('payment_transactions')
        .select('id, user_id, plan_id, reference, amount_kobo, currency, status, subscription_plans(code, name)')
        .eq('reference', reference).eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      if (!transaction) return fail('Payment reference not found.', 404);
      if (transaction.status === 'success') return json({ verified: true, status: 'success',
        reference, planCode: transaction.subscription_plans.code, planName: transaction.subscription_plans.name,
        amount: transaction.amount_kobo / 100 });
      const result = await paystack(`/transaction/verify/${encodeURIComponent(reference)}`, 'GET');
      const paid = result.data;
      if (paid?.status !== 'success') {
        const status = paid?.status === 'abandoned' ? 'abandoned' : 'failed';
        await admin.from('payment_transactions').update({ status }).eq('id', transaction.id).eq('status', 'pending');
        return json({ verified: false, status: paid?.status || 'failed', reference,
          message: 'Payment verification did not indicate success.' });
      }
      if (paid.reference !== transaction.reference || Number(paid.amount) !== Number(transaction.amount_kobo) ||
        String(paid.currency || '').toUpperCase() !== String(transaction.currency || '').toUpperCase()) {
        return fail('Verified payment details do not match the pending transaction.', 409, 'PAYMENT_DETAILS_MISMATCH');
      }
      const { data: fulfilled, error: fulfillError } = await admin.rpc('fulfill_paystack_payment', {
        p_reference: reference,
        p_provider_transaction_id: String(paid.id || ''),
        p_paid_at: paid.paid_at || new Date().toISOString(),
        p_customer_code: paid.customer?.customer_code || null,
        p_subscription_code: paid.subscription?.subscription_code || paid.subscription_code || null,
        p_email_token: paid.subscription?.email_token || paid.email_token || null,
      });
      if (fulfillError) throw fulfillError;
      return json(fulfilled);
    }

    if (action === 'cancel') {
      const plan = sub.subscription_plans;
      if (plan.code === 'basic') return json({ success: true, message: 'You are on the free Basic plan. No paid subscription to cancel.' });
      if (sub.cancel_at_period_end || sub.status === 'non_renewing') return json({ success: true,
        message: 'Your subscription is already set to end after the current billing period.', currentPeriodEnd: sub.current_period_end });
      if (!sub.paystack_subscription_code && !(Deno.env.get('PAYSTACK_SECRET_KEY') || '').startsWith('sk_test_')) {
        return fail('This subscription is not linked to Paystack yet. Please contact support to stop renewal.', 409, 'PAYSTACK_SUBSCRIPTION_NOT_LINKED');
      }
      if (sub.paystack_subscription_code) {
        if (!sub.paystack_email_token) return fail('Paystack cancellation token is missing. Please contact support.', 409, 'PAYSTACK_CANCELLATION_TOKEN_MISSING');
        await paystack('/subscription/disable', 'POST', { code: sub.paystack_subscription_code, token: sub.paystack_email_token });
      }
      const { error } = await admin.from('user_subscriptions').update({ status: 'non_renewing', cancel_at_period_end: true })
        .eq('id', sub.id).eq('user_id', user.id);
      if (error) throw error;
      return json({ success: true, message: 'Your subscription will remain active until the end of your current billing period.', currentPeriodEnd: sub.current_period_end });
    }

    if (action === 'admin_metrics') {
      const { data: profile, error: profileError } = await admin.from('profiles')
        .select('role').eq('id', user.id).maybeSingle();
      if (profileError) throw profileError;
      if (profile?.role !== 'admin') return fail('Administrator access required.', 403);

      const [{ data: plans, error: plansError }, successfulPayments, subscriptions] = await Promise.all([
        admin.from('subscription_plans').select('id, code, name, display_order').order('display_order'),
        (async () => {
          const rows: any[] = [];
          for (let offset = 0;; offset += 1000) {
            const { data, error } = await admin.from('payment_transactions').select('amount_kobo')
              .eq('status', 'success').range(offset, offset + 999);
            if (error) throw error;
            rows.push(...(data || []));
            if ((data || []).length < 1000) break;
          }
          return rows;
        })(),
        (async () => {
          const rows: any[] = [];
          for (let offset = 0;; offset += 1000) {
            const { data, error } = await admin.from('user_subscriptions').select('plan_id, status').range(offset, offset + 999);
            if (error) throw error;
            rows.push(...(data || []));
            if ((data || []).length < 1000) break;
          }
          return rows;
        })(),
      ]);
      if (plansError) throw plansError;
      const planCounts = (plans || []).map((plan: any) => ({
        code: plan.code,
        name: plan.name,
        count: (subscriptions || []).filter((item: any) => item.plan_id === plan.id && item.status === 'active').length,
      }));
      const statusBreakdown: Record<string, number> = {};
      for (const item of subscriptions || []) statusBreakdown[item.status] = (statusBreakdown[item.status] || 0) + 1;
      return json({ plans: planCounts,
        totalRevenueNgn: (successfulPayments || []).reduce((sum: number, item: any) => sum + item.amount_kobo, 0) / 100,
        totalTransactions: (successfulPayments || []).length,
        statusBreakdown,
      });
    }

    return fail('Unknown billing action.', 400);
  } catch (error) {
    console.error('Billing function error:', error);
    return fail(error instanceof Error ? error.message : 'Billing request failed.', (error as any)?.status || 500, (error as any)?.code);
  }
});
