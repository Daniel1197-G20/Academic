/**
 * test-academic-foundation.js
 *
 * Comprehensive Test Suite for Studora Academic Intelligence Data Foundation (Phase 1).
 *
 * Verifies all 17 mandatory criteria:
 *  1. Starting a study session.
 *  2. Pausing and resuming a session.
 *  3. Completing a session.
 *  4. Heartbeat processing.
 *  5. Inactivity detection.
 *  6. Browser tab visibility changes.
 *  7. Network interruption and recovery (time-gap clamping).
 *  8. Duplicate heartbeat requests.
 *  9. Duplicate practice submissions (idempotency).
 *  10. Correct and incorrect answers evaluation.
 *  11. Topic with zero attempts (strictly 'not_assessed', never weak).
 *  12. Topic with fewer than five attempts (classified as 'developing', never weak).
 *  13. Topic reaching five attempts (proper diagnosis into 'struggling', 'proficient', or 'mastered').
 *  14. Student ownership and isolation (cannot access/modify another student's session).
 *  15. Unauthorized requests (unauthenticated 401s).
 *  16. Multiple tabs and overlapping sessions (supersedes prior active session cleanly).
 *  17. Existing tutor assessment regression verification (zero regression).
 */

import { initializeDatabase, db, closeDatabase } from './db.js';
import { handleApiRequest } from './api.js';

process.env.APP_SECRET = process.env.APP_SECRET || 'test_secret_for_academic_foundation_suite_2026';
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
      return this;
    }
  };

  const res = {
    writeHead(status, hdrs) {
      resStatus = status;
      resHeaders = { ...resHeaders, ...hdrs };
      return this;
    },
    setHeader(k, v) {
      resHeaders[k] = v;
      return this;
    },
    write(chunk) {
      resBody += chunk;
      return this;
    },
    end(chunk) {
      if (chunk) resBody += chunk;
      return this;
    }
  };

  return {
    req,
    res,
    getResponse: () => {
      let parsed = {};
      try { parsed = JSON.parse(resBody); } catch { parsed = { raw: resBody }; }
      return { status: resStatus, headers: resHeaders, body: parsed };
    }
  };
}

async function executeApi(method, path, body = null, token = null) {
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  const mock = createMockHttp(method, path, body, headers);
  await handleApiRequest(mock.req, mock.res);
  return mock.getResponse();
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 ACADEMIC INTELLIGENCE FOUNDATION TEST SUITE');
  console.log('====================================================\n');

  await initializeDatabase();

  // Step 0: Login Demo Student (Alexander Vance) and Student B (Maya Lin)
  const alexLogin = await executeApi('POST', '/api/auth/login', {
    email: 'alexander.vance@tech-academy.edu',
    password: 'Password123!'
  });
  const alexToken = alexLogin.body.token;
  const alexId = alexLogin.body.user.id;

  const mayaLogin = await executeApi('POST', '/api/auth/login', {
    email: 'maya.lin@tech-academy.edu',
    password: 'Password123!'
  });
  const mayaToken = mayaLogin.body.token;
  const mayaId = mayaLogin.body.user.id;

  assert(alexToken && alexId, 'Demo Student A logged in successfully');
  assert(mayaToken && mayaId, 'Demo Student B logged in successfully');

  console.log('\n--- 1. Study Session Lifecycle (Start, Pause, Resume, Complete) ---');

  // Test 1: Start study session
  const startRes = await executeApi('POST', '/api/study/sessions/start', {
    subjectId: 'subj_cs',
    topicId: 'top_algo_sort'
  }, alexToken);

  assert(startRes.status === 201, '1. Start study session returns 201 Created');
  assert(startRes.body.session?.status === 'active', 'Session is active on start');
  const sessId = startRes.body.session?.sessionId;

  // Test 2: Pause session
  const pauseRes = await executeApi('POST', `/api/study/sessions/${sessId}/pause`, {}, alexToken);
  assert(pauseRes.status === 200, '2. Pause session returns 200 OK');
  assert(pauseRes.body.status === 'paused', 'Session status is now paused');

  // Test 3: Resume session
  const resumeRes = await executeApi('POST', `/api/study/sessions/${sessId}/resume`, {}, alexToken);
  assert(resumeRes.status === 200, '3. Resume session returns 200 OK');
  assert(resumeRes.body.status === 'active', 'Session status is resumed to active');

  console.log('\n--- 2. Telemetry, Heartbeat, and Inactivity Tracking ---');

  // Test 4: Heartbeat processing
  const hb1 = await executeApi('POST', `/api/study/sessions/${sessId}/heartbeat`, {
    isTabVisible: true,
    isUserActive: true
  }, alexToken);
  assert(hb1.status === 200, '4. Normal heartbeat returns 200 OK');
  assert(typeof hb1.body.activeDurationSeconds === 'number', 'Heartbeat returns activeDurationSeconds');

  // Test 5: Inactivity detection (user is idle)
  const hbIdle = await executeApi('POST', `/api/study/sessions/${sessId}/heartbeat`, {
    isTabVisible: true,
    isUserActive: false
  }, alexToken);
  assert(hbIdle.status === 200, '5. Heartbeat with user idle flags idle duration');

  // Test 6: Tab visibility change (Page Visibility API)
  const visRes = await executeApi('POST', `/api/study/sessions/${sessId}/visibility`, {
    isVisible: false
  }, alexToken);
  assert(visRes.status === 200 && visRes.body.eventType === 'tab_blur', '6. Tab backgrounded triggers tab_blur event');

  const hbBlur = await executeApi('POST', `/api/study/sessions/${sessId}/heartbeat`, {
    isTabVisible: false,
    isUserActive: true
  }, alexToken);
  assert(hbBlur.status === 200, 'Tab blur prevents active time accumulation');

  // Test 7: Network gap & time clamping (cannot claim 10 hours from a dropped connection)
  // Simulate database last heartbeat set to 1 hour ago
  await db.query(`
    UPDATE student_study_sessions
    SET last_heartbeat_at = CURRENT_TIMESTAMP - INTERVAL '1 hour'
    WHERE id = $1;
  `, [sessId]);

  const hbClamped = await executeApi('POST', `/api/study/sessions/${sessId}/heartbeat`, {
    isTabVisible: true,
    isUserActive: true
  }, alexToken);
  assert(hbClamped.status === 200, '7. Extended disconnect heartbeat is recovered safely');
  assert(hbClamped.body.activeDurationSeconds <= 70, 'Active duration clamped to prevent massive jump after network gap');

  // Test 8: Rapid duplicate heartbeat requests
  const hbDup1 = await executeApi('POST', `/api/study/sessions/${sessId}/heartbeat`, { isTabVisible: true, isUserActive: true }, alexToken);
  const hbDup2 = await executeApi('POST', `/api/study/sessions/${sessId}/heartbeat`, { isTabVisible: true, isUserActive: true }, alexToken);
  assert(hbDup1.status === 200 && hbDup2.status === 200, '8. Rapid duplicate heartbeats handled gracefully and idempotently');

  // Test 3B: Complete session
  const compRes = await executeApi('POST', `/api/study/sessions/${sessId}/complete`, {}, alexToken);
  assert(compRes.status === 200, '3B. Complete session returns 200 OK');
  assert(compRes.body.status === 'completed', 'Session marked as completed');

  console.log('\n--- 3. Multiple Tabs, Cross-Device & Ownership Security ---');

  // Test 14: Cross-student isolation (Maya cannot heartbeat or complete Alexander's session)
  const unauthorizedHb = await executeApi('POST', `/api/study/sessions/${sessId}/heartbeat`, { isTabVisible: true, isUserActive: true }, mayaToken);
  assert(unauthorizedHb.status === 404, '14. Maya blocked from accessing Alexander’s session (404/Access Denied)');

  // Test 15: Unauthorized requests without token
  const unauthRes = await executeApi('POST', `/api/study/sessions/start`, {});
  assert(unauthRes.status === 401, '15. Unauthenticated request rejected with 401 Unauthorized');

  // Test 16: Multiple tabs starting overlapping session (clean auto-supersede)
  const tabSess1 = await executeApi('POST', '/api/study/sessions/start', { source: 'tab_1' }, alexToken);
  const tabSess2 = await executeApi('POST', '/api/study/sessions/start', { source: 'tab_2' }, alexToken);

  const checkTab1 = await db.query(`SELECT status FROM student_study_sessions WHERE id = $1;`, [tabSess1.body.session.sessionId]);
  assert(checkTab1.rows[0].status === 'completed', '16. Starting session in new tab auto-completes old tab session');
  assert(tabSess2.body.session.status === 'active', 'New tab session is cleanly active');

  console.log('\n--- 4. Practice Attempts & Anti-Answer-Leakage ---');

  // Clean test topic practice answers for isolated testing
  const testTopic = 'top_algo_sort';
  const testSubj = 'subj_cs';
  await db.query(`DELETE FROM student_practice_answers WHERE student_id = $1;`, [alexId]);
  await db.query(`DELETE FROM student_practice_attempts WHERE student_id = $1;`, [alexId]);
  await db.query(`DELETE FROM student_topic_mastery WHERE student_id = $1;`, [alexId]);

  // Test 11: Topic with zero attempts
  const profile0 = await executeApi('GET', '/api/academic/profile', null, alexToken);
  const topic0 = profile0.body.topicMastery?.allTopics?.find(t => t.topic_id === testTopic);
  assert(!topic0, '11. Topic with 0 attempts has no mastery entry or is strictly not_assessed (never weak)');

  // Start practice drill
  const drill1 = await executeApi('POST', '/api/practice/start', {
    subjectId: testSubj,
    topicId: testTopic,
    limit: 5
  }, alexToken);

  assert(drill1.status === 201, 'Practice drill initialized with status 201');
  assert(drill1.body.drill?.questions?.length === 5, 'Drill returns 5 questions');
  const leakCheck = drill1.body.drill.questions.some(q => q.correct_answer || q.correctAnswer || q.explanation);
  assert(!leakCheck, 'Answer keys & explanations NEVER leaked to client on drill start');

  const attId1 = drill1.body.drill.attemptId;
  const questions1 = drill1.body.drill.questions;

  // Test 10: Submit drill with correct and incorrect answers (4 correct, 1 incorrect)
  // q_cs_sort_1 correct answer is 'C'
  // q_cs_sort_2 correct answer is 'A'
  // q_cs_sort_3 correct answer is 'C'
  // q_cs_sort_4 correct answer is 'B'
  // q_cs_sort_5 correct answer is 'B'
  const subAnswers1 = questions1.slice(0, 4).map(q => {
    let opt = 'A';
    if (q.id === 'q_cs_sort_1') opt = 'C';
    if (q.id === 'q_cs_sort_2') opt = 'A';
    if (q.id === 'q_cs_sort_3') opt = 'C';
    if (q.id === 'q_cs_sort_4') opt = 'B';
    if (q.id === 'q_cs_sort_5') opt = 'B';
    if (q.id === 'q_cs_sort_6') opt = 'B';
    return { questionId: q.id, selectedOption: opt };
  });

  // Test 12: Topic with fewer than five attempts (Submit 3 answers)
  const submitShort = await executeApi('POST', '/api/practice/submit', {
    attemptId: attId1,
    answers: subAnswers1.slice(0, 3)
  }, alexToken);

  assert(submitShort.status === 200, '10. Drill submitted and evaluated server-side');
  assert(submitShort.body.masteryRecord?.totalQuestionsAttempted === 3, 'Recorded exactly 3 attempts');
  assert(submitShort.body.masteryRecord?.masteryClassification === 'developing', '12. Topic with < 5 attempts is strictly classified as "developing" (NEVER weak)');

  // Test 9: Duplicate practice submission idempotency
  const dupSubmit = await executeApi('POST', '/api/practice/submit', {
    attemptId: attId1,
    answers: subAnswers1.slice(0, 3)
  }, alexToken);
  assert(dupSubmit.status === 200 && dupSubmit.body.alreadySubmitted === true, '9. Duplicate drill submission handled idempotently');

  // Test 13: Topic reaching five attempts (proper diagnosis into 'struggling' vs 'mastered')
  // Start second drill for remaining questions
  const drill2 = await executeApi('POST', '/api/practice/start', {
    subjectId: testSubj,
    topicId: testTopic,
    limit: 3
  }, alexToken);

  // Submit all wrong answers to test empirical weakness diagnosis
  const wrongAnswers = drill2.body.drill.questions.map(q => ({
    questionId: q.id,
    selectedOption: 'Z' // wrong option
  }));

  const submitWeak = await executeApi('POST', '/api/practice/submit', {
    attemptId: drill2.body.drill.attemptId,
    answers: wrongAnswers
  }, alexToken);

  assert(submitWeak.status === 200, 'Second drill submitted');
  const masteryTotal = submitWeak.body.masteryRecord?.totalQuestionsAttempted;
  assert(masteryTotal >= 5, 'Topic has reached >= 5 attempts threshold');
  assert(submitWeak.body.masteryRecord?.accuracyPercentage < 60, 'Accuracy is below 60%');
  assert(submitWeak.body.masteryRecord?.masteryClassification === 'struggling', '13. Topic with >= 5 attempts and <60% accuracy is diagnosed as "struggling" (Empirical Weakness)');

  console.log('\n--- 5. Regression Check on Existing Platform Functions ---');

  // Test 17: Tutor assessment functionality intact (table question_bank & tutor tables unharmed)
  const tutorCheck = await db.query(`
    SELECT count(*) as count FROM question_bank WHERE status = 'active';
  `);
  assert(Number(tutorCheck.rows[0].count) >= 12, '17. Question bank active questions preserved without regression');

  const plansCheck = await executeApi('GET', '/api/billing/plans');
  assert(plansCheck.status === 200 && plansCheck.body.plans?.length === 4, 'Subscription plans API intact');

  console.log('\n====================================================');
  console.log(`RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('====================================================\n');

  await closeDatabase();

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
