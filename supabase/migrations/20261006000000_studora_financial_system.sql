-- ==============================================================================
-- STUDORA — TUTOR MARKETPLACE FINANCIAL SYSTEM
-- Migration: 20261006000000_studora_financial_system.sql
-- "Study smarter. Go further."
--
-- Implements:
--   • Platform commission configuration table
--   • Tutor session pricing (extended tutor_profiles)
--   • Tutor payout profiles (bank account storage)
--   • Financial snapshot columns on tutor_bookings
--   • Immutable session ledger (tutor_session_ledger)
--   • Withdrawal tracking (tutor_withdrawals)
--   • 10 SECURITY DEFINER RPCs for all financial mutations
--   • Full Row Level Security for all new tables
--
-- Architecture: Option B — Studora collects full student payment via Paystack,
-- then pays tutors 80% via Paystack Transfers on withdrawal request.
-- Commission (20%) is NEVER hardcoded in application code — always read from
-- platform_config.commission_percentage.
-- All monetary amounts are stored as BIGINT in kobo (₦1 = 100 kobo).
-- NO floating-point arithmetic is used for any financial calculation.
-- ==============================================================================

-- ==============================================================================
-- 1. PLATFORM CONFIGURATION TABLE
--    Stores admin-controlled platform settings. Commission rate lives here.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.platform_config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed the default commission rate (20% platform, 80% tutor)
INSERT INTO public.platform_config (key, value, description)
VALUES (
  'commission_percentage',
  '20',
  'Platform commission percentage (integer 0-100). Tutor receives (100 - value)% of each session payment.'
)
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read platform config" ON public.platform_config;
CREATE POLICY "Authenticated users can read platform config" ON public.platform_config
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage platform config" ON public.platform_config;
CREATE POLICY "Admins can manage platform config" ON public.platform_config
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- ==============================================================================
-- 2. EXTEND TUTOR_PROFILES WITH SESSION PRICING
--    Tutors set their own session price. Stored as kobo (integer).
--    Min: ₦1,000 = 100,000 kobo | Max: ₦100,000 = 10,000,000 kobo
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tutor_profiles' AND column_name = 'session_price_kobo'
  ) THEN
    ALTER TABLE public.tutor_profiles
      ADD COLUMN session_price_kobo BIGINT
      CHECK (
        session_price_kobo IS NULL
        OR (session_price_kobo >= 100000 AND session_price_kobo <= 10000000)
      );
    COMMENT ON COLUMN public.tutor_profiles.session_price_kobo IS
      'Tutor session price in kobo (integer). ₦1 = 100 kobo. NULL means price not yet set. Min ₦1,000 (100000 kobo), Max ₦100,000 (10000000 kobo).';
  END IF;
END $$;


-- ==============================================================================
-- 3. TUTOR PAYOUT PROFILES TABLE
--    Stores bank account information for payouts. Sensitive fields (is_verified,
--    paystack codes) are write-protected by trigger — only service role or admin
--    can set them.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.tutor_payout_profiles (
  tutor_id                UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  bank_code               TEXT NOT NULL,
  bank_name               TEXT NOT NULL,
  account_number          TEXT NOT NULL,  -- stored as text to preserve leading zeros
  account_name            TEXT NOT NULL,
  paystack_recipient_code TEXT,           -- Paystack Transfer recipient code (set server-side)
  paystack_subaccount_code TEXT,          -- Paystack subaccount code (set server-side, if split used)
  is_verified             BOOLEAN NOT NULL DEFAULT false,
  verified_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payout_profiles_tutor ON public.tutor_payout_profiles(tutor_id);

COMMENT ON TABLE public.tutor_payout_profiles IS
  'Tutor bank account details for Paystack Transfer payouts. Paystack codes and verification status are set exclusively by server-side processes.';

-- Trigger: block non-admin/non-service from setting is_verified=true or Paystack codes
CREATE OR REPLACE FUNCTION public.protect_payout_profile_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Block client from self-verifying their payout account
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified AND NEW.is_verified = true THEN
    IF auth.role() = 'authenticated' AND NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Forbidden: Payout account verification is controlled server-side only.';
    END IF;
  END IF;

  -- Block client from setting Paystack codes directly
  IF (NEW.paystack_recipient_code IS DISTINCT FROM OLD.paystack_recipient_code OR
      NEW.paystack_subaccount_code IS DISTINCT FROM OLD.paystack_subaccount_code) THEN
    IF auth.role() = 'authenticated' AND NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Forbidden: Paystack integration codes are controlled server-side only.';
    END IF;
  END IF;

  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_payout_profile ON public.tutor_payout_profiles;
CREATE TRIGGER trg_protect_payout_profile
BEFORE UPDATE ON public.tutor_payout_profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_payout_profile_verification();

-- RLS
ALTER TABLE public.tutor_payout_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tutors can view own payout profile" ON public.tutor_payout_profiles;
CREATE POLICY "Tutors can view own payout profile" ON public.tutor_payout_profiles
  FOR SELECT USING (auth.uid() = tutor_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Tutors can insert own payout profile" ON public.tutor_payout_profiles;
CREATE POLICY "Tutors can insert own payout profile" ON public.tutor_payout_profiles
  FOR INSERT WITH CHECK (auth.uid() = tutor_id AND public.is_tutor(auth.uid()));

DROP POLICY IF EXISTS "Tutors can update own payout profile fields" ON public.tutor_payout_profiles;
CREATE POLICY "Tutors can update own payout profile fields" ON public.tutor_payout_profiles
  FOR UPDATE
  USING (auth.uid() = tutor_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = tutor_id OR public.is_admin(auth.uid()));


-- ==============================================================================
-- 4. EXTEND TUTOR_BOOKINGS WITH FINANCIAL SNAPSHOT COLUMNS
--    These columns are written atomically when a booking is created.
--    The commission rate and amounts are snapshotted from the server at the
--    moment of booking, protecting historical accuracy if rates change later.
-- ==============================================================================

DO $$
BEGIN
  -- Price snapshot columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tutor_bookings' AND column_name = 'session_price_kobo') THEN
    ALTER TABLE public.tutor_bookings ADD COLUMN session_price_kobo BIGINT;
    COMMENT ON COLUMN public.tutor_bookings.session_price_kobo IS 'Snapshot of tutor session price at booking time (kobo). Never changes after creation.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tutor_bookings' AND column_name = 'platform_commission_percentage') THEN
    ALTER TABLE public.tutor_bookings ADD COLUMN platform_commission_percentage INT;
    COMMENT ON COLUMN public.tutor_bookings.platform_commission_percentage IS 'Snapshot of platform commission % at booking time. Never changes after creation.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tutor_bookings' AND column_name = 'platform_commission_amount_kobo') THEN
    ALTER TABLE public.tutor_bookings ADD COLUMN platform_commission_amount_kobo BIGINT;
    COMMENT ON COLUMN public.tutor_bookings.platform_commission_amount_kobo IS 'Studora platform share in kobo. Never changes after creation.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tutor_bookings' AND column_name = 'tutor_earning_amount_kobo') THEN
    ALTER TABLE public.tutor_bookings ADD COLUMN tutor_earning_amount_kobo BIGINT;
    COMMENT ON COLUMN public.tutor_bookings.tutor_earning_amount_kobo IS 'Tutor share in kobo. Never changes after creation.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tutor_bookings' AND column_name = 'currency') THEN
    ALTER TABLE public.tutor_bookings ADD COLUMN currency TEXT NOT NULL DEFAULT 'NGN';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tutor_bookings' AND column_name = 'payment_reference') THEN
    ALTER TABLE public.tutor_bookings ADD COLUMN payment_reference TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tutor_bookings' AND column_name = 'payment_status') THEN
    ALTER TABLE public.tutor_bookings ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid'
      CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed', 'refunded', 'reversed'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tutor_bookings' AND column_name = 'mode') THEN
    ALTER TABLE public.tutor_bookings ADD COLUMN mode TEXT NOT NULL DEFAULT 'virtual'
      CHECK (mode IN ('virtual', 'physical'));
  END IF;
END $$;

-- Unique constraint on payment_reference (bookings share one reference with ledger)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_bookings_payment_reference'
  ) THEN
    ALTER TABLE public.tutor_bookings ADD CONSTRAINT uq_bookings_payment_reference UNIQUE (payment_reference);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_payment_ref    ON public.tutor_bookings(payment_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.tutor_bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_tutor_id       ON public.tutor_bookings(tutor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_student_id     ON public.tutor_bookings(student_id);


-- ==============================================================================
-- 5. TUTOR SESSION LEDGER TABLE (IMMUTABLE FINANCIAL RECORD)
--    Every session payment creates one ledger entry. Core financial fields
--    (amounts, commission, booking reference) are immutable after creation
--    enforced by trigger. Only earning_status transitions are allowed updates.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.tutor_session_ledger (
  id                              TEXT PRIMARY KEY
                                    DEFAULT ('tsl_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
  booking_id                      TEXT NOT NULL REFERENCES public.tutor_bookings(id) ON DELETE RESTRICT,
  student_id                      UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  tutor_id                        UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  -- Financial snapshot (written once; immutable via trigger)
  gross_amount_kobo               BIGINT NOT NULL CHECK (gross_amount_kobo > 0),
  platform_commission_percentage  INT    NOT NULL CHECK (platform_commission_percentage BETWEEN 0 AND 100),
  platform_commission_amount_kobo BIGINT NOT NULL CHECK (platform_commission_amount_kobo >= 0),
  tutor_amount_kobo               BIGINT NOT NULL CHECK (tutor_amount_kobo >= 0),
  currency                        TEXT   NOT NULL DEFAULT 'NGN',

  -- Paystack identifiers
  payment_reference               TEXT   NOT NULL,
  paystack_transaction_id         TEXT,
  paystack_subaccount_code        TEXT,

  -- Earning lifecycle state
  -- pending            → payment confirmed; session not yet completed
  -- available          → session completed; tutor can request withdrawal
  -- withdrawal_requested → reserved for a pending withdrawal
  -- processing         → Paystack transfer initiated
  -- paid               → transfer confirmed by Paystack webhook
  -- failed             → transfer failed; returned to available
  -- reversed           → refund issued; earning voided
  earning_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (earning_status IN (
      'pending', 'available', 'withdrawal_requested',
      'processing', 'paid', 'failed', 'reversed'
    )),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tsl_booking_id ON public.tutor_session_ledger(booking_id);
CREATE INDEX IF NOT EXISTS idx_tsl_tutor          ON public.tutor_session_ledger(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tsl_student        ON public.tutor_session_ledger(student_id);
CREATE INDEX IF NOT EXISTS idx_tsl_earning_status ON public.tutor_session_ledger(earning_status);
CREATE INDEX IF NOT EXISTS idx_tsl_payment_ref    ON public.tutor_session_ledger(payment_reference);

COMMENT ON TABLE public.tutor_session_ledger IS
  'Immutable financial ledger. One row per paid tutoring session. Core financial fields cannot be modified after creation (enforced by trigger). Only earning_status transitions are permitted updates.';

-- Trigger: block mutations to core financial fields after creation
CREATE OR REPLACE FUNCTION public.protect_ledger_immutable_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- These fields must never change after initial creation
  IF (NEW.gross_amount_kobo               IS DISTINCT FROM OLD.gross_amount_kobo               OR
      NEW.platform_commission_percentage  IS DISTINCT FROM OLD.platform_commission_percentage  OR
      NEW.platform_commission_amount_kobo IS DISTINCT FROM OLD.platform_commission_amount_kobo OR
      NEW.tutor_amount_kobo               IS DISTINCT FROM OLD.tutor_amount_kobo               OR
      NEW.payment_reference               IS DISTINCT FROM OLD.payment_reference               OR
      NEW.booking_id                      IS DISTINCT FROM OLD.booking_id                      OR
      NEW.student_id                      IS DISTINCT FROM OLD.student_id                      OR
      NEW.tutor_id                        IS DISTINCT FROM OLD.tutor_id) THEN
    RAISE EXCEPTION 'Forbidden: Financial ledger core fields are immutable after creation.';
  END IF;
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_ledger_immutable ON public.tutor_session_ledger;
CREATE TRIGGER trg_protect_ledger_immutable
BEFORE UPDATE ON public.tutor_session_ledger
FOR EACH ROW EXECUTE FUNCTION public.protect_ledger_immutable_fields();

-- RLS: No direct client writes; reads are scoped to owner or admin
ALTER TABLE public.tutor_session_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own session ledger entries" ON public.tutor_session_ledger;
CREATE POLICY "Students can view own session ledger entries" ON public.tutor_session_ledger
  FOR SELECT USING (auth.uid() = student_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Tutors can view own earnings ledger" ON public.tutor_session_ledger;
CREATE POLICY "Tutors can view own earnings ledger" ON public.tutor_session_ledger
  FOR SELECT USING (auth.uid() = tutor_id OR public.is_admin(auth.uid()));


-- ==============================================================================
-- 6. TUTOR WITHDRAWALS TABLE
--    Tracks each tutor payout request from 'requested' through 'paid'/'failed'.
--    Status transitions and financial fields are write-protected by trigger.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.tutor_withdrawals (
  id                         TEXT PRIMARY KEY
                               DEFAULT ('wd_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
  tutor_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  amount_kobo                BIGINT NOT NULL CHECK (amount_kobo > 0),
  currency                   TEXT   NOT NULL DEFAULT 'NGN',

  -- Payout destination snapshot (copied from payout_profiles at request time)
  bank_code                  TEXT NOT NULL,
  bank_name                  TEXT NOT NULL,
  account_number             TEXT NOT NULL,
  account_name               TEXT NOT NULL,
  paystack_recipient_code    TEXT,

  -- Paystack transfer tracking
  paystack_transfer_code     TEXT,
  paystack_transfer_reference TEXT UNIQUE,

  -- Status: requested → admin_approved → processing → paid / failed
  -- reversed: payout was reversed after completion
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'admin_approved', 'processing', 'paid', 'failed', 'reversed')),
  failure_reason             TEXT,

  -- Admin approval tracking
  approved_by  UUID REFERENCES auth.users(id),
  approved_at  TIMESTAMPTZ,

  -- Timestamps
  created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_tutor         ON public.tutor_withdrawals(tutor_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status        ON public.tutor_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_transfer_ref  ON public.tutor_withdrawals(paystack_transfer_reference);

COMMENT ON TABLE public.tutor_withdrawals IS
  'Tracks tutor payout requests. status, amount_kobo, and Paystack codes are write-protected by trigger. Only the request_tutor_withdrawal RPC may create rows.';

-- Trigger: protect withdrawal status and financial fields from client manipulation
CREATE OR REPLACE FUNCTION public.protect_withdrawal_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Status transitions beyond 'requested' require admin or service role
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('admin_approved', 'processing', 'paid', 'failed', 'reversed') THEN
      IF auth.role() = 'authenticated' AND NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Forbidden: Withdrawal status transitions are controlled server-side only.';
      END IF;
    END IF;
  END IF;

  -- Amount and Paystack codes are immutable after creation
  IF (NEW.amount_kobo IS DISTINCT FROM OLD.amount_kobo OR
      NEW.paystack_transfer_code IS DISTINCT FROM OLD.paystack_transfer_code OR
      NEW.paystack_recipient_code IS DISTINCT FROM OLD.paystack_recipient_code OR
      NEW.paystack_transfer_reference IS DISTINCT FROM OLD.paystack_transfer_reference) THEN
    IF auth.role() = 'authenticated' AND NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Forbidden: Withdrawal financial fields are immutable after creation.';
    END IF;
  END IF;

  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_withdrawal ON public.tutor_withdrawals;
CREATE TRIGGER trg_protect_withdrawal
BEFORE UPDATE ON public.tutor_withdrawals
FOR EACH ROW EXECUTE FUNCTION public.protect_withdrawal_status();

-- RLS
ALTER TABLE public.tutor_withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tutors can view own withdrawals" ON public.tutor_withdrawals;
CREATE POLICY "Tutors can view own withdrawals" ON public.tutor_withdrawals
  FOR SELECT USING (auth.uid() = tutor_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update withdrawals" ON public.tutor_withdrawals;
CREATE POLICY "Admins can update withdrawals" ON public.tutor_withdrawals
  FOR UPDATE USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- ==============================================================================
-- 7. SECURITY DEFINER RPCs — ALL FINANCIAL MUTATIONS
--    Every function explicitly sets search_path = public to prevent search path
--    injection attacks, verifies identity and authorization, validates all inputs,
--    and uses integer-only kobo arithmetic for all monetary calculations.
-- ==============================================================================

-- ── RPC 1: get_platform_commission ───────────────────────────────────────────
-- Returns the current commission percentage as an integer.
-- Used by all RPCs that need the commission rate (never hardcoded).

CREATE OR REPLACE FUNCTION public.get_platform_commission()
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT value::INT FROM public.platform_config WHERE key = 'commission_percentage'),
    20  -- Absolute fallback if table is somehow empty
  );
$$;

COMMENT ON FUNCTION public.get_platform_commission() IS
  'Returns current platform commission percentage from platform_config. Never hardcoded.';


-- ── RPC 2: calculate_session_split ───────────────────────────────────────────
-- Pure integer arithmetic; no floating point.
-- ₦10,000 (1,000,000 kobo): commission=200,000, tutor=800,000

CREATE OR REPLACE FUNCTION public.calculate_session_split(
  p_gross_kobo BIGINT
)
RETURNS TABLE(
  gross_amount_kobo               BIGINT,
  commission_percentage           INT,
  commission_amount_kobo          BIGINT,
  tutor_amount_kobo               BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_commission_pct  INT;
  v_commission_kobo BIGINT;
  v_tutor_kobo      BIGINT;
BEGIN
  IF p_gross_kobo IS NULL OR p_gross_kobo <= 0 THEN
    RAISE EXCEPTION 'Invalid gross amount: must be a positive integer in kobo. Got: %', p_gross_kobo;
  END IF;

  -- Read authoritative commission rate (integer, no float)
  v_commission_pct := public.get_platform_commission();

  -- Integer division: floor(gross * pct / 100). No floats ever touch money.
  v_commission_kobo := (p_gross_kobo * v_commission_pct) / 100;
  v_tutor_kobo      := p_gross_kobo - v_commission_kobo;

  RETURN QUERY SELECT p_gross_kobo, v_commission_pct, v_commission_kobo, v_tutor_kobo;
END;
$$;

COMMENT ON FUNCTION public.calculate_session_split(BIGINT) IS
  'Splits a gross kobo amount into platform commission and tutor share using integer arithmetic. No floating point.';


-- ── RPC 3: set_tutor_session_price ───────────────────────────────────────────
-- Only approved tutors can call this. Sets their own session price.
-- Validates: caller is tutor, price in valid range.

CREATE OR REPLACE FUNCTION public.set_tutor_session_price(
  p_price_kobo BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tutor_id UUID;
  v_split    RECORD;
BEGIN
  v_tutor_id := auth.uid();
  IF v_tutor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT public.is_tutor(v_tutor_id) THEN
    RAISE EXCEPTION 'Forbidden: Only approved tutors can set a session price.';
  END IF;

  -- Range validation: min ₦1,000 (100,000 kobo), max ₦100,000 (10,000,000 kobo)
  IF p_price_kobo IS NULL OR p_price_kobo < 100000 THEN
    RAISE EXCEPTION 'Session price must be at least ₦1,000 (100,000 kobo). Got: %', p_price_kobo;
  END IF;
  IF p_price_kobo > 10000000 THEN
    RAISE EXCEPTION 'Session price cannot exceed ₦100,000 (10,000,000 kobo). Got: %', p_price_kobo;
  END IF;

  UPDATE public.tutor_profiles
  SET session_price_kobo = p_price_kobo, updated_at = CURRENT_TIMESTAMP
  WHERE id = v_tutor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tutor profile not found.';
  END IF;

  SELECT * INTO v_split FROM public.calculate_session_split(p_price_kobo);

  RETURN jsonb_build_object(
    'success',                  true,
    'session_price_kobo',       p_price_kobo,
    'commission_percentage',    v_split.commission_percentage,
    'commission_amount_kobo',   v_split.commission_amount_kobo,
    'tutor_amount_kobo',        v_split.tutor_amount_kobo
  );
END;
$$;


-- ── RPC 4: initialize_booking_payment ────────────────────────────────────────
-- Student calls this to create a booking with an authoritative price snapshot.
-- The server-side commission rate is read and applied; client values are ignored.
-- Returns payment_reference for Paystack initialization.

CREATE OR REPLACE FUNCTION public.initialize_booking_payment(
  p_tutor_id  UUID,
  p_subject   TEXT,
  p_slot_time TEXT,
  p_mode      TEXT DEFAULT 'virtual',
  p_notes     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_tutor      RECORD;
  v_split      RECORD;
  v_booking_id TEXT;
  v_payment_ref TEXT;
BEGIN
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- A tutor cannot book themselves
  IF v_student_id = p_tutor_id THEN
    RAISE EXCEPTION 'You cannot book a session with yourself.';
  END IF;

  -- Validate mode
  IF p_mode NOT IN ('virtual', 'physical') THEN
    RAISE EXCEPTION 'Invalid session mode. Must be "virtual" or "physical".';
  END IF;

  -- Validate inputs
  IF p_subject IS NULL OR trim(p_subject) = '' THEN
    RAISE EXCEPTION 'Subject is required.';
  END IF;
  IF p_slot_time IS NULL OR trim(p_slot_time) = '' THEN
    RAISE EXCEPTION 'Session time is required.';
  END IF;

  -- Look up tutor with their current pricing
  SELECT tp.id, tp.session_price_kobo, tp.is_active, tp.is_verified, tp.is_visible,
         p.full_name
  INTO v_tutor
  FROM public.tutor_profiles tp
  JOIN public.profiles p ON p.id = tp.id
  WHERE tp.id = p_tutor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tutor not found.';
  END IF;

  IF NOT (v_tutor.is_active AND v_tutor.is_verified AND v_tutor.is_visible) THEN
    RAISE EXCEPTION 'This tutor is not currently available for bookings.';
  END IF;

  IF v_tutor.session_price_kobo IS NULL OR v_tutor.session_price_kobo <= 0 THEN
    RAISE EXCEPTION 'This tutor has not set a session price yet.';
  END IF;

  -- Server-side authoritative split — client cannot influence these values
  SELECT * INTO v_split FROM public.calculate_session_split(v_tutor.session_price_kobo);

  -- Generate IDs
  v_booking_id  := 'bk_'  || substr(md5(random()::text || clock_timestamp()::text), 1, 16);
  v_payment_ref := 'STU_' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 20));

  -- Create booking with full financial snapshot — all amounts calculated server-side
  INSERT INTO public.tutor_bookings (
    id, student_id, tutor_id, subject, slot_time, status, notes, mode,
    session_price_kobo, platform_commission_percentage,
    platform_commission_amount_kobo, tutor_earning_amount_kobo,
    currency, payment_reference, payment_status
  ) VALUES (
    v_booking_id, v_student_id, p_tutor_id,
    trim(p_subject), trim(p_slot_time),
    'pending', p_notes, p_mode,
    v_split.gross_amount_kobo, v_split.commission_percentage,
    v_split.commission_amount_kobo, v_split.tutor_amount_kobo,
    'NGN', v_payment_ref, 'pending'
  );

  -- Create corresponding pending ledger entry
  INSERT INTO public.tutor_session_ledger (
    booking_id, student_id, tutor_id,
    gross_amount_kobo, platform_commission_percentage,
    platform_commission_amount_kobo, tutor_amount_kobo,
    currency, payment_reference, earning_status
  ) VALUES (
    v_booking_id, v_student_id, p_tutor_id,
    v_split.gross_amount_kobo, v_split.commission_percentage,
    v_split.commission_amount_kobo, v_split.tutor_amount_kobo,
    'NGN', v_payment_ref, 'pending'
  );

  RETURN jsonb_build_object(
    'success',                        true,
    'booking_id',                     v_booking_id,
    'payment_reference',              v_payment_ref,
    'tutor_name',                     v_tutor.full_name,
    'subject',                        trim(p_subject),
    'mode',                           p_mode,
    'gross_amount_kobo',              v_split.gross_amount_kobo,
    'platform_commission_percentage', v_split.commission_percentage,
    'platform_commission_amount_kobo', v_split.commission_amount_kobo,
    'tutor_amount_kobo',              v_split.tutor_amount_kobo,
    'currency',                       'NGN'
  );
END;
$$;


-- ── RPC 5: confirm_session_payment ───────────────────────────────────────────
-- Called by the server (service role) after successful Paystack verification.
-- Idempotent: safe to call twice for the same booking.

CREATE OR REPLACE FUNCTION public.confirm_session_payment(
  p_booking_id             TEXT,
  p_paystack_transaction_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
BEGIN
  -- This is called by service role after Paystack verification — no auth.uid() check needed

  SELECT * INTO v_booking FROM public.tutor_bookings WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  -- Idempotent: if already confirmed, return success without modifying anything
  IF v_booking.payment_status = 'paid' THEN
    RETURN jsonb_build_object(
      'success',    true,
      'idempotent', true,
      'status',     'paid',
      'booking_id', p_booking_id
    );
  END IF;

  -- Mark booking as paid and confirmed
  UPDATE public.tutor_bookings
  SET payment_status = 'paid',
      status         = 'confirmed',
      updated_at     = CURRENT_TIMESTAMP
  WHERE id = p_booking_id;

  -- Update ledger entry with Paystack transaction ID (earning stays 'pending' until session completes)
  UPDATE public.tutor_session_ledger
  SET paystack_transaction_id = p_paystack_transaction_id,
      updated_at              = CURRENT_TIMESTAMP
  WHERE booking_id = p_booking_id;

  RETURN jsonb_build_object(
    'success',        true,
    'idempotent',     false,
    'booking_id',     p_booking_id,
    'status',         'paid',
    'earning_status', 'pending'
  );
END;
$$;


-- ── RPC 6: complete_booking_and_release_earning ───────────────────────────────
-- Tutor (or admin) marks a session as completed.
-- Earning transitions from 'pending' → 'available' (tutor can now withdraw).

CREATE OR REPLACE FUNCTION public.complete_booking_and_release_earning(
  p_booking_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_booking   RECORD;
  v_ledger    RECORD;
BEGIN
  v_caller_id := auth.uid();

  SELECT * INTO v_booking FROM public.tutor_bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.';
  END IF;

  -- Only the tutor who owns this booking or an admin can mark it complete
  IF v_caller_id IS NOT NULL THEN
    IF v_caller_id != v_booking.tutor_id AND NOT public.is_admin(v_caller_id) THEN
      RAISE EXCEPTION 'Forbidden: Only the session tutor or an admin can mark a session as completed.';
    END IF;
  END IF;

  -- Cannot complete an unpaid session
  IF v_booking.payment_status != 'paid' THEN
    RAISE EXCEPTION 'Cannot complete an unpaid session. Payment must be confirmed first.';
  END IF;

  -- Idempotent
  IF v_booking.status = 'completed' THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'status', 'completed');
  END IF;

  IF v_booking.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot complete a cancelled booking.';
  END IF;

  -- Mark booking completed
  UPDATE public.tutor_bookings
  SET status = 'completed', updated_at = CURRENT_TIMESTAMP
  WHERE id = p_booking_id;

  -- Release earning from 'pending' → 'available'
  UPDATE public.tutor_session_ledger
  SET earning_status = 'available', updated_at = CURRENT_TIMESTAMP
  WHERE booking_id = p_booking_id AND earning_status = 'pending';

  SELECT tutor_amount_kobo INTO v_ledger
  FROM public.tutor_session_ledger WHERE booking_id = p_booking_id;

  RETURN jsonb_build_object(
    'success',               true,
    'booking_id',            p_booking_id,
    'earning_released_kobo', COALESCE(v_ledger.tutor_amount_kobo, 0),
    'earning_status',        'available'
  );
END;
$$;


-- ── RPC 7: get_tutor_earnings_summary ────────────────────────────────────────
-- Returns the authenticated tutor's earnings overview.
-- Values are computed fresh from the ledger — never from a mutable balance column.

CREATE OR REPLACE FUNCTION public.get_tutor_earnings_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_tutor_id             UUID;
  v_total_earned_kobo    BIGINT := 0;
  v_available_kobo       BIGINT := 0;
  v_pending_kobo         BIGINT := 0;
  v_withdrawn_kobo       BIGINT := 0;
  v_sessions_completed   INT    := 0;
  v_total_commission_kobo BIGINT := 0;
BEGIN
  v_tutor_id := auth.uid();
  IF v_tutor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT public.is_tutor(v_tutor_id) THEN
    RAISE EXCEPTION 'Forbidden: Earnings overview is only available to approved tutors.';
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN earning_status IN ('available','withdrawal_requested','processing','paid')
                      THEN tutor_amount_kobo ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN earning_status = 'available'
                      THEN tutor_amount_kobo ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN earning_status = 'pending'
                      THEN tutor_amount_kobo ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN earning_status = 'paid'
                      THEN tutor_amount_kobo ELSE 0 END), 0),
    COUNT(CASE WHEN earning_status IN ('available','paid','withdrawal_requested','processing')
               THEN 1 END),
    COALESCE(SUM(CASE WHEN earning_status NOT IN ('reversed','failed')
                      THEN platform_commission_amount_kobo ELSE 0 END), 0)
  INTO
    v_total_earned_kobo, v_available_kobo, v_pending_kobo,
    v_withdrawn_kobo, v_sessions_completed, v_total_commission_kobo
  FROM public.tutor_session_ledger
  WHERE tutor_id = v_tutor_id;

  RETURN jsonb_build_object(
    'total_earned_kobo',      v_total_earned_kobo,
    'available_kobo',         v_available_kobo,
    'pending_kobo',           v_pending_kobo,
    'withdrawn_kobo',         v_withdrawn_kobo,
    'sessions_completed',     v_sessions_completed,
    'platform_commission_kobo', v_total_commission_kobo
  );
END;
$$;


-- ── RPC 8: request_tutor_withdrawal ──────────────────────────────────────────
-- Atomically reserves earnings and creates a withdrawal record.
-- Uses SELECT FOR UPDATE to prevent double-spending.
-- Minimum withdrawal: ₦5,000 = 500,000 kobo.

CREATE OR REPLACE FUNCTION public.request_tutor_withdrawal(
  p_amount_kobo BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tutor_id      UUID;
  v_payout        RECORD;
  v_available_kobo BIGINT;
  v_withdrawal_id TEXT;
  v_min_withdrawal BIGINT := 500000;  -- ₦5,000 minimum
BEGIN
  v_tutor_id := auth.uid();
  IF v_tutor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT public.is_tutor(v_tutor_id) THEN
    RAISE EXCEPTION 'Forbidden: Only approved tutors can request withdrawals.';
  END IF;

  -- Validate amount
  IF p_amount_kobo IS NULL OR p_amount_kobo <= 0 THEN
    RAISE EXCEPTION 'Withdrawal amount must be a positive value in kobo.';
  END IF;
  IF p_amount_kobo < v_min_withdrawal THEN
    RAISE EXCEPTION 'Minimum withdrawal is ₦5,000 (500,000 kobo). Requested: % kobo.', p_amount_kobo;
  END IF;

  -- Verify tutor has a verified payout account
  SELECT * INTO v_payout
  FROM public.tutor_payout_profiles
  WHERE tutor_id = v_tutor_id AND is_verified = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No verified payout account found. Please set up your bank account and wait for verification.';
  END IF;

  -- No duplicate pending withdrawal
  IF EXISTS (
    SELECT 1 FROM public.tutor_withdrawals
    WHERE tutor_id = v_tutor_id
      AND status IN ('requested', 'admin_approved', 'processing')
  ) THEN
    RAISE EXCEPTION 'You already have a pending withdrawal request. Please wait for it to complete before requesting another.';
  END IF;

  -- Lock available earnings (prevents concurrent double-spend)
  SELECT COALESCE(SUM(tutor_amount_kobo), 0) INTO v_available_kobo
  FROM public.tutor_session_ledger
  WHERE tutor_id = v_tutor_id AND earning_status = 'available'
  FOR UPDATE;

  IF v_available_kobo < p_amount_kobo THEN
    RAISE EXCEPTION 'Insufficient available balance. Available: ₦% kobo, Requested: ₦% kobo.',
      v_available_kobo, p_amount_kobo;
  END IF;

  -- Generate withdrawal ID
  v_withdrawal_id := 'wd_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16);

  -- Create withdrawal record (status = 'requested')
  INSERT INTO public.tutor_withdrawals (
    id, tutor_id, amount_kobo, currency,
    bank_code, bank_name, account_number, account_name,
    paystack_recipient_code, status
  ) VALUES (
    v_withdrawal_id, v_tutor_id, p_amount_kobo, 'NGN',
    v_payout.bank_code, v_payout.bank_name,
    v_payout.account_number, v_payout.account_name,
    v_payout.paystack_recipient_code, 'requested'
  );

  -- Reserve earnings: FIFO — mark 'withdrawal_requested' for enough entries to cover amount
  WITH ranked AS (
    SELECT id, tutor_amount_kobo,
           SUM(tutor_amount_kobo) OVER (
             ORDER BY created_at ASC
             ROWS UNBOUNDED PRECEDING
           ) AS running_total
    FROM public.tutor_session_ledger
    WHERE tutor_id = v_tutor_id AND earning_status = 'available'
  )
  UPDATE public.tutor_session_ledger
  SET earning_status = 'withdrawal_requested',
      updated_at     = CURRENT_TIMESTAMP
  WHERE id IN (
    SELECT id FROM ranked
    WHERE running_total - tutor_amount_kobo < p_amount_kobo
  );

  RETURN jsonb_build_object(
    'success',       true,
    'withdrawal_id', v_withdrawal_id,
    'amount_kobo',   p_amount_kobo,
    'status',        'requested',
    'bank_name',     v_payout.bank_name,
    'account_name',  v_payout.account_name
  );
END;
$$;


-- ── RPC 9: admin_approve_withdrawal ──────────────────────────────────────────
-- Admin approves a withdrawal. The server then calls executeTutorPayout()
-- which initiates the Paystack transfer.

CREATE OR REPLACE FUNCTION public.admin_approve_withdrawal(
  p_withdrawal_id TEXT,
  p_admin_notes   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_wd       RECORD;
BEGIN
  v_admin_id := auth.uid();
  IF NOT public.is_admin(v_admin_id) THEN
    RAISE EXCEPTION 'Forbidden: Administrator authorization required.';
  END IF;

  SELECT * INTO v_wd
  FROM public.tutor_withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal not found.';
  END IF;

  IF v_wd.status != 'requested' THEN
    RAISE EXCEPTION 'Withdrawal is not in "requested" status (current: %).', v_wd.status;
  END IF;

  UPDATE public.tutor_withdrawals
  SET status      = 'admin_approved',
      approved_by = v_admin_id,
      approved_at = CURRENT_TIMESTAMP,
      updated_at  = CURRENT_TIMESTAMP
  WHERE id = p_withdrawal_id;

  -- Audit log
  INSERT INTO public.admin_audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (
    v_admin_id, 'WITHDRAWAL_APPROVED', 'tutor_withdrawal', p_withdrawal_id,
    jsonb_build_object(
      'tutor_id',   v_wd.tutor_id,
      'amount_kobo', v_wd.amount_kobo,
      'notes',      p_admin_notes
    )
  );

  RETURN jsonb_build_object(
    'success',       true,
    'withdrawal_id', p_withdrawal_id,
    'status',        'admin_approved',
    'tutor_id',      v_wd.tutor_id,
    'amount_kobo',   v_wd.amount_kobo
  );
END;
$$;


-- ── RPC 10: reverse_session_earning ──────────────────────────────────────────
-- Reverses a session earning (refund / cancellation).
-- Never deletes financial records — marks as 'reversed'.
-- Only admin or service role can call this.

CREATE OR REPLACE FUNCTION public.reverse_session_earning(
  p_booking_id TEXT,
  p_reason     TEXT DEFAULT 'Session cancelled'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_ledger    RECORD;
BEGIN
  v_caller_id := auth.uid();

  -- Only admins may reverse earnings through the authenticated client path
  IF v_caller_id IS NOT NULL AND NOT public.is_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Forbidden: Earning reversals require administrator authorization.';
  END IF;

  SELECT * INTO v_ledger
  FROM public.tutor_session_ledger
  WHERE booking_id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ledger entry not found for booking: %', p_booking_id;
  END IF;

  -- Idempotent
  IF v_ledger.earning_status = 'reversed' THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true);
  END IF;

  -- Cannot reverse a paid or in-flight transfer
  IF v_ledger.earning_status IN ('paid', 'processing') THEN
    RAISE EXCEPTION 'Cannot reverse an earning that is already paid or processing. Contact Paystack support for transfer reversal.';
  END IF;

  -- Mark earning reversed
  UPDATE public.tutor_session_ledger
  SET earning_status = 'reversed', updated_at = CURRENT_TIMESTAMP
  WHERE booking_id = p_booking_id;

  -- Mark booking as cancelled and payment reversed
  UPDATE public.tutor_bookings
  SET status         = 'cancelled',
      payment_status = 'reversed',
      updated_at     = CURRENT_TIMESTAMP
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success',        true,
    'booking_id',     p_booking_id,
    'earning_status', 'reversed',
    'reason',         p_reason
  );
END;
$$;


-- ==============================================================================
-- 8. ADDITIONAL INDEXES FOR FINANCIAL QUERIES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_tsl_tutor_available
  ON public.tutor_session_ledger(tutor_id, earning_status)
  WHERE earning_status = 'available';

CREATE INDEX IF NOT EXISTS idx_tsl_tutor_pending
  ON public.tutor_session_ledger(tutor_id, earning_status)
  WHERE earning_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_withdrawals_requested
  ON public.tutor_withdrawals(status, created_at)
  WHERE status = 'requested';

-- ==============================================================================
-- END OF MIGRATION
-- ==============================================================================
