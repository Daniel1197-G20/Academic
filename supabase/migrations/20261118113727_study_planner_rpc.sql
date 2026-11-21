-- Keep plan/topic creation and study logging atomic under the caller's RLS.
CREATE OR REPLACE FUNCTION public.create_study_plan(
  p_subject TEXT,
  p_goal TEXT,
  p_deadline DATE,
  p_study_frequency TEXT DEFAULT 'Daily',
  p_difficulty TEXT DEFAULT 'Medium',
  p_estimated_hours NUMERIC DEFAULT 10,
  p_topics JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_plan_id TEXT := 'plan_' || pg_catalog.gen_random_uuid()::TEXT;
  v_subject TEXT := pg_catalog.btrim(p_subject);
  v_goal TEXT := pg_catalog.btrim(p_goal);
  v_topics JSONB;
  v_frequency TEXT := COALESCE(NULLIF(pg_catalog.btrim(p_study_frequency), ''), 'Daily');
  v_difficulty TEXT := COALESCE(NULLIF(pg_catalog.btrim(p_difficulty), ''), 'Medium');
  v_estimated_hours NUMERIC := COALESCE(NULLIF(p_estimated_hours, 0), 10);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '28000';
  END IF;
  IF v_subject = '' OR v_goal = '' OR p_deadline IS NULL THEN
    RAISE EXCEPTION 'Subject, goal, and deadline are required.' USING ERRCODE = '22023';
  END IF;
  IF v_estimated_hours < 0 OR v_estimated_hours > 9999 THEN
    RAISE EXCEPTION 'Estimated study hours are outside the supported range.' USING ERRCODE = '22023';
  END IF;
  IF p_topics IS NOT NULL AND pg_catalog.jsonb_typeof(p_topics) <> 'array' THEN
    RAISE EXCEPTION 'Topics must be an array.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.study_plans (
    id, user_id, subject, goal, deadline, study_frequency, difficulty, estimated_hours, logged_hours
  ) VALUES (
    v_plan_id, v_user_id, v_subject, v_goal, p_deadline, v_frequency, v_difficulty, v_estimated_hours, 0
  );

  WITH topic_input AS (
    SELECT
      CASE
        WHEN pg_catalog.jsonb_typeof(item.value) = 'string' THEN item.value #>> '{}'
        ELSE item.value ->> 'title'
      END AS title,
      item.ordinality::INTEGER AS display_order
    FROM pg_catalog.jsonb_array_elements(COALESCE(p_topics, '[]'::JSONB)) WITH ORDINALITY AS item(value, ordinality)
  ), inserted AS (
    INSERT INTO public.study_topics (id, study_plan_id, user_id, title, is_completed, display_order)
    SELECT
      'top_' || pg_catalog.gen_random_uuid()::TEXT,
      v_plan_id,
      v_user_id,
      pg_catalog.btrim(topic_input.title),
      false,
      topic_input.display_order
    FROM topic_input
    WHERE topic_input.title IS NOT NULL AND pg_catalog.btrim(topic_input.title) <> ''
    RETURNING id, study_plan_id, user_id, title, is_completed, display_order
  )
  SELECT COALESCE(
    pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'id', inserted.id,
      'study_plan_id', inserted.study_plan_id,
      'user_id', inserted.user_id,
      'title', inserted.title,
      'is_completed', inserted.is_completed,
      'display_order', inserted.display_order
    ) ORDER BY inserted.display_order),
    '[]'::JSONB
  )
  INTO v_topics
  FROM inserted;

  RETURN pg_catalog.jsonb_build_object(
    'plan', pg_catalog.jsonb_build_object(
      'id', v_plan_id,
      'user_id', v_user_id,
      'subject', v_subject,
      'goal', v_goal,
      'deadline', p_deadline,
      'study_frequency', v_frequency,
      'difficulty', v_difficulty,
      'estimated_hours', v_estimated_hours,
      'logged_hours', 0,
      'topics', v_topics
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_study_topic(p_topic_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_completed BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '28000';
  END IF;

  UPDATE public.study_topics
  SET is_completed = NOT is_completed,
      completed_at = CASE WHEN NOT is_completed THEN CURRENT_TIMESTAMP ELSE NULL END
  WHERE id = p_topic_id AND user_id = v_user_id
  RETURNING is_completed INTO v_is_completed;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Topic not found or unauthorized.' USING ERRCODE = 'P0002';
  END IF;

  RETURN pg_catalog.jsonb_build_object('success', true, 'is_completed', v_is_completed);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_study_session(
  p_plan_id TEXT,
  p_duration_minutes INTEGER,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_log_id TEXT := 'log_' || pg_catalog.gen_random_uuid()::TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '28000';
  END IF;
  IF p_duration_minutes IS NULL OR p_duration_minutes < 1 OR p_duration_minutes > 1440 THEN
    RAISE EXCEPTION 'Duration must be between 1 and 1440 minutes.' USING ERRCODE = '22023';
  END IF;
  IF p_plan_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.study_plans WHERE id = p_plan_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Study plan not found or unauthorized.' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.study_logs (id, user_id, study_plan_id, duration_minutes, notes, logged_at)
  VALUES (v_log_id, v_user_id, p_plan_id, p_duration_minutes, COALESCE(p_notes, ''), CURRENT_DATE);

  IF p_plan_id IS NOT NULL THEN
    UPDATE public.study_plans
    SET logged_hours = logged_hours + pg_catalog.round(p_duration_minutes::NUMERIC / 60, 1)
    WHERE id = p_plan_id AND user_id = v_user_id;
  END IF;

  RETURN pg_catalog.jsonb_build_object('success', true, 'logId', v_log_id);
END;
$$;

REVOKE ALL ON FUNCTION public.create_study_plan(TEXT, TEXT, DATE, TEXT, TEXT, NUMERIC, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.toggle_study_topic(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_study_session(TEXT, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_study_plan(TEXT, TEXT, DATE, TEXT, TEXT, NUMERIC, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_study_topic(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_study_session(TEXT, INTEGER, TEXT) TO authenticated;
