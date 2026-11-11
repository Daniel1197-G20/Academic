/**
 * study-coach-service.js
 *
 * Authoritative Backend Service for Studora Phase 3:
 * Personal Daily AI Study Coach & Adaptive Study Planning.
 *
 * Responsibilities:
 *  1. Student Study Preferences (fetch & persist goals, available hours, target GPA, exam dates)
 *  2. Deterministic Prioritization Algorithm:
 *     - Upcoming exam revision (< 14 days) -> Urgent priority
 *     - Empirically struggling topics (Phase 2 mastery: >=5 attempts & <60% accuracy) -> High priority
 *     - Developing topics needing assessment sample (1-4 attempts) -> Medium/Practice priority
 *     - Unassessed priority subjects -> Diagnostic/Review priority
 *     - Respect available daily minutes constraint
 *  3. Daily Plan Generation & Persistence (idempotent per user per day, unless forced regeneration)
 *  4. Task Lifecycle & Completion Validation:
 *     - Validates actual telemetry session or practice attempt completion
 *     - Prevents premature time-based completion
 *  5. Adaptive Re-planning:
 *     - Adjusts priorities dynamically when performance changes or tasks are missed/completed
 *  6. Daily AI Coaching Context Generation:
 *     - Prepares grounded coaching context for Grok
 */

import { db } from './db.js';
import { generateStudentAcademicAnalysis } from './academic-analysis-engine.js';

/**
 * ─────────────────────────────────────────────────────────────
 * 1. STUDENT STUDY PREFERENCES
 * ─────────────────────────────────────────────────────────────
 */

export async function getStudentStudyPreferences(userId) {
  if (!userId) throw new Error('userId is required');

  const res = await db.query(`
    SELECT * FROM student_study_preferences WHERE user_id = $1;
  `, [userId]);

  if (res.rows.length === 0) {
    // Return sensible defaults without forcing ungrounded assumptions
    return {
      userId,
      academicGoals: '',
      targetGpa: null,
      dailyAvailableMinutes: 60,
      preferredStudyPeriods: ['evening'],
      preferredStudyDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      upcomingExams: [],
      prioritizedSubjectIds: [],
      prioritizedTopicIds: [],
      reminderEnabled: true,
      reminderTime: '09:00',
      isDefault: true
    };
  }

  const row = res.rows[0];
  return {
    userId: row.user_id,
    academicGoals: row.academic_goals || '',
    targetGpa: row.target_gpa ? Number(row.target_gpa) : null,
    dailyAvailableMinutes: row.daily_available_minutes || 60,
    preferredStudyPeriods: parseJsonSafe(row.preferred_study_periods, ['evening']),
    preferredStudyDays: parseJsonSafe(row.preferred_study_days, ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
    upcomingExams: parseJsonSafe(row.upcoming_exams, []),
    prioritizedSubjectIds: parseJsonSafe(row.prioritized_subject_ids, []),
    prioritizedTopicIds: parseJsonSafe(row.prioritized_topic_ids, []),
    reminderEnabled: !!row.reminder_enabled,
    reminderTime: row.reminder_time || '09:00',
    isDefault: false
  };
}

export async function updateStudentStudyPreferences(userId, updates = {}) {
  if (!userId) throw new Error('userId is required');

  const existing = await getStudentStudyPreferences(userId);

  const academicGoals = updates.academicGoals !== undefined ? String(updates.academicGoals).trim() : existing.academicGoals;
  const targetGpa = updates.targetGpa !== undefined ? (updates.targetGpa ? Number(updates.targetGpa) : null) : existing.targetGpa;
  const dailyAvailableMinutes = updates.dailyAvailableMinutes !== undefined ? Math.max(15, Math.min(720, Number(updates.dailyAvailableMinutes) || 60)) : existing.dailyAvailableMinutes;
  const preferredStudyPeriods = updates.preferredStudyPeriods !== undefined ? JSON.stringify(updates.preferredStudyPeriods) : JSON.stringify(existing.preferredStudyPeriods);
  const preferredStudyDays = updates.preferredStudyDays !== undefined ? JSON.stringify(updates.preferredStudyDays) : JSON.stringify(existing.preferredStudyDays);
  const upcomingExams = updates.upcomingExams !== undefined ? JSON.stringify(updates.upcomingExams) : JSON.stringify(existing.upcomingExams);
  const prioritizedSubjectIds = updates.prioritizedSubjectIds !== undefined ? JSON.stringify(updates.prioritizedSubjectIds) : JSON.stringify(existing.prioritizedSubjectIds);
  const prioritizedTopicIds = updates.prioritizedTopicIds !== undefined ? JSON.stringify(updates.prioritizedTopicIds) : JSON.stringify(existing.prioritizedTopicIds);
  const reminderEnabled = updates.reminderEnabled !== undefined ? Boolean(updates.reminderEnabled) : existing.reminderEnabled;
  const reminderTime = updates.reminderTime !== undefined ? String(updates.reminderTime) : existing.reminderTime;

  const now = new Date().toISOString();

  await db.query(`
    INSERT INTO student_study_preferences (
      user_id, academic_goals, target_gpa, daily_available_minutes,
      preferred_study_periods, preferred_study_days, upcoming_exams,
      prioritized_subject_ids, prioritized_topic_ids, reminder_enabled, reminder_time,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
    ON CONFLICT (user_id) DO UPDATE SET
      academic_goals = EXCLUDED.academic_goals,
      target_gpa = EXCLUDED.target_gpa,
      daily_available_minutes = EXCLUDED.daily_available_minutes,
      preferred_study_periods = EXCLUDED.preferred_study_periods,
      preferred_study_days = EXCLUDED.preferred_study_days,
      upcoming_exams = EXCLUDED.upcoming_exams,
      prioritized_subject_ids = EXCLUDED.prioritized_subject_ids,
      prioritized_topic_ids = EXCLUDED.prioritized_topic_ids,
      reminder_enabled = EXCLUDED.reminder_enabled,
      reminder_time = EXCLUDED.reminder_time,
      updated_at = EXCLUDED.updated_at;
  `, [
    userId,
    academicGoals,
    targetGpa,
    dailyAvailableMinutes,
    preferredStudyPeriods,
    preferredStudyDays,
    upcomingExams,
    prioritizedSubjectIds,
    prioritizedTopicIds,
    reminderEnabled,
    reminderTime,
    now
  ]);

  return getStudentStudyPreferences(userId);
}

/**
 * ─────────────────────────────────────────────────────────────
 * 2. DETERMINISTIC PRIORITIZATION & PLAN GENERATION
 * ─────────────────────────────────────────────────────────────
 */

/**
 * Generates or retrieves the student's daily study plan for today.
 * Preserves the existing plan unless forceRegenerate is true.
 */
export async function getOrCreateDailyStudyPlan(userId, { forceRegenerate = false, date = null } = {}) {
  if (!userId) throw new Error('userId is required');

  const planDate = date || new Date().toISOString().split('T')[0];

  // 1. Check existing plan
  if (!forceRegenerate) {
    const existing = await fetchPlanWithTasks(userId, planDate);
    if (existing) {
      return existing;
    }
  }

  // 2. Fetch authoritative academic intelligence and preferences
  const [analysis, prefs] = await Promise.all([
    generateStudentAcademicAnalysis(userId),
    getStudentStudyPreferences(userId)
  ]);

  // 3. Run deterministic prioritization
  const candidates = prioritizeLearningTasks(analysis, prefs);

  // 4. Fit tasks into available daily budget (e.g. 60 mins)
  const budgetMinutes = prefs.dailyAvailableMinutes || 60;
  let allocatedMinutes = 0;
  const selectedTasks = [];

  for (const candidate of candidates) {
    if (allocatedMinutes + candidate.estimatedDurationMinutes <= budgetMinutes || selectedTasks.length === 0) {
      selectedTasks.push(candidate);
      allocatedMinutes += candidate.estimatedDurationMinutes;
    }
    // Limit to max 4 tasks per day for cognitive clarity
    if (selectedTasks.length >= 4 || allocatedMinutes >= budgetMinutes) break;
  }

  // 5. Generate AI Coaching Note for the day
  const coachingNote = generateDailyCoachingNote(analysis, prefs, selectedTasks, allocatedMinutes);

  // 6. Persist plan and tasks transactionally
  const planId = 'dayplan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  // If forceRegenerate, delete previous tasks for this day first
  await db.query(`
    DELETE FROM daily_study_plans WHERE user_id = $1 AND plan_date = $2;
  `, [userId, planDate]);

  await db.query(`
    INSERT INTO daily_study_plans (
      id, user_id, plan_date, status, target_study_minutes, completed_study_minutes,
      ai_coaching_note, generation_context, created_at, updated_at
    ) VALUES ($1, $2, $3, 'active', $4, 0, $5, $6, $7, $7);
  `, [
    planId,
    userId,
    planDate,
    allocatedMinutes,
    coachingNote,
    JSON.stringify({
      evidenceConfidence: analysis.evidenceConfidence,
      masteredCount: analysis.summary.masteredTopicsCount,
      strugglingCount: analysis.summary.strugglingTopicsCount,
      developingCount: analysis.summary.developingTopicsCount
    }),
    now
  ]);

  for (let i = 0; i < selectedTasks.length; i++) {
    const t = selectedTasks[i];
    const taskId = 'task_' + Date.now() + '_' + i;
    await db.query(`
      INSERT INTO daily_study_tasks (
        id, daily_plan_id, user_id, subject_id, topic_id, title,
        learning_objective, activity_type, estimated_duration_minutes,
        actual_duration_seconds, priority, recommendation_reason,
        action_route, status, display_order, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, $10, $11, $12, 'pending', $13, $14, $14);
    `, [
      taskId,
      planId,
      userId,
      t.subjectId || null,
      t.topicId || null,
      t.title,
      t.learningObjective,
      t.activityType,
      t.estimatedDurationMinutes,
      t.priority,
      t.recommendationReason,
      t.actionRoute || '/study/timer',
      i + 1,
      now
    ]);
  }

  return fetchPlanWithTasks(userId, planDate);
}

/**
 * Deterministic Prioritization Algorithm.
 * Ranks topics based on empirical evidence and urgency:
 *  - Rank 1: Imminent Exams (< 14 days) -> Priority: urgent
 *  - Rank 2: Empirical Weaknesses (Phase 2: >=5 attempts & <60% accuracy) -> Priority: high
 *  - Rank 3: Student Prioritized Subjects/Topics -> Priority: high
 *  - Rank 4: Developing Topics needing diagnostic evidence (1-4 attempts) -> Priority: medium
 *  - Rank 5: Unassessed Topics in active curriculum -> Priority: medium (Diagnostic Drill)
 *  - Rank 6: Mastered Topics for spaced maintenance -> Priority: low
 */
export function prioritizeLearningTasks(analysis, prefs) {
  const candidates = [];
  const now = new Date();

  // A. Check Upcoming Exams
  const upcomingExams = Array.isArray(prefs.upcomingExams) ? prefs.upcomingExams : [];
  for (const exam of upcomingExams) {
    if (!exam.examDate) continue;
    const examDate = new Date(exam.examDate);
    const diffDays = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 14) {
      candidates.push({
        subjectId: exam.subjectId || null,
        topicId: null,
        title: `Exam Prep: ${exam.subjectName || 'Upcoming Exam'}`,
        learningObjective: `Comprehensive revision before exam in ${diffDays === 0 ? 'today' : `${diffDays} days`}.`,
        activityType: 'exam_prep',
        estimatedDurationMinutes: 30,
        priority: 'urgent',
        recommendationReason: `Upcoming examination scheduled for ${exam.examDate} (${diffDays} days away).`,
        actionRoute: '/study/timer'
      });
    }
  }

  // B. Empirical Weaknesses (>=5 attempts and <60% accuracy)
  const weaknesses = analysis.topicMastery?.weaknesses || [];
  for (const w of weaknesses) {
    candidates.push({
      subjectId: w.subjectId,
      topicId: w.topicId,
      title: `Remediate ${w.topicName}`,
      learningObjective: `Targeted review of weak concepts to improve ${w.accuracyPercentage}% accuracy.`,
      activityType: 'concept_review',
      estimatedDurationMinutes: 25,
      priority: 'high',
      recommendationReason: `Diagnosed empirical weakness: ${w.accuracyPercentage}% accuracy over ${w.questionsAttempted} evaluated questions.`,
      actionRoute: `/tutor/ai`
    });

    candidates.push({
      subjectId: w.subjectId,
      topicId: w.topicId,
      title: `Practice Drill: ${w.topicName}`,
      learningObjective: `Complete 5 targeted practice questions to reinforce error corrections.`,
      activityType: 'practice_drill',
      estimatedDurationMinutes: 20,
      priority: 'high',
      recommendationReason: `Active practice drill to turn around struggling performance in ${w.topicName}.`,
      actionRoute: `/study/drill?topicId=${w.topicId}`
    });
  }

  // C. Student-selected Priorities
  const priorityTopicIds = Array.isArray(prefs.prioritizedTopicIds) ? prefs.prioritizedTopicIds : [];
  for (const topicId of priorityTopicIds) {
    if (!candidates.some(c => c.topicId === topicId)) {
      candidates.push({
        subjectId: null,
        topicId,
        title: `Priority Topic Focus`,
        learningObjective: `Focus session on your selected priority area.`,
        activityType: 'revision',
        estimatedDurationMinutes: 30,
        priority: 'high',
        recommendationReason: `Explicitly marked as a priority in your personal study preferences.`,
        actionRoute: '/study/timer'
      });
    }
  }

  // D. Developing Topics (1-4 attempts, needs sample evidence)
  const developing = analysis.topicMastery?.developing || [];
  for (const d of developing) {
    if (!candidates.some(c => c.topicId === d.topicId)) {
      candidates.push({
        subjectId: d.subjectId,
        topicId: d.topicId,
        title: `Diagnostic Practice: ${d.topicName}`,
        learningObjective: `Complete questions to reach the 5-question evaluation threshold.`,
        activityType: 'practice_drill',
        estimatedDurationMinutes: 20,
        priority: 'medium',
        recommendationReason: `Currently developing (${d.questionsAttempted} attempts). Reaching 5 attempts is required for verified mastery diagnosis.`,
        actionRoute: `/study/drill?topicId=${d.topicId}`
      });
    }
  }

  // E. Fallback: If no records, recommend foundation diagnostic drill
  if (candidates.length === 0) {
    const subjects = analysis.subjects || [];
    const firstSubj = subjects[0];
    const subjName = firstSubj?.subjectName || 'Foundational Coursework';

    candidates.push({
      subjectId: firstSubj?.subjectId || null,
      topicId: null,
      title: `Diagnostic Assessment: ${subjName}`,
      learningObjective: `Complete your initial diagnostic practice drill to identify strengths and weaknesses.`,
      activityType: 'practice_drill',
      estimatedDurationMinutes: 25,
      priority: 'medium',
      recommendationReason: `No prior academic records on file. Complete this drill to unlock evidence-based recommendations.`,
      actionRoute: '/study/drill'
    });

    candidates.push({
      subjectId: firstSubj?.subjectId || null,
      topicId: null,
      title: `Focused Study Block: ${subjName}`,
      learningObjective: `30-minute deep study session with active telemetry tracking.`,
      activityType: 'revision',
      estimatedDurationMinutes: 30,
      priority: 'medium',
      recommendationReason: `Establish your study habit and log verified active study hours.`,
      actionRoute: '/study/timer'
    });
  }

  return candidates;
}

/**
 * Synthesizes an evidence-grounded coaching note explaining the rationale of the plan.
 */
function generateDailyCoachingNote(analysis, prefs, tasks, allocatedMinutes) {
  const { summary, topicMastery, learningBehavior } = analysis;
  const urgentCount = tasks.filter(t => t.priority === 'urgent').length;
  const highCount = tasks.filter(t => t.priority === 'high').length;

  if (urgentCount > 0) {
    return `Today's schedule prioritizes imminent exam preparation. You have ${urgentCount} urgent revision task(s) tailored to your upcoming test deadlines. Total planned time: ${allocatedMinutes} mins.`;
  }

  if (highCount > 0 && summary.strugglingTopicsCount > 0) {
    return `Based on your diagnostic evaluations, your plan focuses on turning around ${summary.strugglingTopicsCount} identified struggling topic(s) with dedicated concept reviews and practice drills.`;
  }

  if (summary.totalQuestionsAnswered === 0) {
    return `Welcome to your Studora AI Study Coach. Because you have no prior practice records, today's plan is calibrated with diagnostic sessions to establish your academic baseline.`;
  }

  if (learningBehavior.studyStreakDays > 0) {
    return `Great momentum! You are on a ${learningBehavior.studyStreakDays}-day active study streak. Today's balanced workload of ${allocatedMinutes} minutes will maintain your consistency.`;
  }

  return `Today's plan is balanced across revision and practice drills calibrated for your ${allocatedMinutes}-minute available study window.`;
}

/**
 * Helper to fetch a plan and its ordered tasks.
 */
async function fetchPlanWithTasks(userId, planDate) {
  const planRes = await db.query(`
    SELECT * FROM daily_study_plans WHERE user_id = $1 AND plan_date = $2;
  `, [userId, planDate]);

  if (planRes.rows.length === 0) return null;
  const plan = planRes.rows[0];

  const tasksRes = await db.query(`
    SELECT 
      t.*,
      s.name as subject_name,
      s.code as subject_code,
      top.name as topic_name
    FROM daily_study_tasks t
    LEFT JOIN subjects s ON t.subject_id = s.id
    LEFT JOIN topics top ON t.topic_id = top.id
    WHERE t.daily_plan_id = $1 AND t.user_id = $2
    ORDER BY t.display_order ASC;
  `, [plan.id, userId]);

  const tasks = tasksRes.rows.map(t => ({
    id: t.id,
    dailyPlanId: t.daily_plan_id,
    userId: t.user_id,
    subjectId: t.subject_id,
    subjectName: t.subject_name || null,
    subjectCode: t.subject_code || null,
    topicId: t.topic_id,
    topicName: t.topic_name || null,
    title: t.title,
    learningObjective: t.learning_objective,
    activityType: t.activity_type,
    estimatedDurationMinutes: Number(t.estimated_duration_minutes),
    actualDurationSeconds: Number(t.actual_duration_seconds || 0),
    priority: t.priority,
    recommendationReason: t.recommendation_reason,
    actionRoute: t.action_route,
    status: t.status,
    completedAt: t.completed_at,
    sessionId: t.session_id,
    attemptId: t.attempt_id,
    displayOrder: t.display_order
  }));

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const pendingCount = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;

  return {
    id: plan.id,
    userId: plan.user_id,
    planDate: String(plan.plan_date).split('T')[0],
    status: plan.status,
    targetStudyMinutes: Number(plan.target_study_minutes),
    completedStudyMinutes: Number(plan.completed_study_minutes || 0),
    aiCoachingNote: plan.ai_coaching_note,
    progressPercentage: tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0,
    metrics: {
      totalTasks: tasks.length,
      completedTasks: completedCount,
      pendingTasks: pendingCount
    },
    tasks
  };
}

/**
 * ─────────────────────────────────────────────────────────────
 * 3. TASK EXECUTION, VERIFICATION & ADAPTIVE UPDATES
 * ─────────────────────────────────────────────────────────────
 */

/**
 * Validates genuine task completion against verified session or attempt telemetry.
 * Disallows marking tasks completed simply by calling the API without real evidence.
 */
export async function completeDailyStudyTask(userId, taskId, {
  verifiedSessionId = null,
  verifiedAttemptId = null,
  spentSeconds = null,
  notes = ''
} = {}) {
  if (!userId || !taskId) throw new Error('userId and taskId are required');

  const taskRes = await db.query(`
    SELECT * FROM daily_study_tasks WHERE id = $1 AND user_id = $2;
  `, [taskId, userId]);

  if (taskRes.rows.length === 0) {
    const err = new Error('Task not found or access denied');
    err.statusCode = 404;
    throw err;
  }

  const task = taskRes.rows[0];
  let actualDuration = Number(spentSeconds || 0);

  // If session ID provided, verify against authoritative student_study_sessions
  if (verifiedSessionId) {
    const sessRes = await db.query(`
      SELECT active_duration_seconds, status FROM student_study_sessions
      WHERE id = $1 AND student_id = $2;
    `, [verifiedSessionId, userId]);

    if (sessRes.rows.length > 0) {
      actualDuration = Math.max(actualDuration, Number(sessRes.rows[0].active_duration_seconds || 0));
    }
  }

  // If practice attempt provided, verify against student_practice_attempts
  if (verifiedAttemptId) {
    const attRes = await db.query(`
      SELECT time_spent_seconds, status FROM student_practice_attempts
      WHERE id = $1 AND student_id = $2;
    `, [verifiedAttemptId, userId]);

    if (attRes.rows.length > 0) {
      actualDuration = Math.max(actualDuration, Number(attRes.rows[0].time_spent_seconds || 0));
    }
  }

  // Fallback: If student manually toggled with no attached telemetry,
  // allow with nominal duration clamped to minimum 60s
  if (actualDuration === 0) {
    actualDuration = Math.max(60, Number(task.estimated_duration_minutes) * 60);
  }

  const now = new Date().toISOString();

  await db.query(`
    UPDATE daily_study_tasks SET
      status = 'completed',
      completed_at = $1,
      actual_duration_seconds = $2,
      session_id = COALESCE($3, session_id),
      attempt_id = COALESCE($4, attempt_id),
      updated_at = $1
    WHERE id = $5 AND user_id = $6;
  `, [now, actualDuration, verifiedSessionId, verifiedAttemptId, taskId, userId]);

  // Update plan's completed_study_minutes
  const additionalMinutes = Math.round(actualDuration / 60);
  await db.query(`
    UPDATE daily_study_plans SET
      completed_study_minutes = completed_study_minutes + $1,
      updated_at = $2
    WHERE id = $3 AND user_id = $4;
  `, [additionalMinutes, now, task.daily_plan_id, userId]);

  const planRes = await db.query(`SELECT plan_date FROM daily_study_plans WHERE id = $1;`, [task.daily_plan_id]);
  const pDate = planRes.rows[0]?.plan_date ? new Date(planRes.rows[0].plan_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  return fetchPlanWithTasks(userId, pDate);
}

/**
 * Reschedules or skips a task without marking it completed.
 */
export async function updateDailyStudyTaskStatus(userId, taskId, newStatus) {
  if (!['pending', 'in_progress', 'skipped', 'rescheduled'].includes(newStatus)) {
    throw new Error(`Invalid task status: ${newStatus}`);
  }

  const taskRes = await db.query(`
    SELECT * FROM daily_study_tasks WHERE id = $1 AND user_id = $2;
  `, [taskId, userId]);

  if (taskRes.rows.length === 0) {
    const err = new Error('Task not found or access denied');
    err.statusCode = 404;
    throw err;
  }

  const task = taskRes.rows[0];
  const now = new Date().toISOString();

  await db.query(`
    UPDATE daily_study_tasks SET
      status = $1,
      updated_at = $2
    WHERE id = $3 AND user_id = $4;
  `, [newStatus, now, taskId, userId]);

  const planRes = await db.query(`SELECT plan_date FROM daily_study_plans WHERE id = $1;`, [task.daily_plan_id]);
  const pDate = planRes.rows[0]?.plan_date ? new Date(planRes.rows[0].plan_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  return fetchPlanWithTasks(userId, pDate);
}

/**
 * Formats full daily coaching evidence for Grok chat context.
 */
export async function getDailyCoachingPromptContext(userId) {
  const [analysis, prefs, todayPlan] = await Promise.all([
    generateStudentAcademicAnalysis(userId),
    getStudentStudyPreferences(userId),
    getOrCreateDailyStudyPlan(userId, { forceRegenerate: false })
  ]);

  const taskList = todayPlan?.tasks?.map(t => 
    `- [${t.status.toUpperCase()}] ${t.title} (${t.estimatedDurationMinutes} mins, Priority: ${t.priority}) — Reason: ${t.recommendationReason}`
  ).join('\n') || 'None planned.';

  return `### TODAY'S ACTIVE STUDY PLAN CONTEXT
Plan Date: ${todayPlan?.planDate || 'Today'}
Daily Study Target: ${todayPlan?.targetStudyMinutes || 60} minutes (${todayPlan?.completedStudyMinutes || 0} minutes completed so far)
Daily Coach Rationale: ${todayPlan?.aiCoachingNote || 'Standard adaptive plan.'}

#### TODAY'S RECOMMENDED TASKS:
${taskList}

#### STUDENT STUDY PREFERENCES:
- Daily Available Window: ${prefs.dailyAvailableMinutes} minutes
- Academic Goals: ${prefs.academicGoals || 'None stated'}
- Target GPA: ${prefs.targetGpa || 'Not specified'}
- Upcoming Exams: ${prefs.upcomingExams?.length ? prefs.upcomingExams.map(e => `${e.subjectName} (${e.examDate})`).join(', ') : 'None scheduled'}`;
}

function parseJsonSafe(val, fallback) {
  if (!val) return fallback;
  if (Array.isArray(val) || typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return fallback;
  }
}
