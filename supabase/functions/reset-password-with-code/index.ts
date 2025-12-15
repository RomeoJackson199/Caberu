import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetRequest {
    email: string;
    code: string;
    newPassword: string;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { email, code, newPassword }: ResetRequest = await req.json();

        if (!email || !code || !newPassword) {
            return new Response(
                JSON.stringify({ error: 'Email, code, and new password are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Verify the code
        const { data: validCodes, error: verifyError } = await supabase
            .from('verification_codes')
            .select('id')
            .eq('email', email)
            .eq('code', code)
            .eq('type', 'recovery')
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .limit(1);

        if (verifyError) throw verifyError;

        if (!validCodes || validCodes.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Invalid or expired verification code' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 2. Mark code as used
        const { error: updateError } = await supabase
            .from('verification_codes')
            .update({ used: true })
            .eq('id', validCodes[0].id);

        if (updateError) throw updateError;

        // 3. Find user by email using auth admin API
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

        if (listError) throw listError;

        const authUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

        if (!authUser) {
            // Fallback: try to find via profiles table
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('user_id')
                .eq('email', email)
                .single();

            if (profileError || !profile || !profile.user_id) {
                return new Response(
                    JSON.stringify({ error: 'No account found with this email address' }),
                    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            // 4. Update password using profile's user_id
            const { error: authError } = await supabase.auth.admin.updateUserById(
                profile.user_id,
                { password: newPassword }
            );

            if (authError) throw authError;
        } else {
            // 4. Update password using auth user's ID
            const { error: authError } = await supabase.auth.admin.updateUserById(
                authUser.id,
                { password: newPassword }
            );

            if (authError) throw authError;
        }

        return new Response(
            JSON.stringify({ success: true, message: 'Password updated successfully' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error in reset-password-with-code:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
