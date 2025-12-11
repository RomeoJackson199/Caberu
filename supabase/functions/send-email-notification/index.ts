import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Environment-based CORS configuration
const getCorsHeaders = () => {
  const environment = Deno.env.get('ENVIRONMENT') || 'development';

  if (environment === 'production') {
    return {
      'Access-Control-Allow-Origin': 'https://gjvxcisbaxhhblhsytar.supabase.co',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Max-Age': '86400',
    };
  }

  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};

const corsHeaders = getCorsHeaders();

interface EmailRequest {
  to: string;
  subject: string;
  message: string;
  messageType: 'appointment_confirmation' | 'appointment_reminder' | 'appointment_cancelled' | 'payment_received' | 'payment_reminder' | 'prescription' | 'emergency' | 'system';
  patientId?: string;
  dentistId?: string;
  isSystemNotification?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured');
    }

    const { to, subject, message, messageType, patientId, dentistId, isSystemNotification }: EmailRequest = await req.json();
    const isSystem = isSystemNotification === true || messageType === 'system';

    let supabase;
    let authedUserId: string | null = null;
    if (isSystem) {
      supabase = createClient(supabaseUrl, supabaseServiceKey);
      console.log('📧 System notification - skipping user authentication');
    } else {
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        throw new Error('Authorization header required');
      }
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Invalid or expired token');
      }
      authedUserId = user.id;
    }

    console.log('📧 Email request details:', { to, subject, messageType, patientId, dentistId, isSystemNotification: isSystem });

    // Authorization check
    if (!isSystem && dentistId && patientId) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', authedUserId)
        .single();

      if (!userProfile) {
        throw new Error('User profile not found');
      }

      const { data: dentist, error: dentistError } = await supabase
        .from('dentists')
        .select('id')
        .eq('id', dentistId)
        .eq('profile_id', userProfile.id)
        .single();

      if (dentistError || !dentist) {
        throw new Error('Unauthorized: Only the dentist can send email notifications');
      }
    } else if (isSystem) {
      console.log('📧 System notification - skipping dentist authorization');
    }

    // Create email notification record
    let notificationId;
    if (patientId && dentistId && !isSystem) {
      try {
        const { data, error } = await supabase
          .from('email_notifications')
          .insert({
            patient_id: patientId,
            dentist_id: dentistId,
            email_address: to,
            message_type: messageType,
            subject: subject,
            message_content: message,
            status: 'pending'
          })
          .select('id')
          .single();

        if (error) {
          console.error('Error creating email notification record:', error);
        } else {
          notificationId = data.id;
          console.log('📝 Email notification record created:', notificationId);
        }
      } catch (recordError) {
        console.error('Failed to create email record, continuing with send:', recordError);
      }
    }

    // Default sender info
    let fromEmail = 'Romeo@caberu.be';
    let fromName = 'Caberu Dental';
    let emailSubject = subject;
    let emailBody = message;
    let businessData: { name: string; phone?: string; address?: string } | null = null;
    let dentistFullName = '';

    // Fetch real business and dentist data
    if (dentistId) {
      const { data: dentistData } = await supabase
        .from('dentists')
        .select(`
          profile_id,
          profiles (first_name, last_name)
        `)
        .eq('id', dentistId)
        .single();

      if (dentistData?.profiles) {
        const profile = dentistData.profiles as any;
        dentistFullName = `Dr. ${profile.first_name} ${profile.last_name}`;
      }

      if (dentistData?.profile_id) {
        // Get business from business_members
        const { data: businessMember } = await supabase
          .from('business_members')
          .select('business_id')
          .eq('profile_id', dentistData.profile_id)
          .limit(1)
          .maybeSingle();

        const businessId = businessMember?.business_id;

        if (businessId) {
          // Fetch actual business details
          const { data: business } = await supabase
            .from('businesses')
            .select('name, phone, tagline')
            .eq('id', businessId)
            .single();

          if (business) {
            businessData = {
              name: business.name || 'Your Dental Practice',
              phone: business.phone || '',
              address: business.tagline || '',
            };
            fromName = dentistFullName ? `${dentistFullName} - ${business.name}` : business.name;
            console.log('📍 Using real business data:', businessData.name);
          }

          // Check for custom template
          const { data: customTemplate } = await supabase
            .from('business_email_templates')
            .select('subject, body_html, is_active')
            .eq('business_id', businessId)
            .eq('template_type', messageType)
            .eq('is_active', true)
            .maybeSingle();

          if (customTemplate) {
            console.log('📝 Using custom email template for:', messageType);
            emailSubject = customTemplate.subject;
            emailBody = customTemplate.body_html;
          }
        }
      }
    }

    // Replace template variables with real data
    const replaceVars = (text: string) => {
      return text
        .replace(/\{\{clinic_name\}\}/g, businessData?.name || 'Your Dental Practice')
        .replace(/\{\{clinic_phone\}\}/g, businessData?.phone || '')
        .replace(/\{\{clinic_address\}\}/g, businessData?.address || '')
        .replace(/\{\{dentist_name\}\}/g, dentistFullName || 'Your Dentist');
    };

    emailSubject = replaceVars(emailSubject);
    emailBody = replaceVars(emailBody);

    // Build final email HTML
    const emailHtml = emailBody.includes('<div') || emailBody.includes('<p')
      ? emailBody
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${emailSubject}</h2>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            ${emailBody.replace(/\n/g, '<br>')}
          </div>
          <p style="color: #666; font-size: 12px;">
            This email was sent from ${businessData?.name || 'your dental practice'}.
          </p>
        </div>
      `;

    // Send via SendGrid
    const sendGridApiKey = Deno.env.get('TWILIO_API_KEY');
    if (!sendGridApiKey) {
      throw new Error('SendGrid API key not configured');
    }

    const emailData = {
      personalizations: [{
        to: [{ email: to }],
        subject: emailSubject
      }],
      from: { email: fromEmail, name: fromName },
      content: [{ type: "text/html", value: emailHtml }]
    };

    console.log('🚀 Sending email via SendGrid...');
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    console.log('📡 SendGrid response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ SendGrid error:', errorText);

      if (notificationId) {
        await supabase
          .from('email_notifications')
          .update({ status: 'failed', error_message: errorText })
          .eq('id', notificationId);
      }

      throw new Error(`SendGrid API failed: ${response.status}`);
    }

    if (notificationId) {
      await supabase
        .from('email_notifications')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          message_content: message
        })
        .eq('id', notificationId);
    }

    console.log(`✅ Email sent successfully for ${messageType}`);

    // Increment business email count if associated with a business
    // We need to re-fetch or ensure businessId is available. 
    // Since businessId variable scope was limited, let's try to resolve it again or rely on the fact that if we have dentistId we can find it.
    if (dentistId) {
      try {
        // Quick lookup for business_id via membership if we don't have it handy in this scope
        const { data: memberData } = await supabase
          .from('business_members')
          .select('business_id')
          .eq('profile_id', (await supabase.from('dentists').select('profile_id').eq('id', dentistId).single()).data?.profile_id)
          .limit(1)
          .maybeSingle();

        if (memberData?.business_id) {
          await supabase.rpc('increment_email_count', { business_uuid: memberData.business_id });
        }
      } catch (incError) {
        console.error('Error incrementing email count:', incError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      notificationId,
      message: 'Email sent successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error sending email:', error);

    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});