-- 20261111000000_studora_phase3_daily_study_coach.sql
-- Studora Phase 3: Personal Daily AI Study Coach & Adaptive Study Planning

-- 1. Student Study Preferences
CREATE TABLE IF NOT EXISTS public.student_study_preferences (
  user_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  academic_goals TEXT DEFAULT '',
  target_gpa NUMERIC(3, 2),
  daily_available_minutes INT NOT NULL DEFAULT 60,
  preferred_study_periods TEXT[] DEFAULT ARRAY['evening']::TEXT[], -- morning, afternoon, evening, night
  preferred_study_days TEXT[] DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday']::TEXT[],
  upcoming_exams JSONB DEFAULT '[]'::jsonb, -- [{ subject_id, subject_name, exam_date, notes }]
  prioritized_subject_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  prioritized_topic_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_time TIME DEFAULT '09:00:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_study_prefs_user ON public.student_study_preferences(user_id);

-- 2. Daily Study Plans (Proactive Daily Container)
CREATE TABLE IF NOT EXISTS public.daily_study_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, adapted, archived
  target_study_minutes INT NOT NULL DEFAULT 60,
  completed_study_minutes INT NOT NULL DEFAULT 0,
  ai_coaching_note TEXT,
  generation_context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, plan_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_study_plans_user_date ON public.daily_study_plans(user_id, plan_date DESC);

-- 3. Daily Study Tasks (Individual Actionable Units)
CREATE TABLE IF NOT EXISTS public.daily_study_tasks (
  id TEXT PRIMARY KEY,
  daily_plan_id TEXT NOT NULL REFERENCES public.daily_study_plans(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES public.subjects(id) ON DELETE SET NULL,
  topic_id TEXT REFERENCES public.topics(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  learning_objective TEXT,
  activity_type TEXT NOT NULL DEFAULT 'revision', -- revision, practice_drill, concept_review, exam_prep
  estimated_duration_minutes INT NOT NULL DEFAULT 25,
  actual_duration_seconds INT NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'medium', -- urgent, high, medium, low
  recommendation_reason TEXT,
  action_route TEXT, -- route to feature e.g., /tutor/ai, /study/timer, /study/drill
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, skipped, rescheduled
  completed_at TIMESTAMPTZ,
  session_id TEXT REFERENCES public.student_study_sessions(id) ON DELETE SET NULL,
  attempt_id TEXT REFERENCES public.student_practice_attempts(id) ON DELETE SET NULL,
  display_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_study_tasks_plan ON public.daily_study_tasks(daily_plan_id, display_order ASC);
CREATE INDEX IF NOT EXISTS idx_daily_study_tasks_user_status ON public.daily_study_tasks(user_id, status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.student_study_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_study_tasks ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users manage their own study preferences" ON public.student_study_preferences;
CREATE POLICY "Users manage their own study preferences" ON public.student_study_preferences
  FOR ALL USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users manage their own daily study plans" ON public.daily_study_plans;
CREATE POLICY "Users manage their own daily study plans" ON public.daily_study_plans
  FOR ALL USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users manage their own daily study tasks" ON public.daily_study_tasks;
CREATE POLICY "Users manage their own daily study tasks" ON public.daily_study_tasks
  FOR ALL USING (auth.uid()::text = user_id);
