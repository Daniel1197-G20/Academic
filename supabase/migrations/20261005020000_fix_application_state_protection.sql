-- ==============================================================================
-- STUDORA — SECURITY FIX: protect_tutor_application_state() whitelist
-- Migration: 20261005020000_fix_application_state_protection.sql
--
-- Defect (Phase 5.1 Runtime Verification — LIVE CONFIRMED):
--   The trigger protect_tutor_application_state() blocked only
--   status IN ('approved', 'rejected', 'suspended'). Students could
--   directly UPDATE status to 'pending_review', 'assessment_passed',
--   or 'submitted' — bypassing the assessment engine entirely.
--
-- Fix:
--   Replace the blocking list with a strict whitelist of status values
--   students are permitted to set via direct UPDATE.
--
--   Student-writable status transitions (direct DB update):
--     draft → draft       (in-progress saves)
--     draft → withdrawn   (applicant withdrawal)
--
--   All other status values MUST be set exclusively by:
--     - start_tutor_assessment()  SECURITY DEFINER RPC
--     - submit_tutor_assessment() SECURITY DEFINER RPC
--     - admin_review_tutor_application() SECURITY DEFINER RPC
--     - admin_set_tutor_suspension()     SECURITY DEFINER RPC
--
-- Security properties preserved:
--   - SECURITY DEFINER RPCs bypass this trigger (they run as postgres/admin)
--   - Admin users bypass via is_admin() check (unchanged)
--   - No RLS weakened
--   - No assessment answer protection changed
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.protect_tutor_application_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_adm BOOLEAN;
  -- Statuses a student may set via direct UPDATE (whitelist)
  -- All other status values are exclusively managed by SECURITY DEFINER RPCs.
  STUDENT_WRITABLE_STATUSES CONSTANT TEXT[] := ARRAY['draft', 'withdrawn'];
BEGIN
  v_is_adm := public.is_admin(auth.uid());

  -- Non-admin authenticated users (students / applicants)
  IF (auth.role() = 'authenticated' OR current_setting('role', true) = 'authenticated')
     AND NOT v_is_adm
  THEN
    -- Block any status change to a value not in the student-writable whitelist
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT (NEW.status = ANY(STUDENT_WRITABLE_STATUSES))
    THEN
      RAISE EXCEPTION
        'Forbidden: Application status "%" can only be set by the Studora assessment engine or an administrator.',
        NEW.status;
    END IF;

    -- Students cannot also change status back from a terminal/advanced state
    -- to a draft/early state (prevents resetting a rejected/assessed application)
    IF NEW.status IS DISTINCT FROM OLD.status
       AND OLD.status NOT IN ('draft')
       AND NEW.status = 'withdrawn'
    THEN
      -- Allow withdrawn from any non-approved state
      -- (students can always withdraw their own application)
      NULL;
    ELSIF NEW.status IS DISTINCT FROM OLD.status
       AND OLD.status IN (
           'submitted', 'assessment_pending', 'assessment_in_progress',
           'assessment_failed', 'assessment_passed', 'pending_review',
           'approved', 'rejected', 'suspended'
         )
       AND NEW.status != 'withdrawn'
    THEN
      RAISE EXCEPTION
        'Forbidden: Cannot revert application from status "%" to "%".',
        OLD.status, NEW.status;
    END IF;

    -- Students cannot fabricate assessment results
    IF (NEW.assessment_score IS DISTINCT FROM OLD.assessment_score
        OR NEW.assessment_passed IS DISTINCT FROM OLD.assessment_passed)
    THEN
      RAISE EXCEPTION
        'Forbidden: Assessment scoring must be performed by the secure assessment engine.';
    END IF;

    -- Students cannot modify admin-only audit fields
    IF NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
       OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
    THEN
      RAISE EXCEPTION
        'Forbidden: Administrative audit fields cannot be modified by students.';
    END IF;
  END IF;

  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Re-attach trigger (it already exists; DROP + CREATE ensures the new function body is live)
DROP TRIGGER IF EXISTS trg_protect_tutor_application ON public.tutor_applications;

CREATE TRIGGER trg_protect_tutor_application
BEFORE UPDATE ON public.tutor_applications
FOR EACH ROW
EXECUTE FUNCTION public.protect_tutor_application_state();
