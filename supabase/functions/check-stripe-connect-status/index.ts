import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Verify user authentication
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('Authorization header required');
        }

        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) {
            throw new Error('Invalid or expired token');
        }

        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeKey) {
            throw new Error("Stripe secret key not configured");
        }

        const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

        const { business_id } = await req.json();

        if (!business_id) {
            throw new Error("business_id is required");
        }

        // Verify user is member of this business
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!profile) {
            throw new Error("Profile not found");
        }

        const { data: membership } = await supabaseClient
            .from('business_members')
            .select('role')
            .eq('profile_id', profile.id)
            .eq('business_id', business_id)
            .single();

        if (!membership) {
            throw new Error("Not a member of this business");
        }

        // Get business with Stripe account
        const { data: business, error: businessError } = await supabaseClient
            .from('businesses')
            .select('id, stripe_account_id, stripe_account_status')
            .eq('id', business_id)
            .single();

        if (businessError || !business) {
            throw new Error("Business not found");
        }

        if (!business.stripe_account_id) {
            return new Response(
                JSON.stringify({
                    connected: false,
                    charges_enabled: false,
                    payouts_enabled: false,
                    onboarding_completed: false,
                    status: 'not_connected',
                    message: "Stripe Connect not set up yet",
                }),
                {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 200,
                }
            );
        }

        // Retrieve account from Stripe to get current status
        const account = await stripe.accounts.retrieve(business.stripe_account_id);

        // Determine status
        let status = 'pending';
        if (account.charges_enabled && account.payouts_enabled) {
            status = 'active';
        } else if (account.requirements?.currently_due?.length > 0) {
            status = 'restricted';
        }

        // Update database with latest status
        await supabaseClient
            .from('businesses')
            .update({
                stripe_account_status: status,
                stripe_charges_enabled: account.charges_enabled || false,
                stripe_payouts_enabled: account.payouts_enabled || false,
                stripe_onboarding_completed: account.details_submitted || false,
            })
            .eq('id', business_id);

        return new Response(
            JSON.stringify({
                connected: true,
                account_id: business.stripe_account_id,
                charges_enabled: account.charges_enabled || false,
                payouts_enabled: account.payouts_enabled || false,
                onboarding_completed: account.details_submitted || false,
                status: status,
                requirements: account.requirements?.currently_due || [],
                message: account.charges_enabled
                    ? "Stripe Connect is active - ready to receive payments"
                    : "Stripe Connect setup incomplete",
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (error) {
        console.error("Error checking Stripe Connect status:", error);
        return new Response(
            JSON.stringify({
                error: (error as Error).message,
                connected: false,
                success: false,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            }
        );
    }
});
