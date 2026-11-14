-- Keep booking price/payment access available to authenticated participants,
-- while withholding platform and tutor split fields from client roles.
REVOKE SELECT ON TABLE public.tutor_bookings FROM anon, authenticated;
REVOKE SELECT (
  platform_commission_percentage,
  platform_commission_amount_kobo,
  tutor_earning_amount_kobo
) ON TABLE public.tutor_bookings FROM anon, authenticated;

GRANT SELECT (
  id,
  student_id,
  tutor_id,
  subject,
  slot_time,
  status,
  notes,
  created_at,
  updated_at,
  session_price_kobo,
  currency,
  payment_reference,
  payment_status,
  mode
) ON TABLE public.tutor_bookings TO authenticated;

-- A student does not need a direct read path to the financial ledger. Admins
-- retain access through the existing admin policy; tutors retain their own
-- earnings ledger policy.
DROP POLICY IF EXISTS "Students can view own session ledger entries"
  ON public.tutor_session_ledger;

-- Internal split helpers are implementation details of security-definer RPCs.
-- Do not expose them as callable Data API functions.
REVOKE EXECUTE ON FUNCTION public.get_platform_commission()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_session_split(BIGINT)
  FROM PUBLIC, anon, authenticated;

-- Setting a tutor price remains available to the authenticated tutor, but its
-- RPC response contains only the tutor's own price (never the internal split).
CREATE OR REPLACE FUNCTION public.set_tutor_session_price(p_price_kobo BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tutor_id UUID;
BEGIN
  v_tutor_id := auth.uid();
  IF v_tutor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT public.is_tutor(v_tutor_id) THEN
    RAISE EXCEPTION 'Forbidden: Only approved tutors can set a session price.';
  END IF;

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

  RETURN jsonb_build_object('success', true, 'session_price_kobo', p_price_kobo);
END;
$$;

-- The RPC remains callable for the server-side payment initialization flow.
-- Its result includes the authoritative gross amount, but never split details.
CREATE OR REPLACE FUNCTION public.initialize_booking_payment(
  p_tutor_id UUID,
  p_subject TEXT,
  p_slot_time TEXT,
  p_mode TEXT DEFAULT 'virtual',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_tutor RECORD;
  v_split RECORD;
  v_booking_id TEXT;
  v_payment_ref TEXT;
BEGIN
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;
  IF v_student_id = p_tutor_id THEN
    RAISE EXCEPTION 'You cannot book a session with yourself.';
  END IF;
  IF p_mode NOT IN ('virtual', 'physical') THEN
    RAISE EXCEPTION 'Invalid session mode. Must be "virtual" or "physical".';
  END IF;
  IF p_subject IS NULL OR trim(p_subject) = '' THEN
    RAISE EXCEPTION 'Subject is required.';
  END IF;
  IF p_slot_time IS NULL OR trim(p_slot_time) = '' THEN
    RAISE EXCEPTION 'Session time is required.';
  END IF;

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

  SELECT * INTO v_split
  FROM public.calculate_session_split(v_tutor.session_price_kobo);

  v_booking_id := 'bk_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16);
  v_payment_ref := 'STU_' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 20));

  INSERT INTO public.tutor_bookings (
    id, student_id, tutor_id, subject, slot_time, status, notes, mode,
    session_price_kobo, platform_commission_percentage,
    platform_commission_amount_kobo, tutor_earning_amount_kobo,
    currency, payment_reference, payment_status
  ) VALUES (
    v_booking_id, v_student_id, p_tutor_id, trim(p_subject), trim(p_slot_time),
    'pending', p_notes, p_mode, v_split.gross_amount_kobo,
    v_split.commission_percentage, v_split.commission_amount_kobo,
    v_split.tutor_amount_kobo, 'NGN', v_payment_ref, 'pending'
  );

  INSERT INTO public.tutor_session_ledger (
    booking_id, student_id, tutor_id, gross_amount_kobo,
    platform_commission_percentage, platform_commission_amount_kobo,
    tutor_amount_kobo, currency, payment_reference, earning_status
  ) VALUES (
    v_booking_id, v_student_id, p_tutor_id, v_split.gross_amount_kobo,
    v_split.commission_percentage, v_split.commission_amount_kobo,
    v_split.tutor_amount_kobo, 'NGN', v_payment_ref, 'pending'
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'payment_reference', v_payment_ref,
    'tutor_name', v_tutor.full_name,
    'subject', trim(p_subject),
    'mode', p_mode,
    'gross_amount_kobo', v_split.gross_amount_kobo,
    'currency', 'NGN'
  );
END;
$$;
