-- ==============================================================================
-- STUDORA — SECURITY & ROLE-BASED ACCESS CONTROL (RBAC) VERIFICATION
-- Tests: Student A, Student B, Tutor, Admin, Unauthenticated Visitor
-- Tests intentional unauthorized access & role elevation prevention
-- ==============================================================================

DO $$
DECLARE
  v_student_a UUID := 'a0000000-0000-0000-0000-000000000001';
  v_student_b UUID := 'b0000000-0000-0000-0000-000000000002';
  v_tutor_id  UUID := 'c0000000-0000-0000-0000-000000000003';
  v_admin_id  UUID := 'd0000000-0000-0000-0000-000000000004';
  
  v_count INT;
  v_role TEXT;
  v_role_elevation_caught BOOLEAN := false;
  v_student_a_see_b_plans INT;
  v_tutor_see_student_plans INT;
  v_admin_see_all_profiles INT;
  v_anon_see_plans INT;
  v_tutor_see_own_availability INT;
  v_student_booking_count INT;
BEGIN
  -- Clean previous test accounts to test triggers from scratch
  DELETE FROM auth.users WHERE id IN (v_student_a, v_student_b, v_tutor_id, v_admin_id);

  -- 1. SETUP IDENTITIES IN auth.users
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES 
    (v_student_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student.a@studora.local', 'pass123', NOW(), '{"provider":"email"}', '{"full_name":"Student A","role":"admin"}', NOW(), NOW()),
    (v_student_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student.b@studora.local', 'pass123', NOW(), '{"provider":"email"}', '{"full_name":"Student B"}', NOW(), NOW()),
    (v_tutor_id,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tutor@studora.local',     'pass123', NOW(), '{"provider":"email"}', '{"full_name":"Prof. Tutor"}', NOW(), NOW()),
    (v_admin_id,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@studora.local',     'pass123', NOW(), '{"provider":"email"}', '{"full_name":"Admin User"}', NOW(), NOW());

  -- 2. VERIFY PROVISIONING DEFAULTED STUDENT A TO 'student' (IGNORED CLIENT-SUPPLIED 'admin' ROLE)
  SELECT role INTO STRICT v_role FROM public.profiles WHERE id = v_student_a;
  IF v_role <> 'student' THEN
    RAISE EXCEPTION 'SECURITY BREACH: Client metadata elevated Student A to %!', v_role;
  END IF;

  -- Assign Tutor and Admin roles securely via server/service-level role
  UPDATE public.profiles SET role = 'tutor' WHERE id = v_tutor_id;
  UPDATE public.profiles SET role = 'admin' WHERE id = v_admin_id;

  -- 3. TEST INTENTIONAL UNAUTHORIZED ROLE ELEVATION ATTEMPT BY STUDENT A
  -- Simulate Student A attempting to run UPDATE profiles SET role = 'admin'
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_student_a, 'role', 'authenticated')::text, true);

  BEGIN
    UPDATE public.profiles SET role = 'admin' WHERE id = v_student_a;
    v_role_elevation_caught := false;
  EXCEPTION WHEN OTHERS THEN
    v_role_elevation_caught := true;
  END;

  IF NOT v_role_elevation_caught THEN
    RAISE EXCEPTION 'SECURITY BREACH: Student A was able to self-elevate role to admin!';
  END IF;

  -- 4. INSERT DATA TO TEST STUDENT ISOLATION
  PERFORM set_config('role', 'service_role', true);
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  INSERT INTO public.study_plans (id, user_id, subject, goal, deadline, study_frequency)
  VALUES 
    ('plan_sec_a', v_student_a, 'Student A Confidential Organic Chemistry', 'A Grade', CURRENT_DATE + 30, 'Daily'),
    ('plan_sec_b', v_student_b, 'Student B Confidential Advanced Calculus', 'A Grade', CURRENT_DATE + 30, 'Daily')
  ON CONFLICT (id) DO NOTHING;

  -- Setup Tutor Availability & Booking
  INSERT INTO public.tutor_profiles (id, title, hourly_rate, is_verified)
  VALUES (v_tutor_id, 'Lead Math Specialist', 5000, true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.tutor_availability (id, tutor_id, day_of_week, start_time, end_time, is_active)
  VALUES ('avail_tutor_1', v_tutor_id, 1, '14:00', '18:00', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.tutor_bookings (id, student_id, tutor_id, subject, slot_time, status)
  VALUES ('book_sec_1', v_student_a, v_tutor_id, 'Calculus Derivatives', '2026-10-15 15:00', 'confirmed')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.tutoring_sessions (id, booking_id, student_id, tutor_id, room_id, zego_room_id, status)
  VALUES ('sess_sec_1', 'book_sec_1', v_student_a, v_tutor_id, 'room_1', 'zego_room_1', 'scheduled')
  ON CONFLICT (id) DO NOTHING;

  -- 5. TEST STUDENT A ISOLATION
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_student_a, 'role', 'authenticated')::text, true);

  -- Student A attempts to read Student B's study plan
  SELECT COUNT(*) INTO v_student_a_see_b_plans FROM public.study_plans WHERE id = 'plan_sec_b';
  IF v_student_a_see_b_plans <> 0 THEN
    RAISE EXCEPTION 'SECURITY BREACH: Student A CAN READ Student B study plan!';
  END IF;

  -- Student A views their own tutor booking
  SELECT COUNT(*) INTO v_student_booking_count FROM public.tutor_bookings WHERE id = 'book_sec_1';
  IF v_student_booking_count <> 1 THEN
    RAISE EXCEPTION 'STUDENT ACCESS ERROR: Student A cannot view their booking!';
  END IF;

  -- 6. TEST TUTOR AUTHORIZATION & BOUNDARIES
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_tutor_id, 'role', 'authenticated')::text, true);

  -- Tutor MUST NOT be able to access Student B's private study plans
  SELECT COUNT(*) INTO v_tutor_see_student_plans FROM public.study_plans WHERE id = 'plan_sec_b';
  IF v_tutor_see_student_plans <> 0 THEN
    RAISE EXCEPTION 'SECURITY BREACH: Tutor can access unrelated student private study plans!';
  END IF;

  -- Tutor CAN access their own bookings and sessions
  SELECT COUNT(*) INTO v_tutor_see_own_availability FROM public.tutoring_sessions WHERE id = 'sess_sec_1';
  IF v_tutor_see_own_availability <> 1 THEN
    RAISE EXCEPTION 'TUTOR ACCESS ERROR: Tutor cannot view their assigned session!';
  END IF;

  -- 7. TEST ADMIN AUTHORIZATION
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_id, 'role', 'authenticated')::text, true);

  -- Admin can see profiles for management
  SELECT COUNT(*) INTO v_admin_see_all_profiles FROM public.profiles WHERE id IN (v_student_a, v_student_b, v_tutor_id);
  IF v_admin_see_all_profiles < 3 THEN
    RAISE EXCEPTION 'ADMIN ACCESS ERROR: Admin cannot view managed profiles (count: %)', v_admin_see_all_profiles;
  END IF;

  -- 8. TEST UNAUTHENTICATED VISITOR (ANON)
  PERFORM set_config('role', 'anon', true);
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);

  -- Anon cannot see private study plans
  SELECT COUNT(*) INTO v_anon_see_plans FROM public.study_plans WHERE id IN ('plan_sec_a', 'plan_sec_b');
  IF v_anon_see_plans <> 0 THEN
    RAISE EXCEPTION 'SECURITY BREACH: Anonymous visitor can view private study plans!';
  END IF;

  -- Anon CAN see public verified tutor profiles & public availability
  SELECT COUNT(*) INTO v_count FROM public.tutor_profiles WHERE id = v_tutor_id;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'CATALOG ERROR: Public cannot view verified tutor profile!';
  END IF;

  RAISE NOTICE 'SUCCESS: ALL RBAC AND RLS SECURITY ISOLATION TESTS PASSED!';
END $$;
