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
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')

        if (!supabaseUrl || !anonKey || !stripeKey) {
            throw new Error('Server configuration error')
        }

        const supabaseClient = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: req.headers.get('Authorization')! } },
        })
        const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) {
            throw new Error('Unauthorized')
        }

        const { return_url } = await req.json()
        const returnUrl = return_url || `${origin}/settings`

        const customerEmail = user.email
        if (!customerEmail) throw new Error('User email not found')

        // Find the Stripe customer by email
        const customers = await stripe.customers.list({ email: customerEmail, limit: 1 })

        if (customers.data.length === 0) {
            throw new Error('No Stripe customer found for this account')
        }

        const customer = customers.data[0]

        // Create a Stripe Customer Portal session
        const session = await stripe.billingPortal.sessions.create({
            customer: customer.id,
            return_url: returnUrl,
        })

        return new Response(
            JSON.stringify({ url: session.url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('Create portal session error:', error)
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
