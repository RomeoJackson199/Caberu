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
    const { sessionId } = await req.json();

    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get current user
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Get checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session || session.payment_status !== 'paid') {
      throw new Error('Payment not completed');
    }

    const metadata = session.metadata;
    if (!metadata || metadata.user_id !== user.id) {
      throw new Error('Session does not belong to current user');
    }

    // Parse business data from metadata
    const businessData = metadata.business_data ? JSON.parse(metadata.business_data) : null;
    
    if (!businessData) {
      throw new Error('Business data not found in session');
    }

    // Generate unique slug
    let uniqueSlug = businessData.slug;
    let slugCounter = 1;
    
    while (true) {
      const { data: existingBusiness } = await supabase
        .from('businesses')
        .select('id')
        .eq('slug', uniqueSlug)
        .maybeSingle();
      
      if (!existingBusiness) break;
      
      uniqueSlug = `${businessData.slug}-${slugCounter}`;
      slugCounter++;
    }

    // Create business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .insert({
        name: businessData.name,
        slug: uniqueSlug,
        owner_profile_id: metadata.profile_id,
        tagline: businessData.tagline || 'Your Practice, Your Way',
        primary_color: businessData.primaryColor || '#0F3D91',
        secondary_color: businessData.secondaryColor || '#66D2D6',
        currency: 'USD',
        template_type: businessData.template || 'healthcare', // Always set to healthcare
      })
      .select()
      .single();

    if (businessError) {
      console.error('Business creation error:', businessError);
      throw new Error('Failed to create business');
    }

    // Add owner as business member
    await supabase
      .from('business_members')
      .insert({
        profile_id: metadata.profile_id,
        business_id: business.id,
        role: 'owner',
      });

    // Assign admin and provider roles to business owner (ignore duplicates)
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert([
        {
          user_id: user.id,
          role: 'admin',
        },
        {
          user_id: user.id,
          role: 'provider',
        }
      ]);
    
    // Ignore duplicate key errors
    if (roleError && !roleError.message.includes('duplicate') && !roleError.message.includes('unique')) {
      console.error('Role assignment error:', roleError);
    }

    // Get subscription details from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription as string);

    // Create subscription record
    await supabase
      .from('subscriptions')
      .insert({
        business_id: business.id,
        plan_id: metadata.plan_id,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        status: stripeSubscription.status,
        billing_cycle: metadata.billing_cycle,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      });

    // Initialize usage tracking
    const currentMonth = new Date().toISOString().slice(0, 7);
    await supabase
      .from('business_usage')
      .insert({
        business_id: business.id,
        month_year: currentMonth,
        customer_count: 0,
        email_count: 0,
      });

    // Set as current business
    await supabase
      .from('session_business')
      .insert({
        user_id: user.id,
        business_id: business.id,
      })
      .select();

    return new Response(
      JSON.stringify({ 
        success: true,
        businessId: business.id,
        businessSlug: business.slug,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error completing business subscription:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
