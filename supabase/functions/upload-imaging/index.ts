import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadRequest {
    businessId: string;
    patientId: string;
    appointmentId: string;
    imagingType: 'xray' | 'photo' | 'scan' | 'unknown';
    notes?: string;
    files: Array<{
        base64: string;
        filename: string;
        mimeType: string;
    }>;
}

// Virus scan stub - ready for integration with ClamAV or similar
async function virusScan(_fileData: Uint8Array): Promise<{ safe: boolean; message?: string }> {
    // TODO: Integrate with actual virus scanning service
    console.log('📋 Virus scan hook called (stub)');
    return { safe: true };
}

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

        const { businessId, patientId, appointmentId, imagingType, notes, files }: UploadRequest = await req.json();

        // Validate required fields
        if (!businessId || !patientId || !files || files.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: businessId, patientId, files' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Verify user has access to this business (check business_members OR if user is business owner)
        const adminClient = createClient(supabaseUrl, supabaseServiceKey);

        // Check business_members first
        const { data: membership } = await adminClient
            .from('business_members')
            .select('role')
            .eq('business_id', businessId)
            .eq('profile_id', user.id)
            .single();

        // Also check if user is the business owner
        let isOwner = false;
        if (!membership) {
            const { data: business } = await adminClient
                .from('businesses')
                .select('owner_id')
                .eq('id', businessId)
                .single();
            isOwner = business?.owner_id === user.id;
        }

        // Also check if user is a dentist associated with this business
        let isDentist = false;
        if (!membership && !isOwner) {
            const { data: dentist } = await adminClient
                .from('dentists')
                .select('id')
                .eq('user_id', user.id)
                .eq('business_id', businessId)
                .single();
            isDentist = !!dentist;
        }

        if (!membership && !isOwner && !isDentist) {
            console.log('Access denied - user:', user.id, 'business:', businessId);
            return new Response(
                JSON.stringify({ error: 'You do not have access to this business' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const role = membership?.role || (isOwner ? 'admin' : (isDentist ? 'dentist' : null));
        if (!role || !['admin', 'dentist', 'staff', 'owner'].includes(role)) {
            return new Response(
                JSON.stringify({ error: 'Insufficient permissions to upload imaging' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Validate file types
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/dicom'];
        for (const file of files) {
            if (!allowedTypes.includes(file.mimeType)) {
                return new Response(
                    JSON.stringify({ error: `Invalid file type: ${file.mimeType}. Allowed: ${allowedTypes.join(', ')}` }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
        }

        // Create imaging set
        const { data: imagingSet, error: setError } = await adminClient
            .from('imaging_sets')
            .insert({
                business_id: businessId,
                patient_id: patientId,
                appointment_id: appointmentId || null,
                uploaded_by: user.id,
                imaging_type: imagingType || 'unknown',
                notes: notes || null
            })
            .select()
            .single();

        if (setError) {
            console.error('Error creating imaging set:', setError);
            throw new Error('Failed to create imaging set');
        }

        // Upload files
        const uploadedFiles = [];
        for (const file of files) {
            try {
                // Decode base64
                const fileData = Uint8Array.from(atob(file.base64), c => c.charCodeAt(0));

                // Virus scan
                const scanResult = await virusScan(fileData);
                if (!scanResult.safe) {
                    console.error('Virus detected in file:', file.filename);
                    continue; // Skip this file
                }

                // Generate storage path
                const timestamp = Date.now();
                const sanitizedFilename = file.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
                const storagePath = `${businessId}/${patientId}/${appointmentId || 'no-appointment'}/${timestamp}_${sanitizedFilename}`;

                // Upload to storage
                const { error: uploadError } = await adminClient.storage
                    .from('clinic-imaging')
                    .upload(storagePath, fileData, {
                        contentType: file.mimeType,
                        upsert: false
                    });

                if (uploadError) {
                    console.error('Error uploading file:', uploadError);
                    continue;
                }

                // Create file record
                const { data: fileRecord, error: fileError } = await adminClient
                    .from('imaging_files')
                    .insert({
                        imaging_set_id: imagingSet.id,
                        storage_path: storagePath,
                        filename: sanitizedFilename,
                        original_filename: file.filename,
                        mime_type: file.mimeType,
                        size_bytes: fileData.length,
                        metadata: {}
                    })
                    .select()
                    .single();

                if (fileError) {
                    console.error('Error creating file record:', fileError);
                } else {
                    uploadedFiles.push(fileRecord);
                }
            } catch (fileErr) {
                console.error('Error processing file:', file.filename, fileErr);
            }
        }

        // Emit imaging.uploaded event (log for now, can be expanded to webhooks)
        console.log('📸 imaging.uploaded event:', {
            imagingSetId: imagingSet.id,
            businessId,
            patientId,
            appointmentId,
            fileCount: uploadedFiles.length,
            uploadedBy: user.id
        });

        return new Response(
            JSON.stringify({
                success: true,
                imagingSet,
                files: uploadedFiles,
                message: `Successfully uploaded ${uploadedFiles.length} file(s)`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error in upload-imaging:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
