import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightSafe } from "../_shared/cors.ts";
import { checkRateLimitDB, getClientIP, rateLimitResponse } from "../_shared/rateLimit.ts";

interface SendInvitesRequest {
  sessionId: string;
}

// Rate limit: 5 bulk import invitations per hour (expensive operation)
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 60 * 1000,  // 1 hour
  maxRequests: 5,
  keyPrefix: 'import_invites'
};

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Server not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const authHeader = req.headers.get('authorization') || '';
    const requestBody: SendInvitesRequest = await req.json();

    if (!requestBody?.sessionId) {
      return new Response(JSON.stringify({ error: 'sessionId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseAuthed = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify caller owns the session via dentist ownership
    const { data: importSession, error: sessionErr } = await supabase
      .from('import_sessions')
      .select('id, dentist_id, filename, total_records, successful_records, failed_records, status')
      .eq('id', requestBody.sessionId)
      .single();

    if (sessionErr || !importSession) {
      return new Response(JSON.stringify({ error: 'Import session not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Ensure the authed user is the dentist who owns this session
    const { data: userResult, error: authError } = await supabaseAuthed.auth.getUser();
    if (authError || !userResult?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authedUserId = userResult.user.id;

    // Apply rate limiting per user
    const rateLimitResult = await checkRateLimitDB(supabase, authedUserId, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit exceeded for user ${authedUserId} on import invitations`);
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }

    const { data: dentistRow, error: dentistErr } = await supabase
      .from('dentists')
      .select('id, profile_id')
      .eq('id', importSession.dentist_id)
      .single();

    if (dentistErr || !dentistRow) {
      return new Response(JSON.stringify({ error: 'Dentist not found for session' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: dentistProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, user_id')
      .eq('id', dentistRow.profile_id)
      .single();

    if (profileErr || !dentistProfile || dentistProfile.user_id !== authedUserId) {
      return new Response(JSON.stringify({ error: 'Forbidden: Not your import session' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch all patients imported in this session
    const { data: patients, error: patientsErr } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('import_session_id', requestBody.sessionId)
      .eq('role', 'patient');

    if (patientsErr) {
      return new Response(JSON.stringify({ error: 'Failed to fetch patients' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:3000';

    let total = 0;
    let sent = 0;
    let failed = 0;
    const failures: Array<{ email: string; error: string }> = [];

    for (const patient of patients || []) {
      total++;
      try {
        const email = (patient.email || '').trim().toLowerCase();
        if (!email || !email.includes('@')) {
          failed++;
          failures.push({ email: patient.email || '(empty)', error: 'Invalid email' });
          continue;
        }

        // Create/refresh invitation token
        const { data: tokenData, error: tokenError } = await supabase
          .rpc('create_invitation_token_with_cleanup', {
            p_profile_id: patient.id,
            p_email: email,
            p_expires_hours: 72
          });

        if (tokenError || !tokenData) {
          failed++;
          failures.push({ email, error: tokenError?.message || 'Token creation failed' });
          continue;
        }

        const invitationLink = `${siteUrl}/invite?token=${tokenData}`;
        const subject = 'Welcome to DentiBot — set your password';
        const message = `
  <p>Hi ${patient.first_name || ''} ${patient.last_name || ''},</p>
  <p>Your profile has been created. Click below to set your password and claim your account.</p>
  <p><a href="${invitationLink}">Set up your password</a></p>
  <p>If you didn’t request this, you can ignore this email.</p>
`;

        // Call the email function with the same Authorization header
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: email,
            subject,
            message,
            messageType: 'system',
            isSystemNotification: true,
            patientId: patient.id,
            dentistId: dentistRow.id
          })
        });

        if (!emailResponse.ok) {
          const errText = await emailResponse.text().catch(() => '');
          failed++;
          failures.push({ email, error: `Email send failed: ${errText}` });
          continue;
        }

        sent++;
      } catch (err: any) {
        failed++;
        failures.push({ email: patient.email || '(unknown)', error: err?.message || 'Unknown error' });
      }
    }

    // Send summary email to dentist
    if (dentistProfile.email) {
      const subject = `Import invitations sent: ${sent}/${total} succeeded`;
      const message = `
  <p>Hello Dr. ${dentistProfile.first_name || ''} ${dentistProfile.last_name || ''},</p>
  <p>We processed your CSV import invitations.</p>
  <ul>
    <li>Total patients: ${total}</li>
    <li>Emails sent: ${sent}</li>
    <li>Failures: ${failed}</li>
  </ul>
  ${failures.length > 0 ? `<p>Failures:</p><ul>${failures.map(f => `<li>${f.email}: ${f.error}</li>`).join('')}</ul>` : ''}
  <p>Session: ${importSession.filename} (${importSession.id})</p>
`;

      await fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: dentistProfile.email,
          subject,
          message,
          messageType: 'system',
          isSystemNotification: true,
          patientId: null,
          dentistId: dentistRow.id
        })
      }).catch(() => undefined);
    }

    return new Response(JSON.stringify({ success: true, total, sent, failed, failures }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});