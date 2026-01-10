import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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

        const { promo_code, business_id, plan_name } = await req.json()
        const normalizedCode = promo_code?.toString().trim().toUpperCase()
        const planNameToUse = plan_name || 'Promo'

        if (!normalizedCode || !business_id) {
            throw new Error('Promo code and business ID are required')
        }

        console.log('apply-promo-code v8 starting for business:', business_id, 'plan:', planNameToUse, 'code:', normalizedCode)

        // 1. Get Profile ID
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (profileError || !profile) {
            console.error('Profile fetch error:', profileError)
            throw new Error('User profile not found')
        }

        const profileId = profile.id
        console.log('v7 Found profile:', profileId)

        // 2. Validate Admin/Owner Access
        const { data: member, error: memberError } = await supabaseClient
            .from('business_members')
            .select('role')
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

        console.log('v7 Member validated:', member.role)

        // 3. Find and Validate Promo Code
        const { data: codeData, error: codeError } = await supabaseClient
            .from('promo_codes')
            .select('*')
            .eq('code', normalizedCode)
            .eq('is_active', true)
            .single()

        if (codeError || !codeData) {
            console.error('Promo code error:', codeError)
            throw new Error('Invalid or expired promo code')
        }

        if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
            throw new Error('Promo code has expired')
        }

        if (codeData.max_uses && codeData.uses_count >= codeData.max_uses) {
            throw new Error('Promo code usage limit reached')
        }

        console.log('v7 Promo code validated:', codeData.code)

        // 4. Calculate new subscription end date
        // Start from current subscription end date if exists, otherwise from now
        const { data: business } = await adminClient
            .from('businesses')
            .select('subscription_ends_at')
            .eq('id', business_id)
            .single()

        let newPeriodEnd = new Date()
        if (business?.subscription_ends_at) {
            const existingEnd = new Date(business.subscription_ends_at)
            if (existingEnd > newPeriodEnd) {
                newPeriodEnd = existingEnd
            }
        }
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1)

        console.log('v7 New subscription end date:', newPeriodEnd.toISOString())

        // 5. Increment promo code usage
        const { error: usageError } = await adminClient.rpc('increment_promo_usage', { promo_id: codeData.id })
        if (usageError) {
            console.error('Promo usage increment error:', usageError)
            throw new Error('Failed to record promo code usage')
        }

        console.log('v8 Promo usage incremented')

        // 6. Update businesses table with subscription info (the main update!)
        const updateData = {
            subscription_status: 'active',
            subscription_plan: planNameToUse,
            subscription_ends_at: newPeriodEnd.toISOString(),
            subscription_started_at: new Date().toISOString(),
            promo_code_used: normalizedCode,
        }

        console.log('v8 Updating business table with:', updateData)

        const { error: businessUpdateError } = await adminClient
            .from('businesses')
            .update(updateData)
            .eq('id', business_id)

        if (businessUpdateError) {
            console.error('v7 Business update error:', businessUpdateError)
            throw new Error('Failed to update subscription: ' + businessUpdateError.message)
        }

        console.log('v7 Business update SUCCESS for:', business_id)

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Promo code applied successfully! Subscription active for 1 month.',
                new_period_end: newPeriodEnd.toISOString(),
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('Apply promo code error:', error)
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
