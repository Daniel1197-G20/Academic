/**
 * Firebase Client Configuration & Service Initializer
 * 
 * ARCHITECTURAL MANDATES:
 * 1. Only client-safe public configuration keys are stored in the frontend:
 *    - apiKey
 *    - authDomain
 *    - projectId
 *    - storageBucket
 *    - messagingSenderId
 *    - appId
 * 
 * 2. NEVER EXPOSE IN FRONTEND:
 *    - Service Account private keys
 *    - Database connection strings or master passwords
 *    - AI provider API secret keys
 *    - Payment gateway secret keys
 * 
 * 3. PostgreSQL remains the authoritative database for academic records & CGPA.
 *    Firebase is used selectively for Authentication, Realtime Messaging (Firestore),
 *    Media Uploads (Storage), and Push Notifications (FCM).
 */

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDemoPlaceholderForLocalDevOnly12345',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'academic-platform-prod.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'academic-platform-prod',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'academic-platform-prod.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '100000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:100000000000:web:abcdef1234567890'
};

/**
 * Checks whether live Firebase configuration has been provided via environment variables
 */
export function isFirebaseConfigured() {
  const key = import.meta.env.VITE_FIREBASE_API_KEY;
  return Boolean(key && !key.includes('Placeholder'));
}

/**
 * Client authentication bridge helper
 * When Firebase Auth is fully active, this returns the current user's ID token.
 */
export async function getFirebaseIdToken() {
  if (typeof window === 'undefined') return null;
  // If a mock or active Firebase session exists in localStorage, return it
  return localStorage.getItem('academic_platform_token') || null;
}
