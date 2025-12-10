import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        // Get auth user
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: { headers: { Authorization: req.headers.get('Authorization')! } },
            }
        )

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) {
            throw new Error('Unauthorized')
        }

        const { subscription_id, cancel_immediately } = await req.json()

        if (!subscription_id) {
            throw new Error('subscription_id is required')
        }

        // Verify user owns this subscription
        const { data: subscription, error: subError } = await supabaseClient
            .from('subscriptions')
            .select(`
        id,
        stripe_subscription_id,
        dentist_id,
        dentists!inner(profile_id)
      `)
            .eq('id', subscription_id)
            .single()

        if (subError || !subscription) {
            throw new Error('Subscription not found')
        }

        // Get user's profile ID
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (!profile || subscription.dentists.profile_id !== profile.id) {
            throw new Error('You can only cancel your own subscription')
        }

        // Initialize Stripe
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
        if (!stripeKey) {
            throw new Error('Stripe not configured')
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16',
        })

        let cancelResult

        if (subscription.stripe_subscription_id) {
            if (cancel_immediately) {
                // Cancel immediately
                cancelResult = await stripe.subscriptions.cancel(subscription.stripe_subscription_id)
            } else {
                // Cancel at period end (default - subscription continues until end of billing period)
                cancelResult = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
                    cancel_at_period_end: true,
                })
            }
        }

        // Update database
        const updateData = cancel_immediately
            ? { status: 'cancelled', cancel_at_period_end: false }
            : { cancel_at_period_end: true }

        await supabaseClient
            .from('subscriptions')
            .update(updateData)
            .eq('id', subscription_id)

        return new Response(
            JSON.stringify({
                success: true,
                cancel_at_period_end: !cancel_immediately,
                current_period_end: cancelResult?.current_period_end
                    ? new Date(cancelResult.current_period_end * 1000).toISOString()
                    : null,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Cancel subscription error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
