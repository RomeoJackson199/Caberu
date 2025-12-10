import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            {
                global: {
                    headers: { Authorization: req.headers.get("Authorization")! },
                },
            }
        );

        // 1. Verify User
        const {
            data: { user },
            error: userError,
        } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            throw new Error("Unauthorized");
        }

        const { session_id, business_data, promo_code_id } = await req.json();

        if (!session_id && !promo_code_id) {
            throw new Error("Missing proof of payment (session_id or promo_code_id)");
        }

        // 2. Verify Payment with Stripe (if session_id provided)
        if (session_id) {
            const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
                apiVersion: "2023-10-16",
            });

            const session = await stripe.checkout.sessions.retrieve(session_id);

            if (session.payment_status !== "paid") {
                throw new Error("Payment not verified: " + session.payment_status);
            }

            // Optional: Check if this session was already used to prevent replay attacks
            // For now, we rely on the fact that creating the same business slug would fail or we could store used sessions.
        }

        // 3. Get User Profile
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!profile) throw new Error("Profile not found");

        // 4. Generate Slug
        const baseSlug = business_data.name
            ?.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') || 'business';

        // Ensure unique slug logic would go here, simplified for now:
        // Ideally use a loop or random suffix if collision.
        const slugSuffix = Math.random().toString(36).substring(2, 6);
        const finalSlug = `${baseSlug}-${slugSuffix}`;

        // 5. Create Business
        const { data: business, error: businessError } = await supabaseClient
            .from('businesses')
            .insert({
                name: business_data.name,
                slug: finalSlug,
                tagline: business_data.tagline,
                bio: business_data.bio,
                template_type: business_data.template || 'generic',
                owner_profile_id: profile.id,
            })
            .select()
            .single();

        if (businessError) throw businessError;

        // 6. Create Owner Member
        await supabaseClient
            .from('business_members')
            .insert({
                business_id: business.id,
                profile_id: profile.id,
                role: 'owner',
            });

        // 7. Assign Provider Role (RPC)
        await supabaseClient.rpc('assign_provider_role', { target_user_id: user.id });

        // 8. Create Services
        if (business_data.services && business_data.services.length > 0) {
            const servicesData = business_data.services.map((service: any) => ({
                business_id: business.id,
                name: service.name,
                description: service.description || null,
                price_cents: Math.round((service.price || 0) * 100),
                currency: 'EUR',
                duration_minutes: service.duration || 30,
                category: service.category || null,
                requires_upfront_payment: service.requires_upfront_payment || false,
                is_active: true,
            }));

            await supabaseClient.from('business_services').insert(servicesData);
        }

        // 9. Handle Promo Code (Increment Usage)
        if (promo_code_id) {
            await supabaseClient.rpc('increment_promo_usage', { promo_id: promo_code_id });
        }

        // 10. Mark Onboarding Complete
        await supabaseClient
            .from('profiles')
            .update({ onboarding_completed: true })
            .eq('id', profile.id);

        return new Response(
            JSON.stringify({ success: true, slug: finalSlug, business_id: business.id }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            }
        );
    }
});
