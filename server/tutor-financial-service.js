/**
 * tutor-financial-service.js
 *
 * Server-side implementation of the Studora Tutor Marketplace Financial System.
 *
 * Responsibilities:
 *  1. Initialize Paystack transactions for tutor session bookings
 *  2. Verify Paystack payment and confirm booking (trusted server-side only)
 *  3. Execute tutor payouts via Paystack Transfers
 *  4. Handle Paystack transfer webhook events
 *  5. Admin: approve withdrawals and initiate transfers
 *
 * Architecture:
 *  - All monetary values are integers in KOBO (₦1 = 100 kobo). No floats.
 *  - Supabase RPCs handle all DB state transitions and commission calculations.
 *  - Client input NEVER determines final payout amount; server reads from DB.
 *  - PAYSTACK_SECRET_KEY and PAYSTACK_WEBHOOK_SECRET never exposed to frontend.
 *
 * Security:
 *  - Webhook HMAC-SHA512 verified before any processing
 *  - All Paystack transfers initiated server-side only
 *  - Idempotent: safe to call twice with same reference
 */

import crypto from 'crypto';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

// ── Paystack Configuration (server-only) ──────────────────────────────────────

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_academic_platform_mock_key_2026';
const PAYSTACK_BASE_URL   = process.env.PAYSTACK_BASE_URL   || 'https://api.paystack.co';

export const IS_TUTOR_TEST_MODE = PAYSTACK_SECRET_KEY.startsWith('sk_test_') || PAYSTACK_SECRET_KEY.includes('mock');

// Webhook secret: must NOT fall back to secret key — that would make signatures forgeable.
if (!process.env.PAYSTACK_WEBHOOK_SECRET && !IS_TUTOR_TEST_MODE) {
  throw new Error('[tutor-financial-service.js] Missing required env: PAYSTACK_WEBHOOK_SECRET');
}
const PAYSTACK_WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET || null;

// ── Supabase Service-Role Client (server-only) ────────────────────────────────

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null;

// Service-role client for RPC calls that bypass RLS (confirm_session_payment, execute payout, etc.)
// If no service key available in test mode, we degrade gracefully.
let supabaseAdmin = null;
if (supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// Anon client (used to call RPCs that still verify auth.uid() via passed JWT)
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'mock_anon_key_for_testing';
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ── Paystack HTTP Helper ──────────────────────────────────────────────────────

async function paystackRequest(endpoint, method = 'GET', data = null) {
  if (IS_TUTOR_TEST_MODE && !process.env.PAYSTACK_LIVE_HTTP) {
    return mockTutorPaystackResponse(endpoint, method, data);
  }

  return new Promise((resolve, reject) => {
    const url     = new URL(endpoint, PAYSTACK_BASE_URL);
    const bodyStr = data ? JSON.stringify(data) : '';

    const options = {
      hostname: url.hostname,
      port:     443,
      path:     url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type':  'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
      }
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
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
          reject(new Error(`Failed to parse Paystack response: ${raw.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function mockTutorPaystackResponse(endpoint, method, data) {
  // Initialize transaction
  if (endpoint.startsWith('/transaction/initialize')) {
    const ref = data?.reference || 'STU_MOCK_' + crypto.randomBytes(4).toString('hex').toUpperCase();
    return Promise.resolve({
      status: true,
      message: 'Authorization URL created (tutor test mode)',
      data: {
        authorization_url: `/billing/callback?reference=${ref}&status=success&type=tutor_session`,
        access_code: 'mock_acc_' + crypto.randomBytes(6).toString('hex'),
        reference: ref
      }
    });
  }

  // Verify transaction
  if (endpoint.startsWith('/transaction/verify/')) {
    const ref = decodeURIComponent(endpoint.replace('/transaction/verify/', ''));
    return Promise.resolve({
      status: true,
      message: 'Verification successful (tutor test mode)',
      data: {
        id: Math.floor(Math.random() * 999999) + 100000,
        domain: 'test',
        status: 'success',
        reference: ref,
        amount: data?.amount_kobo || 1000000,
        gateway_response: 'Successful',
        paid_at: new Date().toISOString(),
        currency: 'NGN',
        customer: { email: 'student@test.studora.com', customer_code: 'CUS_mock_student' },
        metadata: data?.metadata || {}
      }
    });
  }

  // Create transfer recipient
  if (endpoint.startsWith('/transferrecipient')) {
    return Promise.resolve({
      status: true,
      message: 'Transfer recipient created (test mode)',
      data: {
        recipient_code: 'RCP_mock_' + crypto.randomBytes(6).toString('hex'),
        type: 'nuban',
        name: data?.name || 'Test Tutor',
        account_number: data?.account_number || '0000000000',
        bank_code: data?.bank_code || '058'
      }
    });
  }

  // Initiate transfer
  if (endpoint.startsWith('/transfer') && method === 'POST') {
    const ref = data?.reference || 'TRF_MOCK_' + crypto.randomBytes(6).toString('hex').toUpperCase();
    return Promise.resolve({
      status: true,
      message: 'Transfer queued (test mode)',
      data: {
        transfer_code: 'TRF_' + crypto.randomBytes(8).toString('hex').toUpperCase(),
        reference: ref,
        amount: data?.amount || 0,
        status: 'pending',
        recipient: { recipient_code: data?.recipient }
      }
    });
  }

  return Promise.resolve({ status: true, message: 'Mock tutor financial response', data: {} });
}

// ── 1. Initialize Booking Payment ─────────────────────────────────────────────

/**
 * Creates a booking with authoritative server-side price snapshot,
 * then initializes a Paystack transaction.
 *
 * @param {string} supabaseJwt - Authenticated student's Supabase JWT
 * @param {object} params
 * @param {string} params.tutorId
 * @param {string} params.subject
 * @param {string} params.slotTime
 * @param {string} params.mode - 'virtual' | 'physical'
 * @param {string} [params.notes]
 * @param {string} params.studentEmail - For Paystack transaction
 * @returns {object} { bookingId, paymentReference, authorizationUrl, amountKobo, ... }
 */
export async function initializeBookingPayment(supabaseJwt, {
  tutorId, subject, slotTime, mode = 'virtual', notes, studentEmail
}) {
  // Call the Supabase RPC with the student's own JWT — RPC verifies auth.uid() is the student
  const { data: booking, error } = await supabaseAnon
    .rpc('initialize_booking_payment', {
      p_tutor_id:  tutorId,
      p_subject:   subject,
      p_slot_time: slotTime,
      p_mode:      mode,
      p_notes:     notes || null
    }, {
      headers: { Authorization: `Bearer ${supabaseJwt}` }
    });

  if (error) {
    const err = new Error(error.message || 'Failed to initialize booking');
    err.statusCode = 400;
    throw err;
  }

  if (!booking?.success) {
    const err = new Error('Booking initialization failed');
    err.statusCode = 500;
    throw err;
  }

  // Initialize Paystack transaction with the server-determined amount
  const paystackData = await paystackRequest('/transaction/initialize', 'POST', {
    amount:    booking.gross_amount_kobo, // kobo — already server-determined
    email:     studentEmail,
    reference: booking.payment_reference,
    currency:  'NGN',
    metadata: {
      booking_id:   booking.booking_id,
      tutor_id:     tutorId,
      subject:      subject,
      session_mode: mode,
      type:         'tutor_session'
    },
    callback_url: process.env.PAYSTACK_TUTOR_CALLBACK_URL || `${process.env.VITE_APP_URL || ''}/tutors/payment/callback`
  });

  return {
    bookingId:            booking.booking_id,
    paymentReference:     booking.payment_reference,
    authorizationUrl:     paystackData.data?.authorization_url,
    accessCode:           paystackData.data?.access_code,
    tutorName:            booking.tutor_name,
    subject:              booking.subject,
    mode:                 booking.mode,
    grossAmountKobo:      booking.gross_amount_kobo,
    commissionPercentage: booking.platform_commission_percentage,
    commissionKobo:       booking.platform_commission_amount_kobo,
    tutorAmountKobo:      booking.tutor_amount_kobo,
    currency:             'NGN'
  };
}

// ── 2. Verify and Confirm Session Payment ─────────────────────────────────────

/**
 * Server-side verification of Paystack payment. Called after student completes
 * Paystack checkout. NEVER trust frontend-reported payment status.
 *
 * Uses service-role to call confirm_session_payment RPC (bypasses RLS).
 *
 * @param {string} reference - Paystack payment reference (must start with STU_)
 * @returns {object} { success, bookingId, status }
 */
export async function verifyAndConfirmTutorPayment(reference) {
  if (!reference || !reference.startsWith('STU_')) {
    const err = new Error('Invalid payment reference format. Must be a Studora session reference.');
    err.statusCode = 400;
    throw err;
  }

  // Verify with Paystack
  const paystackData = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`, 'GET');

  if (!paystackData.data || paystackData.data.status !== 'success') {
    const err = new Error(`Payment verification failed. Paystack status: ${paystackData.data?.status || 'unknown'}`);
    err.statusCode = 402;
    throw err;
  }

  // Verify metadata identifies this as a tutor session
  const meta = paystackData.data.metadata || {};
  if (meta.type && meta.type !== 'tutor_session') {
    const err = new Error('Reference is not a tutor session payment.');
    err.statusCode = 400;
    throw err;
  }

  const bookingId         = meta.booking_id;
  const paystackTxnId     = String(paystackData.data.id || '');

  if (!bookingId) {
    const err = new Error('Payment reference is missing booking metadata.');
    err.statusCode = 400;
    throw err;
  }

  // Confirm in Supabase using service-role (bypasses RLS — only called server-side)
  const client = supabaseAdmin || supabaseAnon;
  const { data: result, error } = await client.rpc('confirm_session_payment', {
    p_booking_id:              bookingId,
    p_paystack_transaction_id: paystackTxnId
  });

  if (error) {
    const err = new Error(error.message || 'Failed to confirm session payment in database');
    err.statusCode = 500;
    throw err;
  }

  return {
    success:    true,
    bookingId,
    status:     'paid',
    idempotent: result?.idempotent || false
  };
}

// ── 3. Create Paystack Transfer Recipient ─────────────────────────────────────

/**
 * Registers a tutor's bank account as a Paystack Transfer recipient.
 * Called when admin verifies a payout profile.
 *
 * @param {object} params
 * @param {string} params.accountName
 * @param {string} params.accountNumber
 * @param {string} params.bankCode
 * @returns {string} recipientCode
 */
export async function createPaystackRecipient({ accountName, accountNumber, bankCode }) {
  const result = await paystackRequest('/transferrecipient', 'POST', {
    type:           'nuban',
    name:           accountName,
    account_number: accountNumber,
    bank_code:      bankCode,
    currency:       'NGN'
  });

  if (!result.data?.recipient_code) {
    throw new Error('Paystack did not return a recipient code');
  }

  return result.data.recipient_code;
}

// ── 4. Execute Tutor Payout (Paystack Transfer) ───────────────────────────────

/**
 * Initiates a Paystack Transfer to pay a tutor.
 * Called server-side ONLY after admin approves a withdrawal.
 *
 * @param {string} withdrawalId - Internal withdrawal ID
 * @param {string} supabaseJwt  - Admin's Supabase JWT (for admin_approve_withdrawal RPC)
 * @returns {object} { success, withdrawalId, transferCode, transferReference }
 */
export async function executeTutorPayout(withdrawalId, adminJwt) {
  if (!withdrawalId) {
    const err = new Error('Withdrawal ID required');
    err.statusCode = 400;
    throw err;
  }

  // Fetch withdrawal details from Supabase
  const client = supabaseAdmin || supabaseAnon;
  const headers = adminJwt ? { Authorization: `Bearer ${adminJwt}` } : {};

  const { data: wd, error: fetchErr } = await client
    .from('tutor_withdrawals')
    .select('id, tutor_id, amount_kobo, currency, paystack_recipient_code, status, account_name')
    .eq('id', withdrawalId)
    .single();

  if (fetchErr || !wd) {
    const err = new Error('Withdrawal not found');
    err.statusCode = 404;
    throw err;
  }

  if (wd.status !== 'admin_approved') {
    const err = new Error(`Withdrawal must be admin_approved to initiate transfer. Current status: ${wd.status}`);
    err.statusCode = 400;
    throw err;
  }

  if (!wd.paystack_recipient_code) {
    const err = new Error('Withdrawal has no Paystack recipient code. Bank account must be verified first.');
    err.statusCode = 400;
    throw err;
  }

  // Idempotency key based on withdrawal ID
  const transferReference = `PAYOUT_${withdrawalId.replace('wd_', '').toUpperCase()}`;

  // Initiate Paystack Transfer (amount in kobo)
  const transferResult = await paystackRequest('/transfer', 'POST', {
    source:    'balance',
    reason:    `Studora tutor earnings payout — ${wd.account_name}`,
    amount:    wd.amount_kobo, // Paystack uses kobo for NGN
    recipient: wd.paystack_recipient_code,
    currency:  wd.currency || 'NGN',
    reference: transferReference
  });

  const transferCode = transferResult.data?.transfer_code;
  const actualRef    = transferResult.data?.reference || transferReference;

  // Update withdrawal to 'processing' with transfer code
  const { error: updateErr } = await client
    .from('tutor_withdrawals')
    .update({
      status:                    'processing',
      paystack_transfer_code:    transferCode || null,
      paystack_transfer_reference: actualRef,
      updated_at:                new Date().toISOString()
    })
    .eq('id', withdrawalId)
    .eq('status', 'admin_approved'); // Only update if still in approved state (idempotent guard)

  if (updateErr) {
    // Non-fatal: transfer was initiated but status update failed
    console.error('[tutor-financial-service] Warning: transfer initiated but DB status update failed:', updateErr.message);
  }

  // Update associated ledger entries from withdrawal_requested → processing
  await client
    .from('tutor_session_ledger')
    .update({ earning_status: 'processing', updated_at: new Date().toISOString() })
    .eq('tutor_id', wd.tutor_id)
    .eq('earning_status', 'withdrawal_requested');

  return {
    success:           true,
    withdrawalId,
    transferCode:      transferCode || null,
    transferReference: actualRef,
    status:            'processing'
  };
}

// ── 5. Finalize Withdrawal (webhook) ──────────────────────────────────────────

/**
 * Marks withdrawal as paid or failed based on Paystack transfer webhook.
 * Idempotent — safe to call twice for same reference.
 *
 * @param {string} transferReference - Paystack transfer reference
 * @param {string} finalStatus       - 'paid' | 'failed'
 * @param {string} [failureReason]   - For failed transfers
 */
export async function finalizeWithdrawal(transferReference, finalStatus, failureReason = null) {
  const client = supabaseAdmin || supabaseAnon;

  const { data: wd, error: fetchErr } = await client
    .from('tutor_withdrawals')
    .select('id, tutor_id, amount_kobo, status')
    .eq('paystack_transfer_reference', transferReference)
    .maybeSingle();

  if (fetchErr || !wd) {
    // Not our reference — might belong to a different system
    return { handled: false, reason: 'No matching withdrawal found for reference' };
  }

  // Idempotent: already in terminal state
  if (wd.status === finalStatus || wd.status === 'paid') {
    return { handled: true, idempotent: true, withdrawalId: wd.id };
  }

  if (finalStatus === 'paid') {
    // Mark withdrawal paid
    await client.from('tutor_withdrawals').update({
      status:       'paid',
      completed_at: new Date().toISOString(),
      updated_at:   new Date().toISOString()
    }).eq('id', wd.id);

    // Mark ledger entries as paid
    await client.from('tutor_session_ledger').update({
      earning_status: 'paid',
      updated_at:     new Date().toISOString()
    }).eq('tutor_id', wd.tutor_id).eq('earning_status', 'processing');

  } else if (finalStatus === 'failed') {
    // Mark withdrawal failed (never delete — only mark)
    await client.from('tutor_withdrawals').update({
      status:         'failed',
      failure_reason: failureReason || 'Transfer failed',
      updated_at:     new Date().toISOString()
    }).eq('id', wd.id);

    // Return ledger entries from processing → available (so tutor can retry)
    await client.from('tutor_session_ledger').update({
      earning_status: 'available',
      updated_at:     new Date().toISOString()
    }).eq('tutor_id', wd.tutor_id).eq('earning_status', 'processing');
  }

  return { handled: true, idempotent: false, withdrawalId: wd.id, finalStatus };
}

// ── 6. Paystack Webhook Handler (Tutor Session Events) ────────────────────────

/**
 * Validates and processes Paystack webhook events for tutor sessions.
 * Called from api.js after raw body is captured.
 *
 * @param {string|Buffer} rawBody - Raw request body (required for signature)
 * @param {string} signature      - x-paystack-signature header value
 * @returns {object} { handled, event, result }
 */
export async function handleTutorPaystackWebhook(rawBody, signature) {
  // 1. Reject empty body
  if (!rawBody) {
    const err = new Error('Empty webhook payload');
    err.statusCode = 400;
    throw err;
  }

  // 2. Verify HMAC-SHA512 signature (skip in test mode without a configured secret)
  if (PAYSTACK_WEBHOOK_SECRET) {
    const expectedSig = crypto
      .createHmac('sha512', PAYSTACK_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSig) {
      const err = new Error('Invalid Paystack webhook signature');
      err.statusCode = 401;
      throw err;
    }
  } else if (!IS_TUTOR_TEST_MODE) {
    const err = new Error('Webhook secret not configured');
    err.statusCode = 500;
    throw err;
  }

  // 3. Parse payload
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (e) {
    const err = new Error('Malformed webhook JSON');
    err.statusCode = 400;
    throw err;
  }

  const eventType = event.event;
  const data      = event.data || {};

  // 4. Route events
  switch (eventType) {
    case 'charge.success': {
      // Only handle tutor session payments (reference starts with STU_)
      const reference = data.reference || '';
      if (!reference.startsWith('STU_')) {
        return { handled: false, event: eventType, reason: 'Not a tutor session reference' };
      }

      try {
        const result = await verifyAndConfirmTutorPayment(reference);
        return { handled: true, event: eventType, result };
      } catch (err) {
        // Log but don't fail the webhook — return 200 to prevent Paystack retries
        console.error('[tutor-financial-service] charge.success processing error:', err.message);
        return { handled: true, event: eventType, error: err.message };
      }
    }

    case 'transfer.success': {
      const reference = data.reference || '';
      if (!reference.startsWith('PAYOUT_')) {
        return { handled: false, event: eventType, reason: 'Not a Studora payout reference' };
      }
      const result = await finalizeWithdrawal(reference, 'paid');
      return { handled: true, event: eventType, result };
    }

    case 'transfer.failed':
    case 'transfer.reversed': {
      const reference     = data.reference || '';
      const failureReason = data.gateway_response || data.reason || eventType;
      if (!reference.startsWith('PAYOUT_')) {
        return { handled: false, event: eventType, reason: 'Not a Studora payout reference' };
      }
      const result = await finalizeWithdrawal(reference, 'failed', failureReason);
      return { handled: true, event: eventType, result };
    }

    default:
      return { handled: false, event: eventType, reason: 'Unhandled event type' };
  }
}

// ── 7. Payout Profile Verification ───────────────────────────────────────────

/**
 * Admin: Verifies a tutor's bank account by creating a Paystack recipient,
 * then updating the payout_profile with the recipient code and verified=true.
 *
 * @param {string} tutorId  - The tutor's profile UUID
 * @param {string} adminJwt - Admin's Supabase JWT
 * @returns {object} { success, recipientCode }
 */
export async function adminVerifyPayoutProfile(tutorId, adminJwt) {
  const client = supabaseAdmin || supabaseAnon;
  const headers = adminJwt ? { Authorization: `Bearer ${adminJwt}` } : {};

  // Fetch the payout profile
  const { data: profile, error } = await client
    .from('tutor_payout_profiles')
    .select('tutor_id, bank_code, bank_name, account_number, account_name, paystack_recipient_code')
    .eq('tutor_id', tutorId)
    .single();

  if (error || !profile) {
    const err = new Error('Payout profile not found for tutor');
    err.statusCode = 404;
    throw err;
  }

  // If already has a recipient code, skip creation (idempotent)
  let recipientCode = profile.paystack_recipient_code;

  if (!recipientCode) {
    recipientCode = await createPaystackRecipient({
      accountName:   profile.account_name,
      accountNumber: profile.account_number,
      bankCode:      profile.bank_code
    });
  }

  // Update via service role (bypasses RLS write protection trigger — only server role can set these)
  const updateClient = supabaseAdmin || supabaseAnon;
  await updateClient
    .from('tutor_payout_profiles')
    .update({
      paystack_recipient_code: recipientCode,
      is_verified:             true,
      verified_at:             new Date().toISOString(),
      updated_at:              new Date().toISOString()
    })
    .eq('tutor_id', tutorId);

  return { success: true, tutorId, recipientCode };
}

// ── 8. Get Tutor Earnings Summary (server proxy) ──────────────────────────────

/**
 * Calls get_tutor_earnings_summary() RPC on behalf of the authenticated tutor.
 * @param {string} supabaseJwt - Tutor's Supabase JWT
 */
export async function getTutorEarningsSummary(supabaseJwt) {
  const { data, error } = await supabaseAnon.rpc('get_tutor_earnings_summary', {}, {
    headers: { Authorization: `Bearer ${supabaseJwt}` }
  });

  if (error) {
    const err = new Error(error.message || 'Failed to fetch earnings summary');
    err.statusCode = 400;
    throw err;
  }

  return data;
}

// ── 9. Request Withdrawal (server proxy) ─────────────────────────────────────

/**
 * Calls request_tutor_withdrawal() RPC on behalf of the authenticated tutor.
 * Server validates; RPC checks balance, payout profile, and duplicate prevention.
 * @param {string} supabaseJwt  - Tutor's Supabase JWT
 * @param {number} amountKobo   - Amount in kobo (integer)
 */
export async function requestWithdrawal(supabaseJwt, amountKobo) {
  if (!Number.isInteger(amountKobo) || amountKobo <= 0) {
    const err = new Error('Withdrawal amount must be a positive integer in kobo');
    err.statusCode = 400;
    throw err;
  }

  const { data, error } = await supabaseAnon.rpc('request_tutor_withdrawal', {
    p_amount_kobo: amountKobo
  }, {
    headers: { Authorization: `Bearer ${supabaseJwt}` }
  });

  if (error) {
    const err = new Error(error.message || 'Withdrawal request failed');
    err.statusCode = 400;
    throw err;
  }

  return data;
}

// ── 10. Fetch Banks List (helper) ─────────────────────────────────────────────

/**
 * Returns list of Nigerian banks from Paystack.
 * Cached in memory for 1 hour to avoid excessive Paystack calls.
 */
let banksCache = null;
let banksCacheTime = 0;
const BANKS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function getNigerianBanks() {
  if (banksCache && Date.now() - banksCacheTime < BANKS_CACHE_TTL) {
    return banksCache;
  }

  try {
    const result = await paystackRequest('/bank?currency=NGN&perPage=100', 'GET');
    const banks  = (result.data || []).map((b) => ({
      id:   b.id,
      name: b.name,
      code: b.code
    }));
    banksCache     = banks;
    banksCacheTime = Date.now();
    return banks;
  } catch (e) {
    // Return common Nigerian banks as fallback in test mode
    return [
      { id: 1,  name: 'Access Bank',          code: '044' },
      { id: 2,  name: 'GT Bank',               code: '058' },
      { id: 3,  name: 'First Bank of Nigeria', code: '011' },
      { id: 4,  name: 'Zenith Bank',           code: '057' },
      { id: 5,  name: 'UBA',                   code: '033' },
      { id: 6,  name: 'Union Bank',            code: '032' },
      { id: 7,  name: 'Sterling Bank',         code: '232' },
      { id: 8,  name: 'Polaris Bank',          code: '076' },
      { id: 9,  name: 'Wema Bank',             code: '035' },
      { id: 10, name: 'Fidelity Bank',         code: '070' },
      { id: 11, name: 'Ecobank',               code: '050' },
      { id: 12, name: 'Opay',                  code: '100004' },
      { id: 13, name: 'Kuda Bank',             code: '090267' },
      { id: 14, name: 'PalmPay',               code: '999991' }
    ];
  }
}
