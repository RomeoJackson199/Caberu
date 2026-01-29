import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';
import { checkRateLimitDB, getClientIP, rateLimitResponse } from '../_shared/rateLimit.ts';

interface SMSVerificationRequest {
  phoneNumber: string;
  type?: 'login' | 'signup' | 'recovery';
}

// Rate limit config: 5 requests per 15 minutes per phone number
const RATE_LIMIT_SMS = {
  windowMs: 15 * 60 * 1000,  // 15 minutes
  maxRequests: 5,
  keyPrefix: 'sms_verify'
};

serve(async (req) => {
  // Handle CORS preflight with secure origin validation
  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    const { phoneNumber, type = 'login' }: SMSVerificationRequest = await req.json();

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone number format (basic E.164 validation)
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    if (!cleanPhone.match(/^\+[1-9]\d{6,14}$/)) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format. Use E.164 format (e.g., +32467881965)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client for rate limiting
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limit check - use phone + IP as key for extra security
    const clientIP = getClientIP(req);
    const rateLimitKey = `${cleanPhone}_${clientIP}`;
    const rateLimitResult = await checkRateLimitDB(supabase, rateLimitKey, RATE_LIMIT_SMS);

    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit exceeded for SMS verification: ${cleanPhone}`);
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }

    // Get Twilio Verify credentials
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioVerifyServiceSid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');

    if (!twilioAccountSid || !twilioAuthToken || !twilioVerifyServiceSid) {
      console.error('Twilio Verify credentials not configured');
      throw new Error('SMS verification service not configured');
    }

    // Send verification via Twilio Verify API
    const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    const verifyUrl = `https://verify.twilio.com/v2/Services/${twilioVerifyServiceSid}/Verifications`;

    const twilioResponse = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: cleanPhone,
        Channel: 'sms',
      }),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error('Twilio Verify error:', twilioData);

      // Handle specific Twilio errors
      if (twilioData.code === 60203) {
        return new Response(
          JSON.stringify({ error: 'Too many verification attempts. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(twilioData.message || 'Failed to send verification SMS');
    }

    console.log(`SMS verification sent to ${cleanPhone}, status: ${twilioData.status}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verification code sent',
        status: twilioData.status,
        // Return masked phone for UI confirmation
        maskedPhone: cleanPhone.slice(0, -4).replace(/\d/g, '*') + cleanPhone.slice(-4)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-sms-verification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
