/**
 * Studora Centralized Client Configuration
 * Single source of truth for public, browser-safe environment configuration.
 *
 * ARCHITECTURAL MANDATES:
 * - NO server secrets (Paystack Secret Key, DB URL, Service Role Key) must ever be placed here.
 * - Components must import from this configuration layer or direct centralized client.
 * - All properties are frozen at runtime to prevent unauthorized client modifications.
 */

export const clientConfig = Object.freeze({
  app: Object.freeze({
    name: 'Studora',
    tagline: 'Study smarter. Go further.',
    version: '1.0.0',
    env: (typeof import.meta !== 'undefined' && import.meta.env?.MODE) || 'development',
    isProd: (typeof import.meta !== 'undefined' && import.meta.env?.PROD) || false,
    isDev: (typeof import.meta !== 'undefined' && import.meta.env?.DEV) ?? true,
  }),
  supabase: Object.freeze({
    // These values must be provided via VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment
    // variables. No hardcoded fallbacks: missing configuration surfaces immediately at startup
    // rather than silently connecting to a stale or shared project.
    url: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '',
    anonKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '',
  }),
  // Transitional legacy references (non-authoritative during Phase 1)
  firebase: Object.freeze({
    apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) || '',
    authDomain: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) || 'studora-a.firebaseapp.com',
    projectId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) || 'studora-a',
    storageBucket: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) || 'studora-a.appspot.com',
    messagingSenderId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || '',
    appId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_APP_ID) || '',
  }),
  paystack: Object.freeze({
    publicKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PAYSTACK_PUBLIC_KEY) || '',
  }),
  zegoCloud: Object.freeze({
    appId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ZEGOCLOUD_APP_ID)
      ? Number(import.meta.env.VITE_ZEGOCLOUD_APP_ID)
      : null,
  }),
  stream: Object.freeze({
    apiKey: (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_STREAM_API_KEY || import.meta.env?.STREAM_API_KEY)) || '',
  })
});

/**
 * Validates whether Stream credentials have been configured in frontend
 */
export function isStreamConfigured() {
  const key = clientConfig.stream?.apiKey;
  return Boolean(key && key.trim().length > 0);
}

/**
 * Validates whether Supabase credentials have been configured
 */
export function isSupabaseConfigured() {
  const url = clientConfig.supabase.url;
  const key = clientConfig.supabase.anonKey;
  return Boolean(url && key && url.includes('supabase.co'));
}

/**
 * Legacy Firebase configuration validator
 */
export function isFirebaseConfigured() {
  const key = clientConfig.firebase.apiKey;
  return Boolean(key && !key.includes('Placeholder') && key.trim().length > 0);
}
