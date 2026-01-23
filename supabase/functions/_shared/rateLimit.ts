/**
 * Shared Rate Limiting Utility for Supabase Edge Functions
 * Supports both in-memory (single instance) and database-backed (multi-instance) limiting
 */

// In-memory rate limit store for single-instance rate limiting
const memoryStore = new Map<string, { count: number; resetAt: number }>();

interface RateLimitConfig {
  windowMs: number;       // Time window in milliseconds
  maxRequests: number;    // Max requests per window
  keyPrefix: string;      // Prefix for the rate limit key
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;    // Seconds until reset (only if blocked)
}

/**
 * Extract client IP from request headers
 */
export function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
         req.headers.get('cf-connecting-ip') ||
         req.headers.get('x-real-ip') ||
         'unknown';
}

/**
 * In-memory rate limiting (fast, single-instance)
 * Best for: Edge functions that don't need distributed rate limiting
 */
export function checkRateLimitMemory(
  clientKey: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = `${config.keyPrefix}_${clientKey}`;
  
  // Periodic cleanup (1% chance per request)
  if (Math.random() < 0.01) {
    for (const [k, v] of memoryStore.entries()) {
      if (now > v.resetAt) memoryStore.delete(k);
    }
  }

  const existing = memoryStore.get(key);
  const resetAt = new Date(now + config.windowMs);

  if (existing) {
    if (now < existing.resetAt) {
      if (existing.count >= config.maxRequests) {
        const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
        console.warn(`Rate limit exceeded for key: ${key}`);
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(existing.resetAt),
          retryAfter
        };
      }
      existing.count++;
      return {
        allowed: true,
        remaining: config.maxRequests - existing.count,
        resetAt: new Date(existing.resetAt)
      };
    } else {
      // Window expired, reset
      memoryStore.set(key, { count: 1, resetAt: now + config.windowMs });
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt
      };
    }
  } else {
    memoryStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt
    };
  }
}

// Type for rate limit record from database
interface RateLimitRecord {
  id: string;
  key: string;
  count: number;
  window_start: string;
  created_at: string | null;
}

/**
 * Database-backed rate limiting (distributed, multi-instance)
 * Best for: Critical endpoints like login, sensitive operations
 */
export async function checkRateLimitDB(
  supabaseClient: { 
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          gte: (column: string, value: string) => {
            order: (column: string, options: { ascending: boolean }) => {
              limit: (count: number) => {
                maybeSingle: () => Promise<{ data: RateLimitRecord | null; error: Error | null }>;
              };
            };
          };
        };
      };
      update: (values: { count: number }) => {
        eq: (column: string, value: string) => {
          gte: (column: string, value: string) => Promise<{ error: Error | null }>;
        };
      };
      insert: (values: { key: string; count: number; window_start: string }) => Promise<{ error: Error | null }>;
      delete: () => {
        eq: (column: string, value: string) => Promise<{ error: Error | null }>;
      };
    };
  },
  clientKey: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStartTime = new Date(now.getTime() - config.windowMs);
  const key = `${config.keyPrefix}_${clientKey}`;
  const resetAt = new Date(now.getTime() + config.windowMs);

  try {
    // Check existing attempts in the current window
    const { data: existingAttempts, error: selectError } = await supabaseClient
      .from('api_rate_limits')
      .select('id, key, count, window_start, created_at')
      .eq('key', key)
      .gte('window_start', windowStartTime.toISOString())
      .order('window_start', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selectError) {
      console.error('Rate limit check error:', selectError);
      // Fail open - allow the request but log the error
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt
      };
    }

    const currentCount = existingAttempts?.count || 0;
    const windowResetAt = existingAttempts?.window_start
      ? new Date(new Date(existingAttempts.window_start).getTime() + config.windowMs)
      : resetAt;

    if (currentCount >= config.maxRequests) {
      const retryAfter = Math.ceil((windowResetAt.getTime() - now.getTime()) / 1000);
      console.warn(`DB rate limit exceeded for key: ${key}`);
      return {
        allowed: false,
        remaining: 0,
        resetAt: windowResetAt,
        retryAfter
      };
    }

    // Increment the counter
    if (existingAttempts) {
      await supabaseClient
        .from('api_rate_limits')
        .update({ count: currentCount + 1 })
        .eq('key', key)
        .gte('window_start', windowStartTime.toISOString());
    } else {
      await supabaseClient
        .from('api_rate_limits')
        .insert({
          key,
          count: 1,
          window_start: now.toISOString()
        });
    }

    return {
      allowed: true,
      remaining: config.maxRequests - currentCount - 1,
      resetAt: windowResetAt
    };
  } catch (error) {
    console.error('Rate limit DB error:', error);
    // Fail open
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt
    };
  }
}

/**
 * Clear rate limit for a key (e.g., after successful login)
 */
export async function clearRateLimit(
  supabaseClient: { 
    from: (table: string) => {
      delete: () => {
        eq: (column: string, value: string) => Promise<{ error: Error | null }>;
      };
    };
  },
  clientKey: string,
  keyPrefix: string
): Promise<void> {
  const key = `${keyPrefix}_${clientKey}`;
  try {
    await supabaseClient
      .from('api_rate_limits')
      .delete()
      .eq('key', key);
  } catch (error) {
    console.error('Failed to clear rate limit:', error);
  }
}

/**
 * Create a rate limit response
 */
export function rateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded. Please try again later.',
      retry_after: result.retryAfter
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfter || 60),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.resetAt.toISOString()
      }
    }
  );
}

// Common rate limit configurations
export const RATE_LIMITS = {
  // Login: 5 attempts per 15 minutes
  LOGIN: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 5,
    keyPrefix: 'login'
  },
  // AI Chat: 30 requests per minute
  AI_CHAT: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 30,
    keyPrefix: 'ai_chat'
  },
  // AI Heavy: 10 requests per minute (for expensive operations)
  AI_HEAVY: {
    windowMs: 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'ai_heavy'
  },
  // Business AI: 20 requests per hour
  BUSINESS_AI: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 20,
    keyPrefix: 'business_ai'
  },
  // Voice AI: 20 calls per hour
  VOICE_AI: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 20,
    keyPrefix: 'voice_ai'
  },
  // Support Chat: 50 messages per hour
  SUPPORT_CHAT: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 50,
    keyPrefix: 'support_chat'
  }
} as const;
