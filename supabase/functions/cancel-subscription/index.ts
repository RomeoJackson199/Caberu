import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts'

serve(async (req) => {
    const origin = req.headers.get('Origin')
    const corsHeaders = getCorsHeaders(origin)
    
    const preflightResponse = handleCorsPreflightSafe(req)
    if (preflightResponse) return preflightResponse

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')

        if (!supabaseUrl || !anonKey || !serviceRoleKey || !stripeKey) {
            throw new Error('Server configuration error')
        }

        const supabaseClient = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: req.headers.get('Authorization')! } },
        })
        const adminClient = createClient(supabaseUrl, serviceRoleKey)
        const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) {
            throw new Error('Unauthorized')
        }

        const { business_id, cancel_immediately } = await req.json()

        if (!business_id) {
            throw new Error('business_id is required')
        }

        console.log('cancel-subscription for business:', business_id)

        // Verify user is owner/admin
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (!profile) throw new Error('Profile not found')

        const { data: member } = await supabaseClient
            .from('business_members')
            .select('role')
            .eq('business_id', business_id)
            .eq('profile_id', profile.id)
            .single()

        if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
            throw new Error('Only owners or admins can cancel subscriptions')
        }

        // Get the Stripe customer for this business owner
        const customerEmail = user.email
        if (!customerEmail) throw new Error('User email not found')

        const customers = await stripe.customers.list({ email: customerEmail, limit: 1 })
        
        if (customers.data.length === 0) {
            // No Stripe customer — just update DB directly (promo-only subscription)
            const updateData = cancel_immediately
                ? { subscription_status: 'cancelled', subscription_plan: null, pending_plan_change: null, pending_plan_change_date: null }
                : { subscription_status: 'cancelling', pending_plan_change: null, pending_plan_change_date: null }

            await adminClient.from('businesses').update(updateData).eq('id', business_id)

            return new Response(
                JSON.stringify({ success: true, cancel_immediately, message: 'Subscription cancelled' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const customer = customers.data[0]

        // Find active subscription for this customer
        const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active',
            limit: 1,
        })

        if (subscriptions.data.length === 0) {
            // No active Stripe subscription — just update DB
            await adminClient.from('businesses').update({
                subscription_status: 'cancelled',
                subscription_plan: null,
                pending_plan_change: null,
                pending_plan_change_date: null,
            }).eq('id', business_id)

            return new Response(
                JSON.stringify({ success: true, cancel_immediately: true, message: 'Subscription cancelled (no active Stripe subscription)' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const subscription = subscriptions.data[0]

        if (cancel_immediately) {
            // Cancel immediately via Stripe
            await stripe.subscriptions.cancel(subscription.id)
            
            await adminClient.from('businesses').update({
                subscription_status: 'cancelled',
                subscription_plan: null,
                pending_plan_change: null,
                pending_plan_change_date: null,
            }).eq('id', business_id)

            return new Response(
                JSON.stringify({ success: true, cancel_immediately: true, message: 'Subscription cancelled immediately' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        } else {
            // Cancel at period end via Stripe
            const updated = await stripe.subscriptions.update(subscription.id, {
                cancel_at_period_end: true,
            })

            const periodEnd = new Date(updated.current_period_end * 1000).toISOString()

            await adminClient.from('businesses').update({
                subscription_status: 'cancelling',
                subscription_ends_at: periodEnd,
                pending_plan_change: null,
                pending_plan_change_date: null,
            }).eq('id', business_id)

            return new Response(
                JSON.stringify({
                    success: true,
                    cancel_immediately: false,
                    current_period_end: periodEnd,
                    message: `Subscription will end on ${new Date(periodEnd).toLocaleDateString()}`,
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }
    } catch (error) {
        console.error('Cancel subscription error:', error)
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
