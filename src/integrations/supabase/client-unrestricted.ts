// Unrestricted Supabase client with service role key
// WARNING: This bypasses all security restrictions
// Use only for development/testing purposes
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://gjvxcisbaxhhblhsytar.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "YOUR_SERVICE_ROLE_KEY_HERE"; // Replace with your actual service role key

// Import the unrestricted supabase client like this:
// import { supabaseUnrestricted } from "@/integrations/supabase/client-unrestricted";

export const supabaseUnrestricted = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// This client bypasses all RLS policies and has full access to all data
// Use with extreme caution in production environments