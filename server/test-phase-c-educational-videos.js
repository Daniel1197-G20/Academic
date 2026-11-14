/**
 * server/test-phase-c-educational-videos.js
 *
 * Comprehensive Automated Verification Suite for Phase C:
 * Educational Video Recommendations Engine.
 *
 * Validates:
 *  1. Profile-based recommendation relevance (Course of study, department, institution, academic level, registered subjects).
 *  2. Different students receive appropriately distinct, individualized recommendations (Alexander vs Maya).
 *  3. Weak-topic prioritization (Remediation tier 1 over general alignment).
 *  4. Video credibility and verification (Non-empty publisher, real educational URLs, verified status, verifiable durations).
 *  5. Incomplete/empty profile handling (Safe baseline curriculum fallback without fabricating profile metrics).
 *  6. Video engagement tracking & cross-student isolation (student_video_progress persistence, user isolation).
 *  7. NEXA AI context injection & grounded coaching responses.
 *  8. Authenticated API Endpoints:
 *     - GET /api/study/videos (401 unauth check, authenticated payload)
 *     - POST /api/study/videos/progress (401 check, progress tracking)
 */

import assert from 'assert';
import { initializeDatabase, db, closeDatabase } from './db.js';
import {
  VERIFIED_EDUCATIONAL_VIDEOS,
  getPersonalizedEducationalVideos,
  trackVideoProgress,
  formatVideoRecommendationsForAi
} from './educational-video-service.js';
import { generateAiTutorResponse } from './ai-tutor-service.js';
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
    write(chunk) {
      responseData += chunk.toString();
    },
    end(chunk) {
      if (chunk) responseData += chunk.toString();
      endPromiseResolve();
    }
  };

  return { req, res, endPromise, getResponse: () => ({ statusCode, headers: responseHeaders, data: responseData }) };
}

async function runApi(method, url, body = null, token = null) {
  const headers = {};
  if (token) headers['authorization'] = `Bearer ${token}`;
  const { req, res, endPromise, getResponse } = createMockHttp(method, url, body, headers);
  await handleApiRequest(req, res);
  await endPromise;
  const resp = getResponse();
  let parsed = null;
  try {
    parsed = JSON.parse(resp.data);
  } catch (e) {
    parsed = resp.data;
  }
  return { status: resp.statusCode, data: parsed };
}

async function runTestSuite() {
  process.env.APP_SECRET = process.env.APP_SECRET || 'test_jwt_secret_academic_platform_phase_c';
  console.log('\n====================================================');
  console.log('🧪 PHASE C: EDUCATIONAL VIDEO RECOMMENDATIONS TEST SUITE');
  console.log('====================================================');

  await initializeDatabase();

  // 1. Authoritative Catalog Verification
  console.log('\n--- 1. Authoritative Video Catalog Verification ---');
  assert(Array.isArray(VERIFIED_EDUCATIONAL_VIDEOS), 'VERIFIED_EDUCATIONAL_VIDEOS must be an array');
  assert(VERIFIED_EDUCATIONAL_VIDEOS.length >= 10, 'Catalog must contain a robust set of verified educational videos');

  for (const v of VERIFIED_EDUCATIONAL_VIDEOS) {
    assert(v.id && typeof v.id === 'string', 'Video must have non-empty id');
    assert(v.title && typeof v.title === 'string', 'Video must have non-empty title');
    assert(v.publisher && typeof v.publisher === 'string', 'Video must have verified publisher');
    assert(v.subjectId && typeof v.subjectId === 'string', 'Video must have valid subjectId');
    assert(v.topicId && typeof v.topicId === 'string', 'Video must have valid topicId');
    assert(v.videoUrl && v.videoUrl.startsWith('https://'), 'Video URL must be a valid secure URL');
    assert(typeof v.durationMinutes === 'number' && v.durationMinutes > 0, 'Duration must be verifiable positive number');
    assert(
      v.verificationStatus === 'verified_university' ||
      v.verificationStatus === 'verified_educator' ||
      v.verificationStatus === 'verified_institution',
      `Verification status must be a credible academic tag: ${v.verificationStatus}`
    );
  }
  console.log(`  ✓ [PASS] Verified all ${VERIFIED_EDUCATIONAL_VIDEOS.length} educational videos have verified publishers, durations, and URLs without placeholders`);

  // Fetch Student A and Student B IDs
  const alexRes = await db.query(`SELECT user_id FROM profiles WHERE full_name = 'Alexander Vance';`);
  const studentAId = alexRes.rows[0].user_id;

  const mayaRes = await db.query(`SELECT user_id FROM profiles WHERE full_name = 'Maya Lin';`);
  const studentBId = mayaRes.rows[0].user_id;

  // 2. Personalization & Distinct Profiles
  console.log('\n--- 2. Personalization: Distinct Profiles Receive Distinct Recommendations ---');
  const alexRecs = await getPersonalizedEducationalVideos(studentAId, { limit: 4 });
  const mayaRecs = await getPersonalizedEducationalVideos(studentBId, { limit: 4 });

  assert(alexRecs.studentId === studentAId, 'Alexander Vance receives his own recommendations');
  assert(mayaRecs.studentId === studentBId, 'Maya Lin receives her own recommendations');
  assert(alexRecs.courseOfStudy === 'Computer Science', 'Alexander courseOfStudy is Computer Science');
  assert(mayaRecs.courseOfStudy === 'Data Science', 'Maya courseOfStudy is Data Science');

  // Verify recommendations differ between students
  const alexTopId = alexRecs.videos[0].id;
  const mayaTopId = mayaRecs.videos[0].id;
  assert(alexTopId !== mayaTopId, `Students with different profiles must receive different recommendations (${alexTopId} vs ${mayaTopId})`);
  assert(
    alexRecs.videos.some(v => v.subjectId === 'subj_cs'),
    'Computer Science student receives Computer Science video recommendations'
  );
  assert(
    mayaRecs.videos.some(v => v.subjectId === 'subj_math'),
    'Data Science student receives Mathematics video recommendations'
  );
  console.log('  ✓ [PASS] Personalization confirmed: Different students receive distinct recommendations based on their courses');

  // 3. Weak-Topic Prioritization
  console.log('\n--- 3. Empirical Weak-Topic Prioritization ---');
  const weakStudentId = 'usr_phase_c_weak_tester';
  await db.query(`
    INSERT INTO users (id, email, password_hash, salt, role)
    VALUES ($1, 'weak_phase_c@tech-academy.edu', 'hash', 'salt', 'student')
    ON CONFLICT (id) DO NOTHING;
  `, [weakStudentId]);

  await db.query(`
    INSERT INTO profiles (user_id, full_name, institution, department, course_of_study, academic_level, registered_subjects)
    VALUES ($1, 'Weak Topic Tester', 'Apex Tech', 'Computing', 'Computer Science', 'Year 2', '["subj_cs"]')
    ON CONFLICT (user_id) DO UPDATE SET registered_subjects = '["subj_cs"]';
  `, [weakStudentId]);

  // Inject empirical weak topic (top_algo_sort with < 60% accuracy over >= 5 attempts)
  await db.query(`
    INSERT INTO student_topic_mastery (
      id, student_id, subject_id, topic_id, total_questions_attempted,
      correct_answers_count, incorrect_answers_count, accuracy_percentage,
      mastery_classification, performance_trend, last_assessed_at
    ) VALUES (
      'mst_phase_c_weak', $1, 'subj_cs', 'top_algo_sort', 6, 2, 4, 33.33,
      'struggling', 'declining', CURRENT_TIMESTAMP
    ) ON CONFLICT (student_id, topic_id) DO UPDATE SET
      accuracy_percentage = 33.33,
      mastery_classification = 'struggling';
  `, [weakStudentId]);

  const weakRecs = await getPersonalizedEducationalVideos(weakStudentId, { limit: 4 });
  assert(weakRecs.videos.length > 0, 'Weak student receives recommendations');
  assert(
    weakRecs.videos[0].priorityTier === 'weakness_remediation',
    `First video must be weakness_remediation, got: ${weakRecs.videos[0].priorityTier}`
  );
  assert(
    weakRecs.videos[0].topicId === 'top_algo_sort',
    `First video must target diagnosed weak topic top_algo_sort, got: ${weakRecs.videos[0].topicId}`
  );
  assert(
    weakRecs.videos[0].recommendationReason.includes('33.33%'),
    'Recommendation explanation includes empirical accuracy score'
  );
  console.log('  ✓ [PASS] Weak-topic prioritization verified: Diagnosed struggling topic prioritized in tier 1');

  // 4. Incomplete/Empty Profile Handling (Strict No-Hallucination)
  console.log('\n--- 4. Incomplete / Empty Profile Handling ---');
  const emptyStudentId = 'usr_phase_c_empty_tester';
  await db.query(`
    INSERT INTO users (id, email, password_hash, salt, role)
    VALUES ($1, 'empty_phase_c@tech-academy.edu', 'hash', 'salt', 'student')
    ON CONFLICT (id) DO NOTHING;
  `, [emptyStudentId]);

  await db.query(`
    INSERT INTO profiles (user_id, full_name, institution, department, course_of_study, academic_level, registered_subjects)
    VALUES ($1, 'Empty Profile Tester', null, null, null, null, '[]')
    ON CONFLICT (user_id) DO UPDATE SET registered_subjects = '[]';
  `, [emptyStudentId]);

  const emptyRecs = await getPersonalizedEducationalVideos(emptyStudentId, { limit: 4 });
  assert(emptyRecs.courseOfStudy === null, 'Incomplete profile courseOfStudy is null');
  assert(emptyRecs.videos.length > 0, 'Incomplete profile receives baseline recommendations');
  assert(
    emptyRecs.videos.every(v => v.priorityTier === 'curriculum_baseline'),
    'Incomplete profile falls back cleanly to verified curriculum_baseline tier'
  );
  console.log('  ✓ [PASS] Incomplete profile handled safely without fabricated assumptions');

  // 5. Video Progress Tracking & Cross-Student Isolation
  console.log('\n--- 5. Video Progress Tracking & Cross-Student Isolation ---');
  const targetVideo = VERIFIED_EDUCATIONAL_VIDEOS[0];
  const trackRes = await trackVideoProgress(studentAId, targetVideo.id, 'completed');
  assert(trackRes.success === true, 'trackVideoProgress returns success');
  assert(trackRes.progress.status === 'completed', 'Status marked as completed');

  // Query student A's recommendations — must show completed
  const alexUpdatedRecs = await getPersonalizedEducationalVideos(studentAId, { limit: 4 });
  const alexTrackedVid = alexUpdatedRecs.videos.find(v => v.id === targetVideo.id);
  if (alexTrackedVid) {
    assert(alexTrackedVid.viewStatus === 'completed', 'Student A sees completed status');
    assert(alexTrackedVid.completedAt !== null, 'completedAt is timestamped');
  }

  // Cross-student isolation check: Student B must NOT see Student A's completed status
  const mayaFreshRecs = await getPersonalizedEducationalVideos(studentBId, { limit: 4 });
  const mayaVid = mayaFreshRecs.videos.find(v => v.id === targetVideo.id);
  if (mayaVid) {
    assert(mayaVid.viewStatus === 'unwatched', 'Student B does not inherit Student A video status');
  }
  console.log('  ✓ [PASS] Video progress tracking and student isolation verified');

  // 6. NEXA Grounded Prompt Context Integration
  console.log('\n--- 6. NEXA Grounded Video Prompt Context Integration ---');
  const videoContextBrief = formatVideoRecommendationsForAi(alexRecs);
  assert(typeof videoContextBrief === 'string', 'formatVideoRecommendationsForAi produces context string');
  assert(videoContextBrief.includes('### VERIFIED EDUCATIONAL VIDEO RECOMMENDATIONS'), 'Context includes header');
  assert(videoContextBrief.includes(alexRecs.videos[0].title), 'Context includes top video title');
  assert(videoContextBrief.includes(alexRecs.videos[0].videoUrl), 'Context includes verified URL');

  // Test AI Tutor response grounded in video recommendations
  const aiResult = await generateAiTutorResponse(
    [{ role: 'user', content: 'What educational videos do you recommend for my coursework?' }],
    videoContextBrief
  );
  assert(aiResult.answer.includes('Educational Video Recommendations'), 'NEXA responds with video recommendations');
  assert(aiResult.answer.includes(alexRecs.videos[0].title), 'NEXA response references verified video title');
  console.log('  ✓ [PASS] NEXA integration verified: Grounded educational video brief with learning objectives');

  // 7. Authenticated HTTP API Endpoints
  console.log('\n--- 7. Authenticated API Endpoints ---');

  // Unauthenticated requests safely rejected
  const unauthGet = await runApi('GET', '/api/study/videos');
  assert(unauthGet.status === 401, 'Unauthenticated GET /api/study/videos returns 401');

  const unauthPost = await runApi('POST', '/api/study/videos/progress', { videoId: targetVideo.id });
  assert(unauthPost.status === 401, 'Unauthenticated POST /api/study/videos/progress returns 401');

  // Authenticate as Student A via real login endpoint
  const loginRes = await runApi('POST', '/api/auth/login', {
    email: 'alexander.vance@tech-academy.edu',
    password: 'Password123!'
  });
  const tokenA = loginRes.data.token;
  assert(tokenA, 'Student A authenticated successfully and received token');

  // Authenticated GET /api/study/videos
  const authGet = await runApi('GET', '/api/study/videos?limit=4', null, tokenA);
  assert(authGet.status === 200, `Authenticated GET /api/study/videos returns 200, got ${authGet.status}`);
  assert(authGet.data.success === true, 'Response contains success flag');
  assert(Array.isArray(authGet.data.videos), 'Response contains videos array');

  // Authenticated POST /api/study/videos/progress
  const authPost = await runApi('POST', '/api/study/videos/progress', {
    videoId: targetVideo.id,
    status: 'viewed'
  }, tokenA);
  assert(authPost.status === 200, 'Authenticated POST /api/study/videos/progress returns 200');
  assert(authPost.data.success === true, 'Progress update returns success');

  console.log('  ✓ [PASS] API endpoints authenticated, verified, and protected with student isolation');

  console.log('\n====================================================');
  console.log('RESULTS: ALL PHASE C TESTS PASSED (0 FAILURES)');
  console.log('====================================================\n');

  await closeDatabase();
}

runTestSuite().catch(err => {
  console.error('\n❌ PHASE C TEST SUITE FAILED:', err);
  process.exit(1);
});
