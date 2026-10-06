/**
 * useTutorApplication
 *
 * Encapsulates all Supabase interactions for the Become a Tutor / Tutor Onboarding
 * workflow. Every scoring and state-transition call is routed through the
 * server-side SECURITY DEFINER RPCs defined in the database schema so that:
 *
 *  - correct_answer never reaches the browser
 *  - assessment scores are calculated server-side only
 *  - students cannot fabricate results or promote their own role
 */

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase/client';

// Fields a student is permitted to write on tutor_applications via updateApplication().
// 'status' is intentionally excluded here — status transitions are controlled by
// dedicated methods (createApplication → 'draft', submitApplication → 'submitted')
// and by server-side SECURITY DEFINER RPCs (start_tutor_assessment, submit_tutor_assessment,
// admin_review_tutor_application). The DB trigger protect_tutor_application_state blocks
// 'approved'/'rejected'/'suspended' but NOT 'pending_review' or 'assessment_passed',
// so allowing 'status' through pickWritable would let a student self-promote their application.
const STUDENT_WRITABLE_FIELDS = [
  'institution',
  'department',
  'academic_level',
  'programme',
  'graduation_year',
  'selected_subject_ids',
  'has_teaching_experience',
  'experience_types',
  'experience_description',
  'teaching_level',
  'bio',
  'teaching_approach',
  'areas_of_expertise',
  'current_step',
  // 'status' excluded — managed exclusively by createApplication, submitApplication, and DB RPCs
];

/**
 * Pick only student-writable keys from an object.
 */
function pickWritable(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([k]) => STUDENT_WRITABLE_FIELDS.includes(k))
  );
}

export function useTutorApplication() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── 1. Fetch the current user's own application (if any) ─────────────────
  const fetchMyApplication = useCallback(async () => {
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error: err } = await supabase
      .from('tutor_applications')
      .select('id, status, current_step, institution, department, academic_level, programme, graduation_year, selected_subject_ids, has_teaching_experience, experience_types, experience_description, teaching_level, bio, teaching_approach, areas_of_expertise, assessment_score, assessment_passed, submitted_at, created_at, updated_at')
      .eq('user_id', user.id)
      .not('status', 'in', '("withdrawn","rejected")')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (err) { setError(err.message); return null; }
    return data;
  }, []);

  // ── 2. Create a new draft application ────────────────────────────────────
  const createApplication = useCallback(async (fields) => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required.');

      // Prevent duplicates — check for any active non-terminal application
      const { data: existing } = await supabase
        .from('tutor_applications')
        .select('id, status')
        .eq('user_id', user.id)
        .not('status', 'in', '("withdrawn","rejected")')
        .limit(1)
        .maybeSingle();

      if (existing) {
        throw new Error(
          `You already have an active application (status: ${existing.status}). Duplicate applications are not permitted.`
        );
      }

      const payload = pickWritable({
        ...fields,
        status: 'draft',
        current_step: 1,
      });

      const { data, error: insertErr } = await supabase
        .from('tutor_applications')
        .insert({ ...payload, user_id: user.id })
        .select('id, status, current_step')
        .single();

      if (insertErr) throw new Error(insertErr.message);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── 3. Update an existing draft application ───────────────────────────────
  const updateApplication = useCallback(async (applicationId, fields) => {
    setLoading(true);
    setError(null);
    try {
      const payload = pickWritable(fields);

      const { data, error: updateErr } = await supabase
        .from('tutor_applications')
        .update(payload)
        .eq('id', applicationId)
        .select('id, status, current_step')
        .single();

      if (updateErr) throw new Error(updateErr.message);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── 4. Submit application (draft → submitted → assessment_pending) ────────
  const submitApplication = useCallback(async (applicationId) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: updateErr } = await supabase
        .from('tutor_applications')
        .update({ status: 'submitted' })
        .eq('id', applicationId)
        .select('id, status')
        .single();

      if (updateErr) throw new Error(updateErr.message);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── 5. Start assessment via SECURITY DEFINER RPC ──────────────────────────
  //    The RPC strips correct_answer and explanation before returning.
  //    Returns: { attempt_id, time_limit_minutes, total_questions,
  //               pass_percentage, questions: [...] }
  const startAssessment = useCallback(async (applicationId) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase
        .rpc('start_tutor_assessment', { p_application_id: applicationId });

      if (rpcErr) throw new Error(rpcErr.message);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── 6. Submit assessment via SECURITY DEFINER RPC ─────────────────────────
  //    Answers is a plain object: { "question-uuid": "selected-option-id" }
  //    Scoring is done entirely server-side.
  //    Returns: { score, passed, pass_percentage, correct_count,
  //               total_questions, status }
  const submitAssessment = useCallback(async (attemptId, answers) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase
        .rpc('submit_tutor_assessment', {
          p_attempt_id: attemptId,
          p_answers: answers,
        });

      if (rpcErr) throw new Error(rpcErr.message);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── 7. Fetch the most recent assessment attempt for an application ─────────
  const fetchLatestAttempt = useCallback(async (applicationId) => {
    setError(null);
    const { data, error: err } = await supabase
      .from('assessment_attempts')
      .select('id, status, score, passed, total_questions, correct_answers_count, time_limit_minutes, started_at, completed_at')
      .eq('application_id', applicationId)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (err) { setError(err.message); return null; }
    return data;
  }, []);

  // ── 8. Fetch subjects list for subject selection ───────────────────────────
  const fetchSubjects = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('subjects')
      .select('id, name, code, category')
      .order('display_order', { ascending: true });

    if (err) return [];
    return data || [];
  }, []);

  // ── 9. Count completed attempts (for retry limit display) ─────────────────
  const fetchAttemptCount = useCallback(async (applicationId) => {
    const { count, error: err } = await supabase
      .from('assessment_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('application_id', applicationId)
      .eq('status', 'completed');

    if (err) return 0;
    return count ?? 0;
  }, []);

  return {
    loading,
    error,
    fetchMyApplication,
    createApplication,
    updateApplication,
    submitApplication,
    startAssessment,
    submitAssessment,
    fetchLatestAttempt,
    fetchSubjects,
    fetchAttemptCount,
  };
}
