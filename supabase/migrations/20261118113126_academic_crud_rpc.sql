-- Duplicate a semester and its courses atomically for the signed-in owner.
CREATE OR REPLACE FUNCTION public.duplicate_semester(p_semester_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_academic_year TEXT;
  v_semester_name TEXT;
  v_display_order INTEGER;
  v_new_semester_id TEXT := 'sem_' || pg_catalog.gen_random_uuid()::TEXT;
  v_courses JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '28000';
  END IF;

  SELECT s.academic_year, s.semester_name
  INTO v_academic_year, v_semester_name
  FROM public.semesters AS s
  WHERE s.id = p_semester_id
    AND s.user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Semester not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(MAX(s.display_order), 0) + 1
  INTO v_display_order
  FROM public.semesters AS s
  WHERE s.user_id = v_user_id;

  INSERT INTO public.semesters (id, user_id, academic_year, semester_name, display_order)
  VALUES (v_new_semester_id, v_user_id, v_academic_year, v_semester_name || ' (Copy)', v_display_order);

  WITH inserted AS (
    INSERT INTO public.student_courses (
      id, semester_id, user_id, course_code, course_title, credit_units, letter_grade
    )
    SELECT
      'crs_' || pg_catalog.gen_random_uuid()::TEXT,
      v_new_semester_id,
      v_user_id,
      c.course_code,
      c.course_title,
      c.credit_units,
      c.letter_grade
    FROM public.student_courses AS c
    WHERE c.semester_id = p_semester_id
      AND c.user_id = v_user_id
    RETURNING id, semester_id, user_id, course_code, course_title, credit_units, letter_grade
  )
  SELECT COALESCE(
    pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'id', i.id,
      'semester_id', i.semester_id,
      'user_id', i.user_id,
      'course_code', i.course_code,
      'course_title', i.course_title,
      'credit_units', i.credit_units,
      'letter_grade', i.letter_grade
    )),
    '[]'::JSONB
  )
  INTO v_courses
  FROM inserted AS i;

  RETURN pg_catalog.jsonb_build_object(
    'semester', pg_catalog.jsonb_build_object(
      'id', v_new_semester_id,
      'user_id', v_user_id,
      'academic_year', v_academic_year,
      'semester_name', v_semester_name || ' (Copy)',
      'display_order', v_display_order,
      'courses', v_courses
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.duplicate_semester(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.duplicate_semester(TEXT) TO authenticated;
