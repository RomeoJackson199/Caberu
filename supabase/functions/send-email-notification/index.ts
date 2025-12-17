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
  businessId?: string; // Direct business ID for email limit checking
  isSystemNotification?: boolean;
  appointmentDate?: string;
  appointmentTime?: string;
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

    const { to, subject, message, messageType, patientId, dentistId, businessId: requestBusinessId, isSystemNotification, appointmentDate, appointmentTime }: EmailRequest = await req.json();
    // Only skip authentication AND limit check for EXPLICIT system notifications (2FA codes, password resets)
    // messageType='system' is still a business email and should count toward limits
    const isSystem = isSystemNotification === true;

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
    console.log('📅 Appointment data received:', { appointmentDate, appointmentTime });

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

    // EMAIL LIMIT ENFORCEMENT - Check if business has exceeded their email limit
    // Skip for system notifications only
    if (!isSystem) {
      try {
        let businessIdToCheck: string | null = requestBusinessId || null;

        // Try to find businessId from dentistId if not provided directly
        if (!businessIdToCheck && dentistId) {
          const { data: dentistData } = await supabase
            .from('dentists')
            .select('profile_id')
            .eq('id', dentistId)
            .single();

          if (dentistData?.profile_id) {
            const { data: memberData } = await supabase
              .from('business_members')
              .select('business_id')
              .eq('profile_id', dentistData.profile_id)
              .limit(1)
              .maybeSingle();

            businessIdToCheck = memberData?.business_id || null;
          }
        }

        // Try to find businessId from patientId if still not found
        if (!businessIdToCheck && patientId) {
          const { data: patientData } = await supabase
            .from('patients')
            .select('business_id')
            .eq('profile_id', patientId)
            .limit(1)
            .maybeSingle();

          businessIdToCheck = patientData?.business_id || null;
        }

        // Now check the email limit if we found a business
        if (businessIdToCheck) {
          const { data: business } = await supabase
            .from('businesses')
            .select('emails_sent_count, subscription_plan')
            .eq('id', businessIdToCheck)
            .single();

          if (business?.subscription_plan) {
            const { data: plan } = await supabase
              .from('subscription_plans')
              .select('email_limit_monthly')
              .ilike('name', `%${business.subscription_plan}%`)
              .maybeSingle();

            const emailLimit = plan?.email_limit_monthly;
            const emailsSent = business.emails_sent_count || 0;

            // -1 or null means unlimited emails
            if (emailLimit !== null && emailLimit !== undefined && emailLimit !== -1) {
              console.log(`📊 Email limit check for business ${businessIdToCheck}: ${emailsSent}/${emailLimit}`);

              if (emailsSent >= emailLimit) {
                console.log('❌ Email limit exceeded!');
                throw new Error(`Email limit exceeded. You have sent ${emailsSent}/${emailLimit} emails this month. Please upgrade your plan to send more emails.`);
              }
            } else {
              console.log(`📊 Email limit check for business ${businessIdToCheck}: ${emailsSent}/unlimited`);
            }
          }
        } else {
          console.log('⚠️ Could not determine business for email limit check, proceeding with email');
        }
      } catch (limitError) {
        if (limitError.message?.includes('Email limit exceeded')) {
          throw limitError;
        }
        console.error('Email limit check error:', limitError);
      }
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

    // Fetch patient data if available
    let patientName = 'Valued Patient';
    if (patientId) {
      const { data: pData } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', patientId)
        .maybeSingle(); // Use maybeSingle to be safe
      if (pData) {
        patientName = `${pData.first_name || ''} ${pData.last_name || ''}`.trim() || 'Valued Patient';
      }
    }

    // Replace template variables with real data
    const replaceVars = (text: string) => {
      let result = text
        .replace(/\{\{clinic_name\}\}/g, businessData?.name || 'Your Dental Practice')
        .replace(/\{\{clinic_phone\}\}/g, businessData?.phone || '')
        .replace(/\{\{clinic_address\}\}/g, businessData?.address || '')
        .replace(/\{\{dentist_name\}\}/g, dentistFullName || 'Your Dentist')
        .replace(/\{\{patient_name\}\}/g, patientName);

      if (appointmentDate) {
        result = result.replace(/\{\{appointment_date\}\}/g, appointmentDate);
      }
      if (appointmentTime) {
        result = result.replace(/\{\{appointment_time\}\}/g, appointmentTime);
      }
      return result;
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