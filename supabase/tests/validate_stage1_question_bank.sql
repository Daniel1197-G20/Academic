-- =============================================================================
-- STUDORA — TUTOR ASSESSMENT STAGE 1 VALIDATION SCRIPT
-- Purpose: Verify that all 10 subjects have >= 10 valid active questions,
--          with correct options, valid correct answers, valid topic references,
--          and zero cross-subject bleeding.
-- Note: Run this script against the database AFTER migrations are applied.
-- =============================================================================

DO $$
DECLARE
  v_missing_subjects TEXT[];
  v_deficient_subjects RECORD;
  v_invalid_options_count INT;
  v_invalid_answer_count INT;
  v_orphaned_topics_count INT;
  v_duplicate_count INT;
  v_total_active INT;
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'STUDORA — STAGE 1 POST-MIGRATION VALIDATION';
  RAISE NOTICE '=======================================================';

  -- 1. Check all 10 expected subjects exist
  SELECT array_agg(expected.id) INTO v_missing_subjects
  FROM (
    VALUES
      ('subj_cs'), ('subj_math'), ('subj_eng'), ('subj_phys'), ('subj_econ'),
      ('subj_se'), ('subj_cyber'), ('subj_english'), ('subj_masscomm'), ('subj_nursing')
  ) AS expected(id)
  LEFT JOIN public.subjects s ON s.id = expected.id AND s.is_active = true
  WHERE s.id IS NULL;

  IF cardinality(v_missing_subjects) > 0 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: Missing active subjects in catalogue: %', v_missing_subjects;
  ELSE
    RAISE NOTICE '[PASS] All 10 supported subjects are active in public.subjects.';
  END IF;

  -- 2. Check each of the 10 subjects has at least 10 active questions
  FOR v_deficient_subjects IN
    SELECT s.id, s.name, COUNT(q.id) AS active_count
    FROM public.subjects s
    LEFT JOIN public.question_bank q ON q.subject_id = s.id AND q.status = 'active'
    WHERE s.id IN (
      'subj_cs', 'subj_math', 'subj_eng', 'subj_phys', 'subj_econ',
      'subj_se', 'subj_cyber', 'subj_english', 'subj_masscomm', 'subj_nursing'
    )
    GROUP BY s.id, s.name
    HAVING COUNT(q.id) < 10
  LOOP
    RAISE EXCEPTION 'VALIDATION FAILED: Subject % (%) has only % active questions (min 10 required).',
      v_deficient_subjects.name, v_deficient_subjects.id, v_deficient_subjects.active_count;
  END LOOP;
  RAISE NOTICE '[PASS] All 10 subjects meet the minimum threshold of >= 10 active questions.';

  -- 3. Check for invalid options (must have exactly 4 items in JSON array)
  SELECT COUNT(*) INTO v_invalid_options_count
  FROM public.question_bank
  WHERE status = 'active'
    AND (
      options IS NULL
      OR jsonb_typeof(options) <> 'array'
      OR jsonb_array_length(options) <> 4
    );

  IF v_invalid_options_count > 0 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: Found % active questions with invalid options arrays.', v_invalid_options_count;
  ELSE
    RAISE NOTICE '[PASS] All active questions have valid 4-option arrays.';
  END IF;

  -- 4. Check for invalid correct answers (must be in options array)
  SELECT COUNT(*) INTO v_invalid_answer_count
  FROM public.question_bank q
  WHERE q.status = 'active'
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(q.options) opt
      WHERE opt->>'id' = q.correct_answer
    );

  IF v_invalid_answer_count > 0 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: Found % active questions where correct_answer does not match options.', v_invalid_answer_count;
  ELSE
    RAISE NOTICE '[PASS] All active questions have valid correct_answer mappings.';
  END IF;

  -- 5. Check topic references match topic.subject_id
  SELECT COUNT(*) INTO v_orphaned_topics_count
  FROM public.question_bank q
  JOIN public.topics t ON t.id = q.topic_id
  WHERE q.subject_id <> t.subject_id;

  IF v_orphaned_topics_count > 0 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: Found % questions linked to topics of a different subject!', v_orphaned_topics_count;
  ELSE
    RAISE NOTICE '[PASS] All question-topic associations match subject isolation requirements.';
  END IF;

  -- 6. Check for duplicate questions within the same subject
  SELECT COUNT(*) INTO v_duplicate_count
  FROM (
    SELECT subject_id, LOWER(TRIM(question)), COUNT(*)
    FROM public.question_bank
    WHERE status = 'active'
    GROUP BY subject_id, LOWER(TRIM(question))
    HAVING COUNT(*) > 1
  ) dups;

  IF v_duplicate_count > 0 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: Found % duplicate questions within subjects.', v_duplicate_count;
  ELSE
    RAISE NOTICE '[PASS] Zero duplicate questions detected within subjects.';
  END IF;

  -- 7. Total active question summary
  SELECT COUNT(*) INTO v_total_active
  FROM public.question_bank
  WHERE status = 'active';

  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'VALIDATION SUCCESSFUL: Total active questions in bank: %', v_total_active;
  RAISE NOTICE '=======================================================';
END $$;

-- ── Subject Breakdown Summary Table ──────────────────────────────────────────
SELECT
  s.display_order,
  s.name AS subject_name,
  s.id AS subject_id,
  COUNT(q.id) FILTER (WHERE q.status = 'active') AS active_questions,
  COUNT(q.id) FILTER (WHERE q.status <> 'active') AS inactive_questions,
  COUNT(q.id) AS total_questions,
  CASE
    WHEN COUNT(q.id) FILTER (WHERE q.status = 'active') >= 10 THEN 'UNLOCKED'
    ELSE 'BLOCKED'
  END AS assessment_status
FROM public.subjects s
LEFT JOIN public.question_bank q ON q.subject_id = s.id
GROUP BY s.display_order, s.name, s.id
ORDER BY s.display_order;
