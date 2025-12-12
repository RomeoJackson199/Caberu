import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

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
            catch (e) { console.log('notes cleanup skipped:', e.message); }

            // Prescriptions
            try { await supabaseAdmin.from('prescriptions').delete().eq('patient_id', profileId); }
            catch (e) { console.log('prescriptions cleanup skipped:', e.message); }

            // Appointments
            try { await supabaseAdmin.from('appointments').delete().eq('patient_id', profileId); }
            catch (e) { console.log('appointments cleanup skipped:', e.message); }

            // Treatment plans
            try { await supabaseAdmin.from('treatment_plans').delete().eq('patient_id', profileId); }
            catch (e) { console.log('treatment_plans cleanup skipped:', e.message); }

            // Invoices  
            try { await supabaseAdmin.from('invoices').delete().eq('patient_id', profileId); }
            catch (e) { console.log('invoices cleanup skipped:', e.message); }

            // Payment requests
            try { await supabaseAdmin.from('payment_requests').delete().eq('patient_id', profileId); }
            catch (e) { console.log('payment_requests cleanup skipped:', e.message); }

            // Medical records
            try { await supabaseAdmin.from('medical_records').delete().eq('patient_id', profileId); }
            catch (e) { console.log('medical_records cleanup skipped:', e.message); }

            // Business members
            try { await supabaseAdmin.from('business_members').delete().eq('profile_id', profileId); }
            catch (e) { console.log('business_members cleanup skipped:', e.message); }

            // Session business
            try { await supabaseAdmin.from('session_business').delete().eq('profile_id', profileId); }
            catch (e) { console.log('session_business cleanup skipped:', e.message); }

            // Dentist record (if they were a dentist)
            try { await supabaseAdmin.from('dentists').delete().eq('profile_id', profileId); }
            catch (e) { console.log('dentists cleanup skipped:', e.message); }
        }

        // === Tables that reference user_id directly ===
        console.log('🧹 Cleaning up user-related data...');

        // Messages
        try { await supabaseAdmin.from('messages').delete().eq('user_id', user.id); }
        catch (e) { console.log('messages cleanup skipped:', e.message); }

        // User roles
        try { await supabaseAdmin.from('user_roles').delete().eq('user_id', user.id); }
        catch (e) { console.log('user_roles cleanup skipped:', e.message); }

        // Session business (also has user_id column)
        try { await supabaseAdmin.from('session_business').delete().eq('user_id', user.id); }
        catch (e) { console.log('session_business user cleanup skipped:', e.message); }

        // Verification codes (by email)
        try { await supabaseAdmin.from('verification_codes').delete().eq('email', user.email); }
        catch (e) { console.log('verification_codes cleanup skipped:', e.message); }

        // Invitation tokens (by email)
        try { await supabaseAdmin.from('invitation_tokens').delete().eq('email', user.email); }
        catch (e) { console.log('invitation_tokens cleanup skipped:', e.message); }

        // Staff members
        try { await supabaseAdmin.from('staff_members').delete().eq('user_id', user.id); }
        catch (e) { console.log('staff_members cleanup skipped:', e.message); }

        // === Finally delete the profile ===
        if (profileId) {
            console.log('🧹 Deleting profile...');
            try {
                await supabaseAdmin.from('profiles').delete().eq('id', profileId);
            } catch (e) {
                console.log('profile deletion skipped:', e.message);
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
            JSON.stringify({ error: error.message || 'Failed to delete account' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
