import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportRequest {
  bundleId: string;
  exportType: 'full_export' | 'portability';
}

serve(async (req) => {
  console.log(`${req.method} request received`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { bundleId, exportType }: ExportRequest = await req.json();
    
    console.log('Export request received:', { bundleId, exportType });

    // Get the export bundle info
    const { data: bundle, error: bundleError } = await supabase
      .from('gdpr_export_bundles')
      .select('*, patient_id')
      .eq('id', bundleId)
      .single();

    if (bundleError || !bundle) {
      console.error('Bundle not found:', bundleError);
      return new Response(JSON.stringify({ error: 'Export bundle not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update status to processing
    await supabase
      .from('gdpr_export_bundles')
      .update({ status: 'processing' })
      .eq('id', bundleId);

    // Generate the export data
    const exportData = await generateExportData(supabase, bundle.patient_id, exportType);

    // Create a simple JSON export (in production, this would create a ZIP file in storage)
    const exportJson = JSON.stringify(exportData, null, 2);
    
    // In a real implementation, you would:
    // 1. Create a ZIP file with the data
    // 2. Upload it to a private storage bucket
    // 3. Generate a signed URL with 24h expiry
    // For this demo, we'll create a simple data URL

    const signedUrl = `data:application/json;base64,${btoa(exportJson)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update bundle with completion info
    const { error: updateError } = await supabase
      .from('gdpr_export_bundles')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        signed_url: signedUrl,
        expires_at: expiresAt.toISOString()
      })
      .eq('id', bundleId);

    if (updateError) {
      console.error('Failed to update bundle:', updateError);
      throw updateError;
    }

    console.log('Export completed successfully');

    return new Response(JSON.stringify({
      success: true,
      bundleId,
      message: 'Export generated successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Export generation error:', error);
    
    // Try to mark the bundle as failed
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      const { bundleId } = await req.json();
      await supabase
        .from('gdpr_export_bundles')
        .update({ status: 'failed' })
        .eq('id', bundleId);
    } catch (e) {
      console.error('Failed to mark bundle as failed:', e);
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      error: 'Export generation failed',
      details: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function generateExportData(supabase: any, patientId: string, exportType: string) {
  console.log('Generating export data for patient:', patientId);

  const exportData: any = {
    export_info: {
      patient_id: patientId,
      export_type: exportType,
      generated_at: new Date().toISOString(),
      data_controller: "Dentibot (Caberu SRL)",
      export_format: "JSON"
    }
  };

  try {
    // Get patient profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', patientId)
      .single();

    if (profile) {
      exportData.personal_data = {
        profile: {
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          phone: profile.phone,
          date_of_birth: profile.date_of_birth,
          address: profile.address,
          emergency_contact: profile.emergency_contact,
          created_at: profile.created_at,
          updated_at: profile.updated_at
        }
      };
    }

    // Get appointments
    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', patientId);

    if (appointments) {
      exportData.medical_data = {
        appointments: appointments.map((apt: any) => ({
          id: apt.id,
          date: apt.appointment_date,
          reason: apt.reason,
          status: apt.status,
          notes: apt.notes,
          urgency: apt.urgency,
          created_at: apt.created_at
        }))
      };
    }

    // Get treatment plans
    const { data: treatments } = await supabase
      .from('treatment_plans')
      .select('*')
      .eq('patient_id', patientId);

    if (treatments) {
      exportData.medical_data.treatment_plans = treatments.map((treatment: any) => ({
        id: treatment.id,
        title: treatment.title,
        description: treatment.description,
        status: treatment.status,
        estimated_duration: treatment.estimated_duration,
        priority: treatment.priority,
        created_at: treatment.created_at,
        updated_at: treatment.updated_at
      }));
    }

    // Get prescriptions
    const { data: prescriptions } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_id', patientId);

    if (prescriptions) {
      exportData.medical_data.prescriptions = prescriptions.map((rx: any) => ({
        id: rx.id,
        medication_name: rx.medication_name,
        dosage: rx.dosage,
        frequency: rx.frequency,
        duration_days: rx.duration_days,
        instructions: rx.instructions,
        created_at: rx.created_at
      }));
    }

    // Get consent records
    const { data: consents } = await supabase
      .from('consent_records')
      .select('*')
      .eq('patient_id', patientId);

    if (consents) {
      exportData.privacy_data = {
        consent_records: consents.map((consent: any) => ({
          scope: consent.scope,
          status: consent.status,
          granted_at: consent.granted_at,
          withdrawn_at: consent.withdrawn_at,
          version: consent.version,
          legal_basis: consent.legal_basis
        }))
      };
    }

    // Get GDPR requests
    const { data: gdprRequests } = await supabase
      .from('gdpr_requests')
      .select('*')
      .eq('patient_id', patientId);

    if (gdprRequests) {
      exportData.privacy_data.gdpr_requests = gdprRequests.map((req: any) => ({
        type: req.type,
        status: req.status,
        description: req.description,
        submitted_at: req.submitted_at,
        resolved_at: req.resolved_at,
        resolution_notes: req.resolution_notes
      }));
    }

    console.log('Export data generated successfully');
    return exportData;

  } catch (error) {
    console.error('Error generating export data:', error);
    throw error;
  }
}