-- SEC-004: Drop legacy overlapping SELECT policy on tutor_profiles
-- The legacy policy "Anyone can view verified tutor profiles" checks only
-- is_verified, allowing suspended/inactive/hidden tutors to remain publicly
-- visible. The newer policy "Anyone can view verified active tutor profiles"
-- (created in 20261002000000_studora_tutor_platform_and_assessment.sql) correctly
-- requires is_verified AND is_active AND is_visible. Drop the legacy policy only.

DROP POLICY IF EXISTS "Anyone can view verified tutor profiles" ON public.tutor_profiles;
