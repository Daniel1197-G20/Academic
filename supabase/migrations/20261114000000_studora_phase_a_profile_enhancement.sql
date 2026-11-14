-- 20261114000000_studora_phase_a_profile_enhancement.sql
-- Studora Phase A: Profile Enhancement & Academic Taxonomy Alignment
-- Adds course_of_study and registered_subject_ids to profiles table safely and additively.
-- Note: As per project guidelines, this migration file is prepared for explicit review
-- and backward-compatible with the JSONB fallback strategy.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'course_of_study'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN course_of_study TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'registered_subject_ids'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN registered_subject_ids TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
END $$;
