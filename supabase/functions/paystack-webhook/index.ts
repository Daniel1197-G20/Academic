import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

function adminClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
  if (!url || !secretKeys.default) throw new Error('Supabase Function credentials are not configured.');
  return createClient(url, secretKeys.default, { auth: { persistSession: false, autoRefreshToken: false } });
}

function equalHex(left: string, right: string) {
  if (!/^[a-f0-9]{128}$/.test(left) || !/^[a-f0-9]{128}$/.test(right)) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return difference === 0;
}

async function verifyPaystackSignature(raw: Uint8Array, header: string, secret: string) {
  const parts = header.split(',').map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith('t='));
  const timestamp = timestampPart ? Number(timestampPart.slice(2)) : NaN;
  if (!Number.isSafeInteger(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const signed = new Uint8Array(encoder.encode(`${timestamp}.`).length + raw.length);
  signed.set(encoder.encode(`${timestamp}.`));
  signed.set(raw, encoder.encode(`${timestamp}.`).length);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, signed));
  const expected = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');

  return parts.filter((part) => part.startsWith('v1=')).some((part) => {
    const signature = part.slice(3).split(':').at(-1) || '';
    return equalHex(signature, expected);
  });
}

async function verifyTransaction(reference: string) {
  const key = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!key) throw new Error('Paystack API key is not configured.');
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.status !== true) throw new Error('Paystack transaction verification failed.');
  if (body.data?.status !== 'success' || body.data?.reference !== reference) {
    throw new Error('Paystack transaction is not successful or its reference does not match.');
  }
  return body.data;
}

async function markProcessed(admin: ReturnType<typeof adminClient>, eventId: string) {
  const { error } = await admin.from('payment_webhook_events')
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq('event_id', eventId);
  if (error) throw error;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const secret = Deno.env.get('PAYSTACK_WEBHOOK_SECRET');
  if (!secret) return json({ error: 'Webhook signing secret is not configured.' }, 503);

  const rawBody = new Uint8Array(await request.arrayBuffer());
  const signature = request.headers.get('Paystack-Signature') || '';
  try {
    if (!await verifyPaystackSignature(rawBody, signature, secret)) {
      return json({ error: 'Invalid Paystack webhook signature.' }, 401);
    }
    const event = JSON.parse(new TextDecoder().decode(rawBody));
    const eventType = String(event.event || '');
    const data = event.data || {};
    if (eventType === 'ping') return json({ acknowledged: true, eventType });

    const eventId = String(event.id || `${eventType}:${data.id || data.reference || data.subscription_code || ''}`);
    if (!eventType || eventId.endsWith(':')) return json({ error: 'Webhook event is missing its identifier.' }, 400);

    const admin = adminClient();
    const { error: insertError } = await admin.from('payment_webhook_events').insert({
      id: `wh_${crypto.randomUUID()}`,
      event_id: eventId,
      event_type: eventType,
      payload: event,
      processed: false,
    });
    if (insertError?.code === '23505') {
      const { data: existing, error } = await admin.from('payment_webhook_events')
        .select('processed').eq('event_id', eventId).maybeSingle();
      if (error) throw error;
      if (existing?.processed) return json({ acknowledged: true, duplicate: true });
    } else if (insertError) {
      throw insertError;
    }

    if (eventType === 'charge.success') {
      const reference = String(data.reference || '');
      if (!reference) throw new Error('Successful charge has no payment reference.');
      const payment = await verifyTransaction(reference);
      const { data: transaction, error } = await admin.from('payment_transactions')
        .select('id, plan_id, user_id, reference, amount_kobo, currency, status')
        .eq('reference', reference).maybeSingle();
      if (error) throw error;

      if (transaction) {
        if (Number(payment.amount) !== Number(transaction.amount_kobo) ||
          String(payment.currency || '').toUpperCase() !== String(transaction.currency || '').toUpperCase()) {
          throw new Error('Verified payment does not match the pending transaction.');
        }
        if (transaction.status !== 'success') {
          const { error: fulfillError } = await admin.rpc('fulfill_paystack_payment', {
            p_reference: reference,
            p_provider_transaction_id: String(payment.id || ''),
            p_paid_at: payment.paid_at || new Date().toISOString(),
            p_customer_code: payment.customer?.customer_code || data.customer?.customer_code || null,
            p_subscription_code: payment.subscription?.subscription_code || payment.subscription_code || null,
            p_email_token: payment.subscription?.email_token || payment.email_token || null,
          });
          if (fulfillError) throw fulfillError;
        }
      } else {
        const { error: renewalError } = await admin.rpc('apply_paystack_renewal', {
          p_reference: reference,
          p_provider_transaction_id: String(payment.id || ''),
          p_amount_kobo: Number(payment.amount),
          p_currency: String(payment.currency || ''),
          p_paid_at: payment.paid_at || new Date().toISOString(),
          p_customer_code: payment.customer?.customer_code || data.customer?.customer_code || '',
        });
        if (renewalError) throw renewalError;
      }
    } else if (eventType === 'subscription.create') {
      const customerCode = data.customer?.customer_code;
      const subscriptionCode = data.subscription_code;
      if (customerCode && subscriptionCode) {
        const { error } = await admin.from('user_subscriptions').update({
          paystack_subscription_code: subscriptionCode,
          paystack_email_token: data.email_token || null,
        }).eq('paystack_customer_code', customerCode);
        if (error) throw error;
      }
    } else if (eventType === 'subscription.disable' || eventType === 'subscription.not_renew') {
      const subscriptionCode = data.subscription_code;
      if (subscriptionCode) {
        const { data: subscriptions, error: fetchError } = await admin.from('user_subscriptions')
          .select('id, current_period_end').eq('paystack_subscription_code', subscriptionCode);
        if (fetchError) throw fetchError;
        for (const subscription of subscriptions || []) {
          const expired = new Date(subscription.current_period_end) <= new Date();
          const { error } = await admin.from('user_subscriptions').update({
            status: expired ? 'expired' : 'non_renewing', cancel_at_period_end: true,
          }).eq('id', subscription.id);
          if (error) throw error;
        }
      }
    } else if (eventType === 'invoice.payment_failed' || eventType === 'invoice.failed') {
      const subscriptionCode = data.subscription?.subscription_code || data.subscription_code;
      let query = admin.from('user_subscriptions').update({ status: 'past_due' });
      if (subscriptionCode) query = query.eq('paystack_subscription_code', subscriptionCode);
      else if (data.customer?.customer_code) query = query.eq('paystack_customer_code', data.customer.customer_code);
      else throw new Error('Failed invoice has no subscription or customer code.');
      const { error } = await query;
      if (error) throw error;
    }

    await markProcessed(admin, eventId);
    return json({ acknowledged: true, processed: true, eventType });
  } catch (error) {
    console.error('Paystack webhook processing failed:', error);
    return json({ error: error instanceof Error ? error.message : 'Webhook processing failed.' }, 500);
  }
});
