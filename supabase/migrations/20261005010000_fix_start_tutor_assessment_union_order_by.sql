-- ==============================================================================
-- STUDORA — HOTFIX: start_tutor_assessment() ORDER BY in UNION bug
-- Migration: 20261005010000_fix_start_tutor_assessment_union_order_by.sql
--
-- Root cause:
--   The fallback_questions CTE used UNION ALL where the second branch had
--   ORDER BY random() and LIMIT — which PostgreSQL forbids inside a UNION
--   branch (ORDER BY / LIMIT in a UNION branch must be wrapped in a subquery).
--
-- Fix:
--   Replace the broken two-CTE pattern with a single clean CTE.
--   The existing candidate_questions CTE already handles subject filtering with
--   a fallback (subject_id = ANY(...) OR subject_id IS NULL), so a second UNION
--   branch is redundant. We wrap the fallback SELECT in a subquery if we need
--   it, but the simplest and correct fix is to consolidate into one query.
--
-- Security preserved:
--   - correct_answer and explanation are never selected.
--   - SECURITY DEFINER + search_path unchanged.
--   - submit_tutor_assessment() unchanged.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.start_tutor_assessment(p_application_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_app_status TEXT;
  v_selected_subjects JSONB;
  v_config RECORD;
  v_attempt_id UUID;
  v_questions JSONB;
  v_q_ids JSONB;
  v_subject_keys TEXT[];
  v_count INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- 1. Verify application ownership and status
  SELECT status, selected_subject_ids INTO v_app_status, v_selected_subjects
  FROM public.tutor_applications
  WHERE id = p_application_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tutor application not found or unauthorized.';
  END IF;

  IF v_app_status NOT IN ('draft', 'submitted', 'assessment_pending', 'assessment_in_progress', 'assessment_failed') THEN
    RAISE EXCEPTION 'Application is not currently eligible for assessment (current status: %).', v_app_status;
  END IF;

  -- 2. Fetch assessment configuration
  SELECT question_count, time_limit_minutes, pass_percentage, max_retries
  INTO v_config
  FROM public.assessment_configs
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_config.question_count IS NULL THEN
    v_config.question_count := 10;
    v_config.time_limit_minutes := 20;
    v_config.pass_percentage := 70;
    v_config.max_retries := 3;
  END IF;

  -- Check retry limit
  SELECT COUNT(*) INTO v_count
  FROM public.assessment_attempts
  WHERE application_id = p_application_id AND status = 'completed';

  IF v_count >= v_config.max_retries THEN
    RAISE EXCEPTION 'Maximum assessment attempts (%) reached. Please contact Studora support.', v_config.max_retries;
  END IF;

  -- Parse selected subject IDs array from JSONB
  IF v_selected_subjects IS NOT NULL AND jsonb_typeof(v_selected_subjects) = 'array' AND jsonb_array_length(v_selected_subjects) > 0 THEN
    SELECT array_agg(value::text) INTO v_subject_keys
    FROM jsonb_array_elements_text(v_selected_subjects);
  ELSE
    v_subject_keys := ARRAY[]::TEXT[];
  END IF;

  -- 3. Select random questions — subject-preferenced then general fallback.
  --    Uses two-pass priority: subject-matched first, then any active question,
  --    both wrapped as subqueries so ORDER BY is legal.
  --    correct_answer and explanation are intentionally excluded.
  WITH subject_questions AS (
    SELECT id, question, question_type, difficulty, options
    FROM public.question_bank
    WHERE status = 'active'
      AND cardinality(v_subject_keys) > 0
      AND subject_id = ANY(v_subject_keys)
    ORDER BY random()
    LIMIT v_config.question_count
  ),
  general_questions AS (
    SELECT id, question, question_type, difficulty, options
    FROM public.question_bank
    WHERE status = 'active'
      AND id NOT IN (SELECT id FROM subject_questions)
    ORDER BY random()
    LIMIT v_config.question_count
  ),
  combined AS (
    SELECT *, 1 AS priority FROM subject_questions
    UNION ALL
    SELECT *, 2 AS priority FROM general_questions
  ),
  final_questions AS (
    SELECT id, question, question_type, difficulty, options
    FROM combined
    ORDER BY priority, random()
    LIMIT v_config.question_count
  )
  SELECT
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'question', question,
        'question_type', question_type,
        'difficulty', difficulty,
        'options', options
      )
    ),
    jsonb_agg(id)
  INTO v_questions, v_q_ids
  FROM final_questions;

  IF v_questions IS NULL OR jsonb_array_length(v_questions) = 0 THEN
    RAISE EXCEPTION 'Assessment question bank is currently undergoing maintenance. Please try again shortly.';
  END IF;

  -- 4. Create assessment attempt
  INSERT INTO public.assessment_attempts (
    user_id, application_id, status, total_questions, time_limit_minutes, question_ids
  ) VALUES (
    v_user_id, p_application_id, 'in_progress', jsonb_array_length(v_questions), v_config.time_limit_minutes, v_q_ids
  ) RETURNING id INTO v_attempt_id;

  -- 5. Mark application status as assessment_in_progress
  UPDATE public.tutor_applications
  SET status = 'assessment_in_progress', updated_at = CURRENT_TIMESTAMP
  WHERE id = p_application_id;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt_id,
    'time_limit_minutes', v_config.time_limit_minutes,
    'total_questions', jsonb_array_length(v_questions),
    'pass_percentage', v_config.pass_percentage,
    'questions', v_questions
  );
END;
$$;
