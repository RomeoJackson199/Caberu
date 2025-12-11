import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!supabaseUrl || !anonKey || !serviceRoleKey) {
            throw new Error('Server configuration error: missing Supabase keys')
        }

        const supabaseClient = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: req.headers.get('Authorization')! } },
        })

        const adminClient = createClient(supabaseUrl, serviceRoleKey)

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) {
            throw new Error('Unauthorized')
        }

        const { promo_code, business_id } = await req.json()
        const normalizedCode = promo_code?.toString().trim().toUpperCase()

        if (!normalizedCode || !business_id) {
            throw new Error('Promo code and business ID are required')
        }

        console.log('apply-promo-code v5 starting for business:', business_id)

        // 0. Get Profile ID
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (profileError || !profile) {
            console.error('Profile fetch error:', profileError)
            throw new Error('User profile not found. Please contact support.')
        }

        const profileId = profile.id
        console.log('Found profile:', profileId)

        // 1. Validate Admin/Owner Access
        const { data: member, error: memberError } = await supabaseClient
            .from('business_members')
            .select('role, profile_id')
            .eq('business_id', business_id)
            .eq('profile_id', profileId)
            .maybeSingle()

        if (memberError) {
            console.error('Member fetch error:', memberError)
            throw new Error('Error checking business membership')
        }

        if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
            console.error('Access denied. Role:', member?.role)
            throw new Error('Only owners or admins can apply promo codes')
        }

        // 2. Find and Validate Promo Code
        const { data: codeData, error: codeError } = await supabaseClient
            .from('promo_codes')
            .select('*')
            .eq('code', normalizedCode)
            .eq('is_active', true)
            .single()

        if (codeError || !codeData) {
            throw new Error('Invalid or expired promo code')
        }

        if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
            throw new Error('Promo code has expired')
        }

        if (codeData.max_uses && codeData.uses_count >= codeData.max_uses) {
            throw new Error('Promo code usage limit reached')
        }

        // 3. Find dentist and latest subscription using service role to avoid RLS gaps
        let { data: dentist, error: dentistError } = await adminClient
            .from('dentists')
            .select('id')
            .eq('business_id', business_id)
            .eq('profile_id', profileId)
            .maybeSingle()

        if (dentistError) {
            console.error('Dentist fetch error:', dentistError)
            throw new Error('Failed to locate dentist record')
        }

        if (!dentist) {
            console.log('Dentist record not found, creating for profile:', profileId)
            const { data: newDentist, error: createDentistError } = await adminClient
                .from('dentists')
                .insert({
                    profile_id: profileId,
                    business_id: business_id,
                    is_active: true,
                })
                .select('id')
                .single()

            if (createDentistError) {
                console.error('Create dentist error:', createDentistError)
                throw new Error('Failed to create dentist record: ' + createDentistError.message)
            }
            dentist = newDentist
        }

        const { data: subscription, error: subscriptionError } = await adminClient
            .from('subscriptions')
            .select('*')
            .eq('dentist_id', dentist.id)
            .order('current_period_end', { ascending: false })
            .maybeSingle()

        if (subscriptionError) {
            console.error('Subscription fetch error:', subscriptionError)
            throw new Error('Failed to fetch subscription for promo application')
        }

        let subscription_id = subscription?.id
        let newPeriodEnd: Date

        // 4. Apply Benefit (Extend 1 Month)
        newPeriodEnd = subscription?.current_period_end
            ? new Date(subscription.current_period_end)
            : new Date()

        if (newPeriodEnd < new Date()) {
            newPeriodEnd = new Date()
        }
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1)

        if (subscription) {
            const { error: updateError } = await adminClient
                .from('subscriptions')
                .update({
                    current_period_end: newPeriodEnd.toISOString(),
                    cancel_at_period_end: false,
                    status: 'active',
                    billing_cycle: subscription.billing_cycle || 'monthly',
                    plan_id: subscription.plan_id,
                })
                .eq('id', subscription.id)

            if (updateError) {
                console.error('Subscription update error:', updateError)
                throw new Error('Failed to extend subscription with promo code')
            }
        } else {
            // Create NEW subscription using adminClient
            const { data: plan } = await adminClient
                .from('subscription_plans')
                .select('id')
                .eq('name', 'Free Trial')
                .maybeSingle()

            const fallbackPlan = await adminClient
                .from('subscription_plans')
                .select('id')
                .limit(1)
                .single()

            const planId = plan?.id || fallbackPlan.data?.id

            const { data: newSub, error: createError } = await adminClient
                .from('subscriptions')
                .insert({
                    dentist_id: dentist.id,
                    plan_id: planId,
                    status: 'active',
                    current_period_end: newPeriodEnd.toISOString(),
                    cancel_at_period_end: false,
                    billing_cycle: 'monthly',
                })
                .select('id')
                .single()

            if (createError) {
                console.error('Subscription create error:', createError)
                throw new Error('Failed to create subscription for promo code')
            }
            subscription_id = newSub.id
        }

        // 5. Increment Usage using adminClient (in case RPC has security definer or similar needs)
        const { error: usageError } = await adminClient.rpc('increment_promo_usage', { promo_id: codeData.id })
        if (usageError) {
            console.error('Promo usage increment error:', usageError)
            throw new Error('Failed to record promo code usage')
        }

        // 6. Update businesses table with subscription info
        const { error: businessUpdateError } = await adminClient
            .from('businesses')
            .update({
                subscription_status: 'active',
                subscription_plan: 'promo',
                subscription_ends_at: newPeriodEnd.toISOString(),
                subscription_started_at: new Date().toISOString(),
                promo_code_used: normalizedCode,
            })
            .eq('id', business_id)

        if (businessUpdateError) {
            console.error('Business update error:', businessUpdateError)
            // Don't throw - subscription was created, just log the error
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Promo code applied successfully. Subscription extended by 1 month.',
                subscription_id,
                new_period_end: newPeriodEnd.toISOString(),
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('Apply promo code error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
