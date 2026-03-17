import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// deno-lint-ignore no-explicit-any
type AnySupabaseClient = any;

// =====================================================
// Login Rate Limiting Utility for Supabase Edge Functions
// =====================================================

const RATE_LIMIT_WINDOW_SECONDS = 900; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 5; // 5 attempts per 15 minutes per email/IP

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  blocked: boolean;
}

/**
 * Check if a login attempt should be rate limited
 * Uses database-backed rate limiting for multi-instance support
 */
export async function checkLoginRateLimit(
  supabase: ReturnType<typeof createClient>,
  email: string,
  clientIP: string
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_SECONDS * 1000);
  
  // Create composite key from email + IP for better tracking
  const rateLimitKey = `login_${email.toLowerCase()}_${clientIP}`;
  
  try {
    // Check existing attempts in the current window
    const { data: existingAttempts, error: selectError } = await supabase
      .from('api_rate_limits')
      .select('count, window_start')
      .eq('key', rateLimitKey)
      .gte('window_start', windowStart.toISOString())
      .order('window_start', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (selectError) {
      console.error('Rate limit check error:', selectError);
      // Fail open - allow the request but log the error
      return {
        allowed: true,
        remaining: MAX_LOGIN_ATTEMPTS,
        resetAt: new Date(now.getTime() + RATE_LIMIT_WINDOW_SECONDS * 1000),
        blocked: false
      };
    }
    
    const currentCount = existingAttempts?.count || 0;
    const resetAt = existingAttempts?.window_start 
      ? new Date(new Date(existingAttempts.window_start).getTime() + RATE_LIMIT_WINDOW_SECONDS * 1000)
      : new Date(now.getTime() + RATE_LIMIT_WINDOW_SECONDS * 1000);
    
    if (currentCount >= MAX_LOGIN_ATTEMPTS) {
      console.warn(`Login rate limit exceeded for: ${email} from IP: ${clientIP}`);
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        blocked: true
      };
    }
    
    // Increment the counter
    if (existingAttempts) {
      await supabase
        .from('api_rate_limits')
        .update({ count: currentCount + 1 })
        .eq('key', rateLimitKey)
        .gte('window_start', windowStart.toISOString());
    } else {
      await supabase
        .from('api_rate_limits')
        .insert({
          key: rateLimitKey,
          count: 1,
          window_start: now.toISOString()
        });
    }
    
    return {
      allowed: true,
      remaining: MAX_LOGIN_ATTEMPTS - currentCount - 1,
      resetAt,
      blocked: false
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    // Fail open
    return {
      allowed: true,
      remaining: MAX_LOGIN_ATTEMPTS,
      resetAt: new Date(now.getTime() + RATE_LIMIT_WINDOW_SECONDS * 1000),
      blocked: false
    };
  }
}

/**
 * Record a successful login (resets the rate limit for this user/IP)
 */
export async function recordSuccessfulLogin(
  supabase: ReturnType<typeof createClient>,
  email: string,
  clientIP: string
): Promise<void> {
  const rateLimitKey = `login_${email.toLowerCase()}_${clientIP}`;
  
  try {
    // Delete rate limit entries for this key on successful login
    await supabase
      .from('api_rate_limits')
      .delete()
      .eq('key', rateLimitKey);
  } catch (error) {
    // Non-critical, just log
    console.error('Failed to clear rate limit on success:', error);
  }
}

/**
 * Record a failed login attempt (for audit purposes)
 */
export async function recordFailedLogin(
  supabase: ReturnType<typeof createClient>,
  email: string,
  clientIP: string,
  reason: string
): Promise<void> {
  try {
    await supabase
      .from('audit_logs')
      .insert({
        action: 'failed_login',
        table_name: 'auth',
        changes: {
          email: email.toLowerCase(),
          ip_address: clientIP,
          reason,
          timestamp: new Date().toISOString()
        }
      });
  } catch (error) {
    console.error('Failed to log failed login:', error);
  }
}
