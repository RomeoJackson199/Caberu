// Supabase client configuration
// SECURITY: Environment variables are required - no hardcoded fallbacks
import { createClient } from '@supabase/supabase-js';

// Environment variables are required - fail fast if not configured
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

export { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY };

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  // Performance optimizations
  global: {
    headers: {
      // Enable compression for faster responses
      'Accept-Encoding': 'gzip, deflate, br',
    },
  },
  // Realtime configuration
  realtime: {
    // Reduce heartbeat for better battery/performance
    params: {
      eventsPerSecond: 10,
    },
  },
  // Database connection pooling
  db: {
    schema: 'public',
  },
});

export const getFunctionUrl = (name: string) => `${SUPABASE_URL}/functions/v1/${name}`;

// Helper to abort slow requests
export const createAbortableQuery = (timeoutMs = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  };
};

// GDPR-compliant session timeout (15 minutes)
const SESSION_TIMEOUT_MS = 15 * 60 * 1000;
const ACTIVITY_THROTTLE_MS = 1000; // Throttle activity detection to once per second
let sessionTimer: ReturnType<typeof setTimeout> | undefined;
let lastActivityTime = 0;

const handleSessionTimeout = async () => {
  await supabase.auth.signOut();
  window.location.href = '/login?reason=timeout';
};

const resetSessionTimeout = () => {
  if (sessionTimer) clearTimeout(sessionTimer);
  sessionTimer = setTimeout(handleSessionTimeout, SESSION_TIMEOUT_MS);
};

// Throttled activity handler to avoid excessive timer resets
const handleActivity = () => {
  const now = Date.now();
  if (now - lastActivityTime >= ACTIVITY_THROTTLE_MS) {
    lastActivityTime = now;
    resetSessionTimeout();
  }
};

// Track user activity to reset timeout
const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];

if (typeof window !== 'undefined') {
  activityEvents.forEach(event => {
    document.addEventListener(event, handleActivity, { passive: true });
  });

  // Start initial timer
  resetSessionTimeout();

  // Clean up on page unload to prevent memory leaks
  window.addEventListener('beforeunload', () => {
    if (sessionTimer) {
      clearTimeout(sessionTimer);
    }
    activityEvents.forEach(event => {
      document.removeEventListener(event, handleActivity);
    });
  });
}

// Export cleanup function for manual cleanup if needed
export const cleanupSessionTimeout = () => {
  if (sessionTimer) {
    clearTimeout(sessionTimer);
    sessionTimer = undefined;
  }
  if (typeof window !== 'undefined') {
    activityEvents.forEach(event => {
      document.removeEventListener(event, handleActivity);
    });
  }
};