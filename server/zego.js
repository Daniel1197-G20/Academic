import crypto from 'crypto';

/**
 * ZEGOCLOUD Server-Side Token Generator (Token04 Protocol)
 *
 * ARCHITECTURAL MANDATES:
 * 1. ZEGOCLOUD_SERVER_SECRET MUST REMAIN SERVER-SIDE AT ALL TIMES.
 * 2. Tokens are generated strictly via AES-128/256-CBC with PKCS5 padding,
 *    following the official ZEGOCLOUD server assistant token04 standard.
 * 3. Browser-supplied user IDs are never trusted; the user identity is derived
 *    exclusively from verified Firebase Authentication context.
 */

// Error code constants
export const ZegoErrorCode = Object.freeze({
  SUCCESS: 0,
  APP_ID_INVALID: 1,
  USER_ID_INVALID: 3,
  SECRET_INVALID: 5,
  EFFECTIVE_TIME_INVALID: 6,
});

/**
 * Derives the appropriate AES cipher algorithm according to the secret byte length.
 * ZEGOCLOUD 32-character secrets map to aes-256-cbc; 16-character map to aes-128-cbc.
 */
function getCipherAlgorithm(keyBuffer) {
  switch (keyBuffer.length) {
    case 16:
      return 'aes-128-cbc';
    case 24:
      return 'aes-192-cbc';
    case 32:
      return 'aes-256-cbc';
    default:
      throw new Error(`Invalid ZEGOCLOUD server secret length: expected 16, 24, or 32 bytes, received ${keyBuffer.length}`);
  }
}

/**
 * Generates a random 16-character alphanumeric initialization vector (IV).
 */
function generateRandomIv() {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  const ivArr = [];
  for (let i = 0; i < 16; i++) {
    ivArr.push(chars.charAt(Math.floor(Math.random() * chars.length)));
  }
  return ivArr.join('');
}

/**
 * Encrypts plain text using AES-CBC with PKCS7/PKCS5 padding.
 */
function aesEncrypt(plainText, keyBuffer, iv) {
  const cipher = crypto.createCipheriv(getCipherAlgorithm(keyBuffer), keyBuffer, iv);
  cipher.setAutoPadding(true);
  const encrypted = cipher.update(plainText, 'utf8');
  const final = cipher.final();
  return Buffer.concat([encrypted, final]);
}

/**
 * Normalizes a secret string to exactly 32 bytes for cryptographic consistency.
 * If the provided secret is already 32 bytes, it is returned as-is.
 * If shorter or longer, it derives a deterministic 32-byte hash buffer.
 */
export function normalizeSecretKey(secret) {
  if (!secret || typeof secret !== 'string') {
    // Default development fallback secret for local non-production sandbox
    return Buffer.from('studora_dev_zego_secret_32bytes!', 'utf8');
  }
  const buf = Buffer.from(secret, 'utf8');
  if (buf.length === 32 || buf.length === 16) {
    return buf;
  }
  // Deterministic 32-byte digest if length differs
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Generates a ZEGOCLOUD Token04 for room authentication.
 *
 * @param {Object} params
 * @param {number} params.appId - The ZEGOCLOUD application ID
 * @param {string} params.userId - Verified user ID (Firebase UID or stable Studora user ID)
 * @param {string|Buffer} params.serverSecret - The server-side secret (MUST NEVER BE SENT TO CLIENT)
 * @param {number} [params.effectiveTimeInSeconds=3600] - Token validity duration
 * @param {string} [params.payload=""] - Custom JSON payload (e.g. room_id, privileges)
 * @returns {string} The formatted Token04 string prefixed with '04'
 */
export function generateToken04({
  appId,
  userId,
  serverSecret,
  effectiveTimeInSeconds = 3600,
  payload = ''
}) {
  if (!appId || typeof appId !== 'number') {
    throw new Error('ZEGOCLOUD AppID must be a valid positive integer.');
  }

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('ZEGOCLOUD UserID must be a non-empty string.');
  }

  if (!effectiveTimeInSeconds || typeof effectiveTimeInSeconds !== 'number' || effectiveTimeInSeconds <= 0) {
    throw new Error('effectiveTimeInSeconds must be a positive integer.');
  }

  const keyBuffer = Buffer.isBuffer(serverSecret) ? serverSecret : normalizeSecretKey(serverSecret);

  const nowSeconds = Math.floor(Date.now() / 1000);
  const expireSeconds = nowSeconds + effectiveTimeInSeconds;

  // 31-bit random nonce
  const nonce = Math.floor(Math.random() * 2147483647);

  const tokenInfo = {
    app_id: appId,
    user_id: userId,
    nonce,
    ctime: nowSeconds,
    expire: expireSeconds,
    payload: payload || ''
  };

  const plainText = JSON.stringify(tokenInfo);
  const iv = generateRandomIv();
  const encryptedBuf = aesEncrypt(plainText, keyBuffer, iv);

  // Binary envelope format per ZEGOCLOUD Token04 standard:
  // [8 bytes: Big-Endian Int64 Expire Time]
  // [2 bytes: Big-Endian UInt16 IV Length (16)]
  // [16 bytes: IV string]
  // [2 bytes: Big-Endian UInt16 Encrypted Data Length]
  // [N bytes: Encrypted ciphertext]
  const bExpire = Buffer.alloc(8);
  bExpire.writeBigInt64BE(BigInt(expireSeconds), 0);

  const bIvLen = Buffer.alloc(2);
  bIvLen.writeUInt16BE(iv.length, 0);

  const bEncLen = Buffer.alloc(2);
  bEncLen.writeUInt16BE(encryptedBuf.length, 0);

  const packedEnvelope = Buffer.concat([
    bExpire,
    bIvLen,
    Buffer.from(iv, 'utf8'),
    bEncLen,
    encryptedBuf
  ]);

  return '04' + packedEnvelope.toString('base64');
}
