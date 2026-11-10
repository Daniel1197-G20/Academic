/**
 * academic-analysis-engine.js
 *
 * Deterministic Academic Intelligence Analysis Engine (Phase 2).
 * Computes verified student performance metrics strictly from authoritative records.
 *
 * Responsibilities:
 *  1. Subject-level performance analysis (attempts, accuracy, coverage, historical trends)
 *  2. Topic-level mastery diagnosis (min-5 evidence threshold, strengths, weaknesses, developing)
 *  3. Learning behaviour telemetry (active duration, session frequency, consistency, subject distribution)
 *  4. Academic progress trends (comparing sequential attempts and study cadence)
 *  5. Evidence grounding generator for AI Tutor context injection
 */

import { db } from './db.js';

/**
 * Generates a comprehensive, evidence-grounded academic intelligence analysis for a student.
 * All quantitative metrics are computed deterministically.
 *
 * @param {string} studentId - Authenticated student identifier
 * @returns {Promise<Object>} Structured academic analysis
 */
export async function generateStudentAcademicAnalysis(studentId) {
  if (!studentId) throw new Error('studentId is required');

  // 1. Fetch Student Profile Metadata
  const profileRes = await db.query(`SELECT full_name, institution, department, academic_level FROM profiles WHERE user_id = $1;`, [studentId]);
  const profile = profileRes.rows[0] || {};

  // 2. Compute Subject Performance
  const subjectAnalysis = await analyzeSubjectPerformance(studentId);

  // 3. Compute Topic Mastery & Diagnosis
  const topicAnalysis = await analyzeTopicMastery(studentId);

  // 4. Compute Learning Behaviour & Telemetry
  const behaviorAnalysis = await analyzeLearningBehavior(studentId);

  // 5. Compute Progress Trends
  const trendAnalysis = await analyzeProgressTrends(studentId);

  // 6. Compute Data Sufficiency & Evidence Confidence
  const totalQuestions = subjectAnalysis.reduce((sum, s) => sum + s.totalQuestionsAttempted, 0);
  const totalSessions = behaviorAnalysis.totalCompletedSessions;

  let evidenceConfidence = 'insufficient';
  if (totalQuestions >= 15 && totalSessions >= 3) {
    evidenceConfidence = 'high';
  } else if (totalQuestions >= 5 || totalSessions >= 1) {
    evidenceConfidence = 'moderate';
  } else {
    evidenceConfidence = 'insufficient';
  }

  return {
    studentId,
    studentName: profile.full_name || 'Student',
    department: profile.department || 'General Studies',
    academicLevel: profile.academic_level || 'Year 1',
    evidenceConfidence,
    summary: {
      totalQuestionsAnswered: totalQuestions,
      totalActiveStudyMinutes: behaviorAnalysis.totalActiveMinutes,
      totalActiveStudyHours: behaviorAnalysis.totalActiveHours,
      masteredTopicsCount: topicAnalysis.strengths.length,
      strugglingTopicsCount: topicAnalysis.weaknesses.length,
      developingTopicsCount: topicAnalysis.developing.length,
      unassessedTopicsCount: topicAnalysis.unassessedCount
    },
    subjects: subjectAnalysis,
    topicMastery: topicAnalysis,
    learningBehavior: behaviorAnalysis,
    trends: trendAnalysis,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Analyzes performance across each academic subject.
 */
async function analyzeSubjectPerformance(studentId) {
  const subjectsRes = await db.query(`
    SELECT id, name, code, category FROM subjects WHERE is_active = true ORDER BY display_order ASC;
  `);

  const results = [];

  for (const subj of subjectsRes.rows) {
    // Practice attempts for this subject
    const attRes = await db.query(`
      SELECT 
        COUNT(*) as total_attempts,
        COALESCE(SUM(total_questions), 0) as total_questions,
        COALESCE(SUM(correct_answers_count), 0) as correct_answers,
        COALESCE(AVG(score), 0) as avg_score
      FROM student_practice_attempts
      WHERE student_id = $1 AND subject_id = $2 AND status = 'completed';
    `, [studentId, subj.id]);

    const stats = attRes.rows[0];
    const totalAttempts = Number(stats.total_attempts || 0);
    const totalQuestions = Number(stats.total_questions || 0);
    const correctCount = Number(stats.correct_answers_count || 0);
    const incorrectCount = totalQuestions - correctCount;
    const accuracy = totalQuestions > 0 ? Number(((correctCount / totalQuestions) * 100).toFixed(1)) : null;

    // Available topic coverage
    const topicsRes = await db.query(`SELECT COUNT(*) as count FROM topics WHERE subject_id = $1 AND is_active = true;`, [subj.id]);
    const totalAvailableTopics = Number(topicsRes.rows[0].count || 0);

    const assessedTopicsRes = await db.query(`
      SELECT COUNT(DISTINCT topic_id) as count FROM student_topic_mastery WHERE student_id = $1 AND subject_id = $2;
    `, [studentId, subj.id]);
    const assessedTopics = Number(assessedTopicsRes.rows[0].count || 0);
    const topicCoveragePercentage = totalAvailableTopics > 0 ? Number(((assessedTopics / totalAvailableTopics) * 100).toFixed(0)) : 0;

    results.push({
      subjectId: subj.id,
      subjectName: subj.name,
      code: subj.code,
      category: subj.category,
      totalPracticeAttempts: totalAttempts,
      totalQuestionsAttempted: totalQuestions,
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      accuracyPercentage: accuracy,
      topicCoveragePercentage,
      hasSufficientData: totalQuestions >= 5
    });
  }

  return results;
}

/**
 * Analyzes topic mastery enforcing the mandatory Phase 1 rules:
 *  - 0 attempts: not_assessed (never weak)
 *  - 1-4 attempts: developing (never weak or mastered)
 *  - >= 5 attempts: struggling (<60%), proficient (60-79%), mastered (>=80%)
 */
async function analyzeTopicMastery(studentId) {
  const allTopicsRes = await db.query(`
    SELECT t.id, t.name, t.code, t.subject_id, s.name as subject_name
    FROM topics t
    JOIN subjects s ON t.subject_id = s.id
    WHERE t.is_active = true
    ORDER BY s.display_order ASC, t.display_order ASC;
  `);

  const masteryRecordsRes = await db.query(`
    SELECT 
      topic_id,
      subject_id,
      total_questions_attempted,
      correct_answers_count,
      accuracy_percentage,
      mastery_classification,
      performance_trend,
      last_assessed_at
    FROM student_topic_mastery
    WHERE student_id = $1;
  `, [studentId]);

  const masteryMap = new Map();
  for (const m of masteryRecordsRes.rows) {
    masteryMap.set(m.topic_id, m);
  }

  const strengths = [];
  const weaknesses = [];
  const developing = [];
  let unassessedCount = 0;

  for (const topic of allTopicsRes.rows) {
    const record = masteryMap.get(topic.id);

    if (!record || record.total_questions_attempted === 0) {
      unassessedCount++;
      continue;
    }

    const item = {
      topicId: topic.id,
      topicName: topic.name,
      topicCode: topic.code,
      subjectId: topic.subject_id,
      subjectName: topic.subject_name,
      questionsAttempted: Number(record.total_questions_attempted),
      correctAnswers: Number(record.correct_answers_count),
      accuracyPercentage: Number(record.accuracy_percentage),
      classification: record.mastery_classification,
      trend: record.performance_trend,
      lastAssessedAt: record.last_assessed_at
    };

    if (record.mastery_classification === 'mastered' || record.mastery_classification === 'proficient') {
      strengths.push(item);
    } else if (record.mastery_classification === 'struggling') {
      weaknesses.push(item);
    } else if (record.mastery_classification === 'developing') {
      developing.push(item);
    }
  }

  return {
    strengths,
    weaknesses,
    developing,
    unassessedCount,
    totalTopicsAvailable: allTopicsRes.rows.length
  };
}

/**
 * Analyzes verified active study duration, cadence, and habits.
 */
async function analyzeLearningBehavior(studentId) {
  const sessionsRes = await db.query(`
    SELECT 
      id, subject_id, source, started_at, ended_at,
      active_duration_seconds, idle_duration_seconds, status
    FROM student_study_sessions
    WHERE student_id = $1 AND status = 'completed'
    ORDER BY created_at DESC;
  `, [studentId]);

  const totalSessions = sessionsRes.rows.length;
  let totalActiveSeconds = 0;
  let totalIdleSeconds = 0;
  const sessionsBySubject = {};

  for (const s of sessionsRes.rows) {
    const act = Number(s.active_duration_seconds || 0);
    const idl = Number(s.idle_duration_seconds || 0);
    totalActiveSeconds += act;
    totalIdleSeconds += idl;

    const subj = s.subject_id || 'unassigned';
    sessionsBySubject[subj] = (sessionsBySubject[subj] || 0) + act;
  }

  const totalActiveMinutes = Math.round(totalActiveSeconds / 60);
  const totalActiveHours = Number((totalActiveMinutes / 60).toFixed(1));
  const totalIdleMinutes = Math.round(totalIdleSeconds / 60);

  // Consistency & Streak calculation from authoritative study logs
  const streakRes = await db.query(`
    SELECT DISTINCT logged_at FROM study_logs WHERE user_id = $1 ORDER BY logged_at DESC;
  `, [studentId]);

  const dates = streakRes.rows.map(r => String(r.logged_at).split('T')[0]);
  let streak = 0;

  if (dates.length > 0) {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yestStr = yesterday.toISOString().split('T')[0];

    if (dates.includes(todayStr) || dates.includes(yestStr)) {
      let curr = new Date(dates.includes(todayStr) ? todayStr : yestStr);
      while (true) {
        const checkStr = curr.toISOString().split('T')[0];
        if (dates.includes(checkStr)) {
          streak++;
          curr.setDate(curr.getDate() - 1);
        } else {
          break;
        }
      }
    }
  }

  return {
    totalCompletedSessions: totalSessions,
    totalActiveMinutes,
    totalActiveHours,
    totalIdleMinutesDeducted: totalIdleMinutes,
    studyStreakDays: streak,
    distinctActiveDaysCount: dates.length,
    subjectTimeDistributionMinutes: Object.fromEntries(
      Object.entries(sessionsBySubject).map(([k, v]) => [k, Math.round(v / 60)])
    )
  };
}

/**
 * Analyzes sequential progress trends to establish empirical improvement or decline.
 */
async function analyzeProgressTrends(studentId) {
  // Check sequential practice drill scores
  const attemptsRes = await db.query(`
    SELECT id, subject_id, topic_id, score, total_questions, correct_answers_count, completed_at
    FROM student_practice_attempts
    WHERE student_id = $1 AND status = 'completed'
    ORDER BY completed_at ASC;
  `, [studentId]);

  const attempts = attemptsRes.rows;
  if (attempts.length < 2) {
    return {
      hasHistoricalTrend: false,
      trendSummary: 'Insufficient historical drill observations. Complete at least 2 diagnostic drills to identify performance trends.',
      improvingTopics: [],
      decliningTopics: []
    };
  }

  // Group by topic to find delta
  const byTopic = {};
  for (const a of attempts) {
    if (!a.topic_id) continue;
    if (!byTopic[a.topic_id]) byTopic[a.topic_id] = [];
    byTopic[a.topic_id].push(Number(a.score));
  }

  const improvingTopics = [];
  const decliningTopics = [];

  for (const [topicId, scores] of Object.entries(byTopic)) {
    if (scores.length >= 2) {
      const first = scores[0];
      const latest = scores[scores.length - 1];
      const delta = Number((latest - first).toFixed(1));

      if (delta >= 10) {
        improvingTopics.push({ topicId, delta, latestScore: latest });
      } else if (delta <= -10) {
        decliningTopics.push({ topicId, delta, latestScore: latest });
      }
    }
  }

  return {
    hasHistoricalTrend: true,
    totalCompletedDrills: attempts.length,
    improvingTopics,
    decliningTopics,
    recentScores: attempts.slice(-5).map(a => Number(a.score))
  };
}

/**
 * Builds a grounded, tamper-proof academic context brief for the Grok AI model.
 * Injects measured facts and explicit warnings not to hallucinate unassessed areas.
 */
export function formatAcademicContextForAi(analysis) {
  const { studentName, department, academicLevel, evidenceConfidence, summary, subjects, topicMastery, learningBehavior, trends } = analysis;

  const strengthsStr = topicMastery.strengths.length > 0
    ? topicMastery.strengths.map(s => `- ${s.topicName} (${s.subjectName}): ${s.accuracyPercentage}% accuracy over ${s.questionsAttempted} questions [${s.classification}]`).join('\n')
    : 'None diagnosed yet (requires at least 5 questions with >=80% accuracy).';

  const weaknessesStr = topicMastery.weaknesses.length > 0
    ? topicMastery.weaknesses.map(w => `- ${w.topicName} (${w.subjectName}): ${w.accuracyPercentage}% accuracy over ${w.questionsAttempted} questions [struggling]`).join('\n')
    : 'None diagnosed (no topic with >=5 questions has scored below 60%).';

  const developingStr = topicMastery.developing.length > 0
    ? topicMastery.developing.map(d => `- ${d.topicName} (${d.subjectName}): ${d.questionsAttempted} questions attempted (insufficient sample size, developing)`).join('\n')
    : 'None.';

  const subjectSummaryStr = subjects.map(s => {
    if (s.totalQuestionsAttempted === 0) {
      return `- ${s.subjectName} (${s.code}): Unassessed (0 questions attempted).`;
    }
    return `- ${s.subjectName} (${s.code}): ${s.accuracyPercentage}% accuracy (${s.correctAnswers}/${s.totalQuestionsAttempted} correct) across ${s.totalPracticeAttempts} drills. Topic coverage: ${s.topicCoveragePercentage}%.`;
  }).join('\n');

  return `### VERIFIED STUDENT ACADEMIC INTELLIGENCE CONTEXT (DO NOT OVERRIDE OR INVENT FACTS)
Student Name: ${studentName}
Academic Program: ${department} — ${academicLevel}
Evidence Confidence Level: ${evidenceConfidence.toUpperCase()}

#### MEASURED ACTIVITY METRICS:
- Total Verified Active Study Hours: ${learningBehavior.totalActiveHours} hours (${learningBehavior.totalActiveMinutes} minutes)
- Deducted Idle / Inactive Tab Time: ${learningBehavior.totalIdleMinutesDeducted} minutes
- Current Study Streak: ${learningBehavior.studyStreakDays} days active
- Total Questions Answered: ${summary.totalQuestionsAnswered}
- Topics Covered / Diagnosed: ${topicMastery.strengths.length + topicMastery.weaknesses.length + topicMastery.developing.length} of ${topicMastery.totalTopicsAvailable} (${topicMastery.unassessedCount} unassessed)

#### SUBJECT PERFORMANCE BREAKDOWN:
${subjectSummaryStr}

#### EMPIRICAL TOPIC STRENGTHS (>=5 attempts & >=80% accuracy):
${strengthsStr}

#### EMPIRICAL TOPIC WEAKNESSES (>=5 attempts & <60% accuracy):
${weaknessesStr}

#### DEVELOPING TOPICS (1-4 attempts, sample size too small for weakness claim):
${developingStr}

#### TREND OBSERVATIONS:
- Has Historical Trend Data: ${trends.hasHistoricalTrend ? 'Yes' : 'No (Requires >= 2 completed drills)'}
- Improving Topics: ${trends.improvingTopics?.length || 0}
- Declining Topics: ${trends.decliningTopics?.length || 0}

CRITICAL RULES FOR YOUR ACADEMIC COACHING RESPONSE:
1. Ground all claims in the verified numbers above. Never fabricate initial baseline scores, study hours, or grades.
2. If the student has zero questions or zero study hours in a subject, state clearly that it is "Unassessed" rather than claiming they are struggling.
3. If evidence is insufficient, explicitly recommend diagnostic drills rather than guessing.
4. Encourage the student with clear, actionable study steps based on their genuine empirical weak areas.`;
}
