import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightSafe } from "../_shared/cors.ts";

interface VerifyRequest {
  email: string;
  code: string;
}

// SECURITY: Rate limiting constants
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 10;

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  try {
    const { email, code }: VerifyRequest = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: 'Email and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get stored code with attempt tracking
    const { data: storedCode, error: fetchError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .single();

    if (fetchError || !storedCode) {
      console.error('Error fetching code:', fetchError);
      return new Response(
        JSON.stringify({ verified: false, error: 'Invalid or expired code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Check for lockout
    const now = new Date();
    if (storedCode.lockout_until) {
      const lockoutUntil = new Date(storedCode.lockout_until);
      if (now < lockoutUntil) {
        const remainingMinutes = Math.ceil((lockoutUntil.getTime() - now.getTime()) / 60000);
        console.log(`Account locked for ${remainingMinutes} more minutes:`, email);
        return new Response(
          JSON.stringify({
            verified: false,
            error: `Too many failed attempts. Try again in ${remainingMinutes} minute(s).`,
            locked: true,
            lockoutMinutes: remainingMinutes
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Lockout expired, reset attempts
        await supabase
          .from('verification_codes')
          .update({ failed_attempts: 0, lockout_until: null })
          .eq('email', email);
      }
    }

    const expiresAt = new Date(storedCode.expires_at);

    // Check if code matches
    if (storedCode.code !== code) {
      // SECURITY: Increment failed attempts
      const newAttempts = (storedCode.failed_attempts || 0) + 1;
      const updateData: any = { failed_attempts: newAttempts };

      // Lock account if max attempts exceeded
      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockoutUntil = new Date();
        lockoutUntil.setMinutes(lockoutUntil.getMinutes() + LOCKOUT_MINUTES);
        updateData.lockout_until = lockoutUntil.toISOString();
        console.log(`Account locked due to ${newAttempts} failed attempts:`, email);
      }

      await supabase
        .from('verification_codes')
        .update(updateData)
        .eq('email', email);

      const remainingAttempts = MAX_FAILED_ATTEMPTS - newAttempts;
      return new Response(
        JSON.stringify({
          verified: false,
          error: remainingAttempts > 0
            ? `Incorrect code. ${remainingAttempts} attempt(s) remaining.`
            : `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`,
          remainingAttempts: Math.max(0, remainingAttempts),
          locked: remainingAttempts <= 0
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ verified: false, error: 'Code has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (storedCode.used) {
      return new Response(
        JSON.stringify({ verified: false, error: 'Code has already been used' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Mark code as used and reset failed attempts on success
    await supabase
      .from('verification_codes')
      .update({ used: true, failed_attempts: 0, lockout_until: null })
      .eq('email', email);

    console.log('2FA code verified successfully for:', email);

    return new Response(
      JSON.stringify({ verified: true, message: 'Code verified successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in verify-2fa-code:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

