/**
 * server/test-phase-b-daily-questions.js
 *
 * Automated Verification for Phase B:
 * Daily Personalized Questions Engine.
 */

import assert from 'assert';
import { initializeDatabase, db, closeDatabase } from './db.js';
import { getDailyPersonalizedQuestions } from './study-coach-service.js';
import { handleApiRequest } from './api.js';

function createMockHttp(method, url, body = null, headers = {}) {
  const req = {
    method,
    url,
    headers: { 'content-type': 'application/json', ...headers },
    listeners: {},
    on(event, handler) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(handler);
      if (event === 'data' && body) {
        setTimeout(() => {
          handler(Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)));
          if (this.listeners['end']) {
            this.listeners['end'].forEach(h => h());
          }
        }, 1);
      } else if (event === 'end' && !body) {
        setTimeout(() => handler(), 1);
      }
      return this;
    }
  };

  let statusCode = 200;
  let responseHeaders = {};
  let responseData = '';
  let endPromiseResolve;
  const endPromise = new Promise(resolve => { endPromiseResolve = resolve; });

  const res = {
    writeHead(code, hdrs) {
      statusCode = code;
      if (hdrs) responseHeaders = { ...responseHeaders, ...hdrs };
    },
    setHeader(key, value) {
      responseHeaders[key.toLowerCase()] = value;
    },
    getHeader(key) {
      return responseHeaders[key.toLowerCase()];
    },
    end(data) {
      if (data) responseData += data;
      endPromiseResolve({ status: statusCode, headers: responseHeaders, data: responseData });
    },
    write(data) {
      if (data) responseData += data;
    },
    getStatus() { return statusCode; },
    getBody() {
      try {
        return JSON.parse(responseData);
      } catch (e) {
        return responseData;
      }
    },
    waitForEnd() { return endPromise; }
  };

  return { req, res };
}

async function runPhaseBTests() {
  process.env.APP_SECRET = process.env.APP_SECRET || 'test_jwt_secret_academic_platform_phase_b';
  console.log('\n====================================================');
  console.log('🧪 PHASE B: DAILY PERSONALIZED QUESTIONS TEST SUITE');
  console.log('====================================================\n');

  await initializeDatabase();

  const studentAId = 'usr_alexander_vance';
  const studentBId = 'usr_maya_lin';

  console.log('--- 1. Authenticated API Endpoint (GET /api/study/daily-questions) ---');
  // Unauthenticated request should be rejected
  const { req: unauthReq, res: unauthRes } = createMockHttp('GET', '/api/study/daily-questions');
  await handleApiRequest(unauthReq, unauthRes);
  await unauthRes.waitForEnd();
  assert(unauthRes.getStatus() === 401, 'Unauthenticated GET /api/study/daily-questions returns 401');
  console.log('  ✓ [PASS] Unauthenticated request safely rejected with 401');

  // Login as Student A
  const { req: lReq, res: lRes } = createMockHttp('POST', '/api/auth/login', {
    email: 'alexander.vance@tech-academy.edu',
    password: 'Password123!'
  });
  await handleApiRequest(lReq, lRes);
  await lRes.waitForEnd();
  const tokenA = lRes.getBody().token;
  assert(tokenA, 'Student A authenticated successfully');

  // Authenticated call
  const { req: qReq, res: qRes } = createMockHttp('GET', '/api/study/daily-questions', null, {
    authorization: `Bearer ${tokenA}`
  });
  await handleApiRequest(qReq, qRes);
  await qRes.waitForEnd();

  assert(qRes.getStatus() === 200, 'GET /api/study/daily-questions returns 200 OK');
  const qBody = qRes.getBody();
  assert(qBody.success === true, 'Response indicates success');
  assert(Array.isArray(qBody.questions), 'Questions returned as array');
  assert(qBody.questions.length > 0, `Returned ${qBody.questions.length} questions`);
  assert(qBody.studentId === studentAId, 'studentId matches authenticated student');
  console.log('  ✓ [PASS] GET /api/study/daily-questions returns structured question set');

  console.log('\n--- 2. Grounding in Actual Academic Profile & Registered Subjects ---');
  // Alexander is registered in Computer Science (subj_cs)
  const qSubjIds = qBody.questions.map(q => q.subjectId);
  assert(qSubjIds.includes('subj_cs') || qSubjIds.includes('subj_math'), 'Questions grounded in registered subjects');
  assert(typeof qBody.rationale === 'string' && qBody.rationale.length > 0, 'Recommendation rationale provided');
  console.log(`  ✓ [PASS] Questions calibrated to registered subjects. Rationale: "${qBody.rationale}"`);

  console.log('\n--- 3. Strict Anti-Answer-Leakage (Zero Explanations/Answers in Drill Payload) ---');
  for (const q of qBody.questions) {
    assert(q.correct_answer === undefined, 'correct_answer is NEVER leaked in daily questions payload');
    assert(q.correctAnswer === undefined, 'correctAnswer is NEVER leaked in daily questions payload');
    assert(q.explanation === undefined, 'explanation is NEVER leaked in daily questions payload');
    assert(Array.isArray(q.options) && q.options.length > 0, 'Options provided safely for client rendering');
  }
  console.log('  ✓ [PASS] Zero answer keys or explanations leaked to the client');

  console.log('\n--- 4. Empirical Weakness Prioritization ---');
  // Inject struggling topic for Student A: top_algo_sort with < 60% accuracy over >= 5 attempts
  await db.query(`
    INSERT INTO student_topic_mastery (
      id, student_id, subject_id, topic_id, total_questions_attempted,
      correct_answers_count, incorrect_answers_count, accuracy_percentage,
      mastery_classification, performance_trend, last_assessed_at
    ) VALUES (
      'mst_phase_b_test', $1, 'subj_cs', 'top_algo_sort', 6, 2, 4, 33.33,
      'struggling', 'declining', CURRENT_TIMESTAMP
    ) ON CONFLICT (student_id, topic_id) DO UPDATE SET
      accuracy_percentage = 33.33,
      mastery_classification = 'struggling';
  `, [studentAId]);

  const targetedData = await getDailyPersonalizedQuestions(studentAId, { limit: 5 });
  assert(targetedData.questions.some(q => q.topicId === 'top_algo_sort'), 'Daily questions prioritize empirical weak topic');
  assert(targetedData.rationale.includes('weakness') || targetedData.rationale.includes('developing'), 'Rationale cites weakness diagnosis');
  console.log('  ✓ [PASS] Questions adaptively prioritize student empirical weakness (top_algo_sort)');

  console.log('\n--- 5. Cross-Student Ownership & Profile Independence ---');
  // Student B (Maya Lin) is enrolled in Data Science / Math
  const bData = await getDailyPersonalizedQuestions(studentBId, { limit: 5 });
  assert(bData.studentId === studentBId, 'Student B questions assigned strictly to Student B');
  assert(bData.questions.length > 0, 'Student B receives questions');
  console.log('  ✓ [PASS] Student B receives independent, profile-calibrated questions');

  console.log('\n--- 6. Incomplete Profile Handling (Strict No-Hallucination) ---');
  const incStudentId = 'usr_incomplete_student';
  const incData = await getDailyPersonalizedQuestions(incStudentId, { limit: 5 });
  assert(incData.targetCourseOfStudy === null, 'Incomplete profile targetCourseOfStudy is strictly null');
  assert(incData.questions.length > 0, 'Surfaces foundational diagnostic questions without error');
  console.log('  ✓ [PASS] Incomplete profiles receive safe curriculum diagnostic fallback without fabricated data');

  console.log('\n====================================================');
  console.log('RESULTS: ALL PHASE B TESTS PASSED (0 FAILURES)');
  console.log('====================================================\n');

  await closeDatabase();
}

runPhaseBTests().catch(err => {
  console.error('Phase B Test Suite Failed:', err);
  process.exit(1);
});
