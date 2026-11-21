-- 20261114010000_studora_phase_c_video_recommendations.sql
-- Studora Phase C: Educational Video Recommendations & Progress Tracking
-- Adds student_video_progress table with strict Row Level Security (RLS) and user isolation.
-- Prepared for explicit review without destructive operations.

CREATE TABLE IF NOT EXISTS public.student_video_progress (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'viewed', -- 'viewed' | 'completed'
  last_watched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_student_video_progress_user ON public.student_video_progress(user_id, status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.student_video_progress ENABLE ROW LEVEL SECURITY;

-- Strict Isolation Policy: Users can only select and modify their own video progress records
DROP POLICY IF EXISTS "Students manage their own video progress" ON public.student_video_progress;
CREATE POLICY "Students manage their own video progress" ON public.student_video_progress
  FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
