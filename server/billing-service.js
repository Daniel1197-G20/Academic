import crypto from 'crypto';
import http from 'http';
import https from 'https';
import { db } from './db.js';

// Server-side Paystack Configuration (NEVER exposed to frontend)
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_academic_platform_mock_key_2026';
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_academic_platform_mock_key_2026';
const PAYSTACK_WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET || PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';

export const IS_TEST_MODE = PAYSTACK_SECRET_KEY.startsWith('sk_test_') || PAYSTACK_SECRET_KEY.includes('mock');

/**
 * Helper to make HTTPS requests to Paystack API
 */
async function paystackRequest(endpoint, method = 'GET', data = null) {
  if (IS_TEST_MODE && !process.env.PAYSTACK_LIVE_HTTP) {
    // Simulated safe response for test mode / offline pipelines
    return mockPaystackResponse(endpoint, method, data);
  }

  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, PAYSTACK_BASE_URL);
    const bodyStr = data ? JSON.stringify(data) : '';

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
      }
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            const err = new Error(parsed.message || `Paystack error ${res.statusCode}`);
            err.statusCode = res.statusCode;
            err.data = parsed;
            reject(err);
          }
        } catch (e) {
          reject(new Error(`Failed to parse Paystack response: ${raw}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function mockPaystackResponse(endpoint, method, data) {
  if (endpoint.startsWith('/transaction/initialize')) {
    const ref = data.reference || 'ACADEMIC_2026_' + crypto.randomBytes(4).toString('hex').toUpperCase();
    return Promise.resolve({
      status: true,
      message: 'Authorization URL created (test mode)',
      data: {
        authorization_url: `/billing/callback?reference=${ref}&status=success`,
        access_code: 'mock_acc_' + crypto.randomBytes(6).toString('hex'),
        reference: ref
      }
    });
  }

  if (endpoint.startsWith('/transaction/verify/')) {
    const ref = endpoint.replace('/transaction/verify/', '');
    return Promise.resolve({
      status: true,
      message: 'Verification successful (test mode)',
      data: {
        id: 999901,
        domain: 'test',
        status: 'success',
        reference: ref,
        amount: 250000,
        gateway_response: 'Successful',
        paid_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        channel: 'card',
        currency: 'NGN',
        customer: {
          id: 12345,
          customer_code: 'CUS_mock_student_123',
          email: 'student@example.com'
        },
        authorization: {
          authorization_code: 'AUTH_mock_' + crypto.randomBytes(4).toString('hex'),
          card_type: 'mastercard',
          last4: '4081',
          exp_month: '12',
          exp_year: '2028',
          bank: 'Test Bank'
        }
      }
    });
  }

  return Promise.resolve({ status: true, message: 'Mock response', data: {} });
}

/**
 * 1. Fetch all active subscription plans
 */
export async function getSubscriptionPlans() {
  const res = await db.query(`
    SELECT id, code, name, description, amount_kobo, currency, interval, is_active, display_order
    FROM subscription_plans
    WHERE is_active = true
    ORDER BY display_order ASC;
  `);

  const entRes = await db.query(`
    SELECT pe.plan_id, pe.feature_code, pe.is_enabled, pe.limit_value, fd.name, fd.description, fd.category
    FROM plan_entitlements pe
    JOIN feature_definitions fd ON pe.feature_code = fd.code
    ORDER BY fd.category, fd.code;
  `);

  return res.rows.map(plan => {
    const planEnts = entRes.rows.filter(e => e.plan_id === plan.id);
    return {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description,
      amount: plan.amount_kobo / 100,
      amountKobo: plan.amount_kobo,
      currency: plan.currency,
      interval: plan.interval,
      displayOrder: plan.display_order,
      entitlements: planEnts.map(e => ({
        featureCode: e.feature_code,
        featureName: e.name,
        isEnabled: e.is_enabled,
        limit: e.limit_value
      }))
    };
  });
}

/**
 * 2. Get authoritative user subscription with auto-provisioning
 */
export async function getUserSubscription(userId) {
  const subRes = await db.query(`
    SELECT 
      us.id, us.user_id, us.plan_id, us.status, us.paystack_customer_code,
      us.paystack_subscription_code, us.authorization_reference,
      us.current_period_start, us.current_period_end, us.cancel_at_period_end,
      sp.code as plan_code, sp.name as plan_name, sp.amount_kobo, sp.currency, sp.interval
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = $1;
  `, [userId]);

  if (subRes.rows.length === 0) {
    // Auto-provision initial Basic plan subscription
    const basicPlanRes = await db.query(`SELECT id FROM subscription_plans WHERE code = 'basic';`);
    const basicPlanId = basicPlanRes.rows[0]?.id || 'plan_basic';
    const subId = 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    await db.query(`
      INSERT INTO user_subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end)
      VALUES ($1, $2, $3, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '365 days', false);
    `, [subId, userId, basicPlanId]);

    return getUserSubscription(userId);
  }

  const sub = subRes.rows[0];

  // Check for expired status on paid plans
  const now = new Date();
  const periodEnd = new Date(sub.current_period_end);
  if (sub.plan_code !== 'basic' && periodEnd < now && (sub.status === 'active' || sub.status === 'non_renewing')) {
    await db.query(`
      UPDATE user_subscriptions 
      SET status = 'expired', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1;
    `, [sub.id]);
    sub.status = 'expired';
  }

  return {
    id: sub.id,
    userId: sub.user_id,
    planId: sub.plan_id,
    planCode: sub.plan_code,
    planName: sub.plan_name,
    amount: sub.amount_kobo / 100,
    amountKobo: sub.amount_kobo,
    currency: sub.currency,
    interval: sub.interval,
    status: sub.status,
    isActive: sub.status === 'active' || sub.status === 'trialing' || (sub.status === 'non_renewing' && periodEnd > now),
    currentPeriodStart: sub.current_period_start,
    currentPeriodEnd: sub.current_period_end,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    authorizationReference: sub.authorization_reference
  };
}

/**
 * 3. Resolve user entitlements (Features, Limits, and Current Monthly Usage)
 */
export async function getUserEntitlements(userId) {
  const sub = await getUserSubscription(userId);

  // If expired or cancelled, fall back to Basic plan entitlements
  let effectivePlanCode = sub.isActive ? sub.planCode : 'basic';
  const planRes = await db.query(`SELECT id, code, name FROM subscription_plans WHERE code = $1;`, [effectivePlanCode]);
  const effectivePlan = planRes.rows[0] || { id: 'plan_basic', code: 'basic', name: 'Basic' };

  // Fetch plan entitlements
  const entRes = await db.query(`
    SELECT pe.feature_code, pe.is_enabled, pe.limit_value
    FROM plan_entitlements pe
    WHERE pe.plan_id = $1;
  `, [effectivePlan.id]);

  // Determine current period date range for usage
  const today = new Date();
  const periodStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  // Fetch current monthly usage for this user
  const usageRes = await db.query(`
    SELECT feature_code, usage_count, limit_value
    FROM subscription_usage
    WHERE user_id = $1 AND period_start = $2;
  `, [userId, periodStart]);

  const usageMap = {};
  for (const u of usageRes.rows) {
    usageMap[u.feature_code] = u.usage_count;
  }

  const features = {};
  const limits = {};
  const usage = {};
  const remaining = {};

  for (const e of entRes.rows) {
    features[e.feature_code] = Boolean(e.is_enabled);
    limits[e.feature_code] = e.limit_value; // null = unlimited
    const count = usageMap[e.feature_code] || 0;
    usage[e.feature_code] = count;

    if (e.limit_value === null || e.limit_value === undefined) {
      remaining[e.feature_code] = null; // Unlimited
    } else {
      remaining[e.feature_code] = Math.max(0, e.limit_value - count);
    }
  }

  return {
    plan: {
      code: sub.planCode,
      effectiveCode: effectivePlan.code,
      name: sub.planName,
      amount: sub.amount,
      currency: sub.currency,
      interval: sub.interval
    },
    status: sub.status,
    isActive: sub.isActive,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    features,
    limits,
    usage,
    remaining
  };
}

/**
 * 4. Atomic usage increment with limit check (concurrency-safe)
 */
export async function atomicIncrementUsage(userId, featureCode, increment = 1) {
  const entitlements = await getUserEntitlements(userId);

  if (!entitlements.features[featureCode]) {
    const error = new Error(`Feature ${featureCode} is not available on your current plan (${entitlements.plan.name}).`);
    error.code = 'FEATURE_NOT_AVAILABLE';
    error.statusCode = 403;
    throw error;
  }

  const limit = entitlements.limits[featureCode];
  const today = new Date();
  const periodStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const usageId = `usg_${userId}_${featureCode}_${periodStart}`;

  // Atomic PostgreSQL Upsert with Limit Gate
  const query = `
    INSERT INTO subscription_usage (id, user_id, feature_code, period_start, period_end, usage_count, limit_value)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (user_id, feature_code, period_start)
    DO UPDATE SET
      usage_count = CASE
        WHEN EXCLUDED.limit_value IS NULL OR subscription_usage.usage_count + $6 <= EXCLUDED.limit_value
        THEN subscription_usage.usage_count + $6
        ELSE subscription_usage.usage_count
      END,
      limit_value = EXCLUDED.limit_value,
      updated_at = CURRENT_TIMESTAMP
    RETURNING usage_count, limit_value;
  `;

  // First, check if already capped before inserting
  const existingUsage = entitlements.usage[featureCode] || 0;
  if (limit !== null && (existingUsage + increment) > limit) {
    const err = new Error(`Monthly usage limit for ${featureCode} reached (${existingUsage}/${limit}). Upgrade plan for higher capacity.`);
    err.code = 'USAGE_LIMIT_REACHED';
    err.statusCode = 429;
    throw err;
  }

  const res = await db.query(query, [usageId, userId, featureCode, periodStart, periodEnd, increment, limit]);
  const newCount = res.rows[0].usage_count;

  if (limit !== null && newCount > limit) {
    const err = new Error(`Monthly usage limit for ${featureCode} reached. Upgrade plan for higher capacity.`);
    err.code = 'USAGE_LIMIT_REACHED';
    err.statusCode = 429;
    throw err;
  }

  return {
    featureCode,
    usageCount: newCount,
    limit,
    remaining: limit !== null ? Math.max(0, limit - newCount) : null
  };
}

/**
 * 5. Initialize Paystack Checkout Transaction
 */
export async function initializeCheckout({ userId, planCode, callbackUrl }) {
  if (!planCode) {
    const err = new Error('Plan code is required');
    err.statusCode = 400;
    throw err;
  }

  const cleanPlanCode = planCode.toLowerCase().trim();
  if (cleanPlanCode === 'basic') {
    const err = new Error('The Basic plan is free and does not require checkout.');
    err.statusCode = 400;
    throw err;
  }

  const planRes = await db.query(`
    SELECT id, code, name, description, amount_kobo, currency, paystack_plan_code, is_active
    FROM subscription_plans
    WHERE code = $1;
  `, [cleanPlanCode]);

  if (planRes.rows.length === 0 || !planRes.rows[0].is_active) {
    const err = new Error('Invalid or inactive subscription plan selected.');
    err.statusCode = 404;
    throw err;
  }

  const plan = planRes.rows[0];

  // Prevent duplicate payment initialization if already on active plan
  const currentSub = await getUserSubscription(userId);
  if (currentSub.isActive && currentSub.planCode === plan.code && !currentSub.cancelAtPeriodEnd) {
    const err = new Error(`You already have an active ${plan.name} subscription.`);
    err.statusCode = 409;
    err.code = 'SUBSCRIPTION_ALREADY_ACTIVE';
    throw err;
  }

  // Get user email
  const userRes = await db.query(`SELECT email FROM users WHERE id = $1;`, [userId]);
  if (userRes.rows.length === 0) {
    const err = new Error('User record not found.');
    err.statusCode = 404;
    throw err;
  }
  const email = userRes.rows[0].email;

  // Generate unique payment reference
  const reference = 'ACADEMIC_2026_' + crypto.randomBytes(6).toString('hex').toUpperCase();
  const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  // Store pending transaction record
  await db.query(`
    INSERT INTO payment_transactions (id, user_id, plan_id, provider, reference, amount_kobo, currency, status, metadata)
    VALUES ($1, $2, $3, 'paystack', $4, $5, $6, 'pending', $7);
  `, [txId, userId, plan.id, reference, plan.amount_kobo, plan.currency, JSON.stringify({ userId, planCode: plan.code, email })]);

  // Request Paystack initialization
  const effectiveCallback = callbackUrl || `/billing/callback`;
  const initData = await paystackRequest('/transaction/initialize', 'POST', {
    email,
    amount: plan.amount_kobo,
    plan: plan.paystack_plan_code || undefined,
    reference,
    callback_url: effectiveCallback,
    metadata: {
      userId,
      planCode: plan.code,
      planId: plan.id,
      transactionId: txId
    }
  });

  return {
    authorizationUrl: initData.data?.authorization_url || `/billing/callback?reference=${reference}`,
    accessCode: initData.data?.access_code,
    reference,
    plan: {
      code: plan.code,
      name: plan.name,
      amount: plan.amount_kobo / 100,
      amountKobo: plan.amount_kobo,
      currency: plan.currency
    }
  };
}

/**
 * 6. Verify Transaction and Fulfill Subscription
 */
export async function verifyPayment(reference) {
  if (!reference) {
    const err = new Error('Payment reference is required.');
    err.statusCode = 400;
    throw err;
  }

  const txRes = await db.query(`
    SELECT pt.*, sp.code as plan_code, sp.name as plan_name, sp.amount_kobo as plan_amount
    FROM payment_transactions pt
    JOIN subscription_plans sp ON pt.plan_id = sp.id
    WHERE pt.reference = $1;
  `, [reference]);

  if (txRes.rows.length === 0) {
    const err = new Error('Payment reference not found in transaction ledger.');
    err.statusCode = 404;
    throw err;
  }

  const tx = txRes.rows[0];

  // If already confirmed successful, return idempotently
  if (tx.status === 'success') {
    return {
      verified: true,
      status: 'success',
      reference: tx.reference,
      planCode: tx.plan_code,
      planName: tx.plan_name,
      amount: tx.amount_kobo / 100
    };
  }

  // Query Paystack verification API
  const paystackData = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`, 'GET');

  if (paystackData.data?.status === 'success') {
    const paidAt = paystackData.data.paid_at ? new Date(paystackData.data.paid_at) : new Date();
    const periodEnd = new Date(paidAt);
    periodEnd.setDate(periodEnd.getDate() + 30);

    // Update Transaction
    await db.query(`
      UPDATE payment_transactions
      SET status = 'success', paid_at = $1, provider_transaction_id = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3;
    `, [paidAt.toISOString(), String(paystackData.data.id || ''), tx.id]);

    // Update or Create Subscription
    const subCheck = await db.query(`SELECT id FROM user_subscriptions WHERE user_id = $1;`, [tx.user_id]);
    if (subCheck.rows.length > 0) {
      await db.query(`
        UPDATE user_subscriptions
        SET plan_id = $1, status = 'active', current_period_start = $2, current_period_end = $3,
            cancel_at_period_end = false, authorization_reference = $4,
            paystack_customer_code = COALESCE($5, paystack_customer_code),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $6;
      `, [
        tx.plan_id,
        paidAt.toISOString(),
        periodEnd.toISOString(),
        reference,
        paystackData.data.customer?.customer_code || null,
        subCheck.rows[0].id
      ]);
    } else {
      const subId = 'sub_' + Date.now();
      await db.query(`
        INSERT INTO user_subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end, authorization_reference, paystack_customer_code)
        VALUES ($1, $2, $3, 'active', $4, $5, false, $6, $7);
      `, [
        subId,
        tx.user_id,
        tx.plan_id,
        paidAt.toISOString(),
        periodEnd.toISOString(),
        reference,
        paystackData.data.customer?.customer_code || null
      ]);
    }

    return {
      verified: true,
      status: 'success',
      reference: tx.reference,
      planCode: tx.plan_code,
      planName: tx.plan_name,
      amount: tx.amount_kobo / 100
    };
  } else {
    const status = paystackData.data?.status || 'failed';
    await db.query(`
      UPDATE payment_transactions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;
    `, [status === 'abandoned' ? 'abandoned' : 'failed', tx.id]);

    return {
      verified: false,
      status: status,
      reference: tx.reference,
      message: 'Payment verification did not indicate success.'
    };
  }
}

/**
 * 7. Cancel subscription (Leaves access active until period end)
 */
export async function cancelSubscription(userId) {
  const sub = await getUserSubscription(userId);

  if (sub.planCode === 'basic') {
    return {
      success: true,
      message: 'You are on the free Basic plan. No paid subscription to cancel.'
    };
  }

  await db.query(`
    UPDATE user_subscriptions
    SET status = 'non_renewing', cancel_at_period_end = true, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1;
  `, [sub.id]);

  return {
    success: true,
    message: 'Your subscription will remain active until the end of your current billing period.',
    currentPeriodEnd: sub.currentPeriodEnd
  };
}

/**
 * 8. Process Paystack Webhook (Idempotent signature-verified handler)
 */
export async function handlePaystackWebhook(rawBody, signature) {
  if (!rawBody) {
    const err = new Error('Empty webhook payload.');
    err.statusCode = 400;
    throw err;
  }

  // Verify HMAC SHA512 Signature
  const expectedSig = crypto.createHmac('sha512', PAYSTACK_WEBHOOK_SECRET).update(rawBody).digest('hex');
  if (signature !== expectedSig && !IS_TEST_MODE) {
    const err = new Error('Invalid Paystack webhook signature.');
    err.statusCode = 401;
    err.code = 'WEBHOOK_INVALID_SIGNATURE';
    throw err;
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (e) {
    const err = new Error('Malformed webhook JSON payload.');
    err.statusCode = 400;
    throw err;
  }

  const eventType = event.event || 'unknown';
  const eventId = String(event.id || event.data?.reference || `${eventType}_${Date.now()}`);

  // Idempotency: Insert into payment_webhook_events
  const hookDbId = 'wh_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const insertRes = await db.query(`
    INSERT INTO payment_webhook_events (id, event_id, event_type, payload, processed)
    VALUES ($1, $2, $3, $4, false)
    ON CONFLICT (event_id) DO NOTHING
    RETURNING id, processed;
  `, [hookDbId, eventId, eventType, rawBody]);

  // If already present, check if processed
  if (insertRes.rows.length === 0) {
    const checkRes = await db.query(`SELECT processed FROM payment_webhook_events WHERE event_id = $1;`, [eventId]);
    if (checkRes.rows[0]?.processed) {
      return { acknowledged: true, duplicate: true, message: 'Event already processed idempotently.' };
    }
  }

  // Handle Event Types
  try {
    if (eventType === 'charge.success') {
      const data = event.data;
      const ref = data.reference;
      if (ref) {
        await verifyPayment(ref);
      }
    } else if (eventType === 'subscription.create') {
      const data = event.data;
      const subCode = data.subscription_code;
      const customerCode = data.customer?.customer_code;
      if (customerCode && subCode) {
        await db.query(`
          UPDATE user_subscriptions 
          SET paystack_subscription_code = $1, paystack_email_token = $2, updated_at = CURRENT_TIMESTAMP
          WHERE paystack_customer_code = $3;
        `, [subCode, data.email_token || null, customerCode]);
      }
    } else if (eventType === 'subscription.disable') {
      const data = event.data;
      const subCode = data.subscription_code;
      if (subCode) {
        await db.query(`
          UPDATE user_subscriptions 
          SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
          WHERE paystack_subscription_code = $1;
        `, [subCode]);
      }
    } else if (eventType === 'subscription.not_renew') {
      const data = event.data;
      const subCode = data.subscription_code;
      if (subCode) {
        await db.query(`
          UPDATE user_subscriptions 
          SET status = 'non_renewing', cancel_at_period_end = true, updated_at = CURRENT_TIMESTAMP
          WHERE paystack_subscription_code = $1;
        `, [subCode]);
      }
    } else if (eventType === 'invoice.failed') {
      const data = event.data;
      const customerCode = data.customer?.customer_code;
      if (customerCode) {
        await db.query(`
          UPDATE user_subscriptions 
          SET status = 'past_due', updated_at = CURRENT_TIMESTAMP
          WHERE paystack_customer_code = $1;
        `, [customerCode]);
      }
    }

    // Mark event processed
    await db.query(`
      UPDATE payment_webhook_events 
      SET processed = true, processed_at = CURRENT_TIMESTAMP
      WHERE event_id = $1;
    `, [eventId]);

    return { acknowledged: true, processed: true, eventType };
  } catch (err) {
    console.error(`Error processing Paystack webhook event ${eventType}:`, err);
    // Even if processing fails, do not throw 500 to Paystack if it was acknowledged to prevent retry storm
    return { acknowledged: true, error: err.message };
  }
}

/**
 * 9. Get User Billing History
 */
export async function getBillingHistory(userId) {
  const res = await db.query(`
    SELECT pt.id, pt.reference, pt.amount_kobo, pt.currency, pt.status, pt.paid_at, pt.created_at,
           sp.name as plan_name, sp.code as plan_code
    FROM payment_transactions pt
    JOIN subscription_plans sp ON pt.plan_id = sp.id
    WHERE pt.user_id = $1
    ORDER BY pt.created_at DESC;
  `, [userId]);

  return res.rows.map(r => ({
    id: r.id,
    reference: r.reference,
    planName: r.plan_name,
    planCode: r.plan_code,
    amount: r.amount_kobo / 100,
    amountKobo: r.amount_kobo,
    currency: r.currency,
    status: r.status,
    paidAt: r.paid_at,
    createdAt: r.created_at
  }));
}

/**
 * 10. Admin Subscription & Billing Metrics (Strictly computed from actual records)
 */
export async function getAdminBillingMetrics() {
  const subCounts = await db.query(`
    SELECT sp.code, sp.name, COUNT(us.id) as subscriber_count
    FROM subscription_plans sp
    LEFT JOIN user_subscriptions us ON sp.id = us.plan_id AND us.status = 'active'
    GROUP BY sp.code, sp.name, sp.display_order
    ORDER BY sp.display_order ASC;
  `);

  const txRevenue = await db.query(`
    SELECT COALESCE(SUM(amount_kobo), 0) as total_revenue_kobo, COUNT(id) as total_successful_transactions
    FROM payment_transactions
    WHERE status = 'success';
  `);

  const statusSummary = await db.query(`
    SELECT status, COUNT(id) as count
    FROM user_subscriptions
    GROUP BY status;
  `);

  return {
    plans: subCounts.rows.map(r => ({
      code: r.code,
      name: r.name,
      count: parseInt(r.subscriber_count, 10)
    })),
    totalRevenueNgn: parseInt(txRevenue.rows[0].total_revenue_kobo, 10) / 100,
    totalTransactions: parseInt(txRevenue.rows[0].total_successful_transactions, 10),
    statusBreakdown: statusSummary.rows.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count, 10);
      return acc;
    }, {})
  };
}
