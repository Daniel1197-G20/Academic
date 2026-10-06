-- ==============================================================================
-- STUDORA — PHASE 5.5: STRICT SUBJECT-BASED TUTOR ASSESSMENT
-- Migration: 20261005030000_phase55_strict_subject_assessment.sql
--
-- Changes:
--   1. Add missing marketplace subjects (Software Engineering, Cybersecurity,
--      English, Mass Communication, Nursing). Existing subjects are preserved.
--   2. Replace start_tutor_assessment() with a strict subject-only version:
--      - Removes general_questions fallback (no unrelated questions ever served)
--      - Adds mandatory subject selection guard
--      - Adds pre-flight available-question count check with clear exception
--      - Proportional allocation across selected subjects via normalised rank
--      - Exact question_count questions returned when pool is sufficient
--      - correct_answer and explanation remain excluded
--      - submit_tutor_assessment(), scoring, RLS, and assessment_configs unchanged
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- 1. SUBJECTS — add marketplace subjects, preserve all existing IDs/rows
-- ---------------------------------------------------------------------------
INSERT INTO public.subjects (id, name, code, description, category, display_order, is_active)
VALUES
  ('subj_se',       'Software Engineering',  'SE',       'Software design, architecture, SDLC, testing, and DevOps practices',      'Engineering & Tech',  6,  true),
  ('subj_cyber',    'Cybersecurity',         'CYBER',    'Network security, ethical hacking, cryptography, and threat analysis',     'Engineering & Tech',  7,  true),
  ('subj_english',  'English',               'ENGLISH',  'English language, grammar, composition, literature, and communication',    'Humanities',          8,  true),
  ('subj_masscomm', 'Mass Communication',    'MASSCOMM', 'Media theory, journalism, broadcasting, public relations, and advertising','Social Sciences',     9,  true),
  ('subj_nursing',  'Nursing',               'NURS',     'Clinical nursing practice, anatomy, pharmacology, and patient care',       'Health Sciences',     10, true)
ON CONFLICT (id) DO NOTHING;

-- NOTE: Physics (subj_phys) has 0 active questions in the bank.
-- The new subjects above also have 0 questions.
-- The new start_tutor_assessment() will cleanly refuse to start an assessment
-- for any subject that lacks the required number of questions.
-- Question content for these subjects must be added by administrators via the
-- admin question bank interface before applicants selecting those subjects can
-- take the assessment.

-- ---------------------------------------------------------------------------
-- 2. start_tutor_assessment() — strict subject-only, proportional, pre-flight
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_tutor_assessment(p_application_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id         UUID;
  v_app_status      TEXT;
  v_selected_subjs  JSONB;
  v_config          RECORD;
  v_attempt_id      UUID;
  v_questions       JSONB;
  v_q_ids           JSONB;
  v_subject_keys    TEXT[];
  v_retry_count     INT;
  v_total_available INT;
BEGIN
  -- ── Auth guard ────────────────────────────────────────────────────────────
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- ── 1. Verify application ownership and current status ───────────────────
  SELECT status, selected_subject_ids
  INTO   v_app_status, v_selected_subjs
  FROM   public.tutor_applications
  WHERE  id = p_application_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tutor application not found or unauthorized.';
  END IF;

  IF v_app_status NOT IN (
    'draft', 'submitted', 'assessment_pending',
    'assessment_in_progress', 'assessment_failed'
  ) THEN
    RAISE EXCEPTION
      'Application is not currently eligible for assessment (current status: %).',
      v_app_status;
  END IF;

  -- ── 2. Load assessment configuration ─────────────────────────────────────
  SELECT question_count, time_limit_minutes, pass_percentage, max_retries
  INTO   v_config
  FROM   public.assessment_configs
  WHERE  is_active = true
  ORDER  BY created_at DESC
  LIMIT  1;

  -- Hard-coded fallback if no config row exists
  IF v_config.question_count IS NULL THEN
    v_config.question_count    := 10;
    v_config.time_limit_minutes := 20;
    v_config.pass_percentage   := 70;
    v_config.max_retries       := 3;
  END IF;

  -- ── 3. Check retry limit ──────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_retry_count
  FROM   public.assessment_attempts
  WHERE  application_id = p_application_id AND status = 'completed';

  IF v_retry_count >= v_config.max_retries THEN
    RAISE EXCEPTION
      'Maximum assessment attempts (%) reached. Please contact Studora support.',
      v_config.max_retries;
  END IF;

  -- ── 4. Validate subject selection — subjects are REQUIRED ─────────────────
  IF v_selected_subjs IS NULL
    OR jsonb_typeof(v_selected_subjs) <> 'array'
    OR jsonb_array_length(v_selected_subjs) = 0
  THEN
    RAISE EXCEPTION
      'No teaching subjects selected. Please select at least one subject before starting the assessment.';
  END IF;

  SELECT array_agg(value::text)
  INTO   v_subject_keys
  FROM   jsonb_array_elements_text(v_selected_subjs);

  -- ── 5. PRE-FLIGHT: count active questions for the selected subjects ────────
  --    If the pool is smaller than question_count the attempt is NOT created.
  SELECT COUNT(*) INTO v_total_available
  FROM   public.question_bank
  WHERE  status     = 'active'
    AND  subject_id = ANY(v_subject_keys);

  IF v_total_available < v_config.question_count THEN
    RAISE EXCEPTION
      'Not enough assessment questions available for the selected teaching subjects. Required: %, Available: %.',
      v_config.question_count,
      v_total_available;
  END IF;

  -- ── 6. Proportional subject-matched question selection ────────────────────
  --
  --  Strategy: normalised-rank round-robin interleave.
  --  Within each subject, questions are ranked by random() (rn).
  --  Sort key = (rn - 1) / subject_pool_size maps each subject to [0, 1).
  --  Ordering by this key interleaves subjects proportionally: a subject with
  --  twice as many questions contributes twice as many slots in the final set.
  --  The outer ORDER BY random() shuffles the final result so question order
  --  is not predictable by subject.
  --
  --  GUARANTEE: every returned question has subject_id IN v_subject_keys.
  --  correct_answer and explanation are intentionally never selected.
  WITH ranked AS (
    SELECT
      id,
      question,
      question_type,
      difficulty,
      options,
      ROW_NUMBER() OVER (PARTITION BY subject_id ORDER BY random())  AS rn,
      COUNT(*)     OVER (PARTITION BY subject_id)::FLOAT             AS subj_n
    FROM public.question_bank
    WHERE status     = 'active'
      AND subject_id = ANY(v_subject_keys)
  ),
  proportional AS (
    SELECT
      id,
      question,
      question_type,
      difficulty,
      options,
      random() AS final_order          -- computed once, used by both aggregates
    FROM ranked
    ORDER BY (rn - 1) / subj_n, random()
    LIMIT v_config.question_count
  )
  SELECT
    jsonb_agg(
      jsonb_build_object(
        'id',            id,
        'question',      question,
        'question_type', question_type,
        'difficulty',    difficulty,
        'options',       options
      )
      ORDER BY final_order
    ),
    jsonb_agg(id ORDER BY final_order)
  INTO v_questions, v_q_ids
  FROM proportional;

  -- Sanity guard (should not be reachable after the pre-flight above)
  IF v_questions IS NULL OR jsonb_array_length(v_questions) = 0 THEN
    RAISE EXCEPTION
      'Assessment question bank is currently undergoing maintenance. Please try again shortly.';
  END IF;

  -- ── 7. Record the attempt ─────────────────────────────────────────────────
  INSERT INTO public.assessment_attempts (
    user_id, application_id, status,
    total_questions, time_limit_minutes, question_ids
  ) VALUES (
    v_user_id, p_application_id, 'in_progress',
    jsonb_array_length(v_questions), v_config.time_limit_minutes, v_q_ids
  )
  RETURNING id INTO v_attempt_id;

  -- ── 8. Transition application state ──────────────────────────────────────
  UPDATE public.tutor_applications
  SET    status     = 'assessment_in_progress',
         updated_at = CURRENT_TIMESTAMP
  WHERE  id = p_application_id;

  -- ── 9. Return session metadata + questions (no answers) ───────────────────
  RETURN jsonb_build_object(
    'attempt_id',         v_attempt_id,
    'time_limit_minutes', v_config.time_limit_minutes,
    'total_questions',    jsonb_array_length(v_questions),
    'pass_percentage',    v_config.pass_percentage,
    'questions',          v_questions
  );
END;
$$;
