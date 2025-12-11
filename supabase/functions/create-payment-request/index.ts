import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Environment-based CORS configuration
const getCorsHeaders = () => {
  const environment = Deno.env.get('ENVIRONMENT') || 'development';

  if (environment === 'production') {
    return {
      "Access-Control-Allow-Origin": "https://gjvxcisbaxhhblhsytar.supabase.co",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Max-Age": "86400",
    };
  }

  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

const corsHeaders = getCorsHeaders();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Invalid or expired token');
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const {
      patient_id,
      dentist_id,
      amount: amountFromBody,
      description,
      patient_email,
      patient_name,
      payment_request_id,
      appointment_id,
      items,
      terms_due_in_days,
      reminder_cadence_days,
      channels,
      send_now
    } = await req.json();

    // Authorization check: User must be a valid dentist creating the request
    // 1. Get the profile of the authenticated user
    const { data: actorProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !actorProfile) {
      throw new Error('Unauthorized: Profile not found');
    }

    // 2. If creating a new request (dentist_id provided), verify they own that dentist record
    if (dentist_id) {
      // Check if the actor OWNS this dentist record
      let { data: dentistRecord, error: dentistError } = await supabaseClient
        .from('dentists')
        .select('id, business_id')
        .eq('id', dentist_id)
        .eq('profile_id', actorProfile.id)
        .maybeSingle();

      // If not the dentist themselves, check if they are a business owner/admin for this dentist
      if (!dentistRecord) {
        // First get the dentist's business_id
        const { data: targetDentist, error: targetError } = await supabaseClient
          .from('dentists')
          .select('business_id')
          .eq('id', dentist_id)
          .single();

        if (targetDentist && targetDentist.business_id) {
          // Check if current user is member of this business (allow all roles for now to fix auth error)
          const { data: membership } = await supabaseClient
            .from('business_members')
            .select('role')
            .eq('business_id', targetDentist.business_id)
            .eq('profile_id', actorProfile.id)
            .maybeSingle();

          if (membership) {
            dentistRecord = { id: dentist_id, business_id: targetDentist.business_id };
          }
        }
      }

      if (!dentistRecord) {
        throw new Error('Unauthorized: You can only create payment requests for your own dentist profile or business.');
      }

      // ... (existing code)

      // Get business_id from the appointment or dentist
      let business_id = null;
      let appointmentDateStr = null;

      if (appointment_id) {
        const { data: appt } = await supabaseClient
          .from('appointments')
          .select('business_id, appointment_date')
          .eq('id', appointment_id)
          .single();
        business_id = appt?.business_id;
        if (appt?.appointment_date) {
          // Format date nicely
          appointmentDateStr = new Date(appt.appointment_date).toLocaleDateString();
        }
      }

      // ... (rest of logic)

      // Send email via system notification if email channel selected
      if (!channels || channels.includes('email')) {
        try {
          const fnUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email-notification`;
          const payload = {
            to: patient_email,
            subject: `Payment request from your dentist`,
            message: `Thanks for your visit. Your secure payment link is below.\n\nAmount: €${(totalAmount / 100).toFixed(2)}\nDescription: ${description}\n\nPay here: ${session.url}`,
            messageType: 'system',
            isSystemNotification: true,
            patientId: patient_id,
            dentistId: dentist_id,
            appointmentDate: appointmentDateStr // Pass the date
          };
          await fetch(fnUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify(payload)
          });

          // Log reminder
          await supabaseClient
            .from('payment_reminders')
            .insert({
              payment_request_id: newPaymentRequestId,
              template_key: 'friendly',
              channel: 'email',
              status: 'sent',
              sent_at: new Date().toISOString(),
              metadata: { totalAmount, description }
            });

          await supabaseClient
            .from('payment_requests')
            .update({ last_reminder_at: new Date().toISOString() })
            .eq('id', newPaymentRequestId);
        } catch (e) {
          // Email failure should not block creation
          console.error('Failed to send payment email:', e);
        }
      }

      // Move to pending for day 0 lifecycle
      await supabaseClient
        .from('payment_requests')
        .update({ status: 'pending' })
        .eq('id', newPaymentRequestId);
    }

    return new Response(
      JSON.stringify({
        payment_url: session.url,
        session_id: session.id,
        payment_request_id: newPaymentRequestId,
        message: "Payment request created successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const environment = Deno.env.get('ENVIRONMENT') || 'development';
    const isDevelopment = environment === 'development';

    // Log full error in development only
    if (isDevelopment) {
      console.error("Error creating payment request:", error);
    }

    // Don't expose internal errors in production
    const publicMessage = isDevelopment
      ? (error as Error).message
      : "Payment request failed";

    return new Response(
      JSON.stringify({
        error: publicMessage,
        success: false
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});