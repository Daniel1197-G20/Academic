import { initializeDatabase, db } from './db.js';
import { handleApiRequest } from './api.js';
import { 
  calculateCumulativeMetrics, 
  calculateRequiredGpaForTarget, 
  DEFAULT_GRADING_SCALES 
} from '../src/services/academic/cgpaEngine.js';

// Simulated HTTP Request/Response Mock for API testing
class MockRequest {
  constructor(method, url, headers = {}, body = null) {
    this.method = method;
    this.url = url;
    this.headers = headers;
    this.body = body ? JSON.stringify(body) : '';
  }

  on(event, callback) {
    if (event === 'data' && this.body) {
      callback(this.body);
    }
    if (event === 'end') {
      callback();
    }
  }
}

class MockResponse {
  constructor() {
    this.statusCode = 200;
    this.headers = {};
    this.body = '';
  }

  writeHead(statusCode, headers = {}) {
    this.statusCode = statusCode;
    this.headers = { ...this.headers, ...headers };
  }

  end(data = '') {
    this.body = data;
  }

  json() {
    return this.body ? JSON.parse(this.body) : {};
  }
}

async function runApi(method, url, headers = {}, body = null) {
  const req = new MockRequest(method, url, headers, body);
  const res = new MockResponse();
  await handleApiRequest(req, res);
  return { status: res.statusCode, data: res.json() };
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 MILESTONE 1 COMPREHENSIVE ARCHITECTURAL AUDIT');
  console.log('====================================================\n');

  await initializeDatabase();
  console.log('✓ Database initialized & seeded successfully.');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✓ [PASS] ${message}`);
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // ----------------------------------------------------
  // TEST GROUP 1: AUTHENTICATION & SESSION MANAGEMENT
  // ----------------------------------------------------
  console.log('\n--- 1. Authentication & Session Management ---');

  // Test 1.1: Demo User Login
  const loginRes = await runApi('POST', '/api/auth/login', {}, {
    email: 'alexander.vance@tech-academy.edu',
    password: 'Password123!'
  });
  assert(loginRes.status === 200, 'Demo user successfully logs in with status 200');
  assert(Boolean(loginRes.data.token), 'API returns signed session token');
  assert(loginRes.data.user.role === 'STUDENT', 'User role is correctly set to STUDENT');
  const alexToken = loginRes.data.token;

  // Test 1.2: Bad Password Rejection
  const badLoginRes = await runApi('POST', '/api/auth/login', {}, {
    email: 'alexander.vance@tech-academy.edu',
    password: 'WrongPassword'
  });
  assert(badLoginRes.status === 401, 'Bad password rejected with 401 Unauthorized');

  // Test 1.3: Session Token Verification
  const meRes = await runApi('GET', '/api/auth/me', {
    authorization: `Bearer ${alexToken}`
  });
  assert(meRes.status === 200, 'Session token verified via /api/auth/me');
  assert(meRes.data.profile.full_name === 'Alexander Vance', 'Profile full name correctly returned');

  // Test 1.4: New User Registration
  const testEmail = `test_student_${Date.now()}@university.edu`;
  const regRes = await runApi('POST', '/api/auth/register', {}, {
    email: testEmail,
    password: 'SecurePass456!',
    fullName: 'Maya Lin',
    institution: 'Oxford Tech',
    department: 'Software Engineering',
    academicLevel: 'Year 2'
  });
  assert(regRes.status === 201, 'New student registration returns status 201 Created');
  assert(Boolean(regRes.data.token), 'Registration returns valid session token');
  const mayaToken = regRes.data.token;
  const mayaUserId = regRes.data.user.id;

  // ----------------------------------------------------
  // TEST GROUP 2: ROW-LEVEL SECURITY & DATA ISOLATION
  // ----------------------------------------------------
  console.log('\n--- 2. Database Row-Level Security & Isolation ---');

  // Test 2.1: Alexander Vance has 5 semesters
  const alexRecords = await runApi('GET', '/api/academic/records', {
    authorization: `Bearer ${alexToken}`
  });
  assert(alexRecords.status === 200, 'Alexander fetches academic records');
  assert(alexRecords.data.semesters.length === 5, 'Alexander has 5 preloaded semesters');
  const alexSemesterId = alexRecords.data.semesters[0].id;
  const alexCourseId = alexRecords.data.semesters[0].courses[0].id;

  // Test 2.2: Maya Lin has 0 semesters initially
  const mayaRecords = await runApi('GET', '/api/academic/records', {
    authorization: `Bearer ${mayaToken}`
  });
  assert(mayaRecords.status === 200, 'Maya fetches academic records');
  assert(mayaRecords.data.semesters.length === 0, 'RLS: Maya cannot see Alexander’s semesters (count is 0)');

  // Test 2.3: Maya tries to delete Alexander's semester -> MUST FAIL
  const unauthorizedDeleteSem = await runApi('DELETE', `/api/academic/semesters/${alexSemesterId}`, {
    authorization: `Bearer ${mayaToken}`
  });
  // Verify Alexander's semester is still intact in the database!
  const alexCheck = await runApi('GET', '/api/academic/records', {
    authorization: `Bearer ${alexToken}`
  });
  assert(alexCheck.data.semesters.length === 5, 'RLS: Unauthorized semester deletion blocked, Alexander still has 5 semesters');

  // Test 2.4: Maya tries to delete or modify Alexander's course -> MUST FAIL
  const unauthorizedCourseUpdate = await runApi('PUT', `/api/academic/courses/${alexCourseId}`, {
    authorization: `Bearer ${mayaToken}`
  }, { courseCode: 'HACKED999', creditUnits: 10, letterGrade: 'F' });
  assert(unauthorizedCourseUpdate.status === 403, 'RLS: Modifying another student’s course returns 403 Forbidden');

  // ----------------------------------------------------
  // TEST GROUP 3: CGPA CALCULATION ENGINE ACCURACY
  // ----------------------------------------------------
  console.log('\n--- 3. CGPA Engine Mathematical Accuracy ---');

  const testCourses = [
    { code: 'CSC101', units: 3, grade: 'A' }, // 3 * 5 = 15
    { code: 'MTH101', units: 4, grade: 'B' }, // 4 * 4 = 16
    { code: 'PHY101', units: 3, grade: 'A' }  // 3 * 5 = 15
  ]; // Total units: 10, Total quality points: 46, GPA: 4.60

  const singleSem = {
    academicYear: 'Year 1',
    semesterName: 'First Semester',
    courses: testCourses
  };

  const metrics5 = calculateCumulativeMetrics([singleSem], DEFAULT_GRADING_SCALES['5.0']);
  assert(metrics5.totalCreditUnits === 10, 'Total credit units correctly sum to 10');
  assert(metrics5.totalQualityPoints === 46.0, 'Total quality points correctly calculate to 46.0');
  assert(metrics5.cgpa === 4.60, 'Cumulative CGPA is exactly 4.60');
  assert(metrics5.classificationName === 'First Class Honours', 'Honors classification correctly evaluates to First Class Honours');

  // Test scale conversion to 4.0 scale
  // 3*4 + 4*3 + 3*4 = 12 + 12 + 12 = 36. GPA = 36 / 10 = 3.60
  const metrics4 = calculateCumulativeMetrics([singleSem], DEFAULT_GRADING_SCALES['4.0']);
  assert(metrics4.totalQualityPoints === 36.0, '4.0 scale points correctly calculate to 36.0');
  assert(metrics4.cgpa === 3.60, '4.0 scale CGPA is 3.60');
  assert(metrics4.classificationName === 'Magna Cum Laude', '4.0 scale honors evaluates to Magna Cum Laude');

  // Test What-If Projection calculation
  const proj = calculateRequiredGpaForTarget(10, 46, 20, 4.80, 5.0);
  assert(proj.achievable === true, 'Projection calculation flags valid target as achievable');
  assert(proj.requiredGpa === 4.90, 'Projection computes exact required GPA (4.90)');

  // ----------------------------------------------------
  // TEST GROUP 4: STUDY PLANNER & STREAK TRACKING
  // ----------------------------------------------------
  console.log('\n--- 4. Study Planner & Consecutive Streak Tracking ---');

  // Test 4.1: Create Study Plan for Maya
  const planRes = await runApi('POST', '/api/study/plans', {
    authorization: `Bearer ${mayaToken}`
  }, {
    subject: 'SE201: Software Architecture',
    goal: 'Understand microservices and event queues',
    deadline: '2026-11-20',
    frequency: 'Daily',
    difficulty: 'Medium',
    estimatedHours: 15,
    topics: ['Monolith vs Microservices', 'Message Brokers (RabbitMQ)', 'Event Sourcing']
  });
  assert(planRes.status === 201, 'Study plan created with status 201');
  assert(planRes.data.plan.topics.length === 3, 'Created plan has 3 topics');
  const topicId = planRes.data.plan.topics[0].id;
  const planId = planRes.data.plan.id;

  // Test 4.2: Toggle Topic
  const toggleRes = await runApi('PATCH', `/api/study/topics/${topicId}/toggle`, {
    authorization: `Bearer ${mayaToken}`
  });
  assert(toggleRes.status === 200, 'Topic toggled with status 200');
  assert(toggleRes.data.is_completed === true, 'Topic status is now completed');

  // Test 4.3: Log Study Hours
  const logRes = await runApi('POST', '/api/study/logs', {
    authorization: `Bearer ${mayaToken}`
  }, {
    planId,
    durationMinutes: 90,
    notes: 'Completed architectural patterns study'
  });
  assert(logRes.status === 201, 'Study session logged with status 201');

  // Test 4.4: Verify Streak
  const streakRes = await runApi('GET', '/api/study/streak', {
    authorization: `Bearer ${mayaToken}`
  });
  assert(streakRes.status === 200, 'Streak calculated with status 200');
  assert(streakRes.data.streak >= 1, 'Streak is at least 1 day for today’s session');
  assert(streakRes.data.totalHours >= 1.5, 'Total study hours matches logged duration');

  // ----------------------------------------------------
  // TEST GROUP 5: PROFILE MANAGEMENT
  // ----------------------------------------------------
  console.log('\n--- 5. Student Profile Updates ---');

  const updateProfRes = await runApi('PUT', '/api/profile', {
    authorization: `Bearer ${mayaToken}`
  }, {
    fullName: 'Maya Lin, Scholar',
    bio: 'Software Engineering sophomore specializing in distributed backend systems.',
    institution: 'Oxford Institute of Tech'
  });
  assert(updateProfRes.status === 200, 'Profile updated with status 200');
  assert(updateProfRes.data.profile.full_name === 'Maya Lin, Scholar', 'Updated name persisted in database');

  // ----------------------------------------------------
  // TEST GROUP 6: PRIVACY, CONSENT, DATA EXPORT & ACCOUNT PURGE
  // ----------------------------------------------------
  console.log('\n--- 6. Privacy, Consent Records & Permanent Account Deletion ---');

  // Test 6.1: Terms & Conditions rejection prevents registration
  const rejectTermsEmail = `reject.terms.${Date.now()}@university.edu`;
  const rejectTermsRes = await runApi('POST', '/api/auth/register', {}, {
    email: rejectTermsEmail,
    password: 'Password123!',
    fullName: 'Test Student',
    termsAccepted: false
  });
  assert(rejectTermsRes.status === 400, 'Registration without terms acceptance is rejected with status 400');

  // Test 6.2: Register student with terms & optional analytics consent
  const consentStudentEmail = `privacy.student.${Date.now()}@university.edu`;
  const registerWithConsentRes = await runApi('POST', '/api/auth/register', {}, {
    email: consentStudentEmail,
    password: 'SecurePassword123!',
    fullName: 'Jordan Privacy',
    institution: 'University of Engineering',
    department: 'Cybersecurity',
    academicLevel: 'Year 2',
    termsAccepted: true,
    analyticsConsent: true
  });
  assert(registerWithConsentRes.status === 201, 'Student registered with consent with status 201');
  const jordanToken = registerWithConsentRes.data.token;
  const jordanUserId = registerWithConsentRes.data.user.id;

  // Test 6.3: Query consent records from database
  const getConsentRes = await runApi('GET', '/api/consent', {
    authorization: `Bearer ${jordanToken}`
  });
  assert(getConsentRes.status === 200, 'Consent records retrieved with status 200');
  assert(getConsentRes.data.records.length >= 3, 'User has at least 3 consent records (terms, privacy, analytics)');
  const termsRecord = getConsentRes.data.records.find(r => r.consent_type === 'terms_and_conditions');
  assert(termsRecord && termsRecord.policy_version === '1.0', 'Terms consent records policy version 1.0');

  // Test 6.4: Update consent preferences via POST /api/consent
  const updateConsentRes = await runApi('POST', '/api/consent', {
    authorization: `Bearer ${jordanToken}`
  }, {
    consents: [
      { type: 'analytics_cookies', status: 'revoked', version: '1.0' },
      { type: 'functional_cookies', status: 'granted', version: '1.0' }
    ],
    context: 'privacy_settings'
  });
  assert(updateConsentRes.status === 200, 'Consent preferences updated with status 200');

  // Test 6.5: Export Personal Data Archive
  const exportRes = await runApi('GET', '/api/auth/export-data', {
    authorization: `Bearer ${jordanToken}`
  });
  assert(exportRes.status === 200, 'Personal data export succeeds with status 200');
  assert(exportRes.data.account && exportRes.data.account.email === consentStudentEmail, 'Export contains correct user account data');
  assert(Array.isArray(exportRes.data.consent_audit_history), 'Export contains consent audit history array');

  // Test 6.6: Account Deletion with incorrect password fails
  const failedDeleteRes = await runApi('DELETE', '/api/auth/account', {
    authorization: `Bearer ${jordanToken}`
  }, {
    password: 'WrongPassword999!'
  });
  assert(failedDeleteRes.status === 401, 'Account deletion with incorrect password fails with status 401');

  // Test 6.7: Account Deletion with correct password succeeds and purges records
  const successDeleteRes = await runApi('DELETE', '/api/auth/account', {
    authorization: `Bearer ${jordanToken}`
  }, {
    password: 'SecurePassword123!'
  });
  assert(successDeleteRes.status === 200, 'Account permanently purged with status 200');
  assert(successDeleteRes.data.success === true, 'Deletion returns success confirmation');

  // Test 6.8: Verify user is completely removed from database
  const userCheck = await db.query('SELECT id FROM users WHERE id = $1;', [jordanUserId]);
  assert(userCheck.rows.length === 0, 'User record is completely purged from users table');
  const consentCheck = await db.query('SELECT id FROM consent_records WHERE user_id = $1;', [jordanUserId]);
  assert(consentCheck.rows.length === 0, 'Associated consent records are completely cascaded');

  console.log('\n====================================================');
  console.log(`🎉 AUDIT PASSED: ${passedTests}/${totalTests} TESTS SUCCESSFUL!`);
  console.log('====================================================\n');
}

runTestSuite().catch(err => {
  console.error('\n❌ AUDIT FAILED:', err);
  process.exit(1);
});

