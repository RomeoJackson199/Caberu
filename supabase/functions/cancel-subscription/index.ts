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

        const { business_id, cancel_immediately } = await req.json()

        if (!business_id) {
            throw new Error('business_id is required')
        }

        console.log('cancel-subscription for business:', business_id)

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
            throw new Error('Only owners or admins can cancel subscriptions')
        }

        // Get current business subscription info
        const { data: business } = await adminClient
            .from('businesses')
            .select('subscription_status, subscription_ends_at')
            .eq('id', business_id)
            .single()

        if (!business) {
            throw new Error('Business not found')
        }

        // Update business subscription status
        const updateData = cancel_immediately
            ? {
                subscription_status: 'cancelled',
                subscription_plan: 'free'
            }
            : {
                subscription_status: 'cancelling' // Will be cancelled at period end
            }

        const { error: updateError } = await adminClient
            .from('businesses')
            .update(updateData)
            .eq('id', business_id)

        if (updateError) {
            console.error('Update error:', updateError)
            throw new Error('Failed to cancel subscription')
        }

        return new Response(
            JSON.stringify({
                success: true,
                cancel_immediately,
                current_period_end: business.subscription_ends_at,
                message: cancel_immediately
                    ? 'Subscription cancelled immediately'
                    : `Subscription will end on ${business.subscription_ends_at ? new Date(business.subscription_ends_at).toLocaleDateString() : 'period end'}`,
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
