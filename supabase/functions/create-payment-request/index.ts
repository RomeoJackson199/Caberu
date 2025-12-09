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

    // Authorization check: Only dentists can create payment requests
    if (dentist_id) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { data: dentist, error: dentistError } = await supabaseClient
        .from('dentists')
        .select('id')
        .eq('id', dentist_id)
        .eq('profile_id', profile?.id)
        .single();

      if (dentistError || !dentist) {
        throw new Error('Unauthorized: Only the dentist can create payment requests');
      }
    }

    // If payment_request_id is provided, get existing payment request
    if (payment_request_id) {
      const { data: paymentRequest, error } = await supabaseClient
        .from('payment_requests')
        .select('*')
        .eq('id', payment_request_id)
        .single();

      if (error) throw new Error("Payment request not found");

      // Verify user owns this payment request (either as dentist or patient)
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const isDentist = await supabaseClient
        .from('dentists')
        .select('id')
        .eq('id', paymentRequest.dentist_id)
        .eq('profile_id', profile?.id)
        .single();

      const isPatient = paymentRequest.patient_id === profile?.id;

      if (!isDentist.data && !isPatient) {
        throw new Error('Unauthorized: You can only access your own payment requests');
      }

      // Determine amount either from record or from items
      let existingAmount = paymentRequest.amount;
      if ((!existingAmount || existingAmount <= 0) && items && Array.isArray(items)) {
        const computed = items.reduce((sum: number, it: any) => {
          const qty = Math.max(1, Number(it.quantity || 1));
          const unit = Math.max(0, Number(it.unit_price_cents || 0));
          const tax = Math.max(0, Number(it.tax_cents || 0));
          return sum + qty * unit + tax;
        }, 0);
        existingAmount = computed;
      }

      // Create new Stripe session for existing payment request
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: paymentRequest.description,
              },
              unit_amount: existingAmount,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.get("origin")}/payment-cancelled`,
        customer_email: paymentRequest.patient_email,
        metadata: {
          patient_id: paymentRequest.patient_id,
          dentist_id: paymentRequest.dentist_id,
          payment_request_id: payment_request_id,
          description: paymentRequest.description,
        },
      });

      // Update payment request with new session ID
      await supabaseClient
        .from('payment_requests')
        .update({ stripe_session_id: session.id })
        .eq('id', payment_request_id);

      return new Response(
        JSON.stringify({
          payment_url: session.url,
          session_id: session.id,
          message: "Payment link created successfully"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Validate required fields with detailed error messages
    const missingFields: string[] = [];
    if (!patient_id) missingFields.push('patient_id');
    if (!dentist_id) missingFields.push('dentist_id');
    if (!description) missingFields.push('description');
    if (!patient_email) missingFields.push('patient_email');

    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          missing: missingFields,
          received: { patient_id, dentist_id, description, patient_email }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If items provided, compute amount from items; otherwise use provided amount
    let totalAmount = 0;
    if (items && Array.isArray(items) && items.length > 0) {
      totalAmount = items.reduce((sum: number, it: any) => {
        const qty = Math.max(1, Number(it.quantity || 1));
        const unit = Math.max(0, Number(it.unit_price_cents || 0));
        const tax = Math.max(0, Number(it.tax_cents || 0));
        return sum + qty * unit + tax;
      }, 0);
    } else {
      totalAmount = Math.max(0, Number(amountFromBody || 0));
    }
    if (totalAmount <= 0) {
      throw new Error('Invalid amount');
    }

    // Compute terms/due date
    const dueInDays: number = Number(terms_due_in_days ?? 14);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueInDays);

    // Resolve actor profile for created_by
    const { data: actorProfile } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // Get business_id from the appointment or dentist
    let business_id = null;
    if (appointment_id) {
      const { data: appt } = await supabaseClient
        .from('appointments')
        .select('business_id')
        .eq('id', appointment_id)
        .single();
      business_id = appt?.business_id;
    }

    // If no appointment, get business from dentist's business memberships
    if (!business_id) {
      const { data: dentistProfile } = await supabaseClient
        .from('dentists')
        .select('profile_id')
        .eq('id', dentist_id)
        .single();

      if (dentistProfile) {
        const { data: membership } = await supabaseClient
          .from('business_members')
          .select('business_id')
          .eq('profile_id', dentistProfile.profile_id)
          .limit(1)
          .single();
        business_id = membership?.business_id;
      }
    }

    if (!business_id) {
      throw new Error('Unable to determine business context for payment request');
    }

    // Create base payment request in draft state
    const { data: insertedRequest, error: insertBaseError } = await supabaseClient
      .from("payment_requests")
      .insert({
        patient_id,
        dentist_id,
        business_id,
        amount: totalAmount,
        description,
        stripe_session_id: null,
        patient_email,
        status: "draft",
        due_date: dueDate.toISOString(),
        terms_due_in_days: dueInDays,
        reminder_cadence_days: reminder_cadence_days ?? [3, 7, 14],
        channels: channels ?? ["email"],
        appointment_id,
        created_by: actorProfile?.id || null,
      })
      .select('id')
      .single();

    if (insertBaseError) {
      throw insertBaseError;
    }

    const newPaymentRequestId = insertedRequest?.id;

    // Insert items if provided
    if (newPaymentRequestId && items && Array.isArray(items) && items.length > 0) {
      const itemsToInsert = items.map((it: any) => ({
        payment_request_id: newPaymentRequestId,
        code: it.code ?? null,
        description: it.description,
        quantity: Math.max(1, Number(it.quantity || 1)),
        unit_price_cents: Math.max(0, Number(it.unit_price_cents || 0)),
        tax_cents: Math.max(0, Number(it.tax_cents || 0)),
      }));
      const { error: itemsError } = await supabaseClient
        .from('payment_items')
        .insert(itemsToInsert);
      if (itemsError) {
        throw itemsError;
      }
    }

    // Check if business has Stripe Connect account for destination charges
    let stripeConnectAccountId = null;
    let platformFeeAmount = 0;

    const { data: businessData } = await supabaseClient
      .from('businesses')
      .select('stripe_account_id, stripe_charges_enabled, platform_fee_percentage')
      .eq('id', business_id)
      .single();

    if (businessData?.stripe_account_id && businessData?.stripe_charges_enabled) {
      stripeConnectAccountId = businessData.stripe_account_id;
      // Calculate platform fee (default 2.5%)
      const feePercentage = businessData.platform_fee_percentage || 2.5;
      platformFeeAmount = Math.round(totalAmount * (feePercentage / 100));
    }

    // Build Stripe checkout session options
    const sessionOptions: any = {
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: description,
            },
            unit_amount: totalAmount, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/payment-cancelled`,
      customer_email: patient_email,
      metadata: {
        patient_id,
        dentist_id,
        business_id,
        description,
        payment_request_id: newPaymentRequestId,
      },
    };

    // Add Stripe Connect destination charges if account is connected
    if (stripeConnectAccountId) {
      sessionOptions.payment_intent_data = {
        // Transfer to dentist's connected account
        transfer_data: {
          destination: stripeConnectAccountId,
        },
        // Platform fee goes to Caberu
        application_fee_amount: platformFeeAmount,
      };
      console.log(`Using Stripe Connect: ${stripeConnectAccountId}, platform fee: ${platformFeeAmount} cents`);
    } else {
      console.log('No Stripe Connect account - payment goes to platform');
    }

    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create(sessionOptions);

    // Attach session id to payment request
    await supabaseClient
      .from('payment_requests')
      .update({ stripe_session_id: session.id })
      .eq('id', newPaymentRequestId);

    // Transition: draft -> sent if sending now (email or copy link)
    const shouldSend = send_now === true || (Array.isArray(channels) && channels.includes('email'));
    if (shouldSend) {
      await supabaseClient
        .from('payment_requests')
        .update({ status: 'sent' })
        .eq('id', newPaymentRequestId);

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