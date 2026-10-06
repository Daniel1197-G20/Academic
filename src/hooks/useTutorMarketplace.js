/**
 * useTutorMarketplace
 *
 * Fetches publicly visible, verified, active tutors from Supabase.
 *
 * Security model:
 *  - Reads only from tutor_profiles (RLS: is_verified=true AND is_active=true AND is_visible=true)
 *  - Joins profiles for name/avatar/institution and tutor_subjects for approved subjects
 *  - Uses the anonymous/authenticated Supabase client — no service-role key
 *  - Sensitive fields (assessment answers, admin notes, rejection reasons) are never selected
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';

/**
 * Returns the public display name for a teaching level.
 */
function formatTeachingLevel(level) {
  if (!level) return null;
  const map = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
  };
  return map[level] || level;
}

export function useTutorMarketplace() {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Fetch all publicly eligible tutors ────────────────────────────────────
  const fetchTutors = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch verified, active, visible tutor profiles joined with public profile info
      //    RLS on tutor_profiles ensures only is_verified=true AND is_active=true AND is_visible=true rows are returned.
      const { data: profileRows, error: profErr } = await supabase
        .from('tutor_profiles')
        .select(`
          id,
          title,
          bio,
          teaching_approach,
          hourly_rate,
          session_price_kobo,
          rating,
          review_count,
          is_verified,
          is_active,
          is_visible,
          academic_level,
          institution,
          department,
          approved_at,
          profiles!inner (
            id,
            full_name,
            avatar_url,
            institution,
            department,
            academic_level
          )
        `)
        .order('approved_at', { ascending: false });

      if (profErr) throw new Error(profErr.message);

      if (!profileRows || profileRows.length === 0) {
        setTutors([]);
        return;
      }

      // 2. Fetch tutor subjects for all returned tutor IDs
      const tutorIds = profileRows.map((r) => r.id);
      const { data: subjectRows, error: subErr } = await supabase
        .from('tutor_subjects')
        .select(`
          tutor_id,
          proficiency_level,
          subjects!inner (
            id,
            name,
            code,
            category
          )
        `)
        .in('tutor_id', tutorIds);

      if (subErr) {
        // Non-fatal: tutor may have no subjects linked yet
        console.warn('useTutorMarketplace: could not load subjects:', subErr.message);
      }

      // 3. Build subject lookup map  { tutorId -> [ subject, ... ] }
      const subjectsByTutor = {};
      (subjectRows || []).forEach((row) => {
        if (!subjectsByTutor[row.tutor_id]) subjectsByTutor[row.tutor_id] = [];
        subjectsByTutor[row.tutor_id].push({
          id: row.subjects.id,
          name: row.subjects.name,
          code: row.subjects.code,
          category: row.subjects.category,
          proficiencyLevel: formatTeachingLevel(row.proficiency_level),
        });
      });

      // 4. Shape public tutor cards — never expose internal IDs, admin notes, or auth info
      const shaped = profileRows.map((row) => {
        const profile = row.profiles;
        const subjects = subjectsByTutor[row.id] || [];
        return {
          tutorId: row.id,
          fullName: profile?.full_name || 'Studora Tutor',
          avatarUrl: profile?.avatar_url || null,
          title: row.title || 'Verified Tutor',
          bio: row.bio || null,
          teachingApproach: row.teaching_approach || null,
          institution: row.institution || profile?.institution || null,
          department: row.department || profile?.department || null,
          academicLevel: row.academic_level || profile?.academic_level || null,
          subjects,
          // Derive subject names for easy filtering
          subjectNames: subjects.map((s) => s.name),
          rating: row.rating ? parseFloat(row.rating) : null,
          reviewCount: row.review_count || 0,
          hourlyRate: row.hourly_rate || 0,
          isVerified: row.is_verified,
          approvedAt: row.approved_at,
        };
      });

      setTutors(shaped);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTutors();
  }, [fetchTutors]);

  return { tutors, loading, error, refetch: fetchTutors };
}
