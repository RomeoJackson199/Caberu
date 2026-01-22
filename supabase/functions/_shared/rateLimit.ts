/**
 * Shared rate limiting utilities for Edge Functions
 * Provides IP and email-based rate limiting with configurable thresholds
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface RateLimitConfig {
  /** Maximum attempts allowed within the time window */
  maxAttempts: number;
  /** Time window in minutes */
  windowMinutes: number;
  /** Lockout duration in minutes after exceeding max attempts */
  lockoutMinutes: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of attempts remaining (0 if locked out) */
  attemptsRemaining: number;
  /** Time until lockout expires (in seconds, 0 if not locked out) */
  retryAfterSeconds: number;
  /** User-friendly error message if blocked */
  message?: string;
}

// Default rate limit configurations
export const RATE_LIMIT_CONFIGS = {
  LOGIN: {
    maxAttempts: 5,
    windowMinutes: 15,
    lockoutMinutes: 15,
  } as RateLimitConfig,
  PASSWORD_RESET: {
    maxAttempts: 3,
    windowMinutes: 60,
    lockoutMinutes: 60,
  } as RateLimitConfig,
  TWO_FA_CODE_SEND: {
    maxAttempts: 3,
    windowMinutes: 60,
    lockoutMinutes: 60,
  } as RateLimitConfig,
};

/**
 * Extract IP address from request
 * Checks various headers for reverse proxy scenarios
 */
export function getClientIp(req: Request): string {
  // Try multiple headers in order of preference
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip', // Cloudflare
    'x-client-ip',
  ];

  for (const header of headers) {
    const value = req.headers.get(header);
    if (value) {
      // x-forwarded-for can be a comma-separated list, take the first IP
      const ip = value.split(',')[0].trim();
      if (ip) return ip;
    }
  }

  return 'unknown';
}

/**
 * Check if a request should be rate limited
 * @param supabase - Supabase client
 * @param identifier - Email, phone, or IP address
 * @param action - Action type (e.g., 'login', 'password_reset')
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  identifier: string,
  action: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMinutes * 60 * 1000);

  try {
    // Query attempts within the time window
    const { data: attempts, error } = await supabase
      .from('rate_limit_attempts')
      .select('*')
      .eq('identifier', identifier.toLowerCase())
      .eq('action', action)
      .gte('attempted_at', windowStart.toISOString())
      .order('attempted_at', { ascending: false });

    if (error) {
      console.error('Rate limit check error:', error);
      // Fail open - allow the request if we can't check rate limits
      return {
        allowed: true,
        attemptsRemaining: config.maxAttempts,
        retryAfterSeconds: 0,
      };
    }

    const attemptCount = attempts?.length || 0;

    // Check if there's an active lockout
    if (attemptCount >= config.maxAttempts && attempts && attempts[0]) {
      const lastAttempt = new Date(attempts[0].attempted_at);
      const lockoutEnd = new Date(lastAttempt.getTime() + config.lockoutMinutes * 60 * 1000);

      if (now < lockoutEnd) {
        const retryAfterSeconds = Math.ceil((lockoutEnd.getTime() - now.getTime()) / 1000);
        const minutes = Math.ceil(retryAfterSeconds / 60);

        return {
          allowed: false,
          attemptsRemaining: 0,
          retryAfterSeconds,
          message: `Too many attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`,
        };
      }
    }

    // Calculate remaining attempts
    const attemptsRemaining = Math.max(0, config.maxAttempts - attemptCount);

    return {
      allowed: attemptCount < config.maxAttempts,
      attemptsRemaining,
      retryAfterSeconds: 0,
    };
  } catch (error) {
    console.error('Rate limit check exception:', error);
    // Fail open - allow the request if there's an exception
    return {
      allowed: true,
      attemptsRemaining: config.maxAttempts,
      retryAfterSeconds: 0,
    };
  }
}

/**
 * Record a rate limit attempt (failed or successful)
 * @param supabase - Supabase client
 * @param identifier - Email, phone, or IP address
 * @param action - Action type
 * @param success - Whether the attempt was successful
 * @param metadata - Optional metadata to store with the attempt
 */
export async function recordAttempt(
  supabase: SupabaseClient,
  identifier: string,
  action: string,
  success: boolean,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('rate_limit_attempts')
      .insert({
        identifier: identifier.toLowerCase(),
        action,
        success,
        attempted_at: new Date().toISOString(),
        metadata: metadata || {},
      });

    if (error) {
      console.error('Failed to record rate limit attempt:', error);
    }

    // If successful, clean up old failed attempts for this identifier
    if (success) {
      await cleanupOldAttempts(supabase, identifier, action);
    }
  } catch (error) {
    console.error('Exception recording rate limit attempt:', error);
  }
}

/**
 * Clean up old rate limit attempts (older than 24 hours)
 * @param supabase - Supabase client
 * @param identifier - Email, phone, or IP address
 * @param action - Action type
 */
async function cleanupOldAttempts(
  supabase: SupabaseClient,
  identifier: string,
  action: string
): Promise<void> {
  const cleanupThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    await supabase
      .from('rate_limit_attempts')
      .delete()
      .eq('identifier', identifier.toLowerCase())
      .eq('action', action)
      .lt('attempted_at', cleanupThreshold.toISOString());
  } catch (error) {
    console.error('Failed to cleanup old attempts:', error);
  }
}

/**
 * Reset rate limit for a specific identifier and action
 * Useful for manual overrides or after successful authentication
 * @param supabase - Supabase client
 * @param identifier - Email, phone, or IP address
 * @param action - Action type
 */
export async function resetRateLimit(
  supabase: SupabaseClient,
  identifier: string,
  action: string
): Promise<void> {
  try {
    await supabase
      .from('rate_limit_attempts')
      .delete()
      .eq('identifier', identifier.toLowerCase())
      .eq('action', action);
  } catch (error) {
    console.error('Failed to reset rate limit:', error);
  }
}

export default {
  checkRateLimit,
  recordAttempt,
  resetRateLimit,
  getClientIp,
  RATE_LIMIT_CONFIGS,
};
