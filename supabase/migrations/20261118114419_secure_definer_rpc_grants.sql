-- Prevent a caller from probing another account's role with the helper RPCs.
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
     AND auth.uid() = user_id
     AND EXISTS (
       SELECT 1 FROM public.profiles AS p
       WHERE p.id = user_id AND p.role = 'admin'
     );
$$;

CREATE OR REPLACE FUNCTION public.is_tutor(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
     AND auth.uid() = user_id
     AND EXISTS (
       SELECT 1 FROM public.profiles AS p
       WHERE p.id = user_id AND p.role = 'tutor'
     );
$$;

-- Email confirmation must be performed by Supabase Auth's configured flow.
-- The old trigger marked every new email as confirmed without verification.
DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;
ALTER FUNCTION public.auto_confirm_user() SET search_path = '';

-- Trigger-only functions are not RPC endpoints. The trigger remains attached
-- where needed; execute privileges are not required to fire it.
ALTER FUNCTION public.protect_profile_role() SET search_path = '';
ALTER FUNCTION public.protect_tutor_application_state() SET search_path = '';

DO $$
DECLARE
  v_function RECORD;
BEGIN
  FOR v_function IN
    SELECT p.oid::REGPROCEDURE AS signature
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
  LOOP
    EXECUTE pg_catalog.format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      v_function.signature
    );
  END LOOP;
END;
$$;

-- Authorization helpers are used by RLS policies, including public tutor
-- profile reads. They now return true only for the caller's own identity.
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_tutor(UUID) TO anon, authenticated;

-- Authenticated, ownership-checking application RPCs.
GRANT EXECUTE ON FUNCTION public.admin_approve_withdrawal(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_tutor_application(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_tutor_suspension(UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_booking_and_release_earning(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tutor_dashboard_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tutor_earnings_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_booking_payment(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_tutor_withdrawal(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_tutor_session_price(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_tutor_assessment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_tutor_assessment(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_tutor_review(TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tutor_respond_booking(TEXT, TEXT, TEXT) TO authenticated;

-- Server-only financial state transitions. In particular, anonymous callers
-- must not be able to confirm payment or reverse a tutor earning.
GRANT EXECUTE ON FUNCTION public.confirm_session_payment(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.reverse_session_earning(TEXT, TEXT) TO service_role;

-- These functions are invoked by database triggers/event triggers only.
REVOKE EXECUTE ON FUNCTION public.auto_confirm_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_email_preferences() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_tutor_application_state() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_payout_profile_verification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_ledger_immutable_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_withdrawal_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
