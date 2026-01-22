import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';
import { checkRateLimitDB, getClientIP, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

/**
 * Login Rate Limit Checker
 * Call this BEFORE attempting login to enforce rate limiting
 * This provides server-side rate limiting for the login flow
 */
serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client IP for rate limiting
    const clientIP = getClientIP(req);
    
    // Create composite key from email + IP
    const rateLimitKey = `${email.toLowerCase()}_${clientIP}`;

    // Create service client for rate limit checks
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check rate limit using database-backed limiting
    const result = await checkRateLimitDB(supabase, rateLimitKey, RATE_LIMITS.LOGIN);

    if (!result.allowed) {
      console.warn(`Login rate limit exceeded for email: ${email}, IP: ${clientIP}`);
      
      // Log failed attempt for security audit
      try {
        await supabase.from('audit_logs').insert({
          action: 'login_rate_limited',
          table_name: 'auth',
          changes: {
            email: email.toLowerCase(),
            ip_address: clientIP,
            remaining_attempts: 0,
            reset_at: result.resetAt.toISOString()
          }
        });
      } catch (logError) {
        console.error('Failed to log rate limit event:', logError);
      }

      return rateLimitResponse(result, corsHeaders);
    }

    return new Response(
      JSON.stringify({
        allowed: true,
        remaining: result.remaining,
        reset_at: result.resetAt.toISOString()
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': result.resetAt.toISOString()
        } 
      }
    );

  } catch (error) {
    console.error('Login rate limit check error:', error);
    // Fail open - don't block login if rate limit check fails
    return new Response(
      JSON.stringify({ allowed: true, error: 'Rate limit check failed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
