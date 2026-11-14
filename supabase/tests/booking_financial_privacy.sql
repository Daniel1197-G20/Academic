-- Run after migrations with `supabase test db`. These checks validate grants
-- and policies; they do not require or modify booking records.
BEGIN;

DO $$
BEGIN
  IF has_column_privilege(
    'authenticated', 'public.tutor_bookings', 'platform_commission_percentage', 'SELECT'
  ) THEN
    RAISE EXCEPTION 'authenticated can read tutor_bookings.platform_commission_percentage';
  END IF;
  IF has_column_privilege(
    'authenticated', 'public.tutor_bookings', 'platform_commission_amount_kobo', 'SELECT'
  ) THEN
    RAISE EXCEPTION 'authenticated can read tutor_bookings.platform_commission_amount_kobo';
  END IF;
  IF has_column_privilege(
    'authenticated', 'public.tutor_bookings', 'tutor_earning_amount_kobo', 'SELECT'
  ) THEN
    RAISE EXCEPTION 'authenticated can read tutor_bookings.tutor_earning_amount_kobo';
  END IF;
  IF NOT has_column_privilege(
    'authenticated', 'public.tutor_bookings', 'session_price_kobo', 'SELECT'
  ) THEN
    RAISE EXCEPTION 'authenticated cannot read the tutor-controlled session price';
  END IF;
  IF has_function_privilege('authenticated', 'public.calculate_session_split(bigint)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can directly execute calculate_session_split';
  END IF;
  IF has_function_privilege('authenticated', 'public.get_platform_commission()', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can directly execute get_platform_commission';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tutor_session_ledger'
      AND policyname = 'Students can view own session ledger entries'
  ) THEN
    RAISE EXCEPTION 'the student-owned financial ledger read policy still exists';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tutor_session_ledger'
      AND policyname = 'Tutors can view own earnings ledger'
      AND qual LIKE '%is_admin%'
  ) THEN
    RAISE EXCEPTION 'the tutor/admin ledger policy is missing';
  END IF;
END;
$$;

ROLLBACK;
