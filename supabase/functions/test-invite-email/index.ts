import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightSafe } from "../_shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase env vars' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const testEmail: string = (body.email || 'test.invite@example.com').toString().trim().toLowerCase();
    const firstName: string = body.firstName || 'Test';
    const lastName: string = body.lastName || 'Invitee';

    // Ensure profile exists or create a minimal one
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('email', testEmail)
      .maybeSingle();

    let profileId: string | null = existingProfile?.id ?? null;

    if (!profileId) {
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          email: testEmail,
          first_name: firstName,
          last_name: lastName,
          role: 'patient',
          profile_completion_status: 'incomplete',
          user_id: null,
        })
        .select('id, email, first_name, last_name')
        .single();

      if (insertError) {
        console.error('Failed to insert test profile:', insertError);
        return new Response(JSON.stringify({ error: insertError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      profileId = newProfile.id;
    }

    // Generate invitation token
    const { data: tokenId, error: tokenError } = await supabase
      .rpc('create_invitation_token_with_cleanup', {
        p_profile_id: profileId,
        p_email: testEmail,
        p_expires_hours: 72,
      });

    if (tokenError) {
      console.error('Token creation failed:', tokenError);
      return new Response(JSON.stringify({ error: tokenError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:3000';
    const invitationLink = `${siteUrl}/invite?token=${tokenId}`;

    const subject = 'DentiBot Invitation Test — set your password';
    const message = `
      <p>Hi ${firstName} ${lastName},</p>
      <p>This is a test of the invitation email flow.</p>
      <p><a href="${invitationLink}">Set up your password</a></p>
      <p>If you didn’t request this, you can ignore this email.</p>
    `;

    const { data: emailData, error: emailError } = await supabase.functions.invoke('send-email-notification', {
      body: {
        to: testEmail,
        subject,
        message,
        messageType: 'system',
        isSystemNotification: true,
        patientId: profileId,
        dentistId: null,
      },
    });

    if (emailError) {
      console.error('Email send failed:', emailError);
      return new Response(JSON.stringify({ success: false, error: emailError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, token: tokenId, invitationLink, emailResult: emailData }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in test-invite-email function:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});