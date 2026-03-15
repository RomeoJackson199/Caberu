import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';
import { sendWhatsAppTemplate, WHATSAPP_TEMPLATES } from '../_shared/whatsapp.ts';

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  
  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) throw new Error('Authorization header required');

    // Standard client for auth checks
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Admin client (bypasses RLS) for lookup & writes
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error('Invalid or expired token');

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe secret key not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const {
      patient_id, dentist_id: requestedDentistId, amount: amountFromBody,
      description, patient_email, patient_name, payment_request_id,
      appointment_id, items, terms_due_in_days, reminder_cadence_days,
      channels, send_now
    } = await req.json();

    // 1. Get actor profile (bypass RLS)
    const { data: actorProfile, error: profileError } = await adminClient
      .from('profiles').select('id, role').eq('user_id', user.id).single();

    if (profileError || !actorProfile) {
      console.error('Profile error:', profileError);
      throw new Error('Unauthorized: Profile not found');
    }
    console.log('✅ Found actor profile:', actorProfile.id);

    // EARLY EXIT: If paying an existing request, patients don't need dentist validation
    if (payment_request_id) {
      console.log('Processing payment for existing request:', payment_request_id);
      
      // Use adminClient to bypass RLS for reading payment request
      const { data: pr, error: prError } = await adminClient.from('payment_requests')
        .select('*').eq('id', payment_request_id).single();
      
      if (prError || !pr) {
        console.error('Payment request error:', prError);
        throw new Error('Payment request not found');
      }

      // Create new Stripe session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: { currency: "eur", product_data: { name: pr.description }, unit_amount: pr.amount },
          quantity: 1
        }],
        mode: "payment",
        success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.get("origin")}/payment-cancelled`,
        customer_email: pr.patient_email,
        metadata: { patient_id: pr.patient_id, dentist_id: pr.dentist_id, payment_request_id, description: pr.description },
      });

      // Update DB (adminClient) - also reset status to pending so user can try again
      await adminClient.from('payment_requests').update({ stripe_session_id: session.id, status: 'pending' }).eq('id', payment_request_id);

      return new Response(JSON.stringify({
        payment_url: session.url, session_id: session.id, message: "Payment link created successfully"
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    // 2. Dentist Resolution (only needed for creating new payment requests)
    let dentist_id = requestedDentistId;
    let validDentist = null;
    let business_id: string | null = null;  // Track business_id for payment_requests

    // A. Check requested dentist
    if (requestedDentistId) {
      const { data: requestedDentist } = await adminClient
        .from('dentists').select('id, profile_id')
        .eq('id', requestedDentistId).maybeSingle();
      if (requestedDentist) {
        validDentist = requestedDentist;
        console.log('✅ Using requested dentist:', requestedDentist.id);
        
        // Get business_id via business_members
        const { data: membership } = await adminClient
          .from('business_members').select('business_id')
          .eq('profile_id', requestedDentist.profile_id).limit(1).maybeSingle();
        if (membership) {
          business_id = membership.business_id;
        }
      }
    }

    // B. Fallback: User's own dentist
    if (!validDentist) {
      const { data: ownDentist } = await adminClient
        .from('dentists').select('id, profile_id')
        .eq('profile_id', actorProfile.id).eq('is_active', true).limit(1).maybeSingle();
      if (ownDentist) {
        validDentist = ownDentist;
        dentist_id = ownDentist.id;
        console.log('✅ Found user dentist:', ownDentist.id);
        
        // Get business_id via business_members
        const { data: membership } = await adminClient
          .from('business_members').select('business_id')
          .eq('profile_id', ownDentist.profile_id).limit(1).maybeSingle();
        if (membership) {
          business_id = membership.business_id;
        }
      }
    }

    // C. Fallback: Business membership - check ALL memberships
    if (!validDentist) {
      console.log('⚠️ Looking up via business_members...');
      const { data: memberships } = await adminClient
        .from('business_members').select('business_id, role')
        .eq('profile_id', actorProfile.id);

      console.log('Found memberships:', memberships?.length || 0);

      if (memberships && memberships.length > 0) {
        // Get all profile_ids that are members of the user's businesses
        const businessIds = memberships.map(m => m.business_id);

        const { data: allBusinessMembers } = await adminClient
          .from('business_members').select('profile_id')
          .in('business_id', businessIds);

        if (allBusinessMembers && allBusinessMembers.length > 0) {
          const memberProfileIds = [...new Set(allBusinessMembers.map(m => m.profile_id))];
          console.log('Checking', memberProfileIds.length, 'profile_ids for active dentists');

          // Find an active dentist whose profile_id is in those business members
          const { data: businessDentist } = await adminClient
            .from('dentists').select('id, profile_id')
            .in('profile_id', memberProfileIds)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();

          if (businessDentist) {
            validDentist = businessDentist;
            dentist_id = businessDentist.id;
            // Get the business_id from the first membership (user's primary business)
            business_id = memberships[0].business_id;
            console.log('✅ Found dentist via business:', businessDentist.id, 'business:', business_id);
          }
        }
      }
    }

    if (!validDentist) {
      console.error(`No valid dentist. Req: ${requestedDentistId}, Actor: ${actorProfile.id}`);
      throw new Error(`Unauthorized: Could not find a valid dentist profile for your account. (Requested: ${requestedDentistId})`);
    }

    // 4. Create New Request
    if (!patient_id || !dentist_id || !description || !patient_email) throw new Error("Missing required fields");

    let totalAmount = 0;
    if (items?.length) {
      totalAmount = items.reduce((sum: number, it: any) =>
        sum + Math.max(1, Number(it.quantity || 1)) * Math.max(0, Number(it.unit_price_cents || 0)) + Math.max(0, Number(it.tax_cents || 0)), 0);
    } else {
      totalAmount = Math.max(0, Number(amountFromBody || 0));
    }
    if (totalAmount <= 0) throw new Error('Invalid amount');

    const dueInDays = Number(terms_due_in_days ?? 14);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueInDays);

    // INSERT via adminClient
    const { data: insertedRequest, error: insertErr } = await adminClient
      .from("payment_requests")
      .insert({
        patient_id, dentist_id, amount: totalAmount, description, stripe_session_id: null,
        patient_email, status: "draft", due_date: dueDate.toISOString(), terms_due_in_days: dueInDays,
        reminder_cadence_days: reminder_cadence_days ?? [3, 7, 14], channels: channels ?? ["email"],
        appointment_id, created_by: actorProfile?.id || null, business_id,
      }).select('id').single();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      throw insertErr;
    }
    const newPaymentRequestId = insertedRequest?.id;

    // Insert Items via adminClient
    if (newPaymentRequestId && items?.length) {
      await adminClient.from('payment_items').insert(items.map((it: any) => ({
        payment_request_id: newPaymentRequestId, code: it.code ?? null, description: it.description,
        quantity: Math.max(1, Number(it.quantity || 1)), unit_price_cents: Math.max(0, Number(it.unit_price_cents || 0)),
        tax_cents: Math.max(0, Number(it.tax_cents || 0)),
      })));
    }

    // Stripe Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: { currency: "eur", product_data: { name: description }, unit_amount: totalAmount },
        quantity: 1
      }],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/payment-cancelled`,
      customer_email: patient_email,
      metadata: { patient_id, dentist_id, description },
    });

    // Update session ID via adminClient
    await adminClient.from('payment_requests').update({ stripe_session_id: session.id }).eq('id', newPaymentRequestId);

    // 5. Send Notification
    const shouldSend = send_now === true || channels?.includes('email');
    if (shouldSend) {
      await adminClient.from('payment_requests').update({ status: 'sent' }).eq('id', newPaymentRequestId);

      if (!channels || channels.includes('email')) {
        try {
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email-notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
            body: JSON.stringify({
              to: patient_email, subject: `Payment request from your dentist`,
              message: `Thanks for your visit.\n\nAmount: €${(totalAmount / 100).toFixed(2)}\nDescription: ${description}\n\nPay here: ${session.url}`,
              messageType: 'payment_reminder', patientId: patient_id, dentistId: dentist_id, businessId: business_id,
            })
          });
          // Insert reminder via adminClient
          await adminClient.from('payment_reminders').insert({
            payment_request_id: newPaymentRequestId, template_key: 'friendly', channel: 'email',
            status: 'sent', sent_at: new Date().toISOString(), metadata: { totalAmount, description }
          });
          await adminClient.from('payment_requests').update({ last_reminder_at: new Date().toISOString() }).eq('id', newPaymentRequestId);
        } catch (e) { console.error('Failed to send email:', e); }

        // Send SMS alongside email if patient has a phone
        if (patient_id) {
          try {
            const { data: patientProfile } = await adminClient
              .from('profiles')
              .select('phone')
              .eq('id', patient_id)
              .single();

            if (patientProfile?.phone) {
              const smsBody = `Payment request: €${(totalAmount / 100).toFixed(2)} for ${description || 'your visit'}. Pay securely here: ${session.url}`;
              const smsResult = await sendSms({ to: patientProfile.phone, message: smsBody, messageType: 'payment_request' });
              if (smsResult.success) {
                console.log(`📱 Payment request SMS sent for ${newPaymentRequestId}`);
              }
            }
          } catch (smsErr) {
            console.warn(`📱 SMS failed for payment request:`, smsErr);
          }
        }
      }
      await adminClient.from('payment_requests').update({ status: 'pending' }).eq('id', newPaymentRequestId);
    }

    return new Response(JSON.stringify({
      payment_url: session.url, session_id: session.id, payment_request_id: newPaymentRequestId, message: "Payment request created successfully"
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });

  } catch (error) {
    const isDev = (Deno.env.get('ENVIRONMENT') || 'development') === 'development';
    if (isDev) console.error("Error:", error);
    return new Response(JSON.stringify({ error: isDev ? (error as Error).message : "Payment request failed", success: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});