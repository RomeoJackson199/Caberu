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
        // Get the authorization header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Create Supabase client with service role for admin operations
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Create regular client to verify the user
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: authHeader },
                },
            }
        );

        // Get the authenticated user
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

        console.log('🗑️ Starting account deletion for user:', user.id, user.email);

        // First get the profile ID since many tables reference profile_id, not user_id
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

        const profileId = profile?.id;
        console.log('📋 Profile ID:', profileId);

        // Delete user data in order (respecting foreign key constraints)
        // Use try-catch for each to continue even if table doesn't exist

        // === Tables that reference profile_id (patient_id) ===
        if (profileId) {
            console.log('🧹 Cleaning up profile-related data...');

            // Notes
            try { await supabaseAdmin.from('notes').delete().eq('patient_id', profileId); }
            catch (e) { console.log('notes cleanup skipped:', (e as Error).message); }

            // Prescriptions
            try { await supabaseAdmin.from('prescriptions').delete().eq('patient_id', profileId); }
            catch (e) { console.log('prescriptions cleanup skipped:', (e as Error).message); }

            // Appointments
            try { await supabaseAdmin.from('appointments').delete().eq('patient_id', profileId); }
            catch (e) { console.log('appointments cleanup skipped:', (e as Error).message); }

            // Treatment plans
            try { await supabaseAdmin.from('treatment_plans').delete().eq('patient_id', profileId); }
            catch (e) { console.log('treatment_plans cleanup skipped:', (e as Error).message); }

            // Invoices  
            try { await supabaseAdmin.from('invoices').delete().eq('patient_id', profileId); }
            catch (e) { console.log('invoices cleanup skipped:', (e as Error).message); }

            // Payment requests
            try { await supabaseAdmin.from('payment_requests').delete().eq('patient_id', profileId); }
            catch (e) { console.log('payment_requests cleanup skipped:', (e as Error).message); }

            // Medical records
            try { await supabaseAdmin.from('medical_records').delete().eq('patient_id', profileId); }
            catch (e) { console.log('medical_records cleanup skipped:', (e as Error).message); }

            // Business members
            try { await supabaseAdmin.from('business_members').delete().eq('profile_id', profileId); }
            catch (e) { console.log('business_members cleanup skipped:', (e as Error).message); }

            // Session business
            try { await supabaseAdmin.from('session_business').delete().eq('profile_id', profileId); }
            catch (e) { console.log('session_business cleanup skipped:', (e as Error).message); }

            // Dentist record (if they were a dentist)
            try { await supabaseAdmin.from('dentists').delete().eq('profile_id', profileId); }
            catch (e) { console.log('dentists cleanup skipped:', (e as Error).message); }
        }

        // === Tables that reference user_id directly ===
        console.log('🧹 Cleaning up user-related data...');

        // Messages
        try { await supabaseAdmin.from('messages').delete().eq('user_id', user.id); }
        catch (e) { console.log('messages cleanup skipped:', (e as Error).message); }

        // User roles
        try { await supabaseAdmin.from('user_roles').delete().eq('user_id', user.id); }
        catch (e) { console.log('user_roles cleanup skipped:', (e as Error).message); }

        // Session business (also has user_id column)
        try { await supabaseAdmin.from('session_business').delete().eq('user_id', user.id); }
        catch (e) { console.log('session_business user cleanup skipped:', (e as Error).message); }

        // Verification codes (by email)
        try { await supabaseAdmin.from('verification_codes').delete().eq('email', user.email); }
        catch (e) { console.log('verification_codes cleanup skipped:', (e as Error).message); }

        // Invitation tokens (by email)
        try { await supabaseAdmin.from('invitation_tokens').delete().eq('email', user.email); }
        catch (e) { console.log('invitation_tokens cleanup skipped:', (e as Error).message); }

        // Staff members
        try { await supabaseAdmin.from('staff_members').delete().eq('user_id', user.id); }
        catch (e) { console.log('staff_members cleanup skipped:', (e as Error).message); }

        // === Finally delete the profile ===
        if (profileId) {
            console.log('🧹 Deleting profile...');
            try {
                await supabaseAdmin.from('profiles').delete().eq('id', profileId);
            } catch (e) {
                console.log('profile deletion skipped:', (e as Error).message);
            }
        }

        // === Delete the auth user ===
        console.log('🔐 Deleting auth user...');
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

        if (deleteError) {
            console.error('Error deleting user from auth:', deleteError);
            throw deleteError;
        }

        console.log('✅ Successfully deleted account for user:', user.id);

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Account and all associated data have been permanently deleted'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Error in delete-user-account:', error);
        return new Response(
            JSON.stringify({ error: (error as Error).message || 'Failed to delete account' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
