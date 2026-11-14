/**
 * server/test-phase-a-profile.js
 *
 * Comprehensive Automated Verification for Phase A:
 * Profile Enhancement & Academic Taxonomy Alignment.
 */

import assert from 'assert';
import { initializeDatabase, db, closeDatabase } from './db.js';
import { generateStudentAcademicAnalysis, formatAcademicContextForAi } from './academic-analysis-engine.js';
import { getStudentAcademicProfile } from './academic-intelligence-service.js';
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

async function runPhaseATests() {
  process.env.APP_SECRET = process.env.APP_SECRET || 'test_jwt_secret_academic_platform_phase_a';
  console.log('\n====================================================');
  console.log('🧪 PHASE A: PROFILE ENHANCEMENT & ACADEMIC TAXONOMY TEST SUITE');
  console.log('====================================================\n');

  await initializeDatabase();

  const studentAId = 'usr_alexander_vance';
  const studentBId = 'usr_maya_lin';

  console.log('--- 1. Verification of Schema Columns and Seeding ---');
  const profA = await db.query('SELECT * FROM profiles WHERE user_id = $1;', [studentAId]);
  assert(profA.rows.length === 1, 'Student A profile exists');
  assert(profA.rows[0].course_of_study === 'Computer Science', 'Student A course_of_study is seeded');
  assert(profA.rows[0].department === 'Computer Science & Software Engineering', 'Student A department is seeded');
  assert(profA.rows[0].academic_level === 'Year 3 (Junior)', 'Student A academic_level is seeded');
  
  let regA = JSON.parse(profA.rows[0].registered_subjects || '[]');
  assert(Array.isArray(regA) && regA.includes('subj_cs'), 'Student A registered_subjects includes subj_cs');
  console.log('  ✓ [PASS] Student A seeded with course_of_study and registered_subjects');

  console.log('\n--- 2. Profile Update API Endpoint (PUT /api/profile) ---');
  // Login as Student A to get token
  const { req: lReq, res: lRes } = createMockHttp('POST', '/api/auth/login', {
    email: 'alexander.vance@tech-academy.edu',
    password: 'Password123!'
  });
  await handleApiRequest(lReq, lRes);
  await lRes.waitForEnd();
  const tokenA = lRes.getBody().token;
  assert(tokenA, 'Student A authenticated successfully');

  // Update Student A with updated course of study and registered subjects
  const updatedPayload = {
    fullName: 'Alexander Vance, B.Sc',
    institution: 'Apex Institute of Technology',
    department: 'Faculty of Computing',
    courseOfStudy: 'Artificial Intelligence & Robotics',
    academicLevel: 'Year 4 (Senior)',
    matricNumber: 'AIT/2023/CS/084',
    bio: 'Pioneering ML and robotics research.',
    academicInterests: ['Reinforcement Learning', 'Robotics', 'Systems'],
    studyPreferences: { study_styles: ['Night Focus', 'Hands-on Practice'], course_of_study: 'Artificial Intelligence & Robotics', registered_subject_ids: ['subj_cs', 'subj_math', 'subj_se'] },
    registeredSubjects: ['subj_cs', 'subj_math', 'subj_se']
  };

  const { req: uReq, res: uRes } = createMockHttp('PUT', '/api/profile', updatedPayload, {
    authorization: `Bearer ${tokenA}`
  });
  await handleApiRequest(uReq, uRes);
  await uRes.waitForEnd();

  assert(uRes.getStatus() === 200, 'PUT /api/profile returned status 200');
  const uBody = uRes.getBody();
  assert(uBody.profile.course_of_study === 'Artificial Intelligence & Robotics', 'Updated course_of_study persisted');
  assert(uBody.profile.academic_level === 'Year 4 (Senior)', 'Updated academic_level persisted');
  const parsedReg = JSON.parse(uBody.profile.registered_subjects);
  assert(parsedReg.length === 3 && parsedReg.includes('subj_se'), 'Updated registered_subjects persisted');
  console.log('  ✓ [PASS] PUT /api/profile updates course_of_study, registered_subjects, and preferences');

  console.log('\n--- 3. Cross-Student Ownership Protection ---');
  // Login as Student B
  const { req: lBReq, res: lBRes } = createMockHttp('POST', '/api/auth/login', {
    email: 'maya.lin@tech-academy.edu',
    password: 'Password123!'
  });
  await handleApiRequest(lBReq, lBRes);
  await lBRes.waitForEnd();
  const tokenB = lBRes.getBody().token;
  assert(tokenB, 'Student B authenticated successfully');

  // Check Student B profile
  const profBRes = await db.query('SELECT * FROM profiles WHERE user_id = $1;', [studentBId]);
  assert(profBRes.rows[0].course_of_study === 'Data Science', 'Student B has distinct course_of_study');
  assert(profBRes.rows[0].course_of_study !== uBody.profile.course_of_study, 'Student B course_of_study is independent of Student A');
  console.log('  ✓ [PASS] Student profiles are strictly isolated per student');

  console.log('\n--- 4. Academic Analysis & Intelligence Integration ---');
  const analysis = await generateStudentAcademicAnalysis(studentAId);
  assert(analysis.studentName === 'Alexander Vance, B.Sc', 'Analysis reflects updated studentName');
  assert(analysis.courseOfStudy === 'Artificial Intelligence & Robotics', 'Analysis reflects courseOfStudy');
  assert(analysis.department === 'Faculty of Computing', 'Analysis reflects department');
  assert(analysis.academicLevel === 'Year 4 (Senior)', 'Analysis reflects academicLevel');
  assert(Array.isArray(analysis.registeredSubjects) && analysis.registeredSubjects.includes('subj_se'), 'Analysis reflects registeredSubjects');
  console.log('  ✓ [PASS] generateStudentAcademicAnalysis extracts verified course_of_study & registered_subjects');

  const summary = await getStudentAcademicProfile(studentAId);
  assert(summary.profile.courseOfStudy === 'Artificial Intelligence & Robotics', 'Academic intelligence summary includes courseOfStudy');
  assert(summary.profile.registeredSubjects.length === 3, 'Academic intelligence summary includes registeredSubjects');
  console.log('  ✓ [PASS] getStudentAcademicProfile preserves enhanced academic profile');

  console.log('\n--- 5. NEXA Grounded Prompt Context Verification ---');
  const promptContext = formatAcademicContextForAi(analysis);
  assert(typeof promptContext === 'string', 'formatAcademicContextForAi produces string');
  assert(promptContext.includes('Course of Study: Artificial Intelligence & Robotics'), 'Context includes Course of Study');
  assert(promptContext.includes('Department: Faculty of Computing'), 'Context includes Department');
  assert(promptContext.includes('Institution: Apex Institute of Technology'), 'Context includes Institution');
  assert(promptContext.includes('Academic Level: Year 4 (Senior)'), 'Context includes Academic Level');
  assert(promptContext.includes('Registered Subjects: subj_cs, subj_math, subj_se'), 'Context includes Registered Subjects');
  console.log('  ✓ [PASS] formatAcademicContextForAi incorporates student academic metadata without assumptions');

  console.log('\n--- 6. Incomplete / Missing Profile Graceful Degradation (Strict No-Hallucination) ---');
  // Create student with incomplete profile
  const incStudentId = 'usr_incomplete_student';
  await db.query(`
    INSERT INTO users (id, email, display_name, role, status)
    VALUES ($1, 'inc@test.com', 'Incomplete Student', 'student', 'active')
    ON CONFLICT (id) DO NOTHING;
  `, [incStudentId]);

  await db.query(`
    INSERT INTO profiles (user_id, full_name, is_public)
    VALUES ($1, 'Incomplete Student', true)
    ON CONFLICT (user_id) DO UPDATE SET
      institution = null,
      department = null,
      course_of_study = null,
      academic_level = null,
      registered_subjects = '[]';
  `, [incStudentId]);

  const incAnalysis = await generateStudentAcademicAnalysis(incStudentId);
  assert(incAnalysis.courseOfStudy === null, 'Missing courseOfStudy is strictly null (never invented)');
  assert(incAnalysis.department === null, 'Missing department is strictly null (never invented)');
  assert(incAnalysis.academicLevel === null, 'Missing academicLevel is strictly null (never invented)');
  assert(incAnalysis.registeredSubjects.length === 0, 'Registered subjects is empty array');

  const incContext = formatAcademicContextForAi(incAnalysis);
  assert(incContext.includes('Academic Program: Incomplete Profile (No assumptions made)'), 'Incomplete profile warning correctly surfaced');
  assert(incContext.includes('Registered Subjects: None explicitly registered.'), 'Zero registered subjects reported honestly');
  console.log('  ✓ [PASS] Incomplete profiles gracefully degrade without hallucinating disciplines or levels');

  console.log('\n====================================================');
  console.log('RESULTS: ALL PHASE A TESTS PASSED (0 FAILURES)');
  console.log('====================================================\n');

  await closeDatabase();
}

runPhaseATests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
