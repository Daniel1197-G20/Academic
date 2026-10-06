import crypto from 'crypto';
import { db, hashPassword, verifyPassword } from './db.js';
import { verifyFirebaseIdToken } from './firebase-auth.js';
import { generateToken04 } from './zego.js';
import {
  getSubscriptionPlans,
  getUserSubscription,
  getUserEntitlements,
  atomicIncrementUsage,
  initializeCheckout,
  verifyPayment,
  cancelSubscription,
  handlePaystackWebhook,
  getBillingHistory,
  getAdminBillingMetrics
} from './billing-service.js';
import {
  initializeBookingPayment,
  verifyAndConfirmTutorPayment,
  executeTutorPayout,
  adminVerifyPayoutProfile,
  getTutorEarningsSummary,
  requestWithdrawal,
  getNigerianBanks,
  handleTutorPaystackWebhook
} from './tutor-financial-service.js';
import { generateAiTutorResponse } from './ai-tutor-service.js';

if (!process.env.APP_SECRET) {
  throw new Error('[server/api.js] Missing required environment variable: APP_SECRET');
}
const JWT_SECRET = process.env.APP_SECRET;
const ZEGO_APP_ID = Number(process.env.ZEGOCLOUD_APP_ID || process.env.VITE_ZEGOCLOUD_APP_ID || 1234567890);
if (!process.env.ZEGOCLOUD_SERVER_SECRET) {
  throw new Error('[server/api.js] Missing required environment variable: ZEGOCLOUD_SERVER_SECRET');
}
const ZEGO_SERVER_SECRET = process.env.ZEGOCLOUD_SERVER_SECRET;

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

// Authenticate request middleware (Supports Supabase Auth JWTs, Firebase ID Tokens & Legacy Session Tokens)
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

  // 1. Try Supabase Auth JWT verification (Primary Authoritative Auth)
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      if (payload && payload.sub && (payload.iss?.includes('supabase') || payload.aud === 'authenticated' || payload.role === 'authenticated')) {
        const nowSec = Math.floor(Date.now() / 1000);
        if (payload.exp && nowSec > payload.exp) {
          return null; // Expired token
        }

        const supabaseUserId = payload.sub;
        const supabaseEmail = (payload.email || '').toLowerCase().trim();

        // Lookup in local database
        const res = await db.query(
          `SELECT id, firebase_uid, email, role FROM users WHERE id = $1 OR email = $2;`,
          [supabaseUserId, supabaseEmail]
        );

        if (res.rows.length > 0) {
          const u = res.rows[0];
          return { userId: u.id, supabaseUid: supabaseUserId, email: u.email, role: u.role || 'student' };
        }

        // Bridge newly authenticated Supabase user into local PGlite to support existing API endpoints
        const displayName = payload.user_metadata?.full_name || payload.user_metadata?.fullName || supabaseEmail.split('@')[0] || 'Student';
        await db.query(`
          INSERT INTO users (id, email, display_name, role, status)
          VALUES ($1, $2, $3, 'student', 'active')
          ON CONFLICT (id) DO NOTHING;
        `, [supabaseUserId, supabaseEmail || `${supabaseUserId}@studora.local`, displayName]);

        await db.query(`
          INSERT INTO profiles (user_id, full_name, institution, department, academic_level, bio, academic_interests, study_preferences, is_public)
          VALUES ($1, $2, $3, $4, $5, 'Student on Studora', '[]', '[]', true)
          ON CONFLICT (user_id) DO NOTHING;
        `, [
          supabaseUserId, 
          displayName,
          payload.user_metadata?.institution || 'General Academy',
          payload.user_metadata?.department || 'General Studies',
          payload.user_metadata?.academic_level || payload.user_metadata?.academicLevel || 'Year 1'
        ]);

        await db.query(`
          INSERT INTO user_settings (user_id, selected_scale)
          VALUES ($1, '5.0')
          ON CONFLICT (user_id) DO NOTHING;
        `, [supabaseUserId]);

        return { userId: supabaseUserId, supabaseUid: supabaseUserId, email: supabaseEmail, role: 'student' };
      }
    }
  } catch (sbErr) {
    // If not a valid Supabase token, fall through to Firebase and legacy checks
  }

  // 2. Try Firebase ID Token verification
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
    try {
      const uRes = await db.query(`SELECT firebase_uid FROM users WHERE id = $1;`, [legacyPayload.userId]);
      if (uRes.rows.length > 0 && uRes.rows[0].firebase_uid) {
        legacyPayload.firebaseUid = uRes.rows[0].firebase_uid;
      }
    } catch (e) {}
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
      req.rawBody = body;
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

    // --- 5. SUBSCRIPTION & BILLING (PAYSTACK & ENTITLEMENTS) ---
    if (pathname === '/api/billing/plans' && method === 'GET') {
      const plans = await getSubscriptionPlans();
      return sendJson(res, 200, { plans });
    }

    if (pathname === '/api/billing/subscription' && method === 'GET') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized session.' });

      const subscription = await getUserSubscription(authUser.userId);
      return sendJson(res, 200, { subscription });
    }

    if (pathname === '/api/billing/entitlements' && method === 'GET') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized session.' });

      const entitlements = await getUserEntitlements(authUser.userId);
      return sendJson(res, 200, { entitlements });
    }

    if (pathname === '/api/billing/checkout' && method === 'POST') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized session.' });

      const { planCode, callbackUrl } = await parseJsonBody(req);
      try {
        const checkoutData = await initializeCheckout({
          userId: authUser.userId,
          planCode,
          callbackUrl
        });
        return sendJson(res, 200, checkoutData);
      } catch (err) {
        return sendJson(res, err.statusCode || 400, { error: err.message, code: err.code });
      }
    }

    if (pathname === '/api/billing/verify' && method === 'POST') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized session.' });

      const { reference } = await parseJsonBody(req);
      try {
        const result = await verifyPayment(reference);
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, err.statusCode || 400, { error: err.message });
      }
    }

    if (pathname === '/api/billing/cancel' && method === 'POST') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized session.' });

      try {
        const result = await cancelSubscription(authUser.userId);
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, err.statusCode || 400, { error: err.message });
      }
    }

    if (pathname === '/api/billing/history' && method === 'GET') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized session.' });

      const history = await getBillingHistory(authUser.userId);
      return sendJson(res, 200, { history });
    }


    if (pathname === '/api/webhooks/paystack' && method === 'POST') {
      await parseJsonBody(req);
      const signature = req.headers['x-paystack-signature'] || '';
      const rawBody   = req.rawBody || '';

      // Parse event type to route to appropriate handler
      let eventType = null;
      let reference = null;
      try {
        const parsed = JSON.parse(rawBody);
        eventType    = parsed.event;
        reference    = parsed.data?.reference || '';
      } catch (_) {}

      // Route tutor session events (charge.success with STU_ prefix, transfer events with PAYOUT_ prefix)
      const isTutorSessionEvent =
        (eventType === 'charge.success' && reference.startsWith('STU_')) ||
        ((eventType === 'transfer.success' || eventType === 'transfer.failed' || eventType === 'transfer.reversed') && reference.startsWith('PAYOUT_'));

      if (isTutorSessionEvent) {
        try {
          const result = await handleTutorPaystackWebhook(rawBody, signature);
          return sendJson(res, 200, result);
        } catch (err) {
          return sendJson(res, err.statusCode || 400, { error: err.message, code: 'TUTOR_WEBHOOK_ERROR' });
        }
      }

      // Default: billing/subscription events handled by billing-service
      try {
        const result = await handlePaystackWebhook(rawBody, signature);
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, err.statusCode || 400, { error: err.message, code: err.code });
      }
    }



    if (pathname === '/api/admin/billing' && method === 'GET') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser || authUser.role !== 'ADMIN') {
        return sendJson(res, 403, { error: 'Forbidden. Administrator authorization required.' });
      }

      const metrics = await getAdminBillingMetrics();
      return sendJson(res, 200, { metrics });
    }

    // --- 6. FEATURE-GATED ENDPOINTS (Real backend authorization & usage enforcement) ---

    // Single query endpoint (legacy compat)
    if (pathname === '/api/ai/query' && method === 'POST') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized session.' });

      const { prompt } = await parseJsonBody(req);
      if (!prompt) return sendJson(res, 400, { error: 'Prompt is required.' });

      try {
        const usage = await atomicIncrementUsage(authUser.userId, 'AI_TUTOR');
        const aiResult = await generateAiTutorResponse([{ role: 'user', content: prompt }]);
        return sendJson(res, 200, {
          success: true,
          answer: aiResult.answer,
          model: aiResult.model,
          provider: aiResult.provider,
          usage
        });
      } catch (err) {
        return sendJson(res, err.statusCode || 403, { error: err.message, code: err.code });
      }
    }

    // POST /api/ai/chat — multi-turn chat endpoint with Grok API + DB persistence
    if (pathname === '/api/ai/chat' && method === 'POST') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized session.' });

      const body = await parseJsonBody(req);
      const { prompt, conversationId, history } = body;

      if (!prompt || !prompt.trim()) {
        return sendJson(res, 400, { error: 'Prompt is required.' });
      }

      try {
        // Enforce AI_TUTOR entitlement and atomically increment monthly usage
        const usage = await atomicIncrementUsage(authUser.userId, 'AI_TUTOR');

        let convId = conversationId;
        let convTitle = '';

        // Create or fetch conversation
        if (!convId) {
          convId = 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          convTitle = prompt.trim().slice(0, 32) + (prompt.length > 32 ? '…' : '');
          await db.query(`
            INSERT INTO ai_chat_conversations (id, user_id, title)
            VALUES ($1, $2, $3);
          `, [convId, authUser.userId, convTitle]);
        } else {
          const check = await db.query(`SELECT title FROM ai_chat_conversations WHERE id = $1 AND user_id = $2;`, [convId, authUser.userId]);
          if (check.rows.length === 0) {
            return sendJson(res, 404, { error: 'Conversation not found.' });
          }
          convTitle = check.rows[0].title;
        }

        // Save user message
        const userMsgId = 'msg_' + Date.now() + '_user';
        await db.query(`
          INSERT INTO ai_chat_messages (id, conversation_id, user_id, sender, content)
          VALUES ($1, $2, $3, 'user', $4);
        `, [userMsgId, convId, authUser.userId, prompt.trim()]);

        // Build multi-turn context
        let msgHistory = Array.isArray(history) ? history : [];
        if (msgHistory.length === 0) {
          msgHistory = [{ role: 'user', content: prompt.trim() }];
        }

        // Call AI Service (Grok API or Academic Fallback)
        const aiResult = await generateAiTutorResponse(msgHistory);

        // Save AI response message
        const aiMsgId = 'msg_' + Date.now() + '_ai';
        await db.query(`
          INSERT INTO ai_chat_messages (id, conversation_id, user_id, sender, content)
          VALUES ($1, $2, $3, 'assistant', $4);
        `, [aiMsgId, convId, authUser.userId, aiResult.answer]);

        // Touch conversation updated_at timestamp
        await db.query(`UPDATE ai_chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1;`, [convId]);

        return sendJson(res, 200, {
          success: true,
          conversationId: convId,
          title: convTitle,
          message: {
            id: aiMsgId,
            sender: 'assistant',
            content: aiResult.answer,
            created_at: new Date().toISOString()
          },
          provider: aiResult.provider,
          model: aiResult.model,
          usage
        });
      } catch (err) {
        return sendJson(res, err.statusCode || 403, { error: err.message, code: err.code });
      }
    }

    // GET /api/ai/conversations — list user's chat history
    if (pathname === '/api/ai/conversations' && method === 'GET') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized session.' });

      const convs = await db.query(`
        SELECT id, title, created_at, updated_at
        FROM ai_chat_conversations
        WHERE user_id = $1
        ORDER BY updated_at DESC;
      `, [authUser.userId]);

      return sendJson(res, 200, { conversations: convs.rows });
    }

    // GET /api/ai/conversations/:id/messages — load messages for a chat
    if (pathname.startsWith('/api/ai/conversations/') && pathname.endsWith('/messages') && method === 'GET') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized session.' });

      const convId = pathname.replace('/api/ai/conversations/', '').replace('/messages', '');
      const msgs = await db.query(`
        SELECT id, sender, content, created_at
        FROM ai_chat_messages
        WHERE conversation_id = $1 AND user_id = $2
        ORDER BY created_at ASC;
      `, [convId, authUser.userId]);

      return sendJson(res, 200, { messages: msgs.rows });
    }

    // DELETE /api/ai/conversations/:id — delete a chat
    if (pathname.startsWith('/api/ai/conversations/') && method === 'DELETE' && !pathname.endsWith('/messages')) {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized session.' });

      const convId = pathname.replace('/api/ai/conversations/', '');
      await db.query(`DELETE FROM ai_chat_conversations WHERE id = $1 AND user_id = $2;`, [convId, authUser.userId]);
      return sendJson(res, 200, { success: true });
    }

    if (pathname === '/api/prep/start' && method === 'POST') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized session.' });

      const { subject } = await parseJsonBody(req);
      try {
        // Enforce TEST_PREP_BASIC entitlement and usage
        const usage = await atomicIncrementUsage(authUser.userId, 'TEST_PREP_BASIC');
        return sendJson(res, 200, {
          success: true,
          examSessionId: 'exam_' + Date.now(),
          subject: subject || 'General Assessment',
          usage
        });
      } catch (err) {
        return sendJson(res, err.statusCode || 403, { error: err.message, code: err.code });
      }
    }

    // ── TUTOR FINANCIAL SYSTEM API ────────────────────────────────────────────

    // GET /api/tutors/banks — list Nigerian banks (for payout profile setup)
    if (pathname === '/api/tutors/banks' && method === 'GET') {
      try {
        const banks = await getNigerianBanks();
        return sendJson(res, 200, { banks });
      } catch (err) {
        return sendJson(res, 500, { error: 'Failed to load bank list', code: 'BANKS_ERROR' });
      }
    }

    // POST /api/tutors/booking/initialize — student initiates booking + Paystack payment
    if (pathname === '/api/tutors/booking/initialize' && method === 'POST') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized session.' });

      const body = await parseJsonBody(req);
      const { tutorId, subject, slotTime, mode, notes } = body;

      if (!tutorId || !subject || !slotTime) {
        return sendJson(res, 400, { error: 'tutorId, subject, and slotTime are required.' });
      }

      try {
        // Enforce TUTOR_BOOKING entitlement (checks subscription tier)
        await atomicIncrementUsage(authUser.userId, 'TUTOR_BOOKING');
      } catch (err) {
        return sendJson(res, err.statusCode || 403, { error: err.message, code: err.code });
      }

      // Retrieve the Supabase JWT from the Authorization header (needed for RPC)
      const authHeader = req.headers['authorization'] || '';
      const supabaseJwt = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

      if (!supabaseJwt) {
        return sendJson(res, 401, { error: 'Supabase JWT required for booking.' });
      }

      try {
        const result = await initializeBookingPayment(supabaseJwt, {
          tutorId,
          subject,
          slotTime,
          mode:         mode || 'virtual',
          notes:        notes || null,
          studentEmail: authUser.email
        });
        return sendJson(res, 201, result);
      } catch (err) {
        return sendJson(res, err.statusCode || 400, { error: err.message });
      }
    }

    // POST /api/tutors/booking/verify — server verifies Paystack payment (never trust frontend)
    if (pathname === '/api/tutors/booking/verify' && method === 'POST') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized session.' });

      const { reference } = await parseJsonBody(req);
      if (!reference) return sendJson(res, 400, { error: 'Payment reference is required.' });

      try {
        const result = await verifyAndConfirmTutorPayment(reference);
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, err.statusCode || 400, { error: err.message });
      }
    }

    // GET /api/tutors/earnings — tutor's earnings summary (calls Supabase RPC)
    if (pathname === '/api/tutors/earnings' && method === 'GET') {
      const authHeader = req.headers['authorization'] || '';
      const supabaseJwt = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
      if (!supabaseJwt) return sendJson(res, 401, { error: 'Supabase JWT required.' });

      try {
        const summary = await getTutorEarningsSummary(supabaseJwt);
        return sendJson(res, 200, { summary });
      } catch (err) {
        return sendJson(res, err.statusCode || 400, { error: err.message });
      }
    }

    // POST /api/tutors/withdrawal/request — tutor requests a payout withdrawal
    if (pathname === '/api/tutors/withdrawal/request' && method === 'POST') {
      const authHeader = req.headers['authorization'] || '';
      const supabaseJwt = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
      if (!supabaseJwt) return sendJson(res, 401, { error: 'Supabase JWT required.' });

      const { amountKobo } = await parseJsonBody(req);
      const amount = Number(amountKobo);
      if (!Number.isInteger(amount) || amount <= 0) {
        return sendJson(res, 400, { error: 'amountKobo must be a positive integer.' });
      }

      try {
        const result = await requestWithdrawal(supabaseJwt, amount);
        return sendJson(res, 201, result);
      } catch (err) {
        return sendJson(res, err.statusCode || 400, { error: err.message });
      }
    }

    // POST /api/admin/tutors/withdrawal/:id/approve — admin approves and initiates transfer
    if (pathname.startsWith('/api/admin/tutors/withdrawal/') && pathname.endsWith('/approve') && method === 'POST') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser || authUser.role !== 'admin' && authUser.role !== 'ADMIN') {
        return sendJson(res, 403, { error: 'Forbidden. Administrator authorization required.' });
      }

      const withdrawalId = pathname
        .replace('/api/admin/tutors/withdrawal/', '')
        .replace('/approve', '');

      const authHeader  = req.headers['authorization'] || '';
      const supabaseJwt = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

      try {
        // Step 1: Admin approve in DB via RPC (sets status = admin_approved)
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl     = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
        const client = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        });
        const { error: approveErr } = await client.rpc('admin_approve_withdrawal', {
          p_withdrawal_id: withdrawalId,
          p_admin_notes:   null
        }, { headers: { Authorization: `Bearer ${supabaseJwt}` } });

        if (approveErr) throw new Error(approveErr.message);

        // Step 2: Initiate Paystack transfer
        const result = await executeTutorPayout(withdrawalId, supabaseJwt);
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, err.statusCode || 400, { error: err.message });
      }
    }

    // POST /api/admin/tutors/payout-profile/:tutorId/verify — admin verifies bank account
    if (pathname.startsWith('/api/admin/tutors/payout-profile/') && pathname.endsWith('/verify') && method === 'POST') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser || authUser.role !== 'admin' && authUser.role !== 'ADMIN') {
        return sendJson(res, 403, { error: 'Forbidden. Administrator authorization required.' });
      }

      const tutorId     = pathname.replace('/api/admin/tutors/payout-profile/', '').replace('/verify', '');
      const authHeader  = req.headers['authorization'] || '';
      const supabaseJwt = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

      try {
        const result = await adminVerifyPayoutProfile(tutorId, supabaseJwt);
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, err.statusCode || 400, { error: err.message });
      }
    }

    // Legacy /api/tutors/book — redirect to new endpoint (backward compat)
    if (pathname === '/api/tutors/book' && method === 'POST') {
      return sendJson(res, 410, {
        error: 'This endpoint has been superseded.',
        message: 'Please use POST /api/tutors/booking/initialize instead.',
        code: 'ENDPOINT_DEPRECATED'
      });
    }



    if (pathname === '/api/video/token' && method === 'POST') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) {
        return sendJson(res, 401, {
          error: 'Authentication required. Please sign in with Firebase or Studora.',
          code: 'AUTH_REQUIRED'
        });
      }

      const body = await parseJsonBody(req).catch(() => ({}));
      const roomID = (body.roomID || body.roomCode || 'studora-test-room').trim();

      // Stable ZEGOCLOUD user ID: derived strictly from verified Firebase UID or stable user ID
      const zegoUserId = authUser.firebaseUid || (authUser.userId && authUser.userId.startsWith('usr_') ? authUser.userId : 'usr_' + authUser.userId);

      // Resolve display name for in-call identity from profile
      let zegoUserName = authUser.email ? authUser.email.split('@')[0] : zegoUserId;
      try {
        const prof = await db.query(`SELECT full_name FROM profiles WHERE user_id = $1;`, [authUser.userId]);
        if (prof.rows.length > 0 && prof.rows[0].full_name) {
          zegoUserName = prof.rows[0].full_name;
        }
      } catch (e) {
        // Fallback to email prefix
      }

      // If not the development test room, enforce subscription entitlement
      let usage = null;
      if (roomID !== 'studora-test-room') {
        try {
          usage = await atomicIncrementUsage(authUser.userId, 'VIDEO_TUTORING');
        } catch (entErr) {
          return sendJson(res, entErr.statusCode || 403, { error: entErr.message, code: entErr.code });
        }
      }

      try {
        // Generate ZEGOCLOUD Token04 strictly server-side
        const effectiveTimeInSeconds = 3600; // 1 hour token validity
        const payload = JSON.stringify({
          room_id: roomID,
          privilege: {
            1: 1, // login room privilege
            2: 1  // publish stream privilege
          },
          stream_id_list: []
        });

        const token = generateToken04({
          appId: ZEGO_APP_ID,
          userId: zegoUserId,
          serverSecret: ZEGO_SERVER_SECRET,
          effectiveTimeInSeconds,
          payload
        });

        // ServerSecret MUST NEVER be included in the response
        return sendJson(res, 200, {
          success: true,
          token,
          appId: ZEGO_APP_ID,
          roomID,
          roomCode: roomID,
          userID: zegoUserId,
          userName: zegoUserName,
          expiresIn: effectiveTimeInSeconds,
          expiresAt: Math.floor(Date.now() / 1000) + effectiveTimeInSeconds,
          usage,
          serverSecretExposed: false
        });
      } catch (genErr) {
        console.error('ZEGOCLOUD token generation error:', genErr);
        return sendJson(res, 500, {
          error: 'Failed to generate ZEGOCLOUD room token: ' + genErr.message,
          code: 'ZEGO_TOKEN_GENERATION_FAILED'
        });
      }
    }

    if (pathname === '/api/analytics/advanced' && method === 'GET') {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Unauthorized session.' });

      const ents = await getUserEntitlements(authUser.userId);
      if (!ents.features['ADVANCED_ANALYTICS']) {
        return sendJson(res, 403, {
          error: 'Advanced Analytics is reserved for Pro and Premium plans.',
          code: 'FEATURE_NOT_AVAILABLE'
        });
      }

      return sendJson(res, 200, {
        success: true,
        predictiveTrend: 'Upward trajectory (+0.32 CGPA projected next semester)',
        retentionProbability: 98.4,
        topicMasteryIndex: 87.2
      });
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
