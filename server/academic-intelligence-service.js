/**
 * academic-intelligence-service.js
 *
 * Authoritative Backend Service for Studora Academic Intelligence Data Foundation.
 *
 * Responsibilities:
 *  1. Student Study Sessions (Start, Heartbeat, Pause, Resume, Complete, Idle/Blur detection)
 *  2. Student Practice Attempts (Diagnostic questions, server-side grading, anti-leakage)
 *  3. Student Topic Mastery (Deterministic classification, min-5 question rule, performance trends)
 *  4. Academic Profile Aggregation (Genuine verified facts vs unassessed states)
 */

import { db } from './db.js';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. STUDENT STUDY SESSIONS & ACTIVE TELEMETRY
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Starts a new study session for an authenticated student.
 * Auto-closes any previously lingering active session for the same student cleanly.
 */
export async function startStudySession(studentId, {
  subjectId = null,
  topicId = null,
  studyPlanId = null,
  source = 'study_timer',
  clientSessionKey = null,
  deviceInfo = {}
} = {}) {
  if (!studentId) throw new Error('studentId is required');

  const now = new Date();

  // If student already has an active session, cleanly complete/time out the previous one
  const activeExisting = await db.query(`
    SELECT id, started_at, last_heartbeat_at, active_duration_seconds
    FROM student_study_sessions
    WHERE student_id = $1 AND status = 'active'
    ORDER BY created_at DESC;
  `, [studentId]);

  for (const prev of activeExisting.rows) {
    await db.query(`
      UPDATE student_study_sessions
      SET status = 'completed', ended_at = $1, updated_at = $1
      WHERE id = $2;
    `, [now.toISOString(), prev.id]);

    await recordSessionEvent(prev.id, studentId, 'complete', { reason: 'auto_superseded_by_new_session' });
  }

  const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  await db.query(`
    INSERT INTO student_study_sessions (
      id, student_id, subject_id, topic_id, study_plan_id, source,
      started_at, last_heartbeat_at, active_duration_seconds, idle_duration_seconds,
      status, client_session_key, device_info, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, 0, 0, 'active', $8, $9, $7, $7);
  `, [
    sessionId,
    studentId,
    subjectId,
    topicId,
    studyPlanId,
    source,
    now.toISOString(),
    clientSessionKey || ('key_' + Date.now()),
    JSON.stringify(deviceInfo || {})
  ]);

  await recordSessionEvent(sessionId, studentId, 'start', { source, clientSessionKey });

  return {
    sessionId,
    studentId,
    status: 'active',
    startedAt: now.toISOString(),
    activeDurationSeconds: 0
  };
}

/**
 * Processes a 30-second heartbeat from the client.
 * Server-validates elapsed time since last heartbeat (clamped to max 35s)
 * to strictly prevent client active-duration manipulation.
 */
export async function processSessionHeartbeat(studentId, sessionId, {
  isTabVisible = true,
  isUserActive = true,
  clientActiveSeconds = null
} = {}) {
  if (!studentId || !sessionId) throw new Error('studentId and sessionId are required');

  const sessionRes = await db.query(`
    SELECT id, student_id, status, last_heartbeat_at, active_duration_seconds, idle_duration_seconds, started_at
    FROM student_study_sessions
    WHERE id = $1 AND student_id = $2;
  `, [sessionId, studentId]);

  if (sessionRes.rows.length === 0) {
    const err = new Error('Session not found or access denied');
    err.statusCode = 404;
    throw err;
  }

  const session = sessionRes.rows[0];

  if (session.status !== 'active') {
    return {
      sessionId,
      status: session.status,
      activeDurationSeconds: session.active_duration_seconds,
      message: `Session is currently ${session.status}. Heartbeat ignored.`
    };
  }

  const now = new Date();
  const lastHeartbeat = new Date(session.last_heartbeat_at || session.started_at);
  const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - lastHeartbeat.getTime()) / 1000));

  // If client took longer than 120s between heartbeats, classify the gap as idle/abandoned gap
  // Clamp allowable active increment to max 35s per standard 30s heartbeat interval
  let activeDelta = 0;
  let idleDelta = 0;

  if (isTabVisible && isUserActive) {
    if (elapsedSeconds <= 35) {
      activeDelta = elapsedSeconds;
    } else if (elapsedSeconds <= 90) {
      // Minor network jitter: allow up to 35s active, count remainder as idle
      activeDelta = 35;
      idleDelta = elapsedSeconds - 35;
    } else {
      // Extended gap (>90s): award standard 30s max, treat rest as idle gap
      activeDelta = 30;
      idleDelta = elapsedSeconds - 30;
    }
  } else {
    // Tab was blurred or user was idle
    idleDelta = elapsedSeconds;
  }

  const newActive = Number(session.active_duration_seconds || 0) + activeDelta;
  const newIdle = Number(session.idle_duration_seconds || 0) + idleDelta;

  await db.query(`
    UPDATE student_study_sessions
    SET last_heartbeat_at = $1,
        active_duration_seconds = $2,
        idle_duration_seconds = $3,
        updated_at = $1
    WHERE id = $4;
  `, [now.toISOString(), newActive, newIdle, sessionId]);

  await recordSessionEvent(sessionId, studentId, 'heartbeat', {
    elapsedSeconds,
    activeDelta,
    idleDelta,
    isTabVisible,
    isUserActive
  });

  return {
    sessionId,
    status: 'active',
    activeDurationSeconds: newActive,
    idleDurationSeconds: newIdle,
    lastHeartbeatAt: now.toISOString()
  };
}

/**
 * Pauses an active study session.
 */
export async function pauseStudySession(studentId, sessionId, { reason = 'user_paused' } = {}) {
  const sessionRes = await db.query(`
    SELECT id, status, active_duration_seconds
    FROM student_study_sessions
    WHERE id = $1 AND student_id = $2;
  `, [sessionId, studentId]);

  if (sessionRes.rows.length === 0) {
    const err = new Error('Session not found or access denied');
    err.statusCode = 404;
    throw err;
  }

  const now = new Date().toISOString();
  await db.query(`
    UPDATE student_study_sessions
    SET status = 'paused', updated_at = $1
    WHERE id = $2;
  `, [now, sessionId]);

  await recordSessionEvent(sessionId, studentId, 'pause', { reason });

  return {
    sessionId,
    status: 'paused',
    activeDurationSeconds: sessionRes.rows[0].active_duration_seconds
  };
}

/**
 * Resumes a paused study session.
 */
export async function resumeStudySession(studentId, sessionId) {
  const sessionRes = await db.query(`
    SELECT id, status, active_duration_seconds
    FROM student_study_sessions
    WHERE id = $1 AND student_id = $2;
  `, [sessionId, studentId]);

  if (sessionRes.rows.length === 0) {
    const err = new Error('Session not found or access denied');
    err.statusCode = 404;
    throw err;
  }

  const now = new Date().toISOString();
  await db.query(`
    UPDATE student_study_sessions
    SET status = 'active', last_heartbeat_at = $1, updated_at = $1
    WHERE id = $2;
  `, [now, sessionId]);

  await recordSessionEvent(sessionId, studentId, 'resume', {});

  return {
    sessionId,
    status: 'active',
    activeDurationSeconds: sessionRes.rows[0].active_duration_seconds
  };
}

/**
 * Completes a study session and syncs duration with student study plans if applicable.
 */
export async function completeStudySession(studentId, sessionId) {
  const sessionRes = await db.query(`
    SELECT id, student_id, study_plan_id, status, active_duration_seconds
    FROM student_study_sessions
    WHERE id = $1 AND student_id = $2;
  `, [sessionId, studentId]);

  if (sessionRes.rows.length === 0) {
    const err = new Error('Session not found or access denied');
    err.statusCode = 404;
    throw err;
  }

  const session = sessionRes.rows[0];
  const now = new Date().toISOString();

  await db.query(`
    UPDATE student_study_sessions
    SET status = 'completed', ended_at = $1, updated_at = $1
    WHERE id = $2;
  `, [now, sessionId]);

  await recordSessionEvent(sessionId, studentId, 'complete', {
    finalActiveDuration: session.active_duration_seconds
  });

  // If associated with a study plan, automatically log the completed study hours
  if (session.study_plan_id && session.active_duration_seconds >= 60) {
    const durationMinutes = Math.round(session.active_duration_seconds / 60);
    const hoursToAdd = Number((durationMinutes / 60).toFixed(1));

    const logId = 'log_' + Date.now();
    await db.query(`
      INSERT INTO study_logs (id, user_id, study_plan_id, duration_minutes, notes, logged_at)
      VALUES ($1, $2, $3, $4, 'Automated logged session via Study Timer', CURRENT_DATE);
    `, [logId, studentId, session.study_plan_id, durationMinutes]);

    await db.query(`
      UPDATE study_plans
      SET logged_hours = logged_hours + $1
      WHERE id = $2 AND user_id = $3;
    `, [hoursToAdd, session.study_plan_id, studentId]);
  }

  return {
    sessionId,
    status: 'completed',
    activeDurationSeconds: session.active_duration_seconds,
    endedAt: now
  };
}

/**
 * Handles client tab visibility change event.
 */
export async function recordSessionVisibilityChange(studentId, sessionId, isVisible) {
  const eventType = isVisible ? 'tab_focus' : 'tab_blur';
  await recordSessionEvent(sessionId, studentId, eventType, { isVisible });
  return { success: true, eventType };
}

/**
 * Helper to record session events append-only.
 */
async function recordSessionEvent(sessionId, studentId, eventType, metadata = {}) {
  try {
    const eventId = 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    await db.query(`
      INSERT INTO study_session_events (id, session_id, student_id, event_type, event_timestamp, metadata)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5);
    `, [eventId, sessionId, studentId, eventType, JSON.stringify(metadata)]);
  } catch (err) {
    console.warn('[SessionEvent] Warning: Failed to record session event:', err.message);
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. STUDENT PRACTICE ATTEMPTS & DIAGNOSTIC DRILLS
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Starts a student practice attempt for a subject and optional topic.
 * Returns questions WITHOUT leaking correct_answer or explanation to client.
 */
export async function startStudentPracticeAttempt(studentId, {
  subjectId = null,
  topicId = null,
  sessionId = null,
  limit = 5
} = {}) {
  if (!studentId) throw new Error('studentId is required');

  let query = `
    SELECT id, subject_id, topic_id, question, question_type, difficulty, options
    FROM question_bank
    WHERE status = 'active'
  `;
  const params = [];

  if (topicId) {
    params.push(topicId);
    query += ` AND topic_id = $${params.length}`;
  } else if (subjectId) {
    params.push(subjectId);
    query += ` AND subject_id = $${params.length}`;
  }

  query += ` ORDER BY RANDOM() LIMIT $${params.length + 1};`;
  params.push(limit);

  const qRes = await db.query(query, params);
  if (qRes.rows.length === 0) {
    const err = new Error('No practice questions available for this subject/topic');
    err.statusCode = 404;
    throw err;
  }

  const attemptId = 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const questionIds = qRes.rows.map(r => r.id);

  await db.query(`
    INSERT INTO student_practice_attempts (
      id, student_id, subject_id, topic_id, session_id, status,
      total_questions, correct_answers_count, question_ids, source, started_at
    ) VALUES ($1, $2, $3, $4, $5, 'in_progress', $6, 0, $7, 'practice_drill', CURRENT_TIMESTAMP);
  `, [
    attemptId,
    studentId,
    subjectId || qRes.rows[0].subject_id,
    topicId || qRes.rows[0].topic_id,
    sessionId || null,
    questionIds.length,
    JSON.stringify(questionIds)
  ]);

  // Clean questions for safe client presentation
  const safeQuestions = qRes.rows.map(q => {
    let opts = q.options;
    if (typeof opts === 'string') {
      try { opts = JSON.parse(opts); } catch { opts = []; }
    }
    return {
      id: q.id,
      subjectId: q.subject_id,
      topicId: q.topic_id,
      question: q.question,
      questionType: q.question_type,
      difficulty: q.difficulty,
      options: opts
    };
  });

  return {
    attemptId,
    studentId,
    subjectId: subjectId || qRes.rows[0].subject_id,
    topicId: topicId || qRes.rows[0].topic_id,
    totalQuestions: safeQuestions.length,
    questions: safeQuestions
  };
}

/**
 * Submits student practice attempt answers.
 * Evaluates answers strictly server-side against authoritative question_bank.
 * Updates student_topic_mastery deterministically.
 */
export async function submitStudentPracticeAttempt(studentId, attemptId, { answers = [], timeSpentSeconds = 0 } = {}) {
  if (!studentId || !attemptId) throw new Error('studentId and attemptId are required');

  const attRes = await db.query(`
    SELECT id, student_id, subject_id, topic_id, status, total_questions, question_ids
    FROM student_practice_attempts
    WHERE id = $1 AND student_id = $2;
  `, [attemptId, studentId]);

  if (attRes.rows.length === 0) {
    const err = new Error('Practice attempt not found or access denied');
    err.statusCode = 404;
    throw err;
  }

  const attempt = attRes.rows[0];

  // Idempotency: If already completed, return cached result
  if (attempt.status === 'completed') {
    const existingAnswers = await db.query(`
      SELECT question_id, selected_option, is_correct FROM student_practice_answers WHERE attempt_id = $1;
    `, [attemptId]);

    return {
      attemptId,
      status: 'completed',
      alreadySubmitted: true,
      answers: existingAnswers.rows
    };
  }

  // Load question answer keys from database
  let qIds = [];
  try {
    qIds = typeof attempt.question_ids === 'string' ? JSON.parse(attempt.question_ids) : attempt.question_ids;
  } catch {
    qIds = [];
  }

  const qBankRes = await db.query(`
    SELECT id, subject_id, topic_id, correct_answer, explanation
    FROM question_bank
    WHERE id = ANY($1::text[]);
  `, [qIds]);

  const bankMap = new Map();
  for (const q of qBankRes.rows) {
    bankMap.set(q.id, q);
  }

  let correctCount = 0;
  const gradedResults = [];

  for (const item of answers) {
    const bankItem = bankMap.get(item.questionId);
    if (!bankItem) continue;

    const selectedOpt = String(item.selectedOption || '').trim().toUpperCase();
    const correctOpt = String(bankItem.correct_answer || '').trim().toUpperCase();
    const isCorrect = (selectedOpt === correctOpt);

    if (isCorrect) correctCount++;

    const ansId = 'ans_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    await db.query(`
      INSERT INTO student_practice_answers (id, attempt_id, student_id, question_id, selected_option, is_correct, answered_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP);
    `, [ansId, attemptId, studentId, item.questionId, selectedOpt, isCorrect]);

    gradedResults.push({
      questionId: item.questionId,
      selectedOption: selectedOpt,
      correctAnswer: correctOpt,
      isCorrect,
      explanation: bankItem.explanation
    });
  }

  const totalQuestions = attempt.total_questions || gradedResults.length;
  const score = totalQuestions > 0 ? Number(((correctCount / totalQuestions) * 100).toFixed(2)) : 0;
  const passed = score >= 60.0;
  const now = new Date().toISOString();

  await db.query(`
    UPDATE student_practice_attempts
    SET status = 'completed',
        score = $1,
        passed = $2,
        correct_answers_count = $3,
        time_spent_seconds = $4,
        completed_at = $5
    WHERE id = $6;
  `, [score, passed, correctCount, Number(timeSpentSeconds) || 0, now, attemptId]);

  // Aggregate and update Student Topic Mastery deterministically
  const topicId = attempt.topic_id;
  const subjectId = attempt.subject_id;
  let masteryRecord = null;

  if (topicId && subjectId) {
    masteryRecord = await updateTopicMastery(studentId, subjectId, topicId);
  }

  return {
    attemptId,
    studentId,
    subjectId,
    topicId,
    status: 'completed',
    score,
    passed,
    correctCount,
    totalQuestions,
    gradedResults,
    masteryRecord
  };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. STUDENT TOPIC MASTERY ALGORITHM
 * ─────────────────────────────────────────────────────────────────────────────
 * Strict Classification Rules:
 *  - 0 attempts: 'not_assessed' (NEVER weak)
 *  - 1 to 4 attempts: 'developing' (NEVER weak or mastered; sample size too small)
 *  - >= 5 attempts:
 *      * accuracy < 60%  -> 'struggling' (Empirical Weakness)
 *      * accuracy 60-79% -> 'proficient'
 *      * accuracy >= 80% -> 'mastered'   (Empirical Strength)
 */
export async function updateTopicMastery(studentId, subjectId, topicId) {
  // Aggregate all authentic answers for this student and topic
  const statsRes = await db.query(`
    SELECT 
      COUNT(*) as total_attempted,
      COUNT(CASE WHEN a.is_correct = true THEN 1 END) as correct_count,
      COUNT(CASE WHEN a.is_correct = false THEN 1 END) as incorrect_count
    FROM student_practice_answers a
    JOIN question_bank q ON a.question_id = q.id
    WHERE a.student_id = $1 AND q.topic_id = $2;
  `, [studentId, topicId]);

  const stats = statsRes.rows[0];
  const total = Number(stats.total_attempted || 0);
  const correct = Number(stats.correct_count || 0);
  const incorrect = Number(stats.incorrect_count || 0);
  const accuracy = total > 0 ? Number(((correct / total) * 100).toFixed(2)) : 0;

  // Determine classification deterministically
  let classification = 'not_assessed';
  if (total === 0) {
    classification = 'not_assessed';
  } else if (total < 5) {
    classification = 'developing';
  } else {
    if (accuracy < 60.0) {
      classification = 'struggling';
    } else if (accuracy < 80.0) {
      classification = 'proficient';
    } else {
      classification = 'mastered';
    }
  }

  // Determine performance trend from last 2 attempts
  let trend = 'stable';
  const recentRes = await db.query(`
    SELECT score FROM student_practice_attempts
    WHERE student_id = $1 AND topic_id = $2 AND status = 'completed'
    ORDER BY completed_at DESC LIMIT 2;
  `, [studentId, topicId]);

  if (recentRes.rows.length >= 2) {
    const latest = Number(recentRes.rows[0].score);
    const prev = Number(recentRes.rows[1].score);
    if (latest > prev + 5) trend = 'improving';
    else if (latest < prev - 5) trend = 'declining';
  }

  const masteryId = `mst_${studentId}_${topicId}`;
  const now = new Date().toISOString();

  await db.query(`
    INSERT INTO student_topic_mastery (
      id, student_id, subject_id, topic_id,
      total_questions_attempted, correct_answers_count, incorrect_answers_count,
      accuracy_percentage, mastery_classification, performance_trend,
      last_assessed_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
    ON CONFLICT (student_id, topic_id) DO UPDATE SET
      total_questions_attempted = EXCLUDED.total_questions_attempted,
      correct_answers_count = EXCLUDED.correct_answers_count,
      incorrect_answers_count = EXCLUDED.incorrect_answers_count,
      accuracy_percentage = EXCLUDED.accuracy_percentage,
      mastery_classification = EXCLUDED.mastery_classification,
      performance_trend = EXCLUDED.performance_trend,
      last_assessed_at = EXCLUDED.last_assessed_at,
      updated_at = EXCLUDED.updated_at;
  `, [
    masteryId,
    studentId,
    subjectId,
    topicId,
    total,
    correct,
    incorrect,
    accuracy,
    classification,
    trend,
    now
  ]);

  return {
    studentId,
    subjectId,
    topicId,
    totalQuestionsAttempted: total,
    correctAnswersCount: correct,
    incorrectAnswersCount: incorrect,
    accuracyPercentage: accuracy,
    masteryClassification: classification,
    performanceTrend: trend,
    lastAssessedAt: now
  };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 4. STUDENT ACADEMIC PROFILE AGGREGATOR
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function getStudentAcademicProfile(studentId) {
  if (!studentId) throw new Error('studentId is required');

  // 1. Authenticated Profile & Metadata
  const profRes = await db.query(`SELECT * FROM profiles WHERE user_id = $1;`, [studentId]);
  const profile = profRes.rows[0] || {};

  // 2. Verified Active Study Sessions
  const sessionStats = await db.query(`
    SELECT 
      COUNT(*) as total_sessions,
      COALESCE(SUM(active_duration_seconds), 0) as total_active_seconds,
      COALESCE(SUM(idle_duration_seconds), 0) as total_idle_seconds
    FROM student_study_sessions
    WHERE student_id = $1 AND status = 'completed';
  `, [studentId]);

  const totalActiveMinutes = Math.round(Number(sessionStats.rows[0].total_active_seconds || 0) / 60);
  const totalActiveHours = Number((totalActiveMinutes / 60).toFixed(1));

  // 3. Topic Mastery Breakdown (Empirical Strengths vs Weaknesses)
  const masteryRes = await db.query(`
    SELECT 
      m.topic_id,
      t.name as topic_name,
      m.subject_id,
      s.name as subject_name,
      m.total_questions_attempted,
      m.correct_answers_count,
      m.accuracy_percentage,
      m.mastery_classification,
      m.performance_trend,
      m.last_assessed_at
    FROM student_topic_mastery m
    JOIN topics t ON m.topic_id = t.id
    JOIN subjects s ON m.subject_id = s.id
    WHERE m.student_id = $1
    ORDER BY m.updated_at DESC;
  `, [studentId]);

  const strengths = [];
  const weaknesses = [];
  const developing = [];

  for (const m of masteryRes.rows) {
    if (m.mastery_classification === 'mastered' || m.mastery_classification === 'proficient') {
      strengths.push(m);
    } else if (m.mastery_classification === 'struggling') {
      weaknesses.push(m);
    } else if (m.mastery_classification === 'developing') {
      developing.push(m);
    }
  }

  // 4. Recent Practice Attempts
  const attemptsRes = await db.query(`
    SELECT id, subject_id, topic_id, score, passed, total_questions, correct_answers_count, completed_at
    FROM student_practice_attempts
    WHERE student_id = $1 AND status = 'completed'
    ORDER BY completed_at DESC LIMIT 10;
  `, [studentId]);

  // 5. Active Study Session (if currently ongoing)
  const currentSessionRes = await db.query(`
    SELECT id, subject_id, topic_id, started_at, active_duration_seconds, status
    FROM student_study_sessions
    WHERE student_id = $1 AND (status = 'active' OR status = 'paused')
    ORDER BY created_at DESC LIMIT 1;
  `, [studentId]);

  return {
    studentId,
    profile: {
      fullName: profile.full_name || 'Student',
      institution: profile.institution,
      department: profile.department,
      academicLevel: profile.academic_level
    },
    activityMetrics: {
      totalCompletedSessions: Number(sessionStats.rows[0].total_sessions || 0),
      totalActiveStudyMinutes: totalActiveMinutes,
      totalActiveStudyHours: totalActiveHours
    },
    topicMastery: {
      strengths,
      weaknesses,
      developing,
      allTopics: masteryRes.rows
    },
    recentAttempts: attemptsRes.rows,
    currentSession: currentSessionRes.rows[0] || null
  };
}
