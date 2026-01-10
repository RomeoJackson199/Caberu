import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';

interface PatientData {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  medical_history?: string;
  emergency_contact?: string;
  business_id: string;
  send_invite_email?: boolean;
  quick_invite_only?: boolean; // Only send invite, don't create full profile
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  
  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sendGridApiKey = Deno.env.get('TWILIO_API_KEY');

    // Verify authenticated user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    // Create client with user auth to check permissions
    const userClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Invalid or expired token');
    }

    // Service role client for bypassing RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const patientData: PatientData = await req.json();
    console.log('📝 Creating patient profile:', { 
      email: patientData.email, 
      name: `${patientData.first_name} ${patientData.last_name}`,
      quickInviteOnly: patientData.quick_invite_only 
    });

    // Verify the user is a member of the business
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    const { data: membership } = await supabase
      .from('business_members')
      .select('role')
      .eq('profile_id', userProfile.id)
      .eq('business_id', patientData.business_id)
      .single();

    if (!membership || !['owner', 'admin', 'dentist'].includes(membership.role)) {
      throw new Error('Unauthorized: Only business members can create patients');
    }

    // Get business details for the email
    const { data: business } = await supabase
      .from('businesses')
      .select('name, phone, address')
      .eq('id', patientData.business_id)
      .single();

    let profileId: string;
    let isNewProfile = false;

    if (patientData.quick_invite_only) {
      // Quick invite - just check if profile exists, don't create full profile
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', patientData.email)
        .maybeSingle();

      if (existingProfile) {
        profileId = existingProfile.id;
      } else {
        // Create minimal placeholder profile that patient will claim
        // Note: user_id is omitted - it will be set when patient claims via auth
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            email: patientData.email,
            first_name: patientData.first_name || 'Patient',
            last_name: patientData.last_name || '',
            business_id: patientData.business_id,
            role: 'patient',
            profile_completion_status: 'incomplete'
          })
          .select('id')
          .single();

        if (profileError) {
          console.error('❌ Error creating placeholder profile:', profileError);
          throw profileError;
        }
        profileId = newProfile.id;
        isNewProfile = true;
      }
    } else {
      // Full profile creation
      // Check if profile already exists with this email
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', patientData.email)
        .maybeSingle();

      if (existingProfile) {
        // Update existing profile with new data
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            first_name: patientData.first_name,
            last_name: patientData.last_name,
            phone: patientData.phone || null,
            date_of_birth: patientData.date_of_birth || null,
            address: patientData.address || null,
            medical_history: patientData.medical_history || null,
            emergency_contact: patientData.emergency_contact || null,
            business_id: patientData.business_id,
          })
          .eq('id', existingProfile.id);

        if (updateError) throw updateError;
        profileId = existingProfile.id;
      } else {
        // Create new profile - user_id is omitted until patient claims via auth
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            email: patientData.email,
            first_name: patientData.first_name,
            last_name: patientData.last_name,
            phone: patientData.phone || null,
            date_of_birth: patientData.date_of_birth || null,
            address: patientData.address || null,
            medical_history: patientData.medical_history || null,
            emergency_contact: patientData.emergency_contact || null,
            business_id: patientData.business_id,
            role: 'patient',
            profile_completion_status: 'incomplete'
          })
          .select('id')
          .single();

        if (profileError) {
          console.error('❌ Error creating profile:', profileError);
          throw profileError;
        }
        profileId = newProfile.id;
        isNewProfile = true;
      }
    }

    console.log('✅ Profile ready:', profileId, isNewProfile ? '(new)' : '(existing)');

    // Send invite/claim email
    if ((patientData.send_invite_email || patientData.quick_invite_only) && sendGridApiKey) {
      const businessName = business?.name || 'Your Dental Practice';
      const claimUrl = `${Deno.env.get('PUBLIC_SITE_URL') || 'https://caberu.be'}/claim?email=${encodeURIComponent(patientData.email)}`;
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2D5D7B; margin-bottom: 24px;">Welcome to ${businessName}!</h2>
          
          <p>Dear ${patientData.first_name || 'Patient'},</p>
          
          <p>${businessName} has added you as a patient. To access your dental records, book appointments, and manage your care online, please create your account.</p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${claimUrl}" style="background: #2D5D7B; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Claim Your Profile
            </a>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <h4 style="color: #1e293b; margin: 0 0 12px 0;">What you can do:</h4>
            <ul style="color: #475569; margin: 0; padding-left: 20px;">
              <li>View and manage your appointments</li>
              <li>Access your dental records</li>
              <li>Communicate with your dentist</li>
              <li>Receive appointment reminders</li>
            </ul>
          </div>
          
          <p style="color: #64748b; font-size: 14px;">
            If you didn't expect this email or have questions, please contact ${businessName}${business?.phone ? ` at ${business.phone}` : ''}.
          </p>
        </div>
      `;

      try {
        const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sendGridApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: patientData.email }], subject: `${businessName} invites you to join` }],
            from: { email: 'Romeo@caberu.be', name: businessName },
            content: [{ type: "text/html", value: emailHtml }]
          })
        });

        if (emailResponse.ok) {
          console.log('✅ Invite email sent to:', patientData.email);
        } else {
          console.error('❌ Failed to send invite email:', await emailResponse.text());
        }
      } catch (emailError) {
        console.error('❌ Email sending error:', emailError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      profileId,
      isNewProfile,
      message: patientData.quick_invite_only 
        ? 'Invitation sent successfully' 
        : 'Patient profile created successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      error: errorMessage,
      success: false
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
