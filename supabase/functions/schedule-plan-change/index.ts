import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { getCorsHeaders, handleCorsPreflightSafe } from "../_shared/cors.ts"

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
            throw new Error('Server configuration error')
        }

        const supabaseClient = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: req.headers.get('Authorization')! } },
        })
        const adminClient = createClient(supabaseUrl, serviceRoleKey)

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) {
            throw new Error('Unauthorized')
        }

        const { business_id, new_plan_name } = await req.json()

        if (!business_id || !new_plan_name) {
            throw new Error('business_id and new_plan_name are required')
        }

        console.log('schedule-plan-change v1 for business:', business_id, 'new plan:', new_plan_name)

        // Verify user is owner/admin of this business
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (!profile) {
            throw new Error('Profile not found')
        }

        const { data: member } = await supabaseClient
            .from('business_members')
            .select('role')
            .eq('business_id', business_id)
            .eq('profile_id', profile.id)
            .single()

        if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
            throw new Error('Only owners or admins can change subscription plans')
        }

        // Get current business subscription info
        const { data: business } = await adminClient
            .from('businesses')
            .select('subscription_status, subscription_plan, subscription_ends_at')
            .eq('id', business_id)
            .single()

        if (!business) {
            throw new Error('Business not found')
        }

        // If no active subscription, can't schedule a change
        if (!business.subscription_status || business.subscription_status === 'cancelled') {
            throw new Error('No active subscription to change. Please subscribe first.')
        }

        // Schedule the plan change for the end of the current period
        const changeDate = business.subscription_ends_at || new Date().toISOString()

        const { error: updateError } = await adminClient
            .from('businesses')
            .update({
                pending_plan_change: new_plan_name,
                pending_plan_change_date: changeDate,
            })
            .eq('id', business_id)

        if (updateError) {
            console.error('Update error:', updateError)
            throw new Error('Failed to schedule plan change')
        }

        const formattedDate = new Date(changeDate).toLocaleDateString()

        return new Response(
            JSON.stringify({
                success: true,
                message: `Your plan will change to ${new_plan_name} on ${formattedDate}.`,
                pending_plan: new_plan_name,
                change_date: changeDate,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Schedule plan change error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
