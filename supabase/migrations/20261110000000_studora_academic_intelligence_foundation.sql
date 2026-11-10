-- ==============================================================================
-- STUDORA — ACADEMIC INTELLIGENCE DATA FOUNDATION (PHASE 1)
-- Migration: 20261110000000_studora_academic_intelligence_foundation.sql
-- "Study smarter. Go further."
-- ==============================================================================

-- 1. STUDENT STUDY SESSIONS
CREATE TABLE IF NOT EXISTS public.student_study_sessions (
  id TEXT PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES public.subjects(id) ON DELETE SET NULL,
  topic_id TEXT REFERENCES public.topics(id) ON DELETE SET NULL,
  study_plan_id TEXT,
  source TEXT NOT NULL DEFAULT 'study_timer' CHECK (source IN ('study_timer', 'practice_drill', 'ai_tutor', 'course_review', 'manual_logged')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  active_duration_seconds INT NOT NULL DEFAULT 0,
  idle_duration_seconds INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned', 'timed_out')),
  client_session_key TEXT,
  device_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_study_sessions_student ON public.student_study_sessions(student_id, status);
CREATE INDEX IF NOT EXISTS idx_student_study_sessions_created ON public.student_study_sessions(student_id, created_at DESC);

-- 2. STUDY SESSION EVENTS
CREATE TABLE IF NOT EXISTS public.study_session_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES public.student_study_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('start', 'heartbeat', 'tab_blur', 'tab_focus', 'pause', 'resume', 'idle_detected', 'complete', 'abandon')),
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_study_session_events_session ON public.study_session_events(session_id, event_timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_study_session_events_student ON public.study_session_events(student_id);

-- 3. STUDENT PRACTICE ATTEMPTS (General student drills, decoupling from tutor_applications)
CREATE TABLE IF NOT EXISTS public.student_practice_attempts (
  id TEXT PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES public.subjects(id) ON DELETE SET NULL,
  topic_id TEXT REFERENCES public.topics(id) ON DELETE SET NULL,
  session_id TEXT REFERENCES public.student_study_sessions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned', 'timed_out')),
  score NUMERIC(5, 2),
  passed BOOLEAN,
  total_questions INT NOT NULL DEFAULT 0,
  correct_answers_count INT NOT NULL DEFAULT 0,
  time_spent_seconds INT DEFAULT 0,
  question_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'practice_drill',
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_practice_attempts_student ON public.student_practice_attempts(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_practice_attempts_topic ON public.student_practice_attempts(student_id, topic_id);

-- 4. STUDENT PRACTICE ANSWERS
CREATE TABLE IF NOT EXISTS public.student_practice_answers (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL REFERENCES public.student_practice_attempts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  selected_option TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_practice_answers_attempt ON public.student_practice_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_student_practice_answers_student ON public.student_practice_answers(student_id);

-- 5. STUDENT TOPIC MASTERY (Empirical concept mastery aggregation)
CREATE TABLE IF NOT EXISTS public.student_topic_mastery (
  id TEXT PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  total_questions_attempted INT NOT NULL DEFAULT 0,
  correct_answers_count INT NOT NULL DEFAULT 0,
  incorrect_answers_count INT NOT NULL DEFAULT 0,
  accuracy_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  mastery_classification TEXT NOT NULL DEFAULT 'not_assessed' CHECK (mastery_classification IN ('not_assessed', 'struggling', 'developing', 'proficient', 'mastered')),
  performance_trend TEXT NOT NULL DEFAULT 'stable' CHECK (performance_trend IN ('improving', 'stable', 'declining')),
  last_assessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_student_topic_mastery UNIQUE (student_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_student_topic_mastery_student ON public.student_topic_mastery(student_id);
CREATE INDEX IF NOT EXISTS idx_student_topic_mastery_subject ON public.student_topic_mastery(student_id, subject_id);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.student_study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_practice_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_practice_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_topic_mastery ENABLE ROW LEVEL SECURITY;

-- student_study_sessions RLS
DROP POLICY IF EXISTS "Students can view own study sessions" ON public.student_study_sessions;
CREATE POLICY "Students can view own study sessions"
  ON public.student_study_sessions FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can insert own study sessions" ON public.student_study_sessions;
CREATE POLICY "Students can insert own study sessions"
  ON public.student_study_sessions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can update own study sessions" ON public.student_study_sessions;
CREATE POLICY "Students can update own study sessions"
  ON public.student_study_sessions FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- study_session_events RLS
DROP POLICY IF EXISTS "Students can view own study events" ON public.study_session_events;
CREATE POLICY "Students can view own study events"
  ON public.study_session_events FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can insert own study events" ON public.study_session_events;
CREATE POLICY "Students can insert own study events"
  ON public.study_session_events FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- student_practice_attempts RLS
DROP POLICY IF EXISTS "Students can view own practice attempts" ON public.student_practice_attempts;
CREATE POLICY "Students can view own practice attempts"
  ON public.student_practice_attempts FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can insert own practice attempts" ON public.student_practice_attempts;
CREATE POLICY "Students can insert own practice attempts"
  ON public.student_practice_attempts FOR INSERT
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can update own practice attempts" ON public.student_practice_attempts;
CREATE POLICY "Students can update own practice attempts"
  ON public.student_practice_attempts FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- student_practice_answers RLS
DROP POLICY IF EXISTS "Students can view own practice answers" ON public.student_practice_answers;
CREATE POLICY "Students can view own practice answers"
  ON public.student_practice_answers FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can insert own practice answers" ON public.student_practice_answers;
CREATE POLICY "Students can insert own practice answers"
  ON public.student_practice_answers FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- student_topic_mastery RLS
DROP POLICY IF EXISTS "Students can view own topic mastery" ON public.student_topic_mastery;
CREATE POLICY "Students can view own topic mastery"
  ON public.student_topic_mastery FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can insert own topic mastery" ON public.student_topic_mastery;
CREATE POLICY "Students can insert own topic mastery"
  ON public.student_topic_mastery FOR INSERT
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can update own topic mastery" ON public.student_topic_mastery;
CREATE POLICY "Students can update own topic mastery"
  ON public.student_topic_mastery FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);
