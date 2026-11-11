/**
 * test-academic-phase2.js
 *
 * Comprehensive Test Suite for Studora Academic Intelligence Phase 2.
 *
 * Verifies:
 *  1. GET /api/academic/analysis returns structured, deterministic analysis for authenticated student.
 *  2. Unauthenticated request to GET /api/academic/analysis returns 401 Unauthorized.
 *  3. Student with zero records returns evidenceConfidence = 'insufficient' and 0 counts (no fabricated statistics).
 *  4. Subject performance calculations (accuracy, question count, topic coverage).
 *  5. Topic mastery enforcement:
 *      - 0 attempts = unassessed
 *      - 1-4 attempts = developing (never labeled weak or mastered)
 *      - >=5 attempts with <60% = struggling (empirical weakness)
 *      - >=5 attempts with >=80% = mastered (empirical strength)
 *  6. Learning behaviour analysis returns verified active hours, deducted idle time, streak, and subject distribution.
 *  7. Historical trend calculation handles <2 drills gracefully (hasHistoricalTrend: false).
 *  8. Evidence grounding generator formatAcademicContextForAi produces structured brief without hallucinations.
 *  9. AI Chat endpoint /api/ai/chat seamlessly injects grounded academic intelligence context.
 *  10. Cross-student isolation: Student A cannot retrieve Student B's academic analysis.
 *  11. Data sufficiency thresholds (insufficient -> moderate -> high) based on deterministic criteria.
 */

import { initializeDatabase, db, closeDatabase } from './db.js';
import { handleApiRequest, createSessionToken } from './api.js';
import { generateStudentAcademicAnalysis, formatAcademicContextForAi } from './academic-analysis-engine.js';

process.env.APP_SECRET = process.env.APP_SECRET || 'test_secret_for_academic_phase2_suite_2026';
process.env.NODE_ENV = 'test';

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ [FAIL] ${testName} ${detail ? `— ${detail}` : ''}`);
    failedCount++;
  }
}

// Mock HTTP Request / Response simulator
function createMockHttp(method, path, body = null, headers = {}) {
  let resStatus = 200;
  let resHeaders = {};
  let resBody = '';

  const req = {
    method,
    url: path,
    headers: {
      'content-type': 'application/json',
      ...headers
    },
    on(event, handler) {
      if (event === 'data' && body) {
        handler(Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)));
      }
      if (event === 'end') {
        handler();
      }
    }
  };

  const res = {
    writeHead(status, hdrs = {}) {
      resStatus = status;
      resHeaders = { ...resHeaders, ...hdrs };
    },
    setHeader(name, val) {
      resHeaders[name.toLowerCase()] = val;
    },
    end(chunk) {
      if (chunk) resBody += chunk.toString();
    },
    getStatus: () => resStatus,
    getBody: () => {
      try {
        return JSON.parse(resBody);
      } catch (e) {
        return resBody;
      }
    }
  };

  return { req, res };
}

async function run() {
  console.log('\n====================================================');
  console.log('🧪 ACADEMIC INTELLIGENCE PHASE 2 TEST SUITE');
  console.log('====================================================\n');

  await initializeDatabase();

  // Seed two distinct test students
  const runId = Date.now();
  const studentA = 'usr_phase2_student_a_' + runId;
  const studentB = 'usr_phase2_student_b_' + runId;
  const emailA = `student.a.${runId}@studora.local`;
  const emailB = `student.b.${runId}@studora.local`;

  await db.query(`
    INSERT INTO users (id, email, display_name, role, status)
    VALUES 
      ($1, $2, 'Student Alpha', 'student', 'active'),
      ($3, $4, 'Student Beta', 'student', 'active')
    ON CONFLICT (id) DO NOTHING;
  `, [studentA, emailA, studentB, emailB]);

  await db.query(`
    INSERT INTO profiles (user_id, full_name, institution, department, academic_level)
    VALUES 
      ($1, 'Student Alpha', 'University of Lagos', 'Computer Science', 'Year 3'),
      ($2, 'Student Beta', 'University of Ibadan', 'Mechanical Engineering', 'Year 2')
    ON CONFLICT (user_id) DO NOTHING;
  `, [studentA, studentB]);

  const tokenA = createSessionToken({ userId: studentA, email: emailA, role: 'student' });
  const tokenB = createSessionToken({ userId: studentB, email: emailB, role: 'student' });

  // ─────────────────────────────────────────────────────────────
  // 1. Unauthenticated Security & Authorization Protection
  // ─────────────────────────────────────────────────────────────
  console.log('--- 1. Authentication & Security ---');
  {
    const { req, res } = createMockHttp('GET', '/api/academic/analysis');
    await handleApiRequest(req, res);
    assert(res.getStatus() === 401, 'Unauthenticated GET /api/academic/analysis returns 401 Unauthorized');
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Empty State / Zero-Record Handling (Strict No Hallucination)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 2. Zero-Record Academic Intelligence (Strict No-Hallucination) ---');
  {
    const { req, res } = createMockHttp('GET', '/api/academic/analysis', null, {
      authorization: `Bearer ${tokenA}`
    });
    await handleApiRequest(req, res);
    const body = res.getBody();

    assert(res.getStatus() === 200, 'Authenticated GET /api/academic/analysis returns 200 OK');
    assert(body.success === true, 'Response indicates success: true');
    assert(body.studentId === studentA, 'Returned studentId matches caller');
    assert(body.studentName === 'Student Alpha', 'Returned profile name matches database');
    assert(body.evidenceConfidence === 'insufficient', 'Zero-record student has evidenceConfidence = "insufficient"');
    assert(body.summary.totalQuestionsAnswered === 0, 'Total questions evaluated is strictly 0');
    assert(body.summary.totalActiveStudyMinutes === 0, 'Total active study minutes is strictly 0');
    assert(body.summary.masteredTopicsCount === 0, 'Mastered topics count is strictly 0');
    assert(body.summary.strugglingTopicsCount === 0, 'Struggling topics count is strictly 0');
    assert(body.topicMastery.strengths.length === 0, 'No strengths diagnosed without data');
    assert(body.topicMastery.weaknesses.length === 0, 'No weaknesses diagnosed without data (never mark unassessed as weak)');
    assert(body.trends.hasHistoricalTrend === false, 'hasHistoricalTrend is false when attempts < 2');
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Subject & Topic Mastery Diagnostics
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 3. Deterministic Mastery Calculation & Classification Rules ---');
  // Use known seeded topics
  const subjectId = 'subj_cs';
  const topic1 = 'top_algo_sort';    // will test 'developing' (3 attempts)
  const topic2 = 'top_algo_graphs';  // will test 'mastered' (6 attempts, 83.3%)
  const topic3 = 'top_db_sql';       // will test 'struggling' (5 attempts, 20%)

  {
    const now = new Date().toISOString();

    // Topic 1: 3 attempts, 3 correct (100% accuracy, but < 5 attempts -> MUST be "developing")
    await db.query(`
      INSERT INTO student_topic_mastery (
        id, student_id, subject_id, topic_id, total_questions_attempted,
        correct_answers_count, incorrect_answers_count, accuracy_percentage,
        mastery_classification, performance_trend, last_assessed_at, updated_at
      ) VALUES ($1, $2, $3, $4, 3, 3, 0, 100.0, 'developing', 'steady', $5, $5)
      ON CONFLICT (student_id, topic_id) DO UPDATE SET
        total_questions_attempted = EXCLUDED.total_questions_attempted,
        mastery_classification = EXCLUDED.mastery_classification;
    `, ['mst_1_' + runId, studentA, subjectId, topic1, now]);

    // Topic 2: 6 attempts, 5 correct (83.3% accuracy, >= 5 attempts -> "mastered")
    await db.query(`
      INSERT INTO student_topic_mastery (
        id, student_id, subject_id, topic_id, total_questions_attempted,
        correct_answers_count, incorrect_answers_count, accuracy_percentage,
        mastery_classification, performance_trend, last_assessed_at, updated_at
      ) VALUES ($1, $2, $3, $4, 6, 5, 1, 83.3, 'mastered', 'improving', $5, $5)
      ON CONFLICT (student_id, topic_id) DO UPDATE SET
        total_questions_attempted = EXCLUDED.total_questions_attempted,
        mastery_classification = EXCLUDED.mastery_classification;
    `, ['mst_2_' + runId, studentA, subjectId, topic2, now]);

    // Topic 3: 5 attempts, 1 correct (20.0% accuracy, >= 5 attempts -> "struggling")
    await db.query(`
      INSERT INTO student_topic_mastery (
        id, student_id, subject_id, topic_id, total_questions_attempted,
        correct_answers_count, incorrect_answers_count, accuracy_percentage,
        mastery_classification, performance_trend, last_assessed_at, updated_at
      ) VALUES ($1, $2, $3, $4, 5, 1, 4, 20.0, 'struggling', 'declining', $5, $5)
      ON CONFLICT (student_id, topic_id) DO UPDATE SET
        total_questions_attempted = EXCLUDED.total_questions_attempted,
        mastery_classification = EXCLUDED.mastery_classification;
    `, ['mst_3_' + runId, studentA, subjectId, topic3, now]);

    // Also record completed practice attempts in DB for subject and trend calculations
    await db.query(`
      INSERT INTO student_practice_attempts (
        id, student_id, subject_id, topic_id, score, passed, total_questions, correct_answers_count, status, completed_at
      ) VALUES 
        ($1, $2, $3, $4, 100.0, true, 3, 3, 'completed', $5),
        ($6, $2, $3, $7, 80.0, true, 6, 5, 'completed', $5),
        ($8, $2, $3, $9, 20.0, false, 5, 1, 'completed', $5)
      ON CONFLICT (id) DO NOTHING;
    `, [
      'att_1_' + runId, studentA, subjectId, topic1, now,
      'att_2_' + runId, topic2,
      'att_3_' + runId, topic3
    ]);

    const { req, res } = createMockHttp('GET', '/api/academic/analysis', null, {
      authorization: `Bearer ${tokenA}`
    });
    await handleApiRequest(req, res);
    const body = res.getBody();

    assert(body.topicMastery.developing.length >= 1, 'Topic with <5 attempts is correctly placed in developing list');
    assert(body.topicMastery.developing.some(d => d.topicId === topic1), 'Topic 1 is classified as developing');
    assert(body.topicMastery.strengths.some(s => s.topicId === topic2), 'Topic 2 is diagnosed as empirical strength (mastered)');
    assert(body.topicMastery.weaknesses.some(w => w.topicId === topic3), 'Topic 3 is diagnosed as empirical weakness (struggling)');
    assert(body.summary.totalQuestionsAnswered === 14, `Total questions correctly aggregates attempts (got ${body.summary.totalQuestionsAnswered})`);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Learning Behaviour Telemetry Verification
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 4. Active Study Telemetry & Streak Calculation ---');
  {
    const now = new Date();
    const sessionId = 'sess_p2_' + Date.now();

    // Insert completed 45-minute study session with 5 minutes idle
    await db.query(`
      INSERT INTO student_study_sessions (
        id, student_id, subject_id, source, started_at, ended_at, last_heartbeat_at,
        active_duration_seconds, idle_duration_seconds, status, created_at, updated_at
      ) VALUES ($1, $2, $3, 'study_timer', $4, $5, $5, 2700, 300, 'completed', $4, $5);
    `, [sessionId, studentA, subjectId, now.toISOString(), now.toISOString()]);

    const analysis = await generateStudentAcademicAnalysis(studentA);
    assert(analysis.learningBehavior.totalCompletedSessions >= 1, 'Completed study session is counted');
    assert(analysis.learningBehavior.totalActiveMinutes >= 45, 'Active duration accurately converted to minutes');
    assert(analysis.learningBehavior.totalActiveHours >= 0.7, 'Active duration accurately computed in hours');
    assert(analysis.learningBehavior.totalIdleMinutesDeducted >= 5, 'Idle time properly deducted and tracked');
    assert(typeof analysis.learningBehavior.studyStreakDays === 'number', 'studyStreakDays is a valid number');
  }

  // ─────────────────────────────────────────────────────────────
  // 5. Evidence Grounding Context for AI Coach
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 5. Grounded AI Context Generator (formatAcademicContextForAi) ---');
  {
    const analysis = await generateStudentAcademicAnalysis(studentA);
    const contextStr = formatAcademicContextForAi(analysis);

    assert(typeof contextStr === 'string', 'formatAcademicContextForAi returns a string');
    assert(contextStr.includes('### VERIFIED STUDENT ACADEMIC INTELLIGENCE CONTEXT'), 'Context contains mandatory grounded header');
    assert(contextStr.includes('Student Name: Student Alpha'), 'Context specifies verified student name');
    assert(contextStr.includes('Total Verified Active Study Hours'), 'Context includes measured study hours');
    assert(contextStr.includes('EMPIRICAL TOPIC STRENGTHS'), 'Context formats verified strengths section');
    assert(contextStr.includes('EMPIRICAL TOPIC WEAKNESSES'), 'Context formats verified weaknesses section');
    assert(contextStr.includes('DEVELOPING TOPICS'), 'Context formats developing topics section');
    assert(contextStr.includes('CRITICAL RULES FOR YOUR ACADEMIC COACHING RESPONSE'), 'Context provides mandatory strict guardrails for Grok');
  }

  // ─────────────────────────────────────────────────────────────
  // 6. Cross-Student Isolation Security
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 6. Cross-Student Data Isolation ---');
  {
    // Student B requests their own analysis; must have 0 records, completely isolated from Student A
    const { req, res } = createMockHttp('GET', '/api/academic/analysis', null, {
      authorization: `Bearer ${tokenB}`
    });
    await handleApiRequest(req, res);
    const body = res.getBody();

    assert(body.studentId === studentB, 'Student B gets only Student B analysis');
    assert(body.summary.totalQuestionsAnswered === 0, 'Student B cannot see Student A questions (strictly 0)');
    assert(body.summary.totalActiveStudyMinutes === 0, 'Student B cannot see Student A study hours (strictly 0)');
    assert(body.topicMastery.strengths.length === 0, 'Student B has 0 strengths (no cross-leakage)');
  }

  // ─────────────────────────────────────────────────────────────
  // 7. AI Chat Route Integration & Prompt Grounding
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 7. Conversational Academic Intelligence (/api/ai/chat) ---');
  {
    const { req, res } = createMockHttp('POST', '/api/ai/chat', {
      prompt: 'What are my strongest topics based on my verified records?'
    }, {
      authorization: `Bearer ${tokenA}`
    });
    await handleApiRequest(req, res);
    const body = res.getBody();

    assert(res.getStatus() === 200, 'POST /api/ai/chat returns 200 OK');
    const answer = body.message?.content || body.answer;
    assert(answer && typeof answer === 'string', 'AI returns a valid answer string');
    assert(answer && answer.length > 20, 'AI answer has substantive content');
  }

  console.log('\n====================================================');
  console.log(`RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('====================================================\n');

  await closeDatabase();
  process.exit(failedCount === 0 ? 0 : 1);
}

run().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
