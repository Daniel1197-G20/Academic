-- ==============================================================================
-- STUDORA — AUTH ROLES, ROLE PROTECTION, TUTOR & ADMIN AUTHORIZATION
-- Migration: 20261001010000_studora_auth_roles_and_tutoring.sql
-- "Study smarter. Go further."
-- ==============================================================================

-- 1. ADD ROLE COLUMN TO PROFILES
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles 
      ADD COLUMN role TEXT NOT NULL DEFAULT 'student' 
      CHECK (role IN ('student', 'tutor', 'admin'));
  END IF;
END $$;

-- 2. HELPER FUNCTIONS FOR AUTHORIZATION
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tutor(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'tutor'
  );
$$;

-- 3. TRIGGER TO PREVENT CLIENT-SIDE ROLE ELEVATION
-- Prevents ordinary users from updating their own role column directly via client queries
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- If called by authenticated user from frontend client who is not an admin
    IF (auth.role() = 'authenticated' OR current_setting('role', true) = 'authenticated') AND NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Forbidden: Role assignment is controlled server-side only.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_role();

-- 4. UPDATE USER PROVISIONING TRIGGER TO ALWAYS DEFAULT TO 'student'
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

  -- 1. Provision User Profile with default role 'student' (Ignores client-supplied role)
  INSERT INTO public.profiles (
    id, full_name, institution, department, academic_level, bio, academic_interests, study_preferences, is_public, role
  ) VALUES (
    NEW.id,
    v_full_name,
    v_institution,
    v_department,
    v_academic_level,
    'Student on Studora',
    '[]'::jsonb,
    '[]'::jsonb,
    true,
    'student'
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

-- 5. TUTOR & SESSIONS TABLES
-- TUTOR PROFILES
CREATE TABLE IF NOT EXISTS public.tutor_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Accredited Tutor',
  hourly_rate INT NOT NULL DEFAULT 0,
  subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  bio TEXT,
  rating NUMERIC(3, 2) NOT NULL DEFAULT 5.0,
  review_count INT NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- TUTOR AVAILABILITY
CREATE TABLE IF NOT EXISTS public.tutor_availability (
  id TEXT PRIMARY KEY,
  tutor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- TUTOR BOOKINGS
CREATE TABLE IF NOT EXISTS public.tutor_bookings (
  id TEXT PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  slot_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- TUTORING SESSIONS
CREATE TABLE IF NOT EXISTS public.tutoring_sessions (
  id TEXT PRIMARY KEY,
  booking_id TEXT REFERENCES public.tutor_bookings(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL,
  zego_room_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  tutor_notes TEXT,
  student_rating INT CHECK (student_rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. ROW LEVEL SECURITY POLICIES FOR ROLES & TUTORING

-- Tutor Profiles
ALTER TABLE public.tutor_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view verified tutor profiles" ON public.tutor_profiles;
CREATE POLICY "Anyone can view verified tutor profiles" ON public.tutor_profiles
  FOR SELECT USING (is_verified = true OR auth.uid() = id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Tutors can update own tutor profile" ON public.tutor_profiles;
CREATE POLICY "Tutors can update own tutor profile" ON public.tutor_profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Tutors can insert own tutor profile" ON public.tutor_profiles;
CREATE POLICY "Tutors can insert own tutor profile" ON public.tutor_profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));

-- Tutor Availability
ALTER TABLE public.tutor_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active tutor availability" ON public.tutor_availability;
CREATE POLICY "Anyone can view active tutor availability" ON public.tutor_availability
  FOR SELECT USING (is_active = true OR auth.uid() = tutor_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Tutors can manage own availability" ON public.tutor_availability;
CREATE POLICY "Tutors can manage own availability" ON public.tutor_availability
  FOR ALL USING (auth.uid() = tutor_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = tutor_id OR public.is_admin(auth.uid()));

-- Tutor Bookings
ALTER TABLE public.tutor_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students and tutors can view their bookings" ON public.tutor_bookings;
CREATE POLICY "Students and tutors can view their bookings" ON public.tutor_bookings
  FOR SELECT USING (
    auth.uid() = student_id OR 
    auth.uid() = tutor_id OR 
    public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Students can create bookings" ON public.tutor_bookings;
CREATE POLICY "Students can create bookings" ON public.tutor_bookings
  FOR INSERT WITH CHECK (
    auth.uid() = student_id OR 
    public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Students and tutors can update their bookings" ON public.tutor_bookings;
CREATE POLICY "Students and tutors can update their bookings" ON public.tutor_bookings
  FOR UPDATE USING (
    auth.uid() = student_id OR 
    auth.uid() = tutor_id OR 
    public.is_admin(auth.uid())
  );

-- Tutoring Sessions
ALTER TABLE public.tutoring_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view their sessions" ON public.tutoring_sessions;
CREATE POLICY "Participants can view their sessions" ON public.tutoring_sessions
  FOR SELECT USING (
    auth.uid() = student_id OR 
    auth.uid() = tutor_id OR 
    public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Participants can update their sessions" ON public.tutoring_sessions;
CREATE POLICY "Participants can update their sessions" ON public.tutoring_sessions
  FOR UPDATE USING (
    auth.uid() = student_id OR 
    auth.uid() = tutor_id OR 
    public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Tutors or admins can create sessions" ON public.tutoring_sessions;
CREATE POLICY "Tutors or admins can create sessions" ON public.tutoring_sessions
  FOR INSERT WITH CHECK (
    auth.uid() = tutor_id OR 
    public.is_admin(auth.uid())
  );

-- Admin Permissions on Reference / Catalog Tables
DROP POLICY IF EXISTS "Admins can manage subscription plans" ON public.subscription_plans;
CREATE POLICY "Admins can manage subscription plans" ON public.subscription_plans
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage plan entitlements" ON public.plan_entitlements;
CREATE POLICY "Admins can manage plan entitlements" ON public.plan_entitlements
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin(auth.uid()));
