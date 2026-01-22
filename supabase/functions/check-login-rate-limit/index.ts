/**
 * Edge Function: Check Login Rate Limit
 *
 * Purpose: Check if a login attempt should be allowed based on rate limiting rules
 *
 * Security Features:
 * - IP-based rate limiting
 * - Email-based rate limiting
 * - Exponential backoff on failed attempts
 * - Automatic lockout after max attempts
 *
 * Rate Limits:
 * - 5 failed attempts per email per 15 minutes
 * - 10 failed attempts per IP per 15 minutes
 * - 15 minute lockout after exceeding limits
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';
import {
  checkRateLimit,
  recordAttempt,
  resetRateLimit,
  getClientIp,
  RATE_LIMIT_CONFIGS,
} from '../_shared/rateLimit.ts';

interface RequestBody {
  email: string;
  action?: 'check' | 'record_failure' | 'record_success';
}

serve(async (req) => {
  // Handle CORS preflight
  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const { email, action = 'check' }: RequestBody = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const clientIp = getClientIp(req);

    // Check rate limits for both email and IP
    const [emailRateLimit, ipRateLimit] = await Promise.all([
      checkRateLimit(
        supabaseClient,
        normalizedEmail,
        'login',
        RATE_LIMIT_CONFIGS.LOGIN
      ),
      checkRateLimit(
        supabaseClient,
        `ip:${clientIp}`,
        'login',
        {
          maxAttempts: 10, // More lenient for IPs (shared networks)
          windowMinutes: 15,
          lockoutMinutes: 15,
        }
      ),
    ]);

    // Handle different actions
    if (action === 'check') {
      // Check if either email or IP is rate limited
      if (!emailRateLimit.allowed) {
        return new Response(
          JSON.stringify({
            allowed: false,
            reason: 'email',
            ...emailRateLimit,
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Retry-After': emailRateLimit.retryAfterSeconds.toString(),
            },
          }
        );
      }

      if (!ipRateLimit.allowed) {
        return new Response(
          JSON.stringify({
            allowed: false,
            reason: 'ip',
            ...ipRateLimit,
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Retry-After': ipRateLimit.retryAfterSeconds.toString(),
            },
          }
        );
      }

      // Both checks passed
      return new Response(
        JSON.stringify({
          allowed: true,
          attemptsRemaining: Math.min(
            emailRateLimit.attemptsRemaining,
            ipRateLimit.attemptsRemaining
          ),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else if (action === 'record_failure') {
      // Record failed login attempt for both email and IP
      await Promise.all([
        recordAttempt(supabaseClient, normalizedEmail, 'login', false, {
          ip: clientIp,
          timestamp: new Date().toISOString(),
          user_agent: req.headers.get('User-Agent') || 'unknown',
        }),
        recordAttempt(supabaseClient, `ip:${clientIp}`, 'login', false, {
          email: normalizedEmail,
          timestamp: new Date().toISOString(),
        }),
      ]);

      // Re-check rate limits after recording
      const [newEmailLimit, newIpLimit] = await Promise.all([
        checkRateLimit(
          supabaseClient,
          normalizedEmail,
          'login',
          RATE_LIMIT_CONFIGS.LOGIN
        ),
        checkRateLimit(
          supabaseClient,
          `ip:${clientIp}`,
          'login',
          {
            maxAttempts: 10,
            windowMinutes: 15,
            lockoutMinutes: 15,
          }
        ),
      ]);

      return new Response(
        JSON.stringify({
          success: true,
          emailRateLimit: newEmailLimit,
          ipRateLimit: newIpLimit,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else if (action === 'record_success') {
      // Reset rate limits on successful login
      await Promise.all([
        resetRateLimit(supabaseClient, normalizedEmail, 'login'),
        resetRateLimit(supabaseClient, `ip:${clientIp}`, 'login'),
      ]);

      return new Response(
        JSON.stringify({ success: true, message: 'Rate limits reset' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Rate limit check error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
