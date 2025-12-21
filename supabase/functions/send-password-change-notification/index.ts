import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PasswordChangeRequest {
  email: string;
  timestamp?: string;
  ipAddress?: string;
  userAgent?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, timestamp, ipAddress, userAgent }: PasswordChangeRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const changeTime = timestamp || new Date().toISOString();
    const formattedTime = new Date(changeTime).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    // Build HTML email content
    const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🔒 Password Changed</h1>
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                Your password was successfully changed.
              </p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;"><strong>When:</strong></p>
                <p style="margin: 0 0 20px 0; color: #333; font-size: 16px;">${formattedTime}</p>
                
                ${ipAddress ? `
                  <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;"><strong>IP Address:</strong></p>
                  <p style="margin: 0 0 20px 0; color: #333; font-size: 14px; font-family: monospace;">${ipAddress}</p>
                ` : ''}
                
                ${userAgent ? `
                  <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;"><strong>Device:</strong></p>
                  <p style="margin: 0; color: #333; font-size: 14px;">${userAgent.substring(0, 100)}${userAgent.length > 100 ? '...' : ''}</p>
                ` : ''}
              </div>
              
              <div style="margin-top: 30px; padding: 20px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
                <p style="margin: 0 0 10px 0; color: #856404; font-size: 16px; font-weight: bold;">
                  ⚠️ Didn't make this change?
                </p>
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  If you didn't change your password, your account may be compromised. Please contact our support team immediately at <a href="mailto:Romeo@caberu.be" style="color: #667eea; text-decoration: none;">Romeo@caberu.be</a>
                </p>
              </div>
              
              <div style="margin-top: 30px; padding: 20px; background: #e7f3ff; border-radius: 8px;">
                <p style="margin: 0 0 10px 0; color: #004085; font-size: 14px; font-weight: bold;">
                  🛡️ Security Tips:
                </p>
                <ul style="margin: 10px 0; padding-left: 20px; color: #004085; font-size: 14px;">
                  <li>Use a unique password for your Caberu account</li>
                  <li>Enable Two-Factor Authentication for extra security</li>
                  <li>Never share your password with anyone</li>
                  <li>Change your password regularly</li>
                </ul>
              </div>
            </div>
            
            <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
              <p style="margin: 0;">
                This is an automated security notification from Caberu.<br>
                You're receiving this because your password was changed.
              </p>
            </div>
          </div>
        `;

    // Send email via centralized send-email-notification function (uses SendGrid)
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        to: email,
        subject: '🔒 Password Changed - Security Alert',
        message: htmlContent,
        messageType: 'system',
        isSystemNotification: true,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Email send error:', errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    console.log('Password change notification sent successfully to:', email);

    // Log to security audit (if we have user context)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to find user by email and log the event
    const { data: userData } = await supabase.auth.admin.listUsers();
    const user = userData?.users?.find(u => u.email === email);

    if (user) {
      await supabase.from('security_audit_logs').insert({
        user_id: user.id,
        event_type: 'password_change',
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: { timestamp: changeTime }
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Password change notification sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-password-change-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
