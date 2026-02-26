import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  
  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  try {
    const {
      planId,
      billingCycle,
      businessName,
      businessTagline,
      businessSlug,
      businessPrimaryColor,
      businessSecondaryColor,
    } = await req.json();

    if (!planId || !billingCycle) {
      throw new Error('Plan ID and billing cycle are required');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      throw new Error('Profile not found');
    }

    // Get business ID for metadata
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: membership } = await adminClient
      .from('business_members')
      .select('business_id')
      .eq('profile_id', profile.id)
      .limit(1)
      .maybeSingle();

    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (!plan) {
      throw new Error('Plan not found');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Find or create Stripe customer
    const existingCustomers = await stripe.customers.list({
      email: profile.email || user.email,
      limit: 1,
    });

    let customer;
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: profile.email || user.email,
        name: `${profile.first_name} ${profile.last_name}`,
        metadata: {
          profile_id: profile.id,
          user_id: user.id,
        },
      });
    }

    const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
    const interval = billingCycle === 'yearly' ? 'year' : 'month';

    // Create Stripe checkout session with native promotion code support
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      payment_method_types: ['card'],
      allow_promotion_codes: true, // Stripe-native promo codes
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${plan.name} Plan`,
              description: `${plan.name} subscription - ${plan.customer_limit} customers${plan.email_limit_monthly ? `, ${plan.email_limit_monthly} emails/month` : ''}`,
            },
            unit_amount: Math.round(price * 100),
            recurring: { interval },
          },
          quantity: 1,
        },
      ],
      success_url: businessName
        ? `${req.headers.get('origin')}/payment-success?type=business&session_id={CHECKOUT_SESSION_ID}`
        : `${req.headers.get('origin')}/payment-success?type=subscription&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/pricing?cancelled=true`,
      metadata: {
        profile_id: profile.id,
        user_id: user.id,
        plan_id: planId,
        plan_name: plan.name,
        billing_cycle: billingCycle,
        business_id: membership?.business_id || '',
        // Business creation data (present only for new-business checkouts)
        ...(businessName && {
          business_data: JSON.stringify({
            name: businessName,
            tagline: businessTagline || '',
            slug: businessSlug || '',
            primaryColor: businessPrimaryColor || '#0F3D91',
            secondaryColor: businessSecondaryColor || '#66D2D6',
          }),
        }),
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
