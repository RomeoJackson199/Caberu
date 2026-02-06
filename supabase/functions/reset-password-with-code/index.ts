import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';
import { checkRateLimitDB, getClientIP, rateLimitResponse } from '../_shared/rateLimit.ts';

interface ResetRequest {
    email: string;
    code: string;
    newPassword: string;
}

// Rate limit config: 5 attempts per 15 minutes per email/IP
const RATE_LIMIT_PASSWORD_RESET = {
  windowMs: 15 * 60 * 1000,  // 15 minutes
  maxRequests: 5,
  keyPrefix: 'pwd_reset'
};

serve(async (req) => {
    const origin = req.headers.get('Origin');
    const corsHeaders = getCorsHeaders(origin);
    
    const preflightResponse = handleCorsPreflightSafe(req);
    if (preflightResponse) return preflightResponse;

    try {
        const { email, code, newPassword }: ResetRequest = await req.json();

        if (!email || !code || !newPassword) {
            return new Response(
                JSON.stringify({ error: 'Email, code, and new password are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Rate limit check - use email + IP as key to prevent brute force attacks
        const clientIP = getClientIP(req);
        const rateLimitKey = `${email.toLowerCase()}_${clientIP}`;
        const rateLimitResult = await checkRateLimitDB(supabase, rateLimitKey, RATE_LIMIT_PASSWORD_RESET);

        if (!rateLimitResult.allowed) {
            console.warn(`Rate limit exceeded for password reset: ${email}`);
            return rateLimitResponse(rateLimitResult, corsHeaders);
        }

        // 1. Verify the code
        const { data: validCodes, error: verifyError } = await supabase
            .from('verification_codes')
            .select('id')
            .eq('email', email)
            .eq('code', code)
            .eq('type', 'recovery')
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .limit(1);

        if (verifyError) throw verifyError;

        if (!validCodes || validCodes.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Invalid or expired verification code' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 2. Mark code as used
        const { error: updateError } = await supabase
            .from('verification_codes')
            .update({ used: true })
            .eq('id', validCodes[0].id);

        if (updateError) throw updateError;

        // 3. Find user by email via profiles table (efficient - avoids loading all users into memory)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('email', email.toLowerCase())
            .maybeSingle();

        if (profileError || !profile || !profile.user_id) {
            return new Response(
                JSON.stringify({ error: 'No account found with this email address' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 4. Update password
        const { error: authError } = await supabase.auth.admin.updateUserById(
            profile.user_id,
            { password: newPassword }
        );

        if (authError) throw authError;

        return new Response(
            JSON.stringify({ success: true, message: 'Password updated successfully' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error in reset-password-with-code:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
