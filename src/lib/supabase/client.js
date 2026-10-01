import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ermkkjkkxlqjrgpinrjt.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVybWtramtreGxxanJncGlucmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NzMxOTcsImV4cCI6MjEwNjQ0OTE5N30.9E5v8_sMfNPAX6NolyU9rzJXkKvmk4WMhW1MX_IGVVw';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

/**
 * Authoritative Supabase Client Singleton for Studora
 * "Study smarter. Go further."
 *
 * Configured with:
 * - Persistent session storage via localStorage
 * - Automatic JWT token refreshing
 * - URL OAuth / magic link session detection
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

export default supabase;
