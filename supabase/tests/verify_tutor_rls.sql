-- ==============================================================================
-- STUDORA — TUTOR RLS, STATE MACHINE & ASSESSMENT ENGINE SECURITY VERIFICATION
-- ==============================================================================

DO $$
DECLARE
  v_user_a UUID := 'b8e974c9-a9fd-45df-a361-f1986b6cefab'; -- Security Test Student
  v_user_b UUID := '6cb83e1e-a936-4457-9302-764403dfb688'; -- Amara Okafor
  v_app_id UUID;
  v_count INT;
  v_assessment_res JSONB;
  v_attempt_id UUID;
  v_submit_res JSONB;
  v_review_res JSONB;
  v_tutor_prof_count INT;
  v_blocked BOOLEAN := false;
BEGIN
  -- Ensure Admin user has admin role in profiles
  UPDATE public.profiles SET role = 'admin' WHERE id = v_admin;
  -- Ensure students have student role
  UPDATE public.profiles SET role = 'student' WHERE id IN (v_user_a, v_user_b);

  -- Clean up previous test applications for User A
  DELETE FROM public.tutor_applications WHERE user_id = v_user_a;

  -- 2. Student A inserts a draft tutor application
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a, 'role', 'authenticated')::text, true);

  INSERT INTO public.tutor_applications (
    user_id, status, institution, department, academic_level,
    selected_subject_ids, bio, teaching_approach
  ) VALUES (
    v_user_a, 'draft', 'Apex Institute of Technology', 'Computer Science', '300 Level',
    '["subj_cs"]'::jsonb, 'Passionate algorithms peer tutor.', 'Interactive problem solving and code trace.'
  ) RETURNING id INTO v_app_id;

  -- Verify Student A sees their own application
  EXECUTE 'SELECT COUNT(*) FROM public.tutor_applications WHERE id = $1' INTO v_count USING v_app_id;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST FAILED: Student A cannot see their own draft application (count: %)', v_count;
  END IF;

  -- 3. Verify Student B CANNOT see Student A's application
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_b, 'role', 'authenticated')::text, true);

  EXECUTE 'SELECT COUNT(*) FROM public.tutor_applications WHERE id = $1' INTO v_count USING v_app_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'SECURITY BREACH: Student B CAN SEE Student A application (count: %)', v_count;
  END IF;

  -- 4. Verify Anonymous CANNOT see Student A's application
  PERFORM set_config('role', 'anon', true);
  PERFORM set_config('request.jwt.claims', '{}', true);

  EXECUTE 'SELECT COUNT(*) FROM public.tutor_applications WHERE id = $1' INTO v_count USING v_app_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'SECURITY BREACH: Anonymous CAN SEE Student A application (count: %)', v_count;
  END IF;

  -- 5. Test Trigger: Student A CANNOT self-approve their application
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a, 'role', 'authenticated')::text, true);

  v_blocked := false;
  BEGIN
    UPDATE public.tutor_applications SET status = 'approved' WHERE id = v_app_id;
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'SECURITY BREACH: Student A was able to update status to approved directly!';
  END IF;

  -- 6. Test Trigger: Student A CANNOT manipulate assessment score directly
  v_blocked := false;
  BEGIN
    UPDATE public.tutor_applications SET assessment_score = 100.0, assessment_passed = true WHERE id = v_app_id;
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'SECURITY BREACH: Student A was able to fabricate assessment score directly!';
  END IF;

  -- 7. Test Non-Admin cannot call admin_review_tutor_application
  v_blocked := false;
  BEGIN
    PERFORM public.admin_review_tutor_application(v_app_id, 'approve', NULL, 'Self approval attempt');
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'SECURITY BREACH: Student A was able to execute admin_review_tutor_application!';
  END IF;

  -- 8. Test Assessment Engine: Start Assessment (strips answers)
  -- First update application to 'submitted'
  UPDATE public.tutor_applications SET status = 'submitted' WHERE id = v_app_id;

  v_assessment_res := public.start_tutor_assessment(v_app_id);
  v_attempt_id := (v_assessment_res->>'attempt_id')::UUID;

  IF v_attempt_id IS NULL THEN
    RAISE EXCEPTION 'TEST FAILED: start_tutor_assessment failed to return attempt_id';
  END IF;

  -- Verify questions array exists and DOES NOT contain 'correct_answer' or 'explanation'
  IF v_assessment_res->'questions' IS NULL OR jsonb_array_length(v_assessment_res->'questions') = 0 THEN
    RAISE EXCEPTION 'TEST FAILED: start_tutor_assessment returned empty questions';
  END IF;

  IF (v_assessment_res->'questions'->0 ? 'correct_answer') OR (v_assessment_res->'questions'->0 ? 'explanation') THEN
    RAISE EXCEPTION 'SECURITY BREACH: start_tutor_assessment EXPOSED correct_answer or explanation to client!';
  END IF;

  -- 9. Test Assessment Engine: Submit answers and server-side score
  -- Build an answer map giving correct answer 'C' for Q1 and 'B' for Q2
  v_submit_res := public.submit_tutor_assessment(
    v_attempt_id,
    jsonb_build_object(
      '00000000-0000-0000-0000-000000000001', 'C',
      '00000000-0000-0000-0000-000000000002', 'B',
      '00000000-0000-0000-0000-000000000003', 'B',
      '00000000-0000-0000-0000-000000000004', 'C',
      '00000000-0000-0000-0000-000000000005', 'B',
      '00000000-0000-0000-0000-000000000006', 'A',
      '00000000-0000-0000-0000-000000000007', 'B',
      '00000000-0000-0000-0000-000000000008', 'B'
    )
  );

  IF (v_submit_res->>'passed')::BOOLEAN <> true THEN
    RAISE EXCEPTION 'TEST FAILED: submit_tutor_assessment expected passed=true (res: %)', v_submit_res;
  END IF;

  -- Application status should now be pending_review
  SELECT status INTO v_count FROM public.tutor_applications WHERE id = v_app_id AND status = 'pending_review';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEST FAILED: Application status was not updated to pending_review after passing assessment!';
  END IF;

  -- 10. Test Admin Review: Admin approves Student A
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  v_review_res := public.admin_review_tutor_application(v_app_id, 'approve', NULL, 'Passed assessment with First Class distinction.');
  IF (v_review_res->>'success')::BOOLEAN <> true THEN
    RAISE EXCEPTION 'TEST FAILED: Admin review approve returned failure (res: %)', v_review_res;
  END IF;

  -- Verify Student A role is now 'tutor'
  SELECT COUNT(*) INTO v_count FROM public.profiles WHERE id = v_user_a AND role = 'tutor';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST FAILED: Student A profile role was not updated to tutor!';
  END IF;

  -- Verify Tutor profile was created and is active
  SELECT COUNT(*) INTO v_count FROM public.tutor_profiles WHERE id = v_user_a AND is_verified = true AND is_active = true;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST FAILED: tutor_profiles was not activated for approved tutor!';
  END IF;

  -- 11. Test Marketplace Visibility: Anonymous / Public can now see approved active tutor
  PERFORM set_config('role', 'anon', true);
  PERFORM set_config('request.jwt.claims', '{}', true);

  EXECUTE 'SELECT COUNT(*) FROM public.tutor_profiles WHERE id = $1' INTO v_tutor_prof_count USING v_user_a;
  IF v_tutor_prof_count <> 1 THEN
    RAISE EXCEPTION 'TEST FAILED: Approved tutor is not visible in public marketplace (count: %)', v_tutor_prof_count;
  END IF;

  -- 12. Test Admin Suspension: Admin suspends tutor
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  PERFORM public.admin_set_tutor_suspension(v_user_a, true, 'Temporary academic sabbatical');

  -- Public cannot see suspended tutor anymore!
  PERFORM set_config('role', 'anon', true);
  PERFORM set_config('request.jwt.claims', '{}', true);

  EXECUTE 'SELECT COUNT(*) FROM public.tutor_profiles WHERE id = $1' INTO v_tutor_prof_count USING v_user_a;
  IF v_tutor_prof_count <> 0 THEN
    RAISE EXCEPTION 'SECURITY BREACH: Suspended tutor is still visible to anonymous public!';
  END IF;

  RAISE NOTICE 'SUCCESS: ALL 12 TUTOR PLATFORM, ASSESSMENT & RLS TESTS PASSED COMPLETELY.';
END $$;
