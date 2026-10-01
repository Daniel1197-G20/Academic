-- ==============================================================================
-- STUDORA — CORE DATABASE SCHEMA MIGRATION
-- Project: studora (ermkkjkkxlqjrgpinrjt)
-- Engine: PostgreSQL 17
-- Single Authoritative Database Platform for Studora
-- "Study smarter. Go further."
-- ==============================================================================

-- 1. REFERENCE TABLES & LOOKUPS

-- GRADING SCALES (Public academic reference standard)
CREATE TABLE IF NOT EXISTS public.grading_scales (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  max_scale NUMERIC(3, 2) NOT NULL,
  rules JSONB NOT NULL,
  classifications JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- SUBSCRIPTION PLANS (Database-driven product pricing & billing cycles)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  amount_kobo INT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  interval TEXT NOT NULL DEFAULT 'monthly',
  paystack_plan_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- FEATURE DEFINITIONS (Centralized catalog of all gated features)
CREATE TABLE IF NOT EXISTS public.feature_definitions (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- PLAN ENTITLEMENTS (Matrix of feature availability & numerical limits per plan)
CREATE TABLE IF NOT EXISTS public.plan_entitlements (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  feature_code TEXT NOT NULL REFERENCES public.feature_definitions(code) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  limit_value INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(plan_id, feature_code)
);

-- 2. USER IDENTITY & PROFILE TABLES

-- PROFILES (Maps 1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  institution TEXT DEFAULT 'General Academy',
  department TEXT DEFAULT 'General Studies',
  academic_level TEXT DEFAULT 'Year 1',
  matric_number TEXT,
  bio TEXT,
  academic_interests JSONB DEFAULT '[]'::jsonb,
  study_preferences JSONB DEFAULT '[]'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT true,
  legacy_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Convenient view / alias column for queries expecting user_id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN user_id UUID GENERATED ALWAYS AS (id) STORED;
  END IF;
END $$;

-- USER SETTINGS
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_scale TEXT NOT NULL DEFAULT '5.0',
  custom_scale_rules JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. ACADEMIC & CGPA ENGINE TABLES

-- SEMESTERS
CREATE TABLE IF NOT EXISTS public.semesters (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  semester_name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_semesters_user_order ON public.semesters(user_id, display_order);

-- STUDENT COURSES
CREATE TABLE IF NOT EXISTS public.student_courses (
  id TEXT PRIMARY KEY,
  semester_id TEXT NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_code TEXT NOT NULL,
  course_title TEXT NOT NULL,
  credit_units INT NOT NULL CHECK (credit_units > 0),
  letter_grade TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_courses_semester ON public.student_courses(semester_id);
CREATE INDEX IF NOT EXISTS idx_student_courses_user ON public.student_courses(user_id);

-- 4. STUDY PLANNER & LOGS

-- STUDY PLANS
CREATE TABLE IF NOT EXISTS public.study_plans (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  goal TEXT NOT NULL,
  deadline DATE NOT NULL,
  study_frequency TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'Medium',
  estimated_hours NUMERIC(5, 1) NOT NULL DEFAULT 10.0,
  logged_hours NUMERIC(5, 1) NOT NULL DEFAULT 0.0,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_study_plans_user ON public.study_plans(user_id);

-- STUDY TOPICS
CREATE TABLE IF NOT EXISTS public.study_topics (
  id TEXT PRIMARY KEY,
  study_plan_id TEXT NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  display_order INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_study_topics_plan ON public.study_topics(study_plan_id);

-- STUDY LOGS
CREATE TABLE IF NOT EXISTS public.study_logs (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_plan_id TEXT REFERENCES public.study_plans(id) ON DELETE SET NULL,
  duration_minutes INT NOT NULL,
  notes TEXT,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_study_logs_user_date ON public.study_logs(user_id, logged_at DESC);

-- 5. LEGAL & COMPLIANCE

-- CONSENT RECORDS (Auditable log of user consent for GDPR/NDPR/COPPA)
CREATE TABLE IF NOT EXISTS public.consent_records (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  consent_status TEXT NOT NULL,
  policy_version TEXT NOT NULL DEFAULT '1.0',
  context TEXT NOT NULL DEFAULT 'web',
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consent_records_user ON public.consent_records(user_id);

-- 6. SUBSCRIPTIONS, PAYMENTS & USAGE

-- USER SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'non_renewing', 'cancelled', 'disabled', 'expired', 'pending')),
  paystack_customer_code TEXT,
  paystack_subscription_code TEXT,
  paystack_email_token TEXT,
  authorization_reference TEXT,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON public.user_subscriptions(user_id);

-- PAYMENT TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id TEXT REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
  provider TEXT NOT NULL DEFAULT 'paystack',
  provider_transaction_id TEXT,
  reference TEXT UNIQUE NOT NULL,
  amount_kobo INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'abandoned', 'reversed')),
  metadata JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_ref ON public.payment_transactions(reference);

-- PAYMENT WEBHOOK EVENTS (Idempotency ledger - Privileged Server Only)
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id TEXT PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_eid ON public.payment_webhook_events(event_id);

-- SUBSCRIPTION USAGE (Monthly feature consumption counters)
CREATE TABLE IF NOT EXISTS public.subscription_usage (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_code TEXT NOT NULL REFERENCES public.feature_definitions(code) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  usage_count INT NOT NULL DEFAULT 0,
  limit_value INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, feature_code, period_start)
);

CREATE INDEX IF NOT EXISTS idx_subscription_usage_lookup ON public.subscription_usage(user_id, feature_code, period_start);

-- 7. DEFAULT REFERENCE SEED DATA

-- Grading Scales
INSERT INTO public.grading_scales (id, name, max_scale, rules, classifications)
VALUES 
(
  '5.0',
  '5.0 Scale (Nigerian/British Commonwealth Standard)',
  5.0, 
  '[{"letter":"A","points":5,"minScore":70},{"letter":"B","points":4,"minScore":60},{"letter":"C","points":3,"minScore":50},{"letter":"D","points":2,"minScore":45},{"letter":"E","points":1,"minScore":40},{"letter":"F","points":0,"minScore":0}]'::jsonb,
  '[{"name":"First Class Honours","minCgpa":4.50},{"name":"Second Class Upper (2:1)","minCgpa":3.50},{"name":"Second Class Lower (2:2)","minCgpa":2.40},{"name":"Third Class","minCgpa":1.50},{"name":"Pass","minCgpa":1.00}]'::jsonb
),
(
  '4.0',
  '4.0 Scale (US / Global Standard)',
  4.0,
  '[{"letter":"A","points":4.0,"minScore":90},{"letter":"B","points":3.0,"minScore":80},{"letter":"C","points":2.0,"minScore":70},{"letter":"D","points":1.0,"minScore":60},{"letter":"F","points":0.0,"minScore":0}]'::jsonb,
  '[{"name":"Summa Cum Laude (Distinction)","minCgpa":3.80},{"name":"Magna Cum Laude (High Honors)","minCgpa":3.50},{"name":"Cum Laude (Honors)","minCgpa":3.20},{"name":"Satisfactory / Good Standing","minCgpa":2.00}]'::jsonb
),
(
  '7.0',
  '7.0 Scale (UI / Canadian Standard)',
  7.0,
  '[{"letter":"A","points":7,"minScore":75},{"letter":"B","points":6,"minScore":70},{"letter":"C","points":5,"minScore":60},{"letter":"D","points":4,"minScore":50},{"letter":"E","points":3,"minScore":45},{"letter":"F","points":0,"minScore":0}]'::jsonb,
  '[{"name":"First Class Honours","minCgpa":6.00},{"name":"Second Class Upper","minCgpa":4.60},{"name":"Second Class Lower","minCgpa":3.20},{"name":"Third Class","minCgpa":2.00}]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  max_scale = EXCLUDED.max_scale,
  rules = EXCLUDED.rules,
  classifications = EXCLUDED.classifications;

-- Subscription Plans
INSERT INTO public.subscription_plans (id, code, name, description, amount_kobo, currency, interval, paystack_plan_code, is_active, display_order)
VALUES 
  ('plan_basic', 'basic', 'Basic', 'Essential CGPA calculation and personal study planning.', 0, 'NGN', 'monthly', NULL, true, 1),
  ('plan_student', 'student', 'Student', 'Advanced CGPA modeling, AI tutor assistance, and structured test prep.', 250000, 'NGN', 'monthly', 'PLN_student_monthly', true, 2),
  ('plan_pro', 'pro', 'Pro', 'Unlimited test prep, video tutoring sessions, and deep performance analytics.', 500000, 'NGN', 'monthly', 'PLN_pro_monthly', true, 3),
  ('plan_premium', 'premium', 'Premium', 'Highest AI allowance, dedicated tutor priority matching, and priority support.', 1000000, 'NGN', 'monthly', 'PLN_premium_monthly', true, 4)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  amount_kobo = EXCLUDED.amount_kobo,
  currency = EXCLUDED.currency,
  interval = EXCLUDED.interval,
  paystack_plan_code = EXCLUDED.paystack_plan_code,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order,
  updated_at = CURRENT_TIMESTAMP;

-- Feature Definitions
INSERT INTO public.feature_definitions (id, code, name, description, category)
VALUES 
  ('feat_cgpa_basic', 'CGPA_BASIC', 'Core CGPA Calculator', 'Multi-scale grade calculation and semester units tally', 'academic'),
  ('feat_cgpa_advanced', 'CGPA_ADVANCED', 'Target GPA Modeling', 'Target grade forecasting and graduation honors projections', 'academic'),
  ('feat_study_planner_basic', 'STUDY_PLANNER_BASIC', 'Study Habit Planner', 'Organize study plans and track weekly syllabus checklists', 'study'),
  ('feat_study_planner_advanced', 'STUDY_PLANNER_ADVANCED', 'Unlimited Study Engine', 'Unlimited concurrent study plans, automated topic pacing, and streaks', 'study'),
  ('feat_test_prep_basic', 'TEST_PREP_BASIC', 'Practice Exam Drills', 'Simulated practice tests and diagnostic feedback', 'exam'),
  ('feat_test_prep_advanced', 'TEST_PREP_ADVANCED', 'Unlimited Exam Simulation', 'Unlimited mock exams, timed drills, and weak topic breakdowns', 'exam'),
  ('feat_ai_tutor', 'AI_TUTOR', 'AI Academic Assistant', 'Contextual coursework explanations and step-by-step problem solver', 'ai'),
  ('feat_ai_tutor_advanced', 'AI_TUTOR_ADVANCED', 'Advanced AI Tutor Modes', 'Multi-mode tutoring: explain, deep study, quiz generator, and flashcards', 'ai'),
  ('feat_tutor_marketplace', 'TUTOR_MARKETPLACE', 'Tutor Directory', 'Browse verified campus subject-matter tutors and ratings', 'tutoring'),
  ('feat_tutor_booking', 'TUTOR_BOOKING', 'Tutor Session Booking', 'Schedule and book 1-on-1 tutoring sessions', 'tutoring'),
  ('feat_video_tutoring', 'VIDEO_TUTORING', 'ZEGOCLOUD Video Tutoring', 'Live interactive video calls, whiteboard, and screen sharing', 'tutoring'),
  ('feat_private_groups', 'PRIVATE_GROUPS', 'Private Study Groups', 'Create and join private peer study channels and shared resources', 'community'),
  ('feat_advanced_analytics', 'ADVANCED_ANALYTICS', 'Predictive Academic Analytics', 'Grade trends, velocity graphs, and performance diagnostics', 'analytics'),
  ('feat_premium_resources', 'PREMIUM_RESOURCES', 'Curated Academic Vault', 'Verified past exams, lecture notes, and revision sheets', 'resources'),
  ('feat_priority_support', 'PRIORITY_SUPPORT', 'Priority Academic Support', 'Expedited tutor matching and platform customer support', 'support')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- Plan Entitlements
INSERT INTO public.plan_entitlements (id, plan_id, feature_code, is_enabled, limit_value)
VALUES 
  -- Basic (Free)
  ('ent_basic_cgpa_basic', 'plan_basic', 'CGPA_BASIC', true, NULL),
  ('ent_basic_cgpa_advanced', 'plan_basic', 'CGPA_ADVANCED', false, NULL),
  ('ent_basic_study_planner_basic', 'plan_basic', 'STUDY_PLANNER_BASIC', true, 2),
  ('ent_basic_study_planner_advanced', 'plan_basic', 'STUDY_PLANNER_ADVANCED', false, NULL),
  ('ent_basic_test_prep_basic', 'plan_basic', 'TEST_PREP_BASIC', true, 3),
  ('ent_basic_test_prep_advanced', 'plan_basic', 'TEST_PREP_ADVANCED', false, NULL),
  ('ent_basic_ai_tutor', 'plan_basic', 'AI_TUTOR', true, 10),
  ('ent_basic_ai_tutor_advanced', 'plan_basic', 'AI_TUTOR_ADVANCED', false, NULL),
  ('ent_basic_tutor_marketplace', 'plan_basic', 'TUTOR_MARKETPLACE', true, NULL),
  ('ent_basic_tutor_booking', 'plan_basic', 'TUTOR_BOOKING', false, NULL),
  ('ent_basic_video_tutoring', 'plan_basic', 'VIDEO_TUTORING', false, NULL),
  ('ent_basic_private_groups', 'plan_basic', 'PRIVATE_GROUPS', false, NULL),
  ('ent_basic_advanced_analytics', 'plan_basic', 'ADVANCED_ANALYTICS', false, NULL),
  ('ent_basic_premium_resources', 'plan_basic', 'PREMIUM_RESOURCES', false, NULL),
  ('ent_basic_priority_support', 'plan_basic', 'PRIORITY_SUPPORT', false, NULL),

  -- Student
  ('ent_student_cgpa_basic', 'plan_student', 'CGPA_BASIC', true, NULL),
  ('ent_student_cgpa_advanced', 'plan_student', 'CGPA_ADVANCED', true, NULL),
  ('ent_student_study_planner_basic', 'plan_student', 'STUDY_PLANNER_BASIC', true, NULL),
  ('ent_student_study_planner_advanced', 'plan_student', 'STUDY_PLANNER_ADVANCED', true, NULL),
  ('ent_student_test_prep_basic', 'plan_student', 'TEST_PREP_BASIC', true, 15),
  ('ent_student_test_prep_advanced', 'plan_student', 'TEST_PREP_ADVANCED', true, 15),
  ('ent_student_ai_tutor', 'plan_student', 'AI_TUTOR', true, 100),
  ('ent_student_ai_tutor_advanced', 'plan_student', 'AI_TUTOR_ADVANCED', false, NULL),
  ('ent_student_tutor_marketplace', 'plan_student', 'TUTOR_MARKETPLACE', true, NULL),
  ('ent_student_tutor_booking', 'plan_student', 'TUTOR_BOOKING', true, 5),
  ('ent_student_video_tutoring', 'plan_student', 'VIDEO_TUTORING', false, NULL),
  ('ent_student_private_groups', 'plan_student', 'PRIVATE_GROUPS', true, NULL),
  ('ent_student_advanced_analytics', 'plan_student', 'ADVANCED_ANALYTICS', false, NULL),
  ('ent_student_premium_resources', 'plan_student', 'PREMIUM_RESOURCES', true, NULL),
  ('ent_student_priority_support', 'plan_student', 'PRIORITY_SUPPORT', false, NULL),

  -- Pro
  ('ent_pro_cgpa_basic', 'plan_pro', 'CGPA_BASIC', true, NULL),
  ('ent_pro_cgpa_advanced', 'plan_pro', 'CGPA_ADVANCED', true, NULL),
  ('ent_pro_study_planner_basic', 'plan_pro', 'STUDY_PLANNER_BASIC', true, NULL),
  ('ent_pro_study_planner_advanced', 'plan_pro', 'STUDY_PLANNER_ADVANCED', true, NULL),
  ('ent_pro_test_prep_basic', 'plan_pro', 'TEST_PREP_BASIC', true, NULL),
  ('ent_pro_test_prep_advanced', 'plan_pro', 'TEST_PREP_ADVANCED', true, NULL),
  ('ent_pro_ai_tutor', 'plan_pro', 'AI_TUTOR', true, 300),
  ('ent_pro_ai_tutor_advanced', 'plan_pro', 'AI_TUTOR_ADVANCED', true, 300),
  ('ent_pro_tutor_marketplace', 'plan_pro', 'TUTOR_MARKETPLACE', true, NULL),
  ('ent_pro_tutor_booking', 'plan_pro', 'TUTOR_BOOKING', true, NULL),
  ('ent_pro_video_tutoring', 'plan_pro', 'VIDEO_TUTORING', true, 10),
  ('ent_pro_private_groups', 'plan_pro', 'PRIVATE_GROUPS', true, NULL),
  ('ent_pro_advanced_analytics', 'plan_pro', 'ADVANCED_ANALYTICS', true, NULL),
  ('ent_pro_premium_resources', 'plan_pro', 'PREMIUM_RESOURCES', true, NULL),
  ('ent_pro_priority_support', 'plan_pro', 'PRIORITY_SUPPORT', false, NULL),

  -- Premium
  ('ent_premium_cgpa_basic', 'plan_premium', 'CGPA_BASIC', true, NULL),
  ('ent_premium_cgpa_advanced', 'plan_premium', 'CGPA_ADVANCED', true, NULL),
  ('ent_premium_study_planner_basic', 'plan_premium', 'STUDY_PLANNER_BASIC', true, NULL),
  ('ent_premium_study_planner_advanced', 'plan_premium', 'STUDY_PLANNER_ADVANCED', true, NULL),
  ('ent_premium_test_prep_basic', 'plan_premium', 'TEST_PREP_BASIC', true, NULL),
  ('ent_premium_test_prep_advanced', 'plan_premium', 'TEST_PREP_ADVANCED', true, NULL),
  ('ent_premium_ai_tutor', 'plan_premium', 'AI_TUTOR', true, 1000),
  ('ent_premium_ai_tutor_advanced', 'plan_premium', 'AI_TUTOR_ADVANCED', true, 1000),
  ('ent_premium_tutor_marketplace', 'plan_premium', 'TUTOR_MARKETPLACE', true, NULL),
  ('ent_premium_tutor_booking', 'plan_premium', 'TUTOR_BOOKING', true, NULL),
  ('ent_premium_video_tutoring', 'plan_premium', 'VIDEO_TUTORING', true, NULL),
  ('ent_premium_private_groups', 'plan_premium', 'PRIVATE_GROUPS', true, NULL),
  ('ent_premium_advanced_analytics', 'plan_premium', 'ADVANCED_ANALYTICS', true, NULL),
  ('ent_premium_premium_resources', 'plan_premium', 'PREMIUM_RESOURCES', true, NULL),
  ('ent_premium_priority_support', 'plan_premium', 'PRIORITY_SUPPORT', true, NULL)
ON CONFLICT (plan_id, feature_code) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  limit_value = EXCLUDED.limit_value,
  updated_at = CURRENT_TIMESTAMP;

-- 8. AUTOMATIC USER PROVISIONING & CONFIRMATION TRIGGERS

CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_institution TEXT;
  v_department TEXT;
  v_academic_level TEXT;
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'fullName',
    split_part(NEW.email, '@', 1)
  );
  v_institution := COALESCE(NEW.raw_user_meta_data->>'institution', 'General Academy');
  v_department := COALESCE(NEW.raw_user_meta_data->>'department', 'General Studies');
  v_academic_level := COALESCE(
    NEW.raw_user_meta_data->>'academic_level',
    NEW.raw_user_meta_data->>'academicLevel',
    'Year 1'
  );

  -- 1. Provision User Profile
  INSERT INTO public.profiles (
    id, full_name, institution, department, academic_level, bio, academic_interests, study_preferences, is_public
  ) VALUES (
    NEW.id,
    v_full_name,
    v_institution,
    v_department,
    v_academic_level,
    'Student on Studora',
    '[]'::jsonb,
    '[]'::jsonb,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    institution = COALESCE(EXCLUDED.institution, profiles.institution),
    department = COALESCE(EXCLUDED.department, profiles.department),
    academic_level = COALESCE(EXCLUDED.academic_level, profiles.academic_level),
    updated_at = CURRENT_TIMESTAMP;

  -- 2. Provision User Academic Scale Settings
  INSERT INTO public.user_settings (user_id, selected_scale)
  VALUES (NEW.id, '5.0')
  ON CONFLICT (user_id) DO NOTHING;

  -- 3. Provision Default Active Basic Plan Subscription
  INSERT INTO public.user_subscriptions (
    id, user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end
  ) VALUES (
    'sub_' || NEW.id,
    NEW.id,
    'plan_basic',
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '365 days',
    false
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger attached to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. POSTGRESQL ROW LEVEL SECURITY (RLS) POLICIES

-- Reference Tables: Anyone (authenticated + anon) can view
ALTER TABLE public.grading_scales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view grading scales" ON public.grading_scales;
CREATE POLICY "Public can view grading scales" ON public.grading_scales FOR SELECT USING (true);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view active subscription plans" ON public.subscription_plans;
CREATE POLICY "Public can view active subscription plans" ON public.subscription_plans FOR SELECT USING (is_active = true);

ALTER TABLE public.feature_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view feature definitions" ON public.feature_definitions;
CREATE POLICY "Public can view feature definitions" ON public.feature_definitions FOR SELECT USING (true);

ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view plan entitlements" ON public.plan_entitlements;
CREATE POLICY "Public can view plan entitlements" ON public.plan_entitlements FOR SELECT USING (true);

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public or owner can view profiles" ON public.profiles;
CREATE POLICY "Public or owner can view profiles" ON public.profiles 
  FOR SELECT USING (is_public = true OR auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- User Settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own settings" ON public.user_settings;
CREATE POLICY "Users manage their own settings" ON public.user_settings 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Semesters
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own semesters" ON public.semesters;
CREATE POLICY "Users manage their own semesters" ON public.semesters 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Student Courses
ALTER TABLE public.student_courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own courses" ON public.student_courses;
CREATE POLICY "Users manage their own courses" ON public.student_courses 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Study Plans
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own study plans" ON public.study_plans;
CREATE POLICY "Users manage their own study plans" ON public.study_plans 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Study Topics
ALTER TABLE public.study_topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own study topics" ON public.study_topics;
CREATE POLICY "Users manage their own study topics" ON public.study_topics 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Study Logs
ALTER TABLE public.study_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own study logs" ON public.study_logs;
CREATE POLICY "Users manage their own study logs" ON public.study_logs 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Consent Records
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view their own consent records" ON public.consent_records;
CREATE POLICY "Users view their own consent records" ON public.consent_records 
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users insert consent records" ON public.consent_records;
CREATE POLICY "Users insert consent records" ON public.consent_records 
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- User Subscriptions
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view their own subscription" ON public.user_subscriptions;
CREATE POLICY "Users view their own subscription" ON public.user_subscriptions 
  FOR SELECT USING (auth.uid() = user_id);

-- Payment Transactions
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view their own payment transactions" ON public.payment_transactions;
CREATE POLICY "Users view their own payment transactions" ON public.payment_transactions 
  FOR SELECT USING (auth.uid() = user_id);

-- Subscription Usage
ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view their own subscription usage" ON public.subscription_usage;
CREATE POLICY "Users view their own usage" ON public.subscription_usage 
  FOR SELECT USING (auth.uid() = user_id);

-- Payment Webhook Events (Zero public access - service role only)
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
