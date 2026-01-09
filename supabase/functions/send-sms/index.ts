import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflightSafe } from "../_shared/cors.ts";

interface SMSRequest {
  to: string;
  message: string;
  messageType: 'auth' | 'appointment_confirmation' | 'reminder' | 'emergency';
  patientId?: string;
  dentistId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) {
    return preflightResponse;
  }

  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Get the authorization header and verify JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    // Create Supabase client with user context for authorization checks
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Invalid or expired token');
    }

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Twilio credentials not configured');
    }

    const { to, message, messageType, patientId, dentistId }: SMSRequest = await req.json();

    // Authorization check: Only dentists can send SMS notifications
    if (dentistId) {
      const { data: dentist, error: dentistError } = await supabase
        .from('dentists')
        .select('id')
        .eq('id', dentistId)
        .eq('profile_id', (
          await supabase.from('profiles').select('id').eq('user_id', user.id).single()
        ).data?.id)
        .single();

      if (dentistError || !dentist) {
        throw new Error('Unauthorized: Only the dentist can send SMS notifications');
      }
    }

    // Create SMS notification record first
    let notificationId;
    if (patientId && dentistId) {
      const { data, error } = await supabase
        .from('sms_notifications')
        .insert({
          patient_id: patientId,
          dentist_id: dentistId,
          phone_number: to,
          message_type: messageType,
          message_content: message,
          status: 'pending'
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating SMS notification record:', error);
      } else {
        notificationId = data.id;
      }
    }

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: twilioPhoneNumber,
        Body: message,
      }),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      throw new Error(`Twilio error: ${twilioData.message}`);
    }

    // Update SMS notification record with Twilio response
    if (notificationId) {
      await supabase
        .from('sms_notifications')
        .update({
          twilio_sid: twilioData.sid,
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', notificationId);
    }

    return new Response(JSON.stringify({
      success: true,
      sid: twilioData.sid,
      notificationId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error sending SMS:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(JSON.stringify({
      error: errorMessage,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});