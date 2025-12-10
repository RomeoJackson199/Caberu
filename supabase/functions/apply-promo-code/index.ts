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

        console.log('apply-promo-code v4 starting for business:', business_id);

        // 0. Get Profile ID
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (profileError || !profile) {
            console.error('Profile fetch error:', profileError);
            throw new Error('User profile not found. Please contact support.');
        }

        const profileId = profile.id;
        console.log('Found profile:', profileId);

        // 1. Validate Admin/Owner Access
        const { data: member, error: memberError } = await supabaseClient
            .from('business_members')
            .select('role, profile_id')
            .eq('business_id', business_id)
            .eq('profile_id', profileId)
            .maybeSingle()

        if (memberError) {
            console.error('Member fetch error:', memberError);
            throw new Error('Error checking business membership');
        }

        if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
            console.error('Access denied. Role:', member?.role);
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
        // First find dentist for this business AND this user
        // We ensure we have profile_id from earlier
        if (!profileId) throw new Error('Could not determine profile ID for current user');

        let { data: dentist } = await supabaseClient
            .from('dentists')
            .select('id')
            .eq('business_id', business_id)
            .eq('profile_id', profileId)
            .maybeSingle();

        if (!dentist) {
            // Create dentist record if missing (e.g. owner who wasn't auto-created as dentist)
            console.log('Dentist record not found, creating for profile:', profileId);
            const { data: newDentist, error: createDentistError } = await supabaseClient
                .from('dentists')
                .insert({
                    profile_id: profileId,
                    business_id: business_id,
                    is_active: true
                })
                .select('id')
                .single();

            if (createDentistError) {
                throw new Error('Failed to create dentist record: ' + createDentistError.message);
            }
            dentist = newDentist;
        }

        const { data: subscription } = await supabaseClient
            .from('subscriptions')
            .select('*')
            .eq('dentist_id', dentist.id)
            .eq('status', 'active')
            .single()

        let subscription_id = subscription?.id;
        let newPeriodEnd;

        // 4. Apply Benefit (Extend 1 Month)
        // We assume all promo codes currently afford a 1-month extension for simplicity

        if (subscription) {
            newPeriodEnd = new Date(subscription.current_period_end)
            if (newPeriodEnd < new Date()) {
                newPeriodEnd = new Date();
            }
            newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

            await supabaseClient
                .from('subscriptions')
                .update({
                    current_period_end: newPeriodEnd.toISOString(),
                    cancel_at_period_end: true,
                    status: 'active' // Reactivate if it was cancelled/expired
                })
                .eq('id', subscription.id)
        } else {
            // Create NEW subscription
            newPeriodEnd = new Date();
            newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

            // Get "Free Trial" or default plan ID
            const { data: plan } = await supabaseClient
                .from('subscription_plans')
                .select('id')
                .eq('name', 'Free Trial')
                .maybeSingle();

            const planId = plan?.id || (await supabaseClient.from('subscription_plans').select('id').limit(1).single()).data?.id;

            const { data: newSub, error: createError } = await supabaseClient
                .from('subscriptions')
                .insert({
                    dentist_id: dentist.id,
                    plan_id: planId,
                    status: 'active',
                    current_period_end: newPeriodEnd.toISOString(),
                    cancel_at_period_end: true
                })
                .select('id')
                .single();

            if (createError) throw createError;
            subscription_id = newSub.id;
        }

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
