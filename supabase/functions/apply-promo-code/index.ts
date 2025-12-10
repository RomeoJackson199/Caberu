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

        const { promo_code, business_id } = await req.json()

        if (!promo_code || !business_id) {
            throw new Error('Promo code and business ID are required')
        }

        // 1. Validate Admin/Owner Access
        const { data: member } = await supabaseClient
            .from('business_members')
            .select('role')
            .eq('business_id', business_id)
            .eq('profile_id', (await supabaseClient.from('profiles').select('id').eq('user_id', user.id).single()).data?.id)
            .single()

        if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
            throw new Error('Only owners or admins can apply promo codes')
        }

        // 2. Find and Validate Promo Code
        const { data: codeData, error: codeError } = await supabaseClient
            .from('promo_codes')
            .select('*')
            .eq('code', promo_code.toUpperCase())
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

        // 3. Find Active Subscription
        // First find dentist for this business
        const { data: dentist } = await supabaseClient
            .from('dentists')
            .select('id')
            .eq('business_id', business_id)
            .single();

        if (!dentist) throw new Error('Dentist record not found for this business');

        const { data: subscription } = await supabaseClient
            .from('subscriptions')
            .select('*')
            .eq('dentist_id', dentist.id)
            .eq('status', 'active')
            .single()

        if (!subscription) {
            throw new Error('No active subscription found to apply promo code to')
        }

        // 4. Apply Benefit (Extend 1 Month)
        // We assume all promo codes currently afford a 1-month extension for simplicity
        // or we could check codeData.discount_type if we supported multiple types

        let newPeriodEnd = new Date(subscription.current_period_end)
        // If period end is in the past (shouldn't happen for active status but just in case), extend from now
        if (newPeriodEnd < new Date()) {
            newPeriodEnd = new Date();
        }

        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

        await supabaseClient
            .from('subscriptions')
            .update({
                current_period_end: newPeriodEnd.toISOString(),
                cancel_at_period_end: true // Ensure it doesn't auto-renew if it was a trial extension
            })
            .eq('id', subscription.id)

        // 5. Increment Usage
        await supabaseClient.rpc('increment_promo_usage', { promo_id: codeData.id })

        // 6. Log Usage (Ideally create a promo_code_usages table, but for now we rely on the counter)

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Promo code applied successfully. Subscription extended by 1 month.',
                new_period_end: newPeriodEnd.toISOString()
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
