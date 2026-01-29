import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightSafe } from "../_shared/cors.ts";

interface VerifySMSRequest {
  phoneNumber: string;
  code: string;
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  try {
    const { phoneNumber, code }: VerifySMSRequest = await req.json();

    if (!phoneNumber || !code) {
      return new Response(
        JSON.stringify({ error: 'Phone number and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone number format
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    if (!cleanPhone.match(/^\+[1-9]\d{6,14}$/)) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate code format (6 digits)
    const cleanCode = code.replace(/\s/g, '');
    if (!cleanCode.match(/^\d{6}$/)) {
      return new Response(
        JSON.stringify({ verified: false, error: 'Invalid code format. Enter 6 digits.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Twilio Verify credentials
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioVerifyServiceSid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');

    if (!twilioAccountSid || !twilioAuthToken || !twilioVerifyServiceSid) {
      console.error('Twilio Verify credentials not configured');
      throw new Error('SMS verification service not configured');
    }

    // Verify code via Twilio Verify API
    const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    const verifyCheckUrl = `https://verify.twilio.com/v2/Services/${twilioVerifyServiceSid}/VerificationCheck`;

    const twilioResponse = await fetch(verifyCheckUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: cleanPhone,
        Code: cleanCode,
      }),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error('Twilio Verify check error:', twilioData);

      // Handle specific Twilio errors
      if (twilioData.code === 60202) {
        return new Response(
          JSON.stringify({
            verified: false,
            error: 'Too many failed attempts. Please request a new code.'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (twilioData.code === 20404) {
        return new Response(
          JSON.stringify({
            verified: false,
            error: 'Verification code expired or not found. Please request a new code.'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(twilioData.message || 'Verification check failed');
    }

    // Check verification status from Twilio
    if (twilioData.status === 'approved') {
      console.log(`SMS verification approved for ${cleanPhone}`);
      return new Response(
        JSON.stringify({
          verified: true,
          message: 'Phone number verified successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log(`SMS verification failed for ${cleanPhone}, status: ${twilioData.status}`);
      return new Response(
        JSON.stringify({
          verified: false,
          error: 'Incorrect verification code'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in verify-sms-code:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
