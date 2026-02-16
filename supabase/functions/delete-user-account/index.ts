import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';
import { checkRateLimitDB, getClientIP, rateLimitResponse } from "../_shared/rateLimit.ts";

// Rate limit: 3 account deletions per hour (critical, destructive operation)
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 60 * 1000,  // 1 hour
  maxRequests: 3,
  keyPrefix: 'delete_account'
};

serve(async (req) => {
    const origin = req.headers.get('Origin');
    const corsHeaders = getCorsHeaders(origin);
    
    const preflightResponse = handleCorsPreflightSafe(req);
    if (preflightResponse) return preflightResponse;

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: authHeader },
                },
            }
        );

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Apply rate limiting per user
        const rateLimitResult = await checkRateLimitDB(supabaseAdmin, user.id, RATE_LIMIT_CONFIG);
        if (!rateLimitResult.allowed) {
          console.warn(`Rate limit exceeded for user ${user.id} on account deletion`);
          return rateLimitResponse(rateLimitResult, corsHeaders);
        }

        console.log('🗑️ Starting safe account deletion for user:', user.id, user.email);

        // Get profile
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

        const profileId = profile?.id;
        console.log('📋 Profile ID:', profileId);

        if (profileId) {
            // Check if user is a dentist/provider
            const { data: dentistRecord } = await supabaseAdmin
                .from('dentists')
                .select('id')
                .eq('profile_id', profileId)
                .maybeSingle();

            if (dentistRecord) {
                // Provider path: deactivate from all businesses
                console.log('👨‍⚕️ Provider detected, deactivating from all businesses...');
                
                const { data: memberships } = await supabaseAdmin
                    .from('business_members')
                    .select('business_id')
                    .eq('profile_id', profileId);

                if (memberships) {
                    for (const membership of memberships) {
                        await supabaseAdmin.rpc('safe_deactivate_dentist', {
                            p_dentist_id: dentistRecord.id,
                            p_business_id: membership.business_id,
                        });
                    }
                }
            }

            // Anonymize patient data (works for both patients and providers)
            console.log('🔒 Anonymizing patient data...');
            await supabaseAdmin.rpc('safe_anonymize_patient', {
                p_profile_id: profileId,
                p_actor_id: user.id,
                p_reason: 'account_deletion_request',
            });
        }

        // Ban the auth user instead of deleting
        console.log('🔐 Banning auth user...');
        const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            ban_duration: '876000h', // ~100 years
        });

        if (banError) {
            console.error('Error banning user:', banError);
            throw banError;
        }

        console.log('✅ Successfully processed account deletion for user:', user.id);

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Your account has been deactivated and your personal data anonymized. Historical records are preserved for legal compliance.'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Error in delete-user-account:', error);
        return new Response(
            JSON.stringify({ error: (error as Error).message || 'Failed to process account deletion' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
