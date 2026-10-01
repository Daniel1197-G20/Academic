import crypto from 'crypto';
import { db, hashPassword, verifyPassword } from './db.js';
import { verifyFirebaseIdToken } from './firebase-auth.js';

const JWT_SECRET = process.env.APP_SECRET || 'academic-platform-secret-key-2026-ghost-green';

// Create a signed HMAC-SHA256 session token
export function createSessionToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

// Verify session token
export function verifySessionToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  if (signature !== expectedSig) return null;
  
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

// Authenticate request middleware (Supports Firebase ID Tokens & Legacy Session Tokens)
export async function getAuthenticatedUser(req) {
  const authHeader = req.headers['authorization'] || '';
  let token = null;
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.headers['cookie']) {
    const match = req.headers['cookie'].match(/auth_token=([^;]+)/);
    if (match) token = match[1];
  }
  if (!token) return null;

  // 1. Try Firebase ID Token verification
  try {
    const fbPayload = await verifyFirebaseIdToken(token);
    if (fbPayload && fbPayload.uid) {
      // Lookup in PostgreSQL users table
      const res = await db.query(
        `SELECT id, firebase_uid, email, role FROM users WHERE firebase_uid = $1 OR email = $2;`,
        [fbPayload.uid, fbPayload.email ? fbPayload.email.toLowerCase().trim() : '']
      );

      if (res.rows.length > 0) {
        const u = res.rows[0];
        if (!u.firebase_uid) {
          await db.query(`UPDATE users SET firebase_uid = $1 WHERE id = $2;`, [fbPayload.uid, u.id]);
        }
        return { userId: u.id, firebaseUid: fbPayload.uid, email: u.email, role: u.role };
      }

      // Auto-provision user record and profile for newly registered Firebase user
      const newUserId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      await db.query(`
        INSERT INTO users (id, firebase_uid, email, role)
        VALUES ($1, $2, $3, $4);
      `, [newUserId, fbPayload.uid, fbPayload.email ? fbPayload.email.toLowerCase().trim() : `${fbPayload.uid}@academicplatform.local`, fbPayload.role || 'STUDENT']);

      await db.query(`
        INSERT INTO profiles (user_id, full_name, institution, department, academic_level, bio, academic_interests, study_preferences, is_public)
        VALUES ($1, $2, 'General Academy', 'General Studies', 'Year 1', 'Student on Academic Platform', '[]', '[]', true);
      `, [newUserId, fbPayload.email ? fbPayload.email.split('@')[0] : 'Student']);

      await db.query(`
        INSERT INTO user_settings (user_id, selected_scale)
        VALUES ($1, '5.0');
      `, [newUserId]);

      return { userId: newUserId, firebaseUid: fbPayload.uid, email: fbPayload.email, role: fbPayload.role || 'STUDENT' };
    }
  } catch (fbErr) {
    // If not a Firebase token or verification error, fallback to legacy token
  }

  // 2. Fallback to Legacy HMAC Session Token verification (Transition Window)
  const legacyPayload = verifySessionToken(token);
  if (legacyPayload && legacyPayload.userId) {
    return legacyPayload;
  }

  return null;
}

// Helper to parse JSON body with max payload size protection
export async function parseJsonBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytesReceived = 0;
    req.on('data', chunk => {
      bytesReceived += chunk.length;
      if (bytesReceived > maxBytes) {
        const err = new Error('Payload Too Large: maximum allowed body size is 1MB');
        err.statusCode = 413;
        reject(err);
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        const error = new Error('Malformed JSON payload');
        error.statusCode = 400;
        reject(error);
      }
    });
  });
}

// Helper for sending JSON response
export function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// API router
export async function handleApiRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  try {
    // --- 1. AUTHENTICATION ---
    if (pathname === '/api/auth/register' && method === 'POST') {
      const { email, password, fullName, institution, department, academicLevel, termsAccepted, analyticsConsent } = await parseJsonBody(req);
      if (!email || !password || !fullName) {
        return sendJson(res, 400, { error: 'Email, password, and full name are required.' });
      }

      if (termsAccepted === false) {
        return sendJson(res, 400, { error: 'You must agree to the Terms & Conditions and acknowledge the Privacy Policy to create an account.' });
      }

      const existing = await db.query(`SELECT id FROM users WHERE email = $1;`, [email.toLowerCase().trim()]);
      if (existing.rows.length > 0) {
        return sendJson(res, 409, { error: 'An account with this email already exists.' });
      }

      const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const { hash, salt } = hashPassword(password);

      await db.query(`
        INSERT INTO users (id, email, password_hash, salt, role)
        VALUES ($1, $2, $3, $4, 'STUDENT');
      `, [userId, email.toLowerCase().trim(), hash, salt]);

      await db.query(`
        INSERT INTO profiles (user_id, full_name, institution, department, academic_level, bio, academic_interests, study_preferences, is_public)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true);
      `, [
        userId,
        fullName.trim(),
        institution || 'General Academy',
        department || 'General Studies',
        academicLevel || 'Year 1',
        'Student on Academic Platform',
        JSON.stringify([]),
        JSON.stringify([])
      ]);

      await db.query(`
        INSERT INTO user_settings (user_id, selected_scale)
        VALUES ($1, '5.0');
      `, [userId]);

      // Record mandatory Terms & Conditions and Privacy Policy consent (Version 1.0)
      const userAgent = req.headers['user-agent'] || 'browser';
      await db.query(`
        INSERT INTO consent_records (id, user_id, consent_type, consent_status, policy_version, context, user_agent)
        VALUES 
        ($1, $2, 'terms_and_conditions', 'granted', '1.0', 'registration', $3),
        ($4, $2, 'privacy_policy', 'granted', '1.0', 'registration', $3);
      `, [
        'c_' + Date.now() + '_terms',
        userId,
        userAgent,
        'c_' + Date.now() + '_privacy'
      ]);

      // Record optional analytics consent if opted in
      if (analyticsConsent) {
        await db.query(`
          INSERT INTO consent_records (id, user_id, consent_type, consent_status, policy_version, context, user_agent)
          VALUES ($1, $2, 'analytics_cookies', 'granted', '1.0', 'registration', $3);
        `, ['c_' + Date.now() + '_analytics', userId, userAgent]);
      }

      const token = createSessionToken({ userId, email: email.toLowerCase().trim(), role: 'STUDENT' });
      return sendJson(res, 201, {
        token,
        user: { id: userId, email: email.toLowerCase().trim(), role: 'STUDENT' },
        profile: { full_name: fullName, institution, department, academic_level: academicLevel }
      });
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
      const { email, password } = await parseJsonBody(req);
      if (!email || !password) {
        return sendJson(res, 400, { error: 'Email and password are required.' });
      }

      const userRes = await db.query(`SELECT id, email, password_hash, salt, role FROM users WHERE email = $1;`, [email.toLowerCase().trim()]);
      if (userRes.rows.length === 0) {
        return sendJson(res, 401, { error: 'Invalid email or password.' });
      }

      const user = userRes.rows[0];
      const valid = verifyPassword(password, user.password_hash, user.salt);
      if (!valid) {
        return sendJson(res, 401, { error: 'Invalid email or password.' });
      }

      const profileRes = await db.query(`SELECT * FROM profiles WHERE user_id = $1;`, [user.id]);
      const profile = profileRes.rows[0] || {};
      const settingsRes = await db.query(`SELECT selected_scale FROM user_settings WHERE user_id = $1;`, [user.id]);
      const selectedScale = settingsRes.rows[0]?.selected_scale || '5.0';

      const token = createSessionToken({ userId: user.id, email: user.email, role: user.role });
      return sendJson(res, 200, {
        token,
        user: { id: user.id, email: user.email, role: user.role },
        profile,
        selectedScale
      });
    }

    if (pathname === '/api/auth/me' && method === 'GET') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) {
        return sendJson(res, 401, { error: 'Unauthorized session.' });
      }

      const userRes = await db.query(`SELECT id, email, role FROM users WHERE id = $1;`, [authUser.userId]);
      if (userRes.rows.length === 0) {
        return sendJson(res, 404, { error: 'User not found.' });
      }

      const profileRes = await db.query(`SELECT * FROM profiles WHERE user_id = $1;`, [authUser.userId]);
      const profile = profileRes.rows[0] || {};
      const settingsRes = await db.query(`SELECT selected_scale FROM user_settings WHERE user_id = $1;`, [authUser.userId]);
      const selectedScale = settingsRes.rows[0]?.selected_scale || '5.0';

      return sendJson(res, 200, {
        user: userRes.rows[0],
        profile,
        selectedScale
      });
    }

    // --- 1B. DATA PORTABILITY & EXPORT (User Rights) ---
    if (pathname === '/api/auth/export-data' && method === 'GET') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized session.' });

      const userRes = await db.query(`SELECT id, email, role, created_at FROM users WHERE id = $1;`, [authUser.userId]);
      if (userRes.rows.length === 0) return sendJson(res, 404, { error: 'User not found.' });

      const profileRes = await db.query(`SELECT * FROM profiles WHERE user_id = $1;`, [authUser.userId]);
      const settingsRes = await db.query(`SELECT * FROM user_settings WHERE user_id = $1;`, [authUser.userId]);
      const semestersRes = await db.query(`SELECT * FROM semesters WHERE user_id = $1 ORDER BY display_order;`, [authUser.userId]);
      const coursesRes = await db.query(`SELECT * FROM student_courses WHERE user_id = $1;`, [authUser.userId]);
      const plansRes = await db.query(`SELECT * FROM study_plans WHERE user_id = $1;`, [authUser.userId]);
      const topicsRes = await db.query(`SELECT * FROM study_topics WHERE user_id = $1;`, [authUser.userId]);
      const logsRes = await db.query(`SELECT * FROM study_logs WHERE user_id = $1 ORDER BY logged_at DESC;`, [authUser.userId]);
      const consentRes = await db.query(`SELECT id, consent_type, consent_status, policy_version, context, created_at FROM consent_records WHERE user_id = $1 ORDER BY created_at DESC;`, [authUser.userId]);

      const exportPayload = {
        metadata: {
          platform: 'Student Academic Platform',
          export_timestamp: new Date().toISOString(),
          notice: 'Personal and academic data export provided under applicable data protection transparency rights.'
        },
        account: userRes.rows[0],
        profile: profileRes.rows[0] || null,
        settings: settingsRes.rows[0] || null,
        academic_records: {
          semesters: semestersRes.rows,
          courses: coursesRes.rows
        },
        study_planner: {
          plans: plansRes.rows,
          topics: topicsRes.rows,
          logs: logsRes.rows
        },
        consent_audit_history: consentRes.rows
      };

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="academic-platform-export-${authUser.userId}.json"`,
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(JSON.stringify(exportPayload, null, 2));
    }

    // --- 1C. PERMANENT ACCOUNT DELETION ---
    if (pathname === '/api/auth/account' && method === 'DELETE') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized.' });

      const { password, confirmPurge } = await parseJsonBody(req);

      const userRes = await db.query(`SELECT id, firebase_uid, password_hash, salt FROM users WHERE id = $1;`, [authUser.userId]);
      if (userRes.rows.length === 0) return sendJson(res, 404, { error: 'User not found.' });

      const user = userRes.rows[0];
      if (user.password_hash && user.salt) {
        if (!password) {
          return sendJson(res, 400, { error: 'Password confirmation is required to permanently delete your account.' });
        }
        const valid = verifyPassword(password, user.password_hash, user.salt);
        if (!valid) {
          return sendJson(res, 401, { error: 'Incorrect password. Account deletion aborted.' });
        }
      } else {
        if (!confirmPurge && password !== 'DELETE') {
          return sendJson(res, 400, { error: 'Confirmation required to permanently delete your account.' });
        }
      }

      // Foreign key cascades automatically purge profiles, user_settings, semesters,
      // student_courses, study_plans, study_topics, study_logs, and consent_records
      await db.query(`DELETE FROM users WHERE id = $1;`, [authUser.userId]);

      return sendJson(res, 200, {
        success: true,
        message: 'Your account and all associated academic, study, and consent records have been permanently purged.'
      });
    }

    // --- 1D. CONSENT AUDITING & PREFERENCES ---
    if (pathname === '/api/consent' && method === 'POST') {
      const authUser = await getAuthenticatedUser(req);
      const { consents, context } = await parseJsonBody(req);

      if (!Array.isArray(consents) || consents.length === 0) {
        return sendJson(res, 400, { error: 'Consents array is required.' });
      }

      const userAgent = req.headers['user-agent'] || 'browser';
      const targetUserId = authUser ? authUser.userId : null;

      for (const item of consents) {
        if (!item.type || !item.status) continue;
        const id = 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        await db.query(`
          INSERT INTO consent_records (id, user_id, consent_type, consent_status, policy_version, context, user_agent)
          VALUES ($1, $2, $3, $4, $5, $6, $7);
        `, [
          id,
          targetUserId,
          item.type,
          item.status,
          item.version || '1.0',
          context || 'cookie_banner',
          userAgent
        ]);
      }

      return sendJson(res, 200, { success: true, recorded: consents.length });
    }

    if (pathname === '/api/consent' && method === 'GET') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized.' });

      const resRecords = await db.query(`
        SELECT consent_type, consent_status, policy_version, context, created_at 
        FROM consent_records 
        WHERE user_id = $1 
        ORDER BY created_at DESC;
      `, [authUser.userId]);

      return sendJson(res, 200, { records: resRecords.rows });
    }

    // --- 2. STUDENT PROFILE ---
    if (pathname === '/api/profile' && method === 'PUT') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized.' });

      const updates = await parseJsonBody(req);
      await db.query(`
        UPDATE profiles SET
          full_name = COALESCE($1, full_name),
          avatar_url = COALESCE($2, avatar_url),
          institution = COALESCE($3, institution),
          department = COALESCE($4, department),
          academic_level = COALESCE($5, academic_level),
          matric_number = COALESCE($6, matric_number),
          bio = COALESCE($7, bio),
          academic_interests = COALESCE($8, academic_interests),
          study_preferences = COALESCE($9, study_preferences),
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $10;
      `, [
        updates.fullName,
        updates.avatarUrl,
        updates.institution,
        updates.department,
        updates.academicLevel,
        updates.matricNumber,
        updates.bio,
        updates.academicInterests ? JSON.stringify(updates.academicInterests) : null,
        updates.studyPreferences ? JSON.stringify(updates.studyPreferences) : null,
        authUser.userId
      ]);

      const updated = await db.query(`SELECT * FROM profiles WHERE user_id = $1;`, [authUser.userId]);
      return sendJson(res, 200, { profile: updated.rows[0] });
    }

    // --- 3. ACADEMIC & CGPA RECORDS ---
    if (pathname === '/api/academic/scales' && method === 'GET') {
      const scalesRes = await db.query(`SELECT * FROM grading_scales;`);
      return sendJson(res, 200, { scales: scalesRes.rows });
    }

    if (pathname === '/api/academic/records' && method === 'GET') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized.' });

      // Row-Level Security: Only fetch records where user_id = authUser.userId
      const semestersRes = await db.query(`
        SELECT * FROM semesters WHERE user_id = $1 ORDER BY display_order ASC;
      `, [authUser.userId]);

      const coursesRes = await db.query(`
        SELECT * FROM student_courses WHERE user_id = $1;
      `, [authUser.userId]);

      const settingsRes = await db.query(`
        SELECT selected_scale FROM user_settings WHERE user_id = $1;
      `, [authUser.userId]);

      const semesters = semestersRes.rows.map(sem => ({
        ...sem,
        courses: coursesRes.rows.filter(c => c.semester_id === sem.id)
      }));

      return sendJson(res, 200, {
        semesters,
        selectedScale: settingsRes.rows[0]?.selected_scale || '5.0'
      });
    }

    if (pathname === '/api/academic/settings/scale' && method === 'PUT') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized.' });

      const { scaleId } = await parseJsonBody(req);
      await db.query(`
        INSERT INTO user_settings (user_id, selected_scale)
        VALUES ($1, $2)
        ON CONFLICT (user_id) DO UPDATE SET selected_scale = EXCLUDED.selected_scale;
      `, [authUser.userId, scaleId]);

      return sendJson(res, 200, { success: true, selectedScale: scaleId });
    }

    if (pathname === '/api/academic/semesters' && method === 'POST') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized.' });

      const { academicYear, semesterName } = await parseJsonBody(req);
      const semId = 'sem_' + Date.now();
      
      const countRes = await db.query(`SELECT COUNT(*) as count FROM semesters WHERE user_id = $1;`, [authUser.userId]);
      const order = parseInt(countRes.rows[0].count) + 1;

      await db.query(`
        INSERT INTO semesters (id, user_id, academic_year, semester_name, display_order)
        VALUES ($1, $2, $3, $4, $5);
      `, [semId, authUser.userId, academicYear || 'Year 1', semesterName || 'First Semester', order]);

      return sendJson(res, 201, {
        semester: { id: semId, user_id: authUser.userId, academic_year: academicYear, semester_name: semesterName, display_order: order, courses: [] }
      });
    }

    if (pathname.startsWith('/api/academic/semesters/') && method === 'DELETE') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized.' });

      const semId = pathname.replace('/api/academic/semesters/', '');
      // Enforce RLS: user_id must match
      const del = await db.query(`DELETE FROM semesters WHERE id = $1 AND user_id = $2;`, [semId, authUser.userId]);
      return sendJson(res, 200, { success: true, deleted: del.affectedRows || 1 });
    }

    if (pathname.endsWith('/duplicate') && pathname.startsWith('/api/academic/semesters/') && method === 'POST') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized.' });

      const semId = pathname.replace('/api/academic/semesters/', '').replace('/duplicate', '');
      const semRes = await db.query(`SELECT * FROM semesters WHERE id = $1 AND user_id = $2;`, [semId, authUser.userId]);
      if (semRes.rows.length === 0) return sendJson(res, 404, { error: 'Semester not found.' });

      const original = semRes.rows[0];
      const newSemId = 'sem_' + Date.now();
      const countRes = await db.query(`SELECT COUNT(*) as count FROM semesters WHERE user_id = $1;`, [authUser.userId]);
      const order = parseInt(countRes.rows[0].count) + 1;

      await db.query(`
        INSERT INTO semesters (id, user_id, academic_year, semester_name, display_order)
        VALUES ($1, $2, $3, $4, $5);
      `, [newSemId, authUser.userId, original.academic_year, `${original.semester_name} (Copy)`, order]);

      // Copy courses
      const coursesRes = await db.query(`SELECT * FROM student_courses WHERE semester_id = $1 AND user_id = $2;`, [semId, authUser.userId]);
      const newCourses = [];
      for (const c of coursesRes.rows) {
        const newCrsId = 'crs_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
        await db.query(`
          INSERT INTO student_courses (id, semester_id, user_id, course_code, course_title, credit_units, letter_grade)
          VALUES ($1, $2, $3, $4, $5, $6, $7);
        `, [newCrsId, newSemId, authUser.userId, c.course_code, c.course_title, c.credit_units, c.letter_grade]);
        newCourses.push({ id: newCrsId, semester_id: newSemId, user_id: authUser.userId, course_code: c.course_code, course_title: c.course_title, credit_units: c.credit_units, letter_grade: c.letter_grade });
      }

      return sendJson(res, 201, {
        semester: { id: newSemId, user_id: authUser.userId, academic_year: original.academic_year, semester_name: `${original.semester_name} (Copy)`, display_order: order, courses: newCourses }
      });
    }

    if (pathname === '/api/academic/courses' && method === 'POST') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized.' });

      const { semesterId, courseCode, courseTitle, creditUnits, letterGrade } = await parseJsonBody(req);
      if (!semesterId || !courseCode || !creditUnits) {
        return sendJson(res, 400, { error: 'Semester ID, Course Code, and Units are required.' });
      }

      // Verify semester ownership
      const semRes = await db.query(`SELECT id FROM semesters WHERE id = $1 AND user_id = $2;`, [semesterId, authUser.userId]);
      if (semRes.rows.length === 0) return sendJson(res, 403, { error: 'Unauthorized access to semester.' });

      const courseId = 'crs_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      await db.query(`
        INSERT INTO student_courses (id, semester_id, user_id, course_code, course_title, credit_units, letter_grade)
        VALUES ($1, $2, $3, $4, $5, $6, $7);
      `, [courseId, semesterId, authUser.userId, courseCode.toUpperCase().trim(), (courseTitle || '').trim(), Number(creditUnits), letterGrade || 'A']);

      return sendJson(res, 201, {
        course: { id: courseId, semester_id: semesterId, user_id: authUser.userId, course_code: courseCode.toUpperCase().trim(), course_title: (courseTitle || '').trim(), credit_units: Number(creditUnits), letter_grade: letterGrade || 'A' }
      });
    }

    if (pathname.startsWith('/api/academic/courses/') && method === 'PUT') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized.' });

      const courseId = pathname.replace('/api/academic/courses/', '');
      const { courseCode, courseTitle, creditUnits, letterGrade } = await parseJsonBody(req);

      // Verify course ownership
      const check = await db.query(`SELECT id FROM student_courses WHERE id = $1 AND user_id = $2;`, [courseId, authUser.userId]);
      if (check.rows.length === 0) return sendJson(res, 403, { error: 'Forbidden. Record does not belong to you.' });

      await db.query(`
        UPDATE student_courses SET
          course_code = COALESCE($1, course_code),
          course_title = COALESCE($2, course_title),
          credit_units = COALESCE($3, credit_units),
          letter_grade = COALESCE($4, letter_grade)
        WHERE id = $5 AND user_id = $6;
      `, [
        courseCode ? courseCode.toUpperCase().trim() : null,
        courseTitle ? courseTitle.trim() : null,
        creditUnits ? Number(creditUnits) : null,
        letterGrade,
        courseId,
        authUser.userId
      ]);

      const updated = await db.query(`SELECT * FROM student_courses WHERE id = $1;`, [courseId]);
      return sendJson(res, 200, { course: updated.rows[0] });
    }

    if (pathname.startsWith('/api/academic/courses/') && method === 'DELETE') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized.' });

      const courseId = pathname.replace('/api/academic/courses/', '');
      // RLS Check: user_id must match
      const check = await db.query(`DELETE FROM student_courses WHERE id = $1 AND user_id = $2;`, [courseId, authUser.userId]);
      return sendJson(res, 200, { success: true });
    }

    // --- 4. STUDY PLANNER & PROGRESS ---
    if (pathname === '/api/study/plans' && method === 'GET') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized.' });

      // RLS check
      const plansRes = await db.query(`
        SELECT * FROM study_plans WHERE user_id = $1 ORDER BY created_at DESC;
      `, [authUser.userId]);

      const topicsRes = await db.query(`
        SELECT * FROM study_topics WHERE user_id = $1 ORDER BY display_order ASC;
      `, [authUser.userId]);

      const plans = plansRes.rows.map(p => ({
        ...p,
        topics: topicsRes.rows.filter(t => t.study_plan_id === p.id)
      }));

      return sendJson(res, 200, { plans });
    }

    if (pathname === '/api/study/plans' && method === 'POST') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized.' });

      const { subject, goal, deadline, studyFrequency, difficulty, estimatedHours, topics } = await parseJsonBody(req);
      if (!subject || !goal || !deadline) {
        return sendJson(res, 400, { error: 'Subject, goal, and deadline are required.' });
      }

      const planId = 'plan_' + Date.now();
      await db.query(`
        INSERT INTO study_plans (id, user_id, subject, goal, deadline, study_frequency, difficulty, estimated_hours, logged_hours)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0.0);
      `, [planId, authUser.userId, subject.trim(), goal.trim(), deadline, studyFrequency || 'Daily', difficulty || 'Medium', Number(estimatedHours) || 10]);

      const createdTopics = [];
      if (Array.isArray(topics)) {
        for (let i = 0; i < topics.length; i++) {
          const title = typeof topics[i] === 'string' ? topics[i] : topics[i].title;
          const topId = 'top_' + Date.now() + '_' + i;
          await db.query(`
            INSERT INTO study_topics (id, study_plan_id, user_id, title, is_completed, display_order)
            VALUES ($1, $2, $3, $4, false, $5);
          `, [topId, planId, authUser.userId, title.trim(), i + 1]);
          createdTopics.push({ id: topId, study_plan_id: planId, user_id: authUser.userId, title: title.trim(), is_completed: false, display_order: i + 1 });
        }
      }

      return sendJson(res, 201, {
        plan: {
          id: planId,
          user_id: authUser.userId,
          subject,
          goal,
          deadline,
          study_frequency: studyFrequency || 'Daily',
          difficulty: difficulty || 'Medium',
          estimated_hours: Number(estimatedHours) || 10,
          logged_hours: 0,
          topics: createdTopics
        }
      });
    }

    if (pathname.startsWith('/api/study/plans/') && method === 'DELETE') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized.' });

      const planId = pathname.replace('/api/study/plans/', '');
      await db.query(`DELETE FROM study_plans WHERE id = $1 AND user_id = $2;`, [planId, authUser.userId]);
      return sendJson(res, 200, { success: true });
    }

    if (pathname.startsWith('/api/study/topics/') && pathname.endsWith('/toggle') && method === 'PATCH') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized.' });

      const topicId = pathname.replace('/api/study/topics/', '').replace('/toggle', '');
      const topicRes = await db.query(`SELECT is_completed FROM study_topics WHERE id = $1 AND user_id = $2;`, [topicId, authUser.userId]);
      if (topicRes.rows.length === 0) return sendJson(res, 404, { error: 'Topic not found or unauthorized.' });

      const newStatus = !topicRes.rows[0].is_completed;
      await db.query(`
        UPDATE study_topics SET
          is_completed = $1,
          completed_at = CASE WHEN $1 = true THEN CURRENT_TIMESTAMP ELSE NULL END
        WHERE id = $2 AND user_id = $3;
      `, [newStatus, topicId, authUser.userId]);

      return sendJson(res, 200, { success: true, is_completed: newStatus });
    }

    if (pathname === '/api/study/logs' && method === 'POST') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized.' });

      const { planId, durationMinutes, notes } = await parseJsonBody(req);
      const minutes = Number(durationMinutes) || 60;
      const logId = 'log_' + Date.now();

      await db.query(`
        INSERT INTO study_logs (id, user_id, study_plan_id, duration_minutes, notes, logged_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_DATE);
      `, [logId, authUser.userId, planId || null, minutes, notes || '']);

      if (planId) {
        const hoursToAdd = Number((minutes / 60).toFixed(1));
        await db.query(`
          UPDATE study_plans SET logged_hours = logged_hours + $1 WHERE id = $2 AND user_id = $3;
        `, [hoursToAdd, planId, authUser.userId]);
      }

      return sendJson(res, 201, { success: true, logId });
    }

    if (pathname === '/api/study/streak' && method === 'GET') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized.' });

      const logsRes = await db.query(`
        SELECT DISTINCT logged_at FROM study_logs WHERE user_id = $1 ORDER BY logged_at DESC;
      `, [authUser.userId]);

      const dates = logsRes.rows.map(r => {
        if (r.logged_at instanceof Date) {
          return r.logged_at.toISOString().split('T')[0];
        }
        return String(r.logged_at).split('T')[0];
      });

      let streak = 0;
      if (dates.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yestStr = yesterday.toISOString().split('T')[0];

        // If studied today or yesterday, streak is alive
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

      // Total study hours
      const sumRes = await db.query(`SELECT COALESCE(SUM(duration_minutes), 0) as total_min FROM study_logs WHERE user_id = $1;`, [authUser.userId]);
      const totalHours = Number((sumRes.rows[0].total_min / 60).toFixed(1));

      return sendJson(res, 200, { streak, totalHours, activeDays: dates.length });
    }

    // Default 404
    return sendJson(res, 404, { error: `Endpoint ${method} ${pathname} not found.` });

  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode === 400 || statusCode === 413) {
      return sendJson(res, statusCode, { error: error.message });
    }
    console.error('API Error in handleApiRequest:', error);
    return sendJson(res, 500, { error: 'Internal Server Error', message: error.message });
  }
}
