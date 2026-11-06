-- STUDORA — APPROVED TUTOR WORKFLOW, ZERO-ACTIVITY INITIAL STATE,
-- BOOKING & SESSION LIFECYCLE MANAGEMENT, TRUSTWORTHY RATINGS & REVIEWS
-- Migration: 20261106211500_tutor_dashboard_activation_and_lifecycle.sql

-- ==============================================================================
-- 1. FIX INITIAL TUTOR PROFILE METRICS (ZERO ACTIVITY ENFORCEMENT)
-- ==============================================================================

-- When a tutor profile is created, rating and review_count must start at genuine zero:
-- rating = NULL (or 0.0), review_count = 0.
-- Existing schema had DEFAULT 5.0 on rating. Alter default to NULL.
ALTER TABLE public.tutor_profiles ALTER COLUMN rating DROP DEFAULT;
ALTER TABLE public.tutor_profiles ALTER COLUMN rating DROP NOT NULL;
ALTER TABLE public.tutor_profiles ALTER COLUMN rating SET DEFAULT NULL;
ALTER TABLE public.tutor_profiles ALTER COLUMN review_count SET DEFAULT 0;

-- Ensure any existing tutor profile that has 0 reviews doesn't display a fake 5.0
UPDATE public.tutor_profiles
SET rating = NULL
WHERE review_count = 0 OR review_count IS NULL;

-- Fix public.admin_review_tutor_application to:
--  1. Verify assessment was actually passed before approving!
--  2. Explicitly initialize rating = NULL, review_count = 0, session_price_kobo = NULL.
CREATE OR REPLACE FUNCTION public.admin_review_tutor_application(
  p_application_id UUID,
  p_decision TEXT, -- 'approve' or 'reject'
  p_rejection_reason TEXT DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_app RECORD;
  v_subj_id TEXT;
BEGIN
  v_admin_id := auth.uid();
  IF NOT public.is_admin(v_admin_id) THEN
    RAISE EXCEPTION 'Forbidden: Administrator authorization required.';
  END IF;

  SELECT * INTO v_app
  FROM public.tutor_applications
  WHERE id = p_application_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tutor application not found.';
  END IF;

  IF p_decision = 'approve' THEN
    -- Strict eligibility check: applicant must have passed the tutor assessment!
    IF v_app.status != 'passed' AND COALESCE(v_app.assessment_passed, false) IS NOT TRUE THEN
      RAISE EXCEPTION 'Forbidden: Only applicants who have completed and passed the tutor assessment can be approved. Current status: %', v_app.status;
    END IF;

    -- 1. Update application record
    UPDATE public.tutor_applications
    SET status = 'approved',
        reviewed_at = CURRENT_TIMESTAMP,
        reviewed_by = v_admin_id,
        admin_notes = p_admin_notes,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_application_id;

    -- 2. Upgrade user profile role to 'tutor'
    UPDATE public.profiles
    SET role = 'tutor',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_app.user_id;

    -- 3. Upsert into tutor_profiles with genuine zero-activity metrics
    INSERT INTO public.tutor_profiles (
      id, title, bio, teaching_approach, institution, department, academic_level,
      rating, review_count, hourly_rate, session_price_kobo,
      is_verified, is_active, is_visible, approved_at, approved_by, application_id
    ) VALUES (
      v_app.user_id,
      'Studora Verified Tutor',
      COALESCE(v_app.bio, 'Studora peer academic tutor.'),
      v_app.teaching_approach,
      v_app.institution,
      v_app.department,
      v_app.academic_level,
      NULL, 0, 0, NULL,
      true, true, true, CURRENT_TIMESTAMP, v_admin_id, p_application_id
    )
    ON CONFLICT (id) DO UPDATE SET
      title = 'Studora Verified Tutor',
      bio = COALESCE(EXCLUDED.bio, tutor_profiles.bio),
      teaching_approach = COALESCE(EXCLUDED.teaching_approach, tutor_profiles.teaching_approach),
      institution = COALESCE(EXCLUDED.institution, tutor_profiles.institution),
      department = COALESCE(EXCLUDED.department, tutor_profiles.department),
      academic_level = COALESCE(EXCLUDED.academic_level, tutor_profiles.academic_level),
      is_verified = true,
      is_active = true,
      is_visible = true,
      approved_at = CURRENT_TIMESTAMP,
      approved_by = v_admin_id,
      application_id = p_application_id,
      updated_at = CURRENT_TIMESTAMP;

    -- 4. Sync tutor subjects
    IF v_app.selected_subject_ids IS NOT NULL AND jsonb_typeof(v_app.selected_subject_ids) = 'array' THEN
      FOR v_subj_id IN SELECT jsonb_array_elements_text(v_app.selected_subject_ids)
      LOOP
        INSERT INTO public.tutor_subjects (tutor_id, subject_id, proficiency_level)
        VALUES (v_app.user_id, v_subj_id, 'advanced')
        ON CONFLICT (tutor_id, subject_id) DO NOTHING;
      END LOOP;
    END IF;

    -- 5. Audit log
    INSERT INTO public.admin_audit_logs (
      actor_id, action, target_type, target_id, metadata
    ) VALUES (
      v_admin_id, 'TUTOR_APPROVED', 'tutor_application', p_application_id::text,
      jsonb_build_object('applicant_id', v_app.user_id, 'notes', p_admin_notes)
    );

    RETURN jsonb_build_object('success', true, 'status', 'approved', 'tutor_id', v_app.user_id);

  ELSIF p_decision = 'reject' THEN
    -- 1. Update application record
    UPDATE public.tutor_applications
    SET status = 'rejected',
        rejection_reason = p_rejection_reason,
        reviewed_at = CURRENT_TIMESTAMP,
        reviewed_by = v_admin_id,
        admin_notes = p_admin_notes,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_application_id;

    -- 2. Audit log
    INSERT INTO public.admin_audit_logs (
      actor_id, action, target_type, target_id, metadata
    ) VALUES (
      v_admin_id, 'TUTOR_REJECTED', 'tutor_application', p_application_id::text,
      jsonb_build_object('applicant_id', v_app.user_id, 'reason', p_rejection_reason, 'notes', p_admin_notes)
    );

    RETURN jsonb_build_object('success', true, 'status', 'rejected', 'applicant_id', v_app.user_id);
  ELSE
    RAISE EXCEPTION 'Invalid review decision (must be approve or reject).';
  END IF;
END;
$$;


-- ==============================================================================
-- 2. BOOKING STATUS TRANSITIONS & RPC
-- ==============================================================================

-- RPC: tutor_respond_booking
-- Allows the tutor assigned to a booking to accept or reject it.
-- Validates:
--  - Caller is the tutor of the booking (or admin)
--  - Booking must be in 'pending' status
--  - p_action must be 'accept' or 'reject'
-- Note: 'accept' marks status = 'confirmed'. 'reject' marks status = 'cancelled'.
CREATE OR REPLACE FUNCTION public.tutor_respond_booking(
  p_booking_id TEXT,
  p_action TEXT, -- 'accept' or 'reject'
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_booking RECORD;
  v_new_status TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT * INTO v_booking
  FROM public.tutor_bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.';
  END IF;

  IF v_booking.tutor_id != v_caller_id AND NOT public.is_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Forbidden: You are not authorized to respond to this booking.';
  END IF;

  IF v_booking.status != 'pending' THEN
    RAISE EXCEPTION 'Booking is already % and cannot be responded to.', v_booking.status;
  END IF;

  IF p_action = 'accept' THEN
    v_new_status := 'confirmed';
  ELSIF p_action = 'reject' THEN
    v_new_status := 'cancelled';
  ELSE
    RAISE EXCEPTION 'Invalid action. Must be accept or reject.';
  END IF;

  UPDATE public.tutor_bookings
  SET status = v_new_status,
      notes = CASE
        WHEN p_reason IS NOT NULL AND p_reason != '' THEN COALESCE(notes || E'\n', '') || 'Response: ' || p_reason
        ELSE notes
      END,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'status', v_new_status
  );
END;
$$;


-- ==============================================================================
-- 3. TRUSTWORTHY RATINGS & REVIEWS RPC & TRIGGER
-- ==============================================================================

-- Ensure tutor_reviews has unique constraint on booking_id so one session cannot be reviewed twice
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_tutor_reviews_booking_id'
  ) THEN
    ALTER TABLE public.tutor_reviews ADD CONSTRAINT uq_tutor_reviews_booking_id UNIQUE (booking_id);
  END IF;
END $$;

-- RPC: submit_tutor_review
-- Requirements:
--  - Only student who participated in an eligible, completed booking/session can review
--  - Validates rating between 1 and 5
--  - Prevents duplicate review for same booking
--  - Automatically recalculates and updates tutor_profiles rating and review_count
CREATE OR REPLACE FUNCTION public.submit_tutor_review(
  p_booking_id TEXT,
  p_rating INT,
  p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_booking RECORD;
  v_review_id TEXT;
  v_avg_rating NUMERIC(3,2);
  v_count INT;
BEGIN
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be an integer between 1 and 5.';
  END IF;

  SELECT * INTO v_booking
  FROM public.tutor_bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking record not found.';
  END IF;

  IF v_booking.student_id != v_student_id THEN
    RAISE EXCEPTION 'Forbidden: You can only review tutoring sessions you attended.';
  END IF;

  -- Eligibility requirement: session MUST be completed!
  IF v_booking.status != 'completed' THEN
    RAISE EXCEPTION 'Only completed tutoring sessions can be reviewed.';
  END IF;

  -- Check for existing review on this booking
  IF EXISTS (SELECT 1 FROM public.tutor_reviews WHERE booking_id = p_booking_id) THEN
    RAISE EXCEPTION 'A review has already been submitted for this session.';
  END IF;

  v_review_id := 'rev_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16);

  INSERT INTO public.tutor_reviews (
    id, tutor_id, student_id, booking_id, rating, comment, is_published, created_at
  ) VALUES (
    v_review_id, v_booking.tutor_id, v_student_id, p_booking_id, p_rating, trim(p_comment), true, CURRENT_TIMESTAMP
  );

  -- Authoritatively recompute tutor's average rating and review count from real records
  SELECT
    ROUND(AVG(rating)::numeric, 2),
    COUNT(*)::int
  INTO
    v_avg_rating,
    v_count
  FROM public.tutor_reviews
  WHERE tutor_id = v_booking.tutor_id AND is_published = true;

  UPDATE public.tutor_profiles
  SET rating = v_avg_rating,
      review_count = v_count,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = v_booking.tutor_id;

  RETURN jsonb_build_object(
    'success', true,
    'review_id', v_review_id,
    'rating', v_avg_rating,
    'review_count', v_count
  );
END;
$$;


-- ==============================================================================
-- 4. TUTOR DASHBOARD COMPREHENSIVE OVERVIEW STATS RPC
-- ==============================================================================

-- RPC: get_tutor_dashboard_overview
-- Computes real, genuine metrics for the authenticated tutor:
--  - total_students (distinct students from confirmed/completed bookings)
--  - total_bookings
--  - pending_bookings
--  - accepted_bookings (confirmed)
--  - completed_sessions
--  - rating (tutor_profiles.rating or NULL)
--  - review_count
--  - total_earned_kobo (from ledger)
--  - available_kobo (from ledger)
--  - pending_kobo (from ledger)
CREATE OR REPLACE FUNCTION public.get_tutor_dashboard_overview()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_tutor_id UUID;
  v_total_students INT := 0;
  v_total_bookings INT := 0;
  v_pending_bookings INT := 0;
  v_accepted_bookings INT := 0;
  v_completed_sessions INT := 0;
  v_rating NUMERIC(3,2) := NULL;
  v_review_count INT := 0;
  v_total_earned_kobo BIGINT := 0;
  v_available_kobo BIGINT := 0;
  v_pending_kobo BIGINT := 0;
  v_withdrawn_kobo BIGINT := 0;
  v_session_price_kobo BIGINT := NULL;
  v_is_verified BOOLEAN := false;
  v_is_active BOOLEAN := false;
BEGIN
  v_tutor_id := auth.uid();
  IF v_tutor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT public.is_tutor(v_tutor_id) THEN
    RAISE EXCEPTION 'Forbidden: Tutor dashboard overview is only accessible to approved tutors.';
  END IF;

  -- 1. Fetch tutor profile info
  SELECT
    rating, review_count, session_price_kobo, is_verified, is_active
  INTO
    v_rating, v_review_count, v_session_price_kobo, v_is_verified, v_is_active
  FROM public.tutor_profiles
  WHERE id = v_tutor_id;

  -- 2. Count distinct students and booking counts from tutor_bookings
  SELECT
    COUNT(DISTINCT student_id),
    COUNT(*),
    COUNT(CASE WHEN status = 'pending' THEN 1 END),
    COUNT(CASE WHEN status = 'confirmed' THEN 1 END),
    COUNT(CASE WHEN status = 'completed' THEN 1 END)
  INTO
    v_total_students,
    v_total_bookings,
    v_pending_bookings,
    v_accepted_bookings,
    v_completed_sessions
  FROM public.tutor_bookings
  WHERE tutor_id = v_tutor_id;

  -- 3. Earnings from authoritative ledger
  SELECT
    COALESCE(SUM(CASE WHEN earning_status IN ('available','withdrawal_requested','processing','paid') THEN tutor_amount_kobo ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN earning_status = 'available' THEN tutor_amount_kobo ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN earning_status = 'pending' THEN tutor_amount_kobo ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN earning_status = 'paid' THEN tutor_amount_kobo ELSE 0 END), 0)
  INTO
    v_total_earned_kobo,
    v_available_kobo,
    v_pending_kobo,
    v_withdrawn_kobo
  FROM public.tutor_session_ledger
  WHERE tutor_id = v_tutor_id;

  RETURN jsonb_build_object(
    'total_students', v_total_students,
    'total_bookings', v_total_bookings,
    'pending_bookings', v_pending_bookings,
    'accepted_bookings', v_accepted_bookings,
    'completed_sessions', v_completed_sessions,
    'rating', v_rating,
    'review_count', COALESCE(v_review_count, 0),
    'total_earned_kobo', v_total_earned_kobo,
    'available_kobo', v_available_kobo,
    'pending_kobo', v_pending_kobo,
    'withdrawn_kobo', v_withdrawn_kobo,
    'session_price_kobo', v_session_price_kobo,
    'is_verified', v_is_verified,
    'is_active', v_is_active
  );
END;
$$;
-- Add DELETE policy for admins and participants if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tutor_bookings' AND policyname = 'Admins can delete bookings'
  ) THEN
    CREATE POLICY "Admins can delete bookings" ON public.tutor_bookings
      FOR DELETE USING (public.is_admin(auth.uid()));
  END IF;
END $$;
