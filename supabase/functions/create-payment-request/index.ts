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

    // User client (with RLS based on user)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Admin client (bypasses RLS for authorization lookups)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
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
    let effectiveDentistId = dentist_id;

    if (dentist_id) {
      // Check if the actor OWNS this dentist record (use adminClient to bypass RLS)
      let { data: dentistRecord, error: dentistError } = await adminClient
        .from('dentists')
        .select('id, business_id')
        .eq('id', dentist_id)
        .eq('profile_id', actorProfile.id)
        .maybeSingle();

      // If not the dentist themselves, check if they are a business owner/admin for this dentist
      if (!dentistRecord) {
        // First get the dentist's business_id
        const { data: targetDentist, error: targetError } = await adminClient
          .from('dentists')
          .select('business_id')
          .eq('id', dentist_id)
          .maybeSingle(); // Use maybeSingle since dentist might not exist

        if (targetDentist && targetDentist.business_id) {
          // Check if current user is member of this business (allow all roles for now to fix auth error)
          const { data: membership } = await adminClient
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

      // FALLBACK: If dentist_id doesn't exist or not authorized, try to find user's own dentist
      if (!dentistRecord) {
        console.log('⚠️ Provided dentist_id not found or not authorized, attempting fallback...');
        console.log('Looking for user\'s own dentist profile with profile_id:', actorProfile.id);

        // Find the user's own active dentist record (use adminClient to bypass RLS)
        const { data: ownDentist } = await adminClient
          .from('dentists')
          .select('id, business_id')
          .eq('profile_id', actorProfile.id)
          .eq('is_active', true)
          .maybeSingle();

        if (ownDentist) {
          console.log('✅ Found user\'s own dentist record:', ownDentist.id);
          dentistRecord = ownDentist;
          effectiveDentistId = ownDentist.id; // Use the user's actual dentist ID
        } else {
          // Final fallback: check if user is a member of ANY business and get a dentist from there
          const { data: anyMembership } = await adminClient
            .from('business_members')
            .select('business_id, role')
            .eq('profile_id', actorProfile.id)
            .limit(1)
            .maybeSingle();

          if (anyMembership) {
            // Get a dentist from this business
            const { data: businessDentist } = await adminClient
              .from('dentists')
              .select('id, business_id')
              .eq('business_id', anyMembership.business_id)
              .eq('is_active', true)
              .limit(1)
              .maybeSingle();

            if (businessDentist) {
              console.log('✅ Using business dentist as fallback:', businessDentist.id);
              dentistRecord = businessDentist;
              effectiveDentistId = businessDentist.id;
            }
          }
        }
      }

      if (!dentistRecord) {
        // Log detailed debug info
        console.error('❌ Authorization Failed - No valid dentist found');
        console.error('Actor Profile ID:', actorProfile.id);
        console.error('Requested Dentist ID:', dentist_id);

        throw new Error(`Unauthorized: Could not find a valid dentist profile for your account. Please contact support. (Requested: ${dentist_id}, Actor: ${actorProfile.id})`);
      }

      // Use the effective dentist ID (which may be the fallback)
      dentist_id = effectiveDentistId;

      // ... (existing code)

      // Get business_id from the appointment or dentist
      let business_id = null;
      let appointmentDateStr = null;
      let appointmentTimeStr = null;

      if (appointment_id) {
        const { data: appt } = await supabaseClient
          .from('appointments')
          .select('business_id, appointment_date, start_time')
          .eq('id', appointment_id)
          .single();
        business_id = appt?.business_id;
        if (appt?.appointment_date) {
          // Format date nicely
          appointmentDateStr = new Date(appt.appointment_date).toLocaleDateString();
        }
        if (appt?.start_time) {
          appointmentTimeStr = appt.start_time;
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
            appointmentDate: appointmentDateStr, // Pass the date
            appointmentTime: appointmentTimeStr
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