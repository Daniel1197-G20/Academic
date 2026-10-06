-- ==============================================================================
-- STUDORA — TUTOR PLATFORM, ASSESSMENT ENGINE & ADMIN AUTHORIZATION
-- Migration: 20261002000000_studora_tutor_platform_and_assessment.sql
-- "Study smarter. Go further."
-- ==============================================================================

-- 1. ACADEMIC SUBJECTS TABLE
CREATE TABLE IF NOT EXISTS public.subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT DEFAULT 'General',
  display_order INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. ACADEMIC TOPICS TABLE
CREATE TABLE IF NOT EXISTS public.topics (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. EXTEND TUTOR_PROFILES TABLE WITH WORKFLOW COLUMNS
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tutor_profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.tutor_profiles ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tutor_profiles' AND column_name = 'is_visible'
  ) THEN
    ALTER TABLE public.tutor_profiles ADD COLUMN is_visible BOOLEAN NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tutor_profiles' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE public.tutor_profiles ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tutor_profiles' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE public.tutor_profiles ADD COLUMN approved_by UUID REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tutor_profiles' AND column_name = 'teaching_approach'
  ) THEN
    ALTER TABLE public.tutor_profiles ADD COLUMN teaching_approach TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tutor_profiles' AND column_name = 'institution'
  ) THEN
    ALTER TABLE public.tutor_profiles ADD COLUMN institution TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tutor_profiles' AND column_name = 'department'
  ) THEN
    ALTER TABLE public.tutor_profiles ADD COLUMN department TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tutor_profiles' AND column_name = 'academic_level'
  ) THEN
    ALTER TABLE public.tutor_profiles ADD COLUMN academic_level TEXT;
  END IF;
END $$;

-- 4. TUTOR APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.tutor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN (
      'draft',
      'submitted',
      'assessment_pending',
      'assessment_in_progress',
      'assessment_failed',
      'assessment_passed',
      'pending_review',
      'approved',
      'rejected',
      'suspended',
      'withdrawn'
    )
  ),
  institution TEXT,
  department TEXT,
  academic_level TEXT,
  programme TEXT,
  graduation_year TEXT,
  selected_subject_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  has_teaching_experience BOOLEAN DEFAULT false,
  experience_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  experience_description TEXT,
  teaching_level TEXT DEFAULT 'intermediate' CHECK (teaching_level IN ('beginner', 'intermediate', 'advanced')),
  bio TEXT,
  teaching_approach TEXT,
  areas_of_expertise JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_step INT NOT NULL DEFAULT 1,
  assessment_score NUMERIC(5,2),
  assessment_passed BOOLEAN DEFAULT false,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tutor_applications_user ON public.tutor_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_tutor_applications_status ON public.tutor_applications(status);

-- Add foreign key link from tutor_profiles to tutor_applications if column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tutor_profiles' AND column_name = 'application_id'
  ) THEN
    ALTER TABLE public.tutor_profiles ADD COLUMN application_id UUID REFERENCES public.tutor_applications(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. RELATIONAL TUTOR SUBJECTS JUNCTION TABLE
CREATE TABLE IF NOT EXISTS public.tutor_subjects (
  tutor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  proficiency_level TEXT DEFAULT 'advanced',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tutor_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_tutor_subjects_subj ON public.tutor_subjects(subject_id);

-- 6. QUESTION BANK TABLE
CREATE TABLE IF NOT EXISTS public.question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id TEXT REFERENCES public.subjects(id) ON DELETE SET NULL,
  topic_id TEXT REFERENCES public.topics(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false')),
  difficulty TEXT NOT NULL DEFAULT 'intermediate' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_question_bank_subject ON public.question_bank(subject_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_status ON public.question_bank(status);

-- 7. ASSESSMENT CONFIGURATION TABLE
CREATE TABLE IF NOT EXISTS public.assessment_configs (
  id TEXT PRIMARY KEY DEFAULT 'default',
  name TEXT NOT NULL DEFAULT 'Standard Tutor Assessment',
  question_count INT NOT NULL DEFAULT 10,
  time_limit_minutes INT NOT NULL DEFAULT 20,
  pass_percentage INT NOT NULL DEFAULT 70,
  max_retries INT NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. ASSESSMENT ATTEMPTS TABLE
CREATE TABLE IF NOT EXISTS public.assessment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.tutor_applications(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'timed_out', 'abandoned')),
  score NUMERIC(5,2),
  passed BOOLEAN,
  total_questions INT NOT NULL DEFAULT 0,
  correct_answers_count INT NOT NULL DEFAULT 0,
  time_limit_minutes INT NOT NULL DEFAULT 20,
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,
  time_spent_seconds INT,
  question_ids JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_assessment_attempts_user ON public.assessment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_app ON public.assessment_attempts(application_id);

-- 9. ASSESSMENT ANSWERS TABLE
CREATE TABLE IF NOT EXISTS public.assessment_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.assessment_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  selected_option TEXT,
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assessment_answers_attempt ON public.assessment_answers(attempt_id);

-- 10. ADMIN AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor ON public.admin_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs(action);

-- 11. TUTOR REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.tutor_reviews (
  id TEXT PRIMARY KEY DEFAULT ('rev_' || substr(md5(random()::text), 1, 12)),
  tutor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id TEXT REFERENCES public.tutor_bookings(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tutor_reviews_tutor ON public.tutor_reviews(tutor_id);

-- ==============================================================================
-- 12. STATE PROTECTION & INTEGRITY TRIGGERS
-- ==============================================================================

-- Trigger to prevent client-side elevation of tutor application state
CREATE OR REPLACE FUNCTION public.protect_tutor_application_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_adm BOOLEAN;
BEGIN
  v_is_adm := public.is_admin(auth.uid());

  -- If the user is attempting an update and is not an administrator
  IF (auth.role() = 'authenticated' OR current_setting('role', true) = 'authenticated') AND NOT v_is_adm THEN
    -- A student cannot change approved_at, reviewed_by, reviewed_at, or set status to approved/rejected/suspended
    IF NEW.status IN ('approved', 'rejected', 'suspended') AND NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Forbidden: Application decision can only be made by Studora administrators.';
    END IF;

    -- Students cannot fabricate passing scores or marks directly
    IF (NEW.assessment_score IS DISTINCT FROM OLD.assessment_score OR NEW.assessment_passed IS DISTINCT FROM OLD.assessment_passed) THEN
      RAISE EXCEPTION 'Forbidden: Assessment scoring must be performed by the secure assessment engine.';
    END IF;

    -- Students cannot edit reviewed_by or rejection_reason
    IF NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
      RAISE EXCEPTION 'Forbidden: Administrative audit fields cannot be modified by students.';
    END IF;
  END IF;

  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_tutor_application ON public.tutor_applications;
CREATE TRIGGER trg_protect_tutor_application
BEFORE UPDATE ON public.tutor_applications
FOR EACH ROW
EXECUTE FUNCTION public.protect_tutor_application_state();

-- ==============================================================================
-- 13. SECURE ASSESSMENT ENGINE (POSTGRESQL RPCs)
-- ==============================================================================

-- Function 1: Start Tutor Assessment
-- Returns random active questions for the applicant's subjects, STRIPPED of correct_answer and explanation!
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

  -- 3. Select random questions without exposing correct_answer or explanation
  WITH candidate_questions AS (
    SELECT id, question, question_type, difficulty, options
    FROM public.question_bank
    WHERE status = 'active'
      AND (
        cardinality(v_subject_keys) = 0 
        OR subject_id = ANY(v_subject_keys) 
        OR subject_id IS NULL
      )
    ORDER BY random()
    LIMIT v_config.question_count
  ),
  fallback_questions AS (
    SELECT id, question, question_type, difficulty, options
    FROM candidate_questions
    UNION ALL
    -- Fallback to general questions if not enough subject questions
    SELECT id, question, question_type, difficulty, options
    FROM public.question_bank
    WHERE status = 'active'
      AND id NOT IN (SELECT id FROM candidate_questions)
    ORDER BY random()
    LIMIT GREATEST(0, v_config.question_count - (SELECT COUNT(*) FROM candidate_questions))
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
  FROM fallback_questions;

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

-- Function 2: Submit Tutor Assessment & Score Server-Side
CREATE OR REPLACE FUNCTION public.submit_tutor_assessment(
  p_attempt_id UUID,
  p_answers JSONB -- object map: { "question_uuid": "selected_option_id_or_text" }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_attempt RECORD;
  v_config RECORD;
  v_q_id UUID;
  v_selected TEXT;
  v_correct_answer TEXT;
  v_is_correct BOOLEAN;
  v_correct_count INT := 0;
  v_total_count INT := 0;
  v_score NUMERIC(5, 2);
  v_passed BOOLEAN;
  v_new_status TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- 1. Verify attempt ownership & status
  SELECT id, user_id, application_id, status, question_ids, started_at
  INTO v_attempt
  FROM public.assessment_attempts
  WHERE id = p_attempt_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assessment attempt not found or unauthorized.';
  END IF;

  IF v_attempt.status <> 'in_progress' THEN
    RAISE EXCEPTION 'Assessment attempt has already been submitted or completed (status: %).', v_attempt.status;
  END IF;

  -- 2. Fetch pass criteria
  SELECT pass_percentage INTO v_config
  FROM public.assessment_configs
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_config.pass_percentage IS NULL THEN
    v_config.pass_percentage := 70;
  END IF;

  -- 3. Evaluate each answer securely against question_bank
  FOR v_q_id IN 
    SELECT (jsonb_array_elements_text(v_attempt.question_ids))::UUID
  LOOP
    v_total_count := v_total_count + 1;
    v_selected := p_answers->>v_q_id::text;

    SELECT correct_answer INTO v_correct_answer
    FROM public.question_bank
    WHERE id = v_q_id;

    IF v_selected IS NOT NULL AND LOWER(TRIM(v_selected)) = LOWER(TRIM(v_correct_answer)) THEN
      v_is_correct := true;
      v_correct_count := v_correct_count + 1;
    ELSE
      v_is_correct := false;
    END IF;

    -- Store individual answer record
    INSERT INTO public.assessment_answers (
      attempt_id, question_id, selected_option, is_correct
    ) VALUES (
      p_attempt_id, v_q_id, v_selected, v_is_correct
    );
  END LOOP;

  -- 4. Calculate final score
  IF v_total_count > 0 THEN
    v_score := ROUND((v_correct_count::numeric / v_total_count::numeric) * 100.0, 2);
  ELSE
    v_score := 0.0;
  END IF;

  v_passed := (v_score >= v_config.pass_percentage);
  v_new_status := CASE WHEN v_passed THEN 'pending_review' ELSE 'assessment_failed' END;

  -- 5. Complete attempt record
  UPDATE public.assessment_attempts
  SET status = 'completed',
      score = v_score,
      passed = v_passed,
      correct_answers_count = v_correct_count,
      total_questions = v_total_count,
      completed_at = CURRENT_TIMESTAMP,
      time_spent_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))::INT
  WHERE id = p_attempt_id;

  -- 6. Transition application state
  UPDATE public.tutor_applications
  SET status = v_new_status,
      assessment_score = v_score,
      assessment_passed = v_passed,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = v_attempt.application_id;

  RETURN jsonb_build_object(
    'attempt_id', p_attempt_id,
    'application_id', v_attempt.application_id,
    'score', v_score,
    'passed', v_passed,
    'pass_percentage', v_config.pass_percentage,
    'correct_count', v_correct_count,
    'total_questions', v_total_count,
    'status', v_new_status
  );
END;
$$;

-- Function 3: Admin Review Decision (Approve or Reject Application)
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

    -- 3. Upsert into tutor_profiles
    INSERT INTO public.tutor_profiles (
      id, title, bio, teaching_approach, institution, department, academic_level,
      is_verified, is_active, is_visible, approved_at, approved_by, application_id
    ) VALUES (
      v_app.user_id,
      'Studora Verified Tutor',
      COALESCE(v_app.bio, 'Studora peer academic tutor.'),
      v_app.teaching_approach,
      v_app.institution,
      v_app.department,
      v_app.academic_level,
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

-- Function 4: Admin Suspend / Unsuspend Tutor
CREATE OR REPLACE FUNCTION public.admin_set_tutor_suspension(
  p_tutor_id UUID,
  p_suspended BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  v_admin_id := auth.uid();
  IF NOT public.is_admin(v_admin_id) THEN
    RAISE EXCEPTION 'Forbidden: Administrator authorization required.';
  END IF;

  UPDATE public.tutor_profiles
  SET is_active = NOT p_suspended,
      is_visible = NOT p_suspended,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_tutor_id;

  UPDATE public.tutor_applications
  SET status = CASE WHEN p_suspended THEN 'suspended' ELSE 'approved' END,
      updated_at = CURRENT_TIMESTAMP
  WHERE user_id = p_tutor_id AND status IN ('approved', 'suspended');

  -- Audit log
  INSERT INTO public.admin_audit_logs (
    actor_id, action, target_type, target_id, metadata
  ) VALUES (
    v_admin_id,
    CASE WHEN p_suspended THEN 'TUTOR_SUSPENDED' ELSE 'TUTOR_REINSTATED' END,
    'tutor_profile',
    p_tutor_id::text,
    jsonb_build_object('reason', p_reason)
  );

  RETURN jsonb_build_object('success', true, 'tutor_id', p_tutor_id, 'is_active', NOT p_suspended);
END;
$$;

-- ==============================================================================
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- 1. Subjects & Topics (Public readable, admin editable)
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active subjects" ON public.subjects;
CREATE POLICY "Public can view active subjects" ON public.subjects
  FOR SELECT USING (is_active = true OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
CREATE POLICY "Admins can manage subjects" ON public.subjects
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public can view active topics" ON public.topics;
CREATE POLICY "Public can view active topics" ON public.topics
  FOR SELECT USING (is_active = true OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage topics" ON public.topics;
CREATE POLICY "Admins can manage topics" ON public.topics
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 2. Tutor Applications (Owner and Admin access only)
ALTER TABLE public.tutor_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Applicants and Admins can view applications" ON public.tutor_applications;
CREATE POLICY "Applicants and Admins can view applications" ON public.tutor_applications
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Students can insert own applications" ON public.tutor_applications;
CREATE POLICY "Students can insert own applications" ON public.tutor_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Applicants and Admins can update applications" ON public.tutor_applications;
CREATE POLICY "Applicants and Admins can update applications" ON public.tutor_applications
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- 3. Tutor Profiles (Approved, active & visible tutors are public in marketplace)
DROP POLICY IF EXISTS "Anyone can view verified active tutor profiles" ON public.tutor_profiles;
CREATE POLICY "Anyone can view verified active tutor profiles" ON public.tutor_profiles
  FOR SELECT USING (
    (is_verified = true AND is_active = true AND is_visible = true)
    OR auth.uid() = id
    OR public.is_admin(auth.uid())
  );

-- 4. Tutor Subjects (Public readable, tutor/admin manageable)
ALTER TABLE public.tutor_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view tutor subjects" ON public.tutor_subjects;
CREATE POLICY "Anyone can view tutor subjects" ON public.tutor_subjects
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Tutors and admins can manage tutor subjects" ON public.tutor_subjects;
CREATE POLICY "Tutors and admins can manage tutor subjects" ON public.tutor_subjects
  FOR ALL USING (auth.uid() = tutor_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = tutor_id OR public.is_admin(auth.uid()));

-- 5. Question Bank (Admins can view and manage; questions delivered to students via RPC without answers)
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view question bank" ON public.question_bank;
CREATE POLICY "Admins can view question bank" ON public.question_bank
  FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage question bank" ON public.question_bank;
CREATE POLICY "Admins can manage question bank" ON public.question_bank
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 6. Assessment Configs
ALTER TABLE public.assessment_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read assessment configs" ON public.assessment_configs;
CREATE POLICY "Anyone can read assessment configs" ON public.assessment_configs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage assessment configs" ON public.assessment_configs;
CREATE POLICY "Admins can manage assessment configs" ON public.assessment_configs
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 7. Assessment Attempts
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users and admins can view assessment attempts" ON public.assessment_attempts;
CREATE POLICY "Users and admins can view assessment attempts" ON public.assessment_attempts
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- 8. Assessment Answers
ALTER TABLE public.assessment_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users and admins can view assessment answers" ON public.assessment_answers;
CREATE POLICY "Users and admins can view assessment answers" ON public.assessment_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.assessment_attempts a
      WHERE a.id = assessment_answers.attempt_id
        AND (a.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- 9. Admin Audit Logs (Admins only)
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs
  FOR SELECT USING (public.is_admin(auth.uid()));

-- 10. Tutor Reviews
ALTER TABLE public.tutor_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published tutor reviews" ON public.tutor_reviews;
CREATE POLICY "Public can view published tutor reviews" ON public.tutor_reviews
  FOR SELECT USING (is_published = true OR auth.uid() = student_id OR auth.uid() = tutor_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Students can write reviews" ON public.tutor_reviews;
CREATE POLICY "Students can write reviews" ON public.tutor_reviews
  FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students and admins can update reviews" ON public.tutor_reviews;
CREATE POLICY "Students and admins can update reviews" ON public.tutor_reviews
  FOR UPDATE USING (auth.uid() = student_id OR public.is_admin(auth.uid()));

-- ==============================================================================
-- 15. SEED DATA (ACADEMIC SUBJECTS, TOPICS, QUESTION BANK, CONFIG)
-- ==============================================================================

-- Seed Subjects
INSERT INTO public.subjects (id, name, code, description, category, display_order)
VALUES 
  ('subj_cs', 'Computer Science', 'CS', 'Algorithms, data structures, systems and software architecture', 'Engineering & Tech', 1),
  ('subj_math', 'Mathematics', 'MATH', 'Calculus, linear algebra, statistics and discrete mathematics', 'Exact Sciences', 2),
  ('subj_eng', 'Engineering', 'ENG', 'Electrical, mechanical, chemical and computer engineering fundamentals', 'Engineering & Tech', 3),
  ('subj_phys', 'Physics', 'PHYS', 'Classical mechanics, electromagnetism, and modern physics', 'Exact Sciences', 4),
  ('subj_econ', 'Economics', 'ECON', 'Microeconomics, macroeconomics, econometrics and finance', 'Social Sciences', 5)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  description = EXCLUDED.description;

-- Seed Topics
INSERT INTO public.topics (id, subject_id, name, code, description, display_order)
VALUES
  ('top_cs_algo', 'subj_cs', 'Algorithms & Complexity', 'CS201', 'Sorting, searching, graph traversal, and asymptotic Big-O notation', 1),
  ('top_cs_ds', 'subj_cs', 'Data Structures', 'CS202', 'Arrays, linked lists, hash tables, binary trees, and heaps', 2),
  ('top_cs_os', 'subj_cs', 'Operating Systems', 'CS301', 'Concurrency, memory management, scheduling, and file systems', 3),
  ('top_cs_db', 'subj_cs', 'Database Systems', 'CS302', 'Relational algebra, SQL, indexing, normalization, and ACID transactions', 4),
  ('top_math_calc', 'subj_math', 'Calculus', 'MTH101', 'Limits, differentiation, integration, and multivariate optimization', 1),
  ('top_math_linalg', 'subj_math', 'Linear Algebra', 'MTH201', 'Vector spaces, matrices, determinants, eigenvalues, and transformations', 2),
  ('top_math_stats', 'subj_math', 'Probability & Statistics', 'MTH202', 'Random variables, distributions, hypothesis testing, and regression', 3),
  ('top_eng_circuits', 'subj_eng', 'Circuit Analysis', 'ENG201', 'Kirchhoff’s laws, AC/DC analysis, Thevenin equivalent, and operational amplifiers', 1),
  ('top_phys_mech', 'subj_phys', 'Classical Mechanics', 'PHY101', 'Newtonian dynamics, conservation laws, rotational motion, and gravitation', 1),
  ('top_econ_micro', 'subj_econ', 'Microeconomics', 'ECN101', 'Supply and demand, consumer behavior, market equilibrium, and elasticity', 1)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  description = EXCLUDED.description;

-- Seed Assessment Configuration
INSERT INTO public.assessment_configs (id, name, question_count, time_limit_minutes, pass_percentage, max_retries, is_active)
VALUES ('default', 'Studora Standard Tutor Accreditation Assessment', 10, 20, 70, 3, true)
ON CONFLICT (id) DO UPDATE SET
  question_count = EXCLUDED.question_count,
  time_limit_minutes = EXCLUDED.time_limit_minutes,
  pass_percentage = EXCLUDED.pass_percentage,
  max_retries = EXCLUDED.max_retries;

-- Seed Question Bank
INSERT INTO public.question_bank (id, subject_id, topic_id, question, question_type, difficulty, options, correct_answer, explanation, status)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'subj_cs',
    'top_cs_algo',
    'What is the worst-case time complexity of finding an element in an unsorted array of size n?',
    'multiple_choice',
    'beginner',
    '[{"id": "A", "text": "O(1)"}, {"id": "B", "text": "O(log n)"}, {"id": "C", "text": "O(n)"}, {"id": "D", "text": "O(n^2)"}]'::jsonb,
    'C',
    'In an unsorted array, a linear search must inspect every element in the worst case, requiring O(n) comparisons.',
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'subj_cs',
    'top_cs_ds',
    'Which data structure inherently enforces the First-In, First-Out (FIFO) ordering principle?',
    'multiple_choice',
    'beginner',
    '[{"id": "A", "text": "Stack"}, {"id": "B", "text": "Queue"}, {"id": "C", "text": "Binary Search Tree"}, {"id": "D", "text": "Max Heap"}]'::jsonb,
    'B',
    'A queue follows First-In, First-Out (FIFO), where elements are enqueued at the tail and dequeued from the head.',
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'subj_cs',
    'top_cs_algo',
    'What is the average time complexity of QuickSort on an array of n items?',
    'multiple_choice',
    'intermediate',
    '[{"id": "A", "text": "O(n)"}, {"id": "B", "text": "O(n log n)"}, {"id": "C", "text": "O(n^2)"}, {"id": "D", "text": "O(log n)"}]'::jsonb,
    'B',
    'QuickSort operates with O(n log n) expected average time complexity through divide-and-conquer partitioning.',
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'subj_cs',
    'top_cs_os',
    'In operating systems, which of the following is NOT one of the four necessary Coffman conditions for deadlock?',
    'multiple_choice',
    'intermediate',
    '[{"id": "A", "text": "Mutual Exclusion"}, {"id": "B", "text": "Hold and Wait"}, {"id": "C", "text": "Preemption Allowed"}, {"id": "D", "text": "Circular Wait"}]'::jsonb,
    'C',
    'No preemption is a Coffman condition; if preemption is allowed, deadlock cannot occur.',
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'subj_cs',
    'top_cs_db',
    'In database normalization, a table is in Second Normal Form (2NF) if and only if it is in 1NF and:',
    'multiple_choice',
    'intermediate',
    '[{"id": "A", "text": "Has no transitive dependencies"}, {"id": "B", "text": "Every non-prime attribute is fully functionally dependent on the entire primary key"}, {"id": "C", "text": "All multivalued dependencies are eliminated"}, {"id": "D", "text": "Has no foreign keys"}]'::jsonb,
    'B',
    '2NF requires 1NF and no partial dependency of any non-prime attribute on a candidate key.',
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000000006',
    'subj_math',
    'top_math_calc',
    'What is the derivative of f(x) = ln(3x^2 + 1) with respect to x?',
    'multiple_choice',
    'intermediate',
    '[{"id": "A", "text": "6x / (3x^2 + 1)"}, {"id": "B", "text": "1 / (3x^2 + 1)"}, {"id": "C", "text": "6x ln(3x^2 + 1)"}, {"id": "D", "text": "3x / (3x^2 + 1)"}]'::jsonb,
    'A',
    'Applying the chain rule: d/dx[ln(u)] = u''/u = (d/dx[3x^2 + 1]) / (3x^2 + 1) = 6x / (3x^2 + 1).',
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000000007',
    'subj_math',
    'top_math_linalg',
    'If a square matrix A has a determinant equal to 0, which statement is guaranteed to be true?',
    'multiple_choice',
    'intermediate',
    '[{"id": "A", "text": "A is invertible"}, {"id": "B", "text": "The columns of A are linearly dependent"}, {"id": "C", "text": "All eigenvalues of A are 0"}, {"id": "D", "text": "A is the identity matrix"}]'::jsonb,
    'B',
    'A determinant of 0 indicates a singular (non-invertible) matrix, which guarantees that its columns are linearly dependent.',
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000000008',
    'subj_math',
    'top_math_stats',
    'For any valid probability distribution, the sum of probabilities across all mutually exclusive outcomes in the sample space must equal:',
    'multiple_choice',
    'beginner',
    '[{"id": "A", "text": "0"}, {"id": "B", "text": "1"}, {"id": "C", "text": "100"}, {"id": "D", "text": "Infinity"}]'::jsonb,
    'B',
    'By the second axiom of probability (Kolmogorov), P(Sample Space) = 1.',
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000000009',
    'subj_eng',
    'top_eng_circuits',
    'Kirchhoff’s Current Law (KCL) is a direct consequence of which fundamental physical conservation law?',
    'multiple_choice',
    'intermediate',
    '[{"id": "A", "text": "Conservation of Energy"}, {"id": "B", "text": "Conservation of Electric Charge"}, {"id": "C", "text": "Conservation of Momentum"}, {"id": "D", "text": "Conservation of Mass"}]'::jsonb,
    'B',
    'KCL states that the algebraic sum of currents entering a node is zero, reflecting conservation of electric charge.',
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000000010',
    'subj_econ',
    'top_econ_micro',
    'When the price elasticity of demand for a good is greater than 1 in absolute value, demand is considered:',
    'multiple_choice',
    'beginner',
    '[{"id": "A", "text": "Inelastic"}, {"id": "B", "text": "Unit elastic"}, {"id": "C", "text": "Elastic"}, {"id": "D", "text": "Perfectively inelastic"}]'::jsonb,
    'C',
    'When |Ed| > 1, the percentage change in quantity demanded exceeds the percentage change in price, indicating elastic demand.',
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000000011',
    'subj_cs',
    'top_cs_ds',
    'Which of the following data structures provides O(1) expected time for search, insert, and delete operations?',
    'multiple_choice',
    'intermediate',
    '[{"id": "A", "text": "Linked List"}, {"id": "B", "text": "Hash Table"}, {"id": "C", "text": "Red-Black Tree"}, {"id": "D", "text": "Sorted Array"}]'::jsonb,
    'B',
    'With a good hash function and reasonable load factor, hash tables provide O(1) expected time for search, insertion, and deletion.',
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000000012',
    'subj_math',
    'top_math_calc',
    'What is the integral of e^(2x) dx?',
    'multiple_choice',
    'beginner',
    '[{"id": "A", "text": "2e^(2x) + C"}, {"id": "B", "text": "(1/2)e^(2x) + C"}, {"id": "C", "text": "e^(2x) + C"}, {"id": "D", "text": "(1/4)e^(2x) + C"}]'::jsonb,
    'B',
    'Using u-substitution where u = 2x, du = 2 dx, the integral evaluates to (1/2)e^(2x) + C.',
    'active'
  )
ON CONFLICT (id) DO UPDATE SET
  question = EXCLUDED.question,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation;

