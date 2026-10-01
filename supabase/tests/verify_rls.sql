-- ==============================================================================
-- STUDORA — RLS & AUTH PROVISIONING VERIFICATION SCRIPT
-- ==============================================================================

DO $$
DECLARE
  v_user_a UUID := 'a0000000-0000-0000-0000-000000000001';
  v_user_b UUID := 'b0000000-0000-0000-0000-000000000002';
  v_count INT;
  v_a_see_a INT;
  v_a_see_b INT;
  v_a_see_b_settings INT;
  v_a_see_b_courses INT;
  v_b_see_b INT;
  v_b_see_a INT;
  v_anon_plans INT;
  v_anon_courses INT;
  v_anon_scales INT;
  v_anon_plans_ref INT;
BEGIN
  -- 1. Insert into auth.users (Trigger will fire)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES 
    (v_user_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test.user.a@studora.local', 'password', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Test User A","institution":"Apex University"}', NOW(), NOW()),
    (v_user_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test.user.b@studora.local', 'password', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Test User B","institution":"Apex University"}', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  -- 2. Verify Trigger created profiles
  SELECT COUNT(*) INTO v_count FROM public.profiles WHERE id IN (v_user_a, v_user_b);
  IF v_count < 2 THEN
    RAISE EXCEPTION 'Trigger Failed: Profiles not created for test users (count: %)', v_count;
  END IF;

  -- 3. Verify Trigger created user_settings
  SELECT COUNT(*) INTO v_count FROM public.user_settings WHERE user_id IN (v_user_a, v_user_b);
  IF v_count < 2 THEN
    RAISE EXCEPTION 'Trigger Failed: Settings not created for test users (count: %)', v_count;
  END IF;

  -- 4. Verify Trigger created default basic subscriptions
  SELECT COUNT(*) INTO v_count FROM public.user_subscriptions WHERE user_id IN (v_user_a, v_user_b);
  IF v_count < 2 THEN
    RAISE EXCEPTION 'Trigger Failed: Subscriptions not created for test users (count: %)', v_count;
  END IF;

  -- 5. Insert private study plans for both users
  INSERT INTO public.study_plans (id, user_id, subject, goal, deadline, study_frequency)
  VALUES 
    ('plan_test_user_a', v_user_a, 'User A Private Math', 'Goal A', CURRENT_DATE + 30, 'Daily'),
    ('plan_test_user_b', v_user_b, 'User B Private Physics', 'Goal B', CURRENT_DATE + 30, 'Daily')
  ON CONFLICT (id) DO UPDATE SET subject = EXCLUDED.subject;

  -- 6. Insert private semesters and courses
  INSERT INTO public.semesters (id, user_id, academic_year, semester_name, display_order)
  VALUES 
    ('sem_test_a', v_user_a, 'Year 1', 'Semester A', 1),
    ('sem_test_b', v_user_b, 'Year 1', 'Semester B', 1)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.student_courses (id, semester_id, user_id, course_code, course_title, credit_units, letter_grade)
  VALUES 
    ('crs_test_a', 'sem_test_a', v_user_a, 'MTH101', 'Calculus A', 3, 'A'),
    ('crs_test_b', 'sem_test_b', v_user_b, 'PHY101', 'Physics B', 3, 'B')
  ON CONFLICT (id) DO NOTHING;

  -- 7. Test User A Isolation
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a, 'role', 'authenticated')::text, true);

  SELECT COUNT(*) INTO v_a_see_a FROM public.study_plans WHERE id = 'plan_test_user_a';
  IF v_a_see_a <> 1 THEN
    RAISE EXCEPTION 'RLS VIOLATION: User A cannot see their own study plan! (found: %)', v_a_see_a;
  END IF;

  SELECT COUNT(*) INTO v_a_see_b FROM public.study_plans WHERE id = 'plan_test_user_b';
  IF v_a_see_b <> 0 THEN
    RAISE EXCEPTION 'RLS VIOLATION: User A CAN ACCESS User B study plan! (found: %)', v_a_see_b;
  END IF;

  SELECT COUNT(*) INTO v_a_see_b_settings FROM public.user_settings WHERE user_id = v_user_b;
  IF v_a_see_b_settings <> 0 THEN
    RAISE EXCEPTION 'RLS VIOLATION: User A CAN ACCESS User B settings! (found: %)', v_a_see_b_settings;
  END IF;

  SELECT COUNT(*) INTO v_a_see_b_courses FROM public.student_courses WHERE user_id = v_user_b;
  IF v_a_see_b_courses <> 0 THEN
    RAISE EXCEPTION 'RLS VIOLATION: User A CAN ACCESS User B student courses! (found: %)', v_a_see_b_courses;
  END IF;

  -- 8. Test User B Isolation
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_b, 'role', 'authenticated')::text, true);

  SELECT COUNT(*) INTO v_b_see_b FROM public.study_plans WHERE id = 'plan_test_user_b';
  IF v_b_see_b <> 1 THEN
    RAISE EXCEPTION 'RLS VIOLATION: User B cannot see their own study plan! (found: %)', v_b_see_b;
  END IF;

  SELECT COUNT(*) INTO v_b_see_a FROM public.study_plans WHERE id = 'plan_test_user_a';
  IF v_b_see_a <> 0 THEN
    RAISE EXCEPTION 'RLS VIOLATION: User B CAN ACCESS User A study plan! (found: %)', v_b_see_a;
  END IF;

  -- 9. Test Anonymous Isolation
  PERFORM set_config('role', 'anon', true);
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);

  SELECT COUNT(*) INTO v_anon_plans FROM public.study_plans;
  IF v_anon_plans <> 0 THEN
    RAISE EXCEPTION 'RLS VIOLATION: Anonymous user can view study plans! (found: %)', v_anon_plans;
  END IF;

  SELECT COUNT(*) INTO v_anon_courses FROM public.student_courses;
  IF v_anon_courses <> 0 THEN
    RAISE EXCEPTION 'RLS VIOLATION: Anonymous user can view student courses! (found: %)', v_anon_courses;
  END IF;

  SELECT COUNT(*) INTO v_anon_scales FROM public.grading_scales;
  IF v_anon_scales < 3 THEN
    RAISE EXCEPTION 'RLS VIOLATION: Anonymous user cannot read grading scales! (found: %)', v_anon_scales;
  END IF;

  SELECT COUNT(*) INTO v_anon_plans_ref FROM public.subscription_plans WHERE is_active = true;
  IF v_anon_plans_ref < 4 THEN
    RAISE EXCEPTION 'RLS VIOLATION: Anonymous user cannot read subscription plans! (found: %)', v_anon_plans_ref;
  END IF;

  -- 10. Clean up test records
  PERFORM set_config('role', 'postgres', true);
  DELETE FROM public.student_courses WHERE id IN ('crs_test_a', 'crs_test_b');
  DELETE FROM public.semesters WHERE id IN ('sem_test_a', 'sem_test_b');
  DELETE FROM public.study_plans WHERE id IN ('plan_test_user_a', 'plan_test_user_b');
  DELETE FROM auth.users WHERE id IN (v_user_a, v_user_b);

  RAISE NOTICE 'ALL RLS AND USER PROVISIONING CHECKS PASSED PERFECTLY!';
END $$;

SELECT 'RLS VERIFICATION SUCCESSFUL: User A and B isolated, anon blocked from private data.' as verification_status;
