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

        const { business_id, refresh_url, return_url } = await req.json();

        if (!business_id) {
            throw new Error("business_id is required");
        }

        // Verify user is owner/admin of this business
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

        if (!membership || !['admin', 'owner'].includes(membership.role)) {
            throw new Error("Only business owners/admins can connect Stripe");
        }

        // Get business details
        const { data: business, error: businessError } = await supabaseClient
            .from('businesses')
            .select('id, name, stripe_account_id')
            .eq('id', business_id)
            .single();

        if (businessError || !business) {
            throw new Error("Business not found");
        }

        let stripeAccountId = business.stripe_account_id;

        // Create new Stripe Connect account if doesn't exist
        if (!stripeAccountId) {
            const account = await stripe.accounts.create({
                type: 'express', // Express accounts are easiest to set up
                country: 'BE', // Belgium - adjust as needed
                email: user.email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                business_type: 'individual',
                business_profile: {
                    name: business.name,
                    mcc: '8021', // Dentists/Orthodontists MCC code
                    url: `https://caberu.be/${business_id}`,
                },
                metadata: {
                    business_id: business_id,
                    caberu_user_id: user.id,
                },
            });

            stripeAccountId = account.id;

            // Save the account ID to the business
            await supabaseClient
                .from('businesses')
                .update({
                    stripe_account_id: stripeAccountId,
                    stripe_account_status: 'pending',
                })
                .eq('id', business_id);
        }

        // Generate onboarding link
        const origin = req.headers.get("origin") || "https://caberu.be";
        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: refresh_url || `${origin}/dentist/settings?tab=branding&stripe=refresh`,
            return_url: return_url || `${origin}/dentist/settings?tab=branding&stripe=complete`,
            type: 'account_onboarding',
        });

        return new Response(
            JSON.stringify({
                url: accountLink.url,
                account_id: stripeAccountId,
                message: "Stripe Connect onboarding link created",
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (error) {
        console.error("Error creating Stripe Connect account:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const errorStack = error instanceof Error ? error.stack : undefined;

        return new Response(
            JSON.stringify({
                error: errorMessage,
                details: errorStack,
                success: false,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            }
        );
    }
});
