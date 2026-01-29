import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightSafe } from "../_shared/cors.ts";
import { checkRateLimitDB, getClientIP, rateLimitResponse } from "../_shared/rateLimit.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Rate limit: 20 patient invitations per hour per business
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 60 * 1000,  // 1 hour
  maxRequests: 20,
  keyPrefix: 'patient_invite'
};

serve(async (req) => {
    const origin = req.headers.get('Origin');
    const corsHeaders = getCorsHeaders(origin);

    const preflightResponse = handleCorsPreflightSafe(req);
    if (preflightResponse) return preflightResponse;

    try {
        const { recipientEmail, recipientName, inviterName, businessName, businessId } = await req.json();

        if (!recipientEmail) {
            return new Response(
                JSON.stringify({ error: "Missing recipientEmail" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create Supabase client for rate limiting
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Apply rate limiting per business
        const rateLimitKey = businessId || getClientIP(req);
        const rateLimitResult = await checkRateLimitDB(supabase, rateLimitKey, RATE_LIMIT_CONFIG);
        if (!rateLimitResult.allowed) {
          console.warn(`Rate limit exceeded for business ${rateLimitKey} on patient invitations`);
          return rateLimitResponse(rateLimitResult, corsHeaders);
        }

        // Create signup URL with business context
        const signupUrl = `${SUPABASE_URL.replace('.supabase.co', '.caberu.be')}/signup?invited=true&business=${businessId}`;
        const baseUrl = 'https://caberu.be';

        // Send email via Resend
        if (RESEND_API_KEY) {
            const emailResponse = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${RESEND_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    from: "Caberu <noreply@caberu.be>",
                    to: recipientEmail,
                    subject: `${inviterName} invited you to join ${businessName} on Caberu`,
                    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited!</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 16px 16px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited! 🎉</h1>
    </div>
    
    <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
        Hi${recipientName ? ` ${recipientName}` : ''},
      </p>
      
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        <strong>${inviterName}</strong> has invited you to join <strong>${businessName}</strong> as a patient on Caberu - our modern dental practice management platform.
      </p>
      
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        With Caberu, you can:
      </p>
      
      <ul style="font-size: 15px; color: #555; line-height: 1.8;">
        <li>📅 Book appointments online anytime</li>
        <li>💬 Message your dental team securely</li>
        <li>📋 View your treatment history and plans</li>
        <li>💳 Pay bills conveniently online</li>
      </ul>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${baseUrl}/signup" 
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
          Create Your Account
        </a>
      </div>
      
      <p style="font-size: 14px; color: #888; text-align: center; margin-top: 30px;">
        If you have any questions, simply reply to this email or contact ${businessName} directly.
      </p>
    </div>
    
    <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
      <p>© ${new Date().getFullYear()} Caberu. Making dental care easier.</p>
      <p>
        <a href="${baseUrl}/privacy" style="color: #667eea; text-decoration: none;">Privacy Policy</a> • 
        <a href="${baseUrl}/terms" style="color: #667eea; text-decoration: none;">Terms of Service</a>
      </p>
    </div>
  </div>
</body>
</html>
          `,
                }),
            });

            if (!emailResponse.ok) {
                const errorText = await emailResponse.text();
                console.error("Resend API error:", errorText);
            }
        } else {
            console.warn("RESEND_API_KEY not configured, email not sent");
        }

        return new Response(
            JSON.stringify({ success: true, message: "Invitation sent" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Error in send-patient-invitation:", error);
        const errorMessage = error instanceof Error ? error.message : "Internal server error";
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
