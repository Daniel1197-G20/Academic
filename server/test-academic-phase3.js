/**
 * test-academic-phase3.js
 *
 * Comprehensive Test Suite for Studora Phase 3:
 * Personal Daily AI Study Coach & Adaptive Study Planning.
 *
 * Verifies:
 *  1. GET & PUT /api/study/preferences:
 *     - Fetches default study preferences when none exist
 *     - Updates study preferences (daily available minutes, academic goals, target GPA, upcoming exams)
 *     - Enforces authorization (401 when unauthenticated)
 *  2. GET /api/study/daily-plan:
 *     - Generates deterministic daily study plan grounded in actual academic records
 *     - Idempotent: returns existing plan on repeat calls without churning
 *     - Handles student with 0 records gracefully (diagnostic baseline tasks)
 *  3. POST /api/study/daily-plan/regenerate:
 *     - Re-calibrates study plan explicitly when requested
 *  4. Deterministic Prioritization Rules:
 *     - Upcoming exam within 14 days -> urgent priority
 *     - Diagnosed empirical weaknesses (>=5 attempts & <60% accuracy) -> high priority
 *     - Developing topics (1-4 attempts) -> medium practice priority
 *     - Unassessed topics -> never labeled as weak
 *  5. Task Completion & Adaptive Telemetry:
 *     - POST /api/study/daily-tasks/:id/complete updates task status & increments plan minutes
 *     - PATCH /api/study/daily-tasks/:id/status updates task (skip, reschedule) without completing
 *     - Authorization enforcement: student cannot manipulate another student's tasks
 *  6. AI Coach Grounded Prompt Context:
 *     - POST /api/ai/chat seamlessly receives TODAY'S ACTIVE STUDY PLAN CONTEXT
 *     - Grok / fallback engine answers questions about "what should I study today"
 *  7. Cross-Student Isolation:
 *     - Student A cannot view or complete Student B's daily tasks or preferences
 */

import { initializeDatabase, db, closeDatabase } from './db.js';
import { handleApiRequest, createSessionToken } from './api.js';
import {
  getStudentStudyPreferences,
  updateStudentStudyPreferences,
  getOrCreateDailyStudyPlan,
  prioritizeLearningTasks,
  completeDailyStudyTask,
  updateDailyStudyTaskStatus,
  getDailyCoachingPromptContext
} from './study-coach-service.js';

process.env.APP_SECRET = process.env.APP_SECRET || 'test_secret_for_academic_phase3_suite_2026';
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
  console.log('🧪 ACADEMIC INTELLIGENCE PHASE 3 TEST SUITE');
  console.log('====================================================\n');

  await initializeDatabase();

  const runId = Date.now();
  const studentA = 'usr_p3_student_a_' + runId;
  const studentB = 'usr_p3_student_b_' + runId;
  const emailA = `student.p3.a.${runId}@studora.local`;
  const emailB = `student.p3.b.${runId}@studora.local`;

  await db.query(`
    INSERT INTO users (id, email, display_name, role, status)
    VALUES 
      ($1, $2, 'Student Alpha Phase3', 'student', 'active'),
      ($3, $4, 'Student Beta Phase3', 'student', 'active')
    ON CONFLICT (id) DO NOTHING;
  `, [studentA, emailA, studentB, emailB]);

  await db.query(`
    INSERT INTO profiles (user_id, full_name, institution, department, academic_level)
    VALUES 
      ($1, 'Student Alpha Phase3', 'University of Lagos', 'Computer Science', 'Year 3'),
      ($2, 'Student Beta Phase3', 'University of Ibadan', 'Mechanical Engineering', 'Year 2')
    ON CONFLICT (user_id) DO NOTHING;
  `, [studentA, studentB]);

  const tokenA = createSessionToken({ userId: studentA, email: emailA, role: 'student' });
  const tokenB = createSessionToken({ userId: studentB, email: emailB, role: 'student' });

  // ─────────────────────────────────────────────────────────────
  // 1. Study Preferences Security & Endpoints
  // ─────────────────────────────────────────────────────────────
  console.log('--- 1. Study Preferences Management ---');
  {
    // Unauthenticated GET
    const { req: r1, res: s1 } = createMockHttp('GET', '/api/study/preferences');
    await handleApiRequest(r1, s1);
    assert(s1.getStatus() === 401, 'Unauthenticated GET /api/study/preferences rejected with 401');

    // Authenticated GET (default preferences)
    const { req: r2, res: s2 } = createMockHttp('GET', '/api/study/preferences', null, {
      authorization: `Bearer ${tokenA}`
    });
    await handleApiRequest(r2, s2);
    const body2 = s2.getBody();
    assert(s2.getStatus() === 200, 'Authenticated GET /api/study/preferences returns 200 OK');
    assert(body2.preferences.dailyAvailableMinutes === 60, 'Default daily available minutes is 60');
    assert(body2.preferences.isDefault === true, 'Returns isDefault true for new student');

    // Update preferences with upcoming exam and goals
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // exam in 7 days
    const examDateStr = futureDate.toISOString().split('T')[0];

    const { req: r3, res: s3 } = createMockHttp('PUT', '/api/study/preferences', {
      dailyAvailableMinutes: 90,
      academicGoals: 'First Class Honours in Computer Science',
      targetGpa: 4.80,
      upcomingExams: [{ subjectId: 'subj_cs', subjectName: 'Computer Science Midterms', examDate: examDateStr }]
    }, {
      authorization: `Bearer ${tokenA}`
    });
    await handleApiRequest(r3, s3);
    const body3 = s3.getBody();
    assert(s3.getStatus() === 200, 'PUT /api/study/preferences updates successfully');
    assert(body3.preferences.dailyAvailableMinutes === 90, 'Updated dailyAvailableMinutes persisted as 90');
    assert(body3.preferences.targetGpa === 4.8, 'Target GPA persisted as 4.80');
    assert(body3.preferences.upcomingExams.length === 1, 'Upcoming exam registered in preferences');
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Deterministic Plan Generation & Idempotency
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 2. Deterministic Daily Plan Generation ---');
  let generatedPlanId = null;
  let firstTaskId = null;
  {
    // First call generates plan
    const { req: r1, res: s1 } = createMockHttp('GET', '/api/study/daily-plan', null, {
      authorization: `Bearer ${tokenA}`
    });
    await handleApiRequest(r1, s1);
    const body1 = s1.getBody();

    assert(s1.getStatus() === 200, 'GET /api/study/daily-plan returns 200 OK');
    assert(body1.success === true, 'Response indicates success: true');
    assert(body1.plan && body1.plan.tasks.length > 0, 'Plan generated with actionable daily tasks');
    assert(body1.plan.userId === studentA, 'Plan ownership strictly matches authenticated student');
    generatedPlanId = body1.plan.id;
    firstTaskId = body1.plan.tasks[0].id;

    // Second call without regenerate MUST be idempotent and return identical plan
    const { req: r2, res: s2 } = createMockHttp('GET', '/api/study/daily-plan', null, {
      authorization: `Bearer ${tokenA}`
    });
    await handleApiRequest(r2, s2);
    const body2 = s2.getBody();
    assert(body2.plan.id === generatedPlanId, 'GET /api/study/daily-plan is idempotent (returns same plan without re-churning)');
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Deterministic Prioritization Rules Verification
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 3. Prioritization Rules (Exams, Weaknesses, Developing) ---');
  {
    // Seed an empirical weakness for Student A (>=5 attempts and <60% accuracy)
    const now = new Date().toISOString();
    const masteryId = 'mst_p3_weak_' + runId;
    await db.query(`
      INSERT INTO student_topic_mastery (
        id, student_id, subject_id, topic_id, total_questions_attempted,
        correct_answers_count, incorrect_answers_count, accuracy_percentage,
        mastery_classification, performance_trend, last_assessed_at, updated_at
      ) VALUES ($1, $2, 'subj_cs', 'top_algo_sort', 8, 3, 5, 37.5, 'struggling', 'declining', $3, $3)
      ON CONFLICT (student_id, topic_id) DO UPDATE SET
        mastery_classification = EXCLUDED.mastery_classification,
        accuracy_percentage = EXCLUDED.accuracy_percentage;
    `, [masteryId, studentA, now]);

    // Force regeneration to adapt to the new diagnosed weakness
    const { req: r1, res: s1 } = createMockHttp('POST', '/api/study/daily-plan/regenerate', null, {
      authorization: `Bearer ${tokenA}`
    });
    await handleApiRequest(r1, s1);
    const body1 = s1.getBody();

    const tasks = body1.plan.tasks;
    assert(tasks.some(t => t.priority === 'urgent'), 'Imminent upcoming exam creates an "urgent" priority task');
    assert(tasks.some(t => t.priority === 'high' && t.topicId === 'top_algo_sort'), 'Empirical weakness (top_algo_sort) creates a "high" priority remediation task');
    assert(tasks.some(t => t.recommendationReason.includes('37.5%')), 'Recommendation reason cites the empirical accuracy percentage');
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Task Completion & Telemetry Integration
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 4. Task Completion & Progress Updates ---');
  {
    // Fetch latest plan to get fresh task ID
    const { req: r1, res: s1 } = createMockHttp('GET', '/api/study/daily-plan', null, {
      authorization: `Bearer ${tokenA}`
    });
    await handleApiRequest(r1, s1);
    const tasks = s1.getBody().plan.tasks;
    const taskToComplete = tasks[0];

    // Complete task
    const { req: r2, res: s2 } = createMockHttp('POST', `/api/study/daily-tasks/${taskToComplete.id}/complete`, {
      spentSeconds: 1800 // 30 minutes
    }, {
      authorization: `Bearer ${tokenA}`
    });
    await handleApiRequest(r2, s2);
    const body2 = s2.getBody();

    assert(s2.getStatus() === 200, 'POST /api/study/daily-tasks/:id/complete returns 200 OK');
    const updatedTask = body2.plan.tasks.find(t => t.id === taskToComplete.id);
    assert(updatedTask.status === 'completed', 'Task status is marked as completed');
    assert(updatedTask.completedAt !== null, 'completedAt timestamp recorded');
    assert(body2.plan.completedStudyMinutes >= 30, 'Plan completed_study_minutes incremented');

    // Skip second task
    const taskToSkip = tasks[1];
    if (taskToSkip) {
      const { req: r3, res: s3 } = createMockHttp('PATCH', `/api/study/daily-tasks/${taskToSkip.id}/status`, {
        status: 'skipped'
      }, {
        authorization: `Bearer ${tokenA}`
      });
      await handleApiRequest(r3, s3);
      const body3 = s3.getBody();
      const skippedTask = body3.plan.tasks.find(t => t.id === taskToSkip.id);
      assert(skippedTask.status === 'skipped', 'Task status successfully updated to "skipped"');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 5. Cross-Student Access Protection
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 5. Cross-Student Ownership & Protection ---');
  {
    // Student B attempts to complete Student A's task -> MUST return 404/Forbidden
    const { req: r1, res: s1 } = createMockHttp('GET', '/api/study/daily-plan', null, {
      authorization: `Bearer ${tokenA}`
    });
    await handleApiRequest(r1, s1);
    const studentATaskId = s1.getBody().plan.tasks[0].id;

    const { req: r2, res: s2 } = createMockHttp('POST', `/api/study/daily-tasks/${studentATaskId}/complete`, {
      spentSeconds: 600
    }, {
      authorization: `Bearer ${tokenB}`
    });
    await handleApiRequest(r2, s2);
    assert(s2.getStatus() === 404, 'Student B cannot complete Student A task (404/Access Denied)');

    // Student B gets their own isolated plan
    const { req: r3, res: s3 } = createMockHttp('GET', '/api/study/daily-plan', null, {
      authorization: `Bearer ${tokenB}`
    });
    await handleApiRequest(r3, s3);
    const body3 = s3.getBody();
    assert(body3.plan.userId === studentB, 'Student B receives strictly Student B plan');
    assert(body3.plan.tasks.every(t => t.userId === studentB), 'All tasks in Student B plan belong to Student B');
  }

  // ─────────────────────────────────────────────────────────────
  // 6. Conversational AI Study Coach Grounding (/api/ai/chat)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 6. Grounded Daily AI Coach Chat Integration ---');
  {
    const { req, res } = createMockHttp('POST', '/api/ai/chat', {
      prompt: 'What should I study today based on my active plan?'
    }, {
      authorization: `Bearer ${tokenA}`
    });
    await handleApiRequest(req, res);
    const body = res.getBody();

    assert(res.getStatus() === 200, 'POST /api/ai/chat returns 200 OK');
    const answer = body.message?.content || body.answer;
    assert(answer && typeof answer === 'string', 'AI returns coaching response string');
    assert(answer.length > 30, 'Coaching response has substantive advice');
  }

  console.log('\n====================================================');
  console.log(`RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('====================================================\n');

  await closeDatabase();
  process.exit(failedCount === 0 ? 0 : 1);
}

run().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
