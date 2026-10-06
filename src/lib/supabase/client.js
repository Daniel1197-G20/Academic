import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
  );
}

// Safe storage abstraction for restrictive mobile environments/WebViews
const createSafeStorage = () => {
  const inMemoryStorage = new Map();

  return {
    getItem(key) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } catch (err) {
        console.warn('LocalStorage read access restricted or blocked, falling back to memory:', err);
      }
      return inMemoryStorage.get(key) || null;
    },
    setItem(key, value) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
          return;
        }
      } catch (err) {
        console.warn('LocalStorage write access restricted or blocked, falling back to memory:', err);
      }
      inMemoryStorage.set(key, String(value));
    },
    removeItem(key) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
          return;
        }
      } catch (err) {
        console.warn('LocalStorage remove access restricted or blocked, falling back to memory:', err);
      }
      inMemoryStorage.delete(key);
    }
  };
};

export const safeStorage = createSafeStorage();

/**
 * Authoritative Supabase Client Singleton for Studora
 * "Study smarter. Go further."
 *
 * Configured with:
 * - Safe persistent session storage with memory fallback
 * - Automatic JWT token refreshing
 * - URL OAuth / magic link session detection
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: safeStorage,
  },
});

export default supabase;
