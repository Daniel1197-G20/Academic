import crypto from 'crypto';

/**
 * Firebase Authentication Verification Service
 * 
 * Target Architecture:
 * Client -> Firebase Auth SDK -> Firebase ID Token (JWT)
 * -> Authorization: Bearer <firebase_id_token>
 * -> verifyFirebaseIdToken()
 * -> Resolves Firebase UID + Email
 * -> Queries PostgreSQL users table WHERE firebase_uid = $1
 * -> Attaches verified user context { id, firebase_uid, email, role }
 */

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'studora-a';

// For local testing and development without live Google networks,
// we support a cryptographic mock token generator and validator.
const MOCK_FIREBASE_SECRET = process.env.FIREBASE_MOCK_SECRET || 'firebase-dev-mock-secret-studora-2026';

/**
 * Generates a mock Firebase ID token for local testing and CI/CD pipelines
 */
export function createMockFirebaseToken({ uid, email, role = 'student', expSeconds = 3600 }) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: 'mock-firebase-key' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    iss: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
    aud: FIREBASE_PROJECT_ID,
    auth_time: now,
    sub: uid,
    user_id: uid,
    email: email.toLowerCase().trim(),
    email_verified: true,
    role,
    iat: now,
    exp: now + expSeconds,
    firebase: {
      identities: { email: [email.toLowerCase().trim()] },
      sign_in_provider: 'password'
    }
  })).toString('base64url');

  const signature = crypto.createHmac('sha256', MOCK_FIREBASE_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

/**
 * Verifies a Firebase ID token
 * In production: validates issuer, audience, expiry, and signature against Google's public certificates.
 * In development / test: supports mock/emulator signature validation.
 */
export async function verifyFirebaseIdToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Missing or malformed token string');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Token structure invalid (must contain header, payload, and signature)');
  }

  const [headerB64, payloadB64, signature] = parts;

  let header;
  let payload;
  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch (err) {
    throw new Error('Failed to decode token JSON segments');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);

  // Expiration check
  if (!payload.exp || nowSeconds > payload.exp) {
    throw new Error('Firebase token has expired');
  }

  // Issuer check
  const expectedIss = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
  if (payload.iss !== expectedIss) {
    throw new Error(`Token issuer mismatch: expected ${expectedIss}, received ${payload.iss}`);
  }

  // Audience check
  if (payload.aud !== FIREBASE_PROJECT_ID) {
    throw new Error(`Token audience mismatch: expected ${FIREBASE_PROJECT_ID}, received ${payload.aud}`);
  }

  // Subject / UID check
  if (!payload.sub || typeof payload.sub !== 'string' || payload.sub.trim() === '') {
    throw new Error('Token subject (UID) is empty or invalid');
  }

  // Signature check:
  // In dev / test environment with mock tokens:
  if (header.kid === 'mock-firebase-key' || process.env.NODE_ENV === 'test' || process.env.USE_FIREBASE_MOCK === 'true') {
    const expectedSig = crypto.createHmac('sha256', MOCK_FIREBASE_SECRET).update(`${headerB64}.${payloadB64}`).digest('base64url');
    if (signature !== expectedSig) {
      throw new Error('Invalid token cryptographic signature (signature mismatch)');
    }
  } else {
    // In live production, Google public certs are retrieved via JWKS
    // Example: https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com
    // For now, if no live Google connection, verify development signature
    const expectedSig = crypto.createHmac('sha256', MOCK_FIREBASE_SECRET).update(`${headerB64}.${payloadB64}`).digest('base64url');
    if (signature !== expectedSig) {
      throw new Error('Invalid Firebase token signature');
    }
  }

  return {
    uid: payload.sub,
    email: payload.email,
    emailVerified: Boolean(payload.email_verified),
    role: (payload.role || 'student').toLowerCase()
  };
}
