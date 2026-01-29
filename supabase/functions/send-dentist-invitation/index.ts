import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightSafe } from "../_shared/cors.ts";
import { checkRateLimitDB, getClientIP, rateLimitResponse } from "../_shared/rateLimit.ts";

interface SendDentistInviteRequest {
  invitee_email: string;
  business_id: string;
  business_name: string;
}

// Rate limit: 10 invitations per hour per user
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 60 * 1000,  // 1 hour
  maxRequests: 10,
  keyPrefix: 'dentist_invite'
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
    const requestBody: SendDentistInviteRequest = await req.json();

    if (!requestBody?.invitee_email || !requestBody?.business_id) {
      return new Response(JSON.stringify({ error: 'invitee_email and business_id are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseAuthed = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify caller is authenticated
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
      console.warn(`Rate limit exceeded for user ${authedUserId} on dentist invitations`);
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }

    const email = requestBody.invitee_email.trim().toLowerCase();

    // Verify the user has permission to invite to this business
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authedUserId)
      .single();

    if (!userProfile) {
      return new Response(JSON.stringify({ error: 'User profile not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: businessMember } = await supabase
      .from('business_members')
      .select('role')
      .eq('business_id', requestBody.business_id)
      .eq('profile_id', userProfile.id)
      .single();

    if (!businessMember || !['owner', 'admin'].includes(businessMember.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden: Only business owners/admins can send invitations' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user already exists in the system
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('email', email)
      .maybeSingle();

    // Create invitation record in database
    const { data: invitation, error: invitationError } = await supabase
      .from('dentist_invitations')
      .insert({
        business_id: requestBody.business_id,
        inviter_profile_id: userProfile.id,
        invitee_email: email,
        invitee_profile_id: existingProfile?.id || null
      })
      .select('id')
      .single();

    if (invitationError || !invitation) {
      console.error('Failed to create invitation record:', invitationError);
      return new Response(JSON.stringify({
        error: 'Failed to create invitation record',
        details: invitationError?.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:3000';
    let invitationLink = '';
    let subject = '';
    let message = '';

    if (existingProfile) {
      // User exists - send them a link to accept the invitation
      invitationLink = `${siteUrl}/dentist-invitations`;
      subject = `You've been invited to join ${requestBody.business_name}`;
      message = `
        <p>Hi ${existingProfile.first_name || ''} ${existingProfile.last_name || ''},</p>
        <p>You've been invited to join <strong>${requestBody.business_name}</strong> as a practitioner.</p>
        <p>Please log in to your account to view and accept this invitation:</p>
        <p><a href="${invitationLink}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Invitation</a></p>
        <p>If you didn't expect this invitation, you can safely ignore this email.</p>
      `;
    } else {
      // User doesn't exist - create a profile and send them an invitation token
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          email: email,
          first_name: '',
          last_name: '',
          role: 'dentist'
        })
        .select('id')
        .single();

      if (profileError || !newProfile) {
        return new Response(JSON.stringify({ error: 'Failed to create profile' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Update the invitation record with the new profile ID
      await supabase
        .from('dentist_invitations')
        .update({ invitee_profile_id: newProfile.id })
        .eq('id', invitation.id);

      // Create invitation token
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('create_invitation_token_with_cleanup', {
          p_profile_id: newProfile.id,
          p_email: email,
          p_expires_hours: 168 // 7 days
        });

      if (tokenError || !tokenData) {
        return new Response(JSON.stringify({ error: 'Failed to create invitation token' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      invitationLink = `${siteUrl}/invite/${tokenData}`;
      subject = `You've been invited to join ${requestBody.business_name}`;
      message = `
        <p>Hi,</p>
        <p>You've been invited to join <strong>${requestBody.business_name}</strong> as a practitioner on Caberu.</p>
        <p>Click the link below to set up your account and accept the invitation:</p>
        <p><a href="${invitationLink}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Set Up Account</a></p>
        <p>This invitation will expire in 7 days.</p>
        <p>If you didn't expect this invitation, you can safely ignore this email.</p>
      `;
    }

    // Send the email
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
        isSystemNotification: true
      })
    });

    if (!emailResponse.ok) {
      const errText = await emailResponse.text().catch(() => '');
      console.error('Failed to send invitation email:', errText);
      return new Response(JSON.stringify({
        error: 'Failed to send invitation email',
        details: errText
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Invitation email sent successfully',
      invitationLink
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error sending dentist invitation:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
