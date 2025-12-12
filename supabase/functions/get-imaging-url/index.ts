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
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Supabase credentials not configured');
        }

        // Get auth token
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Authorization required' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Create authenticated client
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            global: { headers: { Authorization: authHeader } }
        });

        // Verify user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid authentication' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { fileId, storagePath } = await req.json();

        if (!fileId && !storagePath) {
            return new Response(
                JSON.stringify({ error: 'Either fileId or storagePath is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const adminClient = createClient(supabaseUrl, supabaseServiceKey);
        let path = storagePath;
        let fileMetadata = null;

        // If fileId provided, get the storage path from database
        if (fileId) {
            const { data: file, error: fileError } = await adminClient
                .from('imaging_files')
                .select(`
          id, storage_path, filename, mime_type, size_bytes, metadata, created_at,
          imaging_set:imaging_sets!inner(
            id, business_id, patient_id, imaging_type, notes
          )
        `)
                .eq('id', fileId)
                .single();

            if (fileError || !file) {
                return new Response(
                    JSON.stringify({ error: 'File not found' }),
                    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            // Verify user has access to this business
            // First get profile_id from user_id
            const { data: profile } = await adminClient
                .from('profiles')
                .select('id')
                .eq('user_id', user.id)
                .single();

            const profileId = profile?.id;

            const { data: membership } = await adminClient
                .from('business_members')
                .select('role')
                .eq('business_id', file.imaging_set.business_id)
                .eq('profile_id', profileId)
                .single();

            // Check if user is business member OR the patient
            const isBusinessMember = !!membership;
            const isPatient = file.imaging_set.patient_id === profileId;

            if (!isBusinessMember && !isPatient) {
                console.log('Access denied - user:', user.id, 'profileId:', profileId, 'patientId:', file.imaging_set.patient_id);
                return new Response(
                    JSON.stringify({ error: 'You do not have access to this file' }),
                    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            path = file.storage_path;
            fileMetadata = {
                id: file.id,
                filename: file.filename,
                mimeType: file.mime_type,
                sizeBytes: file.size_bytes,
                imagingType: file.imaging_set.imaging_type,
                createdAt: file.created_at
            };
        }

        // Generate signed URL (1 hour expiry)
        const { data: signedUrl, error: urlError } = await adminClient.storage
            .from('clinic-imaging')
            .createSignedUrl(path, 3600); // 1 hour

        if (urlError) {
            console.error('Error creating signed URL:', urlError);
            return new Response(
                JSON.stringify({ error: 'Failed to generate signed URL' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                url: signedUrl.signedUrl,
                expiresIn: 3600,
                metadata: fileMetadata
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error in get-imaging-url:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
