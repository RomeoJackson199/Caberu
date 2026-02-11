/**
 * GDPR Data Subject Rights Implementation
 * Handles access, portability, rectification, erasure, restriction, and objection requests.
 */
import { supabase } from '@/integrations/supabase/client';
import { logAuditEvent, logDeletion, logExport } from './auditLogger';

export type GdprRequestType = 'access' | 'rectification' | 'erasure' | 'restriction' | 'portability' | 'objection';
export type GdprRequestStatus = 'submitted' | 'in_progress' | 'approved' | 'rejected' | 'completed' | 'expired';

export interface GdprRequest {
  id: string;
  patient_id: string;
  type: GdprRequestType;
  status: GdprRequestStatus;
  description: string | null;
  legal_basis: string | null;
  urgency_level: string;
  submitted_at: string;
  due_at: string;
  resolved_at: string | null;
  actor_id: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientDataExport {
  patient: Record<string, unknown>;
  appointments: Record<string, unknown>[];
  prescriptions: Record<string, unknown>[];
  treatment_plans: Record<string, unknown>[];
  patient_notes: Record<string, unknown>[];
  medical_records: Record<string, unknown>[];
  consent_records: Record<string, unknown>[];
  communication_logs: Record<string, unknown>[];
  documents: Record<string, unknown>[];
  export_metadata: {
    exported_at: string;
    format: string;
    requested_by: string;
  };
}

/**
 * Submit a new GDPR data subject request.
 */
export async function submitGdprRequest(
  patientId: string,
  type: GdprRequestType,
  description?: string,
  actorId?: string
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  const { data, error } = await supabase
    .from('gdpr_requests')
    .insert({
      patient_id: patientId,
      type,
      status: 'submitted',
      description: description ?? null,
      actor_id: actorId ?? null,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    actor_id: actorId ?? null,
    action: 'gdpr_request',
    entity_type: 'gdpr_requests',
    entity_id: data.id,
    patient_id: patientId,
    purpose_code: 'gdpr_request',
    after_data: { type, description },
  });

  return { success: true, requestId: data.id };
}

/**
 * Get all GDPR requests for a patient.
 */
export async function getPatientGdprRequests(
  patientId: string
): Promise<GdprRequest[]> {
  const { data, error } = await supabase
    .from('gdpr_requests')
    .select('*')
    .eq('patient_id', patientId)
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('[DataSubjectRights] Failed to fetch requests:', error.message);
    return [];
  }

  return (data ?? []) as GdprRequest[];
}

/**
 * Get all pending GDPR requests (for admin dashboard).
 */
export async function getPendingGdprRequests(): Promise<GdprRequest[]> {
  const { data, error } = await supabase
    .from('gdpr_requests')
    .select('*')
    .in('status', ['submitted', 'in_progress'])
    .order('due_at', { ascending: true });

  if (error) {
    console.error('[DataSubjectRights] Failed to fetch pending requests:', error.message);
    return [];
  }

  return (data ?? []) as GdprRequest[];
}

/**
 * Update the status of a GDPR request.
 */
export async function updateGdprRequestStatus(
  requestId: string,
  status: GdprRequestStatus,
  actorId: string,
  resolutionNotes?: string
): Promise<{ success: boolean; error?: string }> {
  const updateData: Record<string, unknown> = {
    status,
    actor_id: actorId,
  };

  if (resolutionNotes) {
    updateData.resolution_notes = resolutionNotes;
  }

  if (status === 'completed' || status === 'rejected') {
    updateData.resolved_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('gdpr_requests')
    .update(updateData)
    .eq('id', requestId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Right to Access: Export all patient data in structured format.
 */
export async function exportPatientData(
  patientId: string,
  requestedBy: string
): Promise<{ success: boolean; data?: PatientDataExport; error?: string }> {
  try {
    const [
      patientResult,
      appointmentsResult,
      prescriptionsResult,
      treatmentPlansResult,
      notesResult,
      medicalRecordsResult,
      consentsResult,
      communicationResult,
      documentsResult,
    ] = await Promise.all([
      supabase.from('patients').select('*').eq('id', patientId).single(),
      supabase.from('appointments').select('*').eq('patient_id', patientId),
      supabase.from('prescriptions').select('*').eq('patient_id', patientId),
      supabase.from('treatment_plans').select('*').eq('patient_id', patientId),
      supabase.from('patient_notes').select('*').eq('patient_id', patientId),
      supabase.from('medical_records').select('*').eq('patient_id', patientId),
      supabase.from('consent_records').select('*').eq('patient_id', patientId),
      supabase.from('communication_logs').select('*').eq('patient_id', patientId),
      supabase.from('patient_documents').select('*').eq('patient_id', patientId),
    ]);

    const totalRecords =
      (appointmentsResult.data?.length ?? 0) +
      (prescriptionsResult.data?.length ?? 0) +
      (treatmentPlansResult.data?.length ?? 0) +
      (notesResult.data?.length ?? 0) +
      (medicalRecordsResult.data?.length ?? 0) +
      (consentsResult.data?.length ?? 0) +
      (communicationResult.data?.length ?? 0) +
      (documentsResult.data?.length ?? 0);

    await logExport(requestedBy, 'patient_full_export', totalRecords + 1, patientId);

    const exportData: PatientDataExport = {
      patient: patientResult.data ?? {},
      appointments: appointmentsResult.data ?? [],
      prescriptions: prescriptionsResult.data ?? [],
      treatment_plans: treatmentPlansResult.data ?? [],
      patient_notes: notesResult.data ?? [],
      medical_records: medicalRecordsResult.data ?? [],
      consent_records: consentsResult.data ?? [],
      communication_logs: communicationResult.data ?? [],
      documents: documentsResult.data ?? [],
      export_metadata: {
        exported_at: new Date().toISOString(),
        format: 'json',
        requested_by: requestedBy,
      },
    };

    return { success: true, data: exportData };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Right to Erasure: Anonymize patient data (soft delete).
 * Keeps appointment counts for statistics but removes all PII.
 */
export async function anonymizePatientData(
  patientId: string,
  actorId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const anonymousId = `ANON-${patientId.substring(0, 8).toUpperCase()}`;

    // Anonymize patient record
    const { error: patientError } = await supabase
      .from('patients')
      .update({
        first_name: 'Anonymous',
        last_name: anonymousId,
        email: `${anonymousId.toLowerCase()}@deleted.local`,
        phone: null,
        date_of_birth: null,
        address: null,
        medical_history: null,
        emergency_contact: null,
        profile_picture_url: null,
        avatar_url: null,
      })
      .eq('id', patientId);

    if (patientError) {
      return { success: false, error: patientError.message };
    }

    // Anonymize appointment details but keep dates/status for statistics
    await supabase
      .from('appointments')
      .update({
        reason: '[REDACTED]',
        notes: null,
        consultation_notes: null,
        ai_summary: null,
      })
      .eq('patient_id', patientId);

    // Delete sensitive records
    await Promise.all([
      supabase.from('prescriptions').delete().eq('patient_id', patientId),
      supabase.from('patient_notes').delete().eq('patient_id', patientId),
      supabase.from('medical_records').delete().eq('patient_id', patientId),
      supabase.from('patient_documents').delete().eq('patient_id', patientId),
      supabase.from('communication_logs').delete().eq('patient_id', patientId),
      supabase.from('patient_allergies').delete().eq('patient_id', patientId),
    ]);

    // Withdraw all consents
    await supabase
      .from('consent_records')
      .update({ status: 'withdrawn', withdrawn_at: new Date().toISOString() })
      .eq('patient_id', patientId)
      .eq('status', 'granted');

    await logDeletion(actorId, 'patient', patientId, reason, patientId);

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Right to Rectification: Update specific patient data fields.
 * Records what was changed and why for compliance.
 */
export async function rectifyPatientData(
  patientId: string,
  actorId: string,
  fieldsToCorrect: Record<string, unknown>,
  requestId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current data for audit trail
    const { data: currentData } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    // Apply corrections
    const { error } = await supabase
      .from('patients')
      .update(fieldsToCorrect)
      .eq('id', patientId);

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuditEvent({
      actor_id: actorId,
      action: 'update',
      entity_type: 'patients',
      entity_id: patientId,
      patient_id: patientId,
      purpose_code: 'gdpr_request',
      before_data: currentData ?? {},
      after_data: { corrected_fields: fieldsToCorrect },
    });

    // Auto-complete the GDPR request if provided
    if (requestId) {
      await updateGdprRequestStatus(requestId, 'completed', actorId, 'Data corrected as requested');
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Right to Objection: Record patient's objection to specific processing.
 * Stops marketing, analytics, or AI processing for the patient.
 */
export async function objectToProcessing(
  patientId: string,
  actorId: string,
  processingTypes: string[],
  reason?: string,
  requestId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Withdraw consent for processing types the patient objects to
    const scopeMap: Record<string, string> = {
      marketing: 'marketing',
      analytics: 'analytics',
      ai_processing: 'ai_intake',
      notifications: 'notifications',
    };

    for (const processingType of processingTypes) {
      const scope = scopeMap[processingType];
      if (scope) {
        await supabase
          .from('consent_records')
          .update({
            status: 'withdrawn',
            withdrawn_at: new Date().toISOString(),
          })
          .eq('patient_id', patientId)
          .eq('scope', scope)
          .eq('status', 'granted');
      }
    }

    // Set data minimization flags
    await supabase
      .from('data_minimization_settings')
      .upsert({
        patient_id: patientId,
        auto_delete_old_messages: true,
        auto_delete_old_images: true,
        minimal_logging: true,
      }, { onConflict: 'patient_id' });

    await logAuditEvent({
      actor_id: actorId,
      action: 'update',
      entity_type: 'data_minimization_settings',
      patient_id: patientId,
      purpose_code: 'gdpr_request',
      after_data: { action: 'objection_to_processing', processing_types: processingTypes, reason },
    });

    // Auto-complete the GDPR request if provided
    if (requestId) {
      await updateGdprRequestStatus(requestId, 'completed', actorId, `Objection processed for: ${processingTypes.join(', ')}`);
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Right to Restriction: Flag a patient's data as restricted.
 * Restricted data should not be processed by AI or automated systems.
 */
export async function restrictPatientProcessing(
  patientId: string,
  actorId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('data_minimization_settings')
    .upsert({
      patient_id: patientId,
      auto_delete_old_messages: false,
      auto_delete_old_images: false,
      minimal_logging: true,
    }, { onConflict: 'patient_id' });

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    actor_id: actorId,
    action: 'update',
    entity_type: 'data_minimization_settings',
    patient_id: patientId,
    purpose_code: 'gdpr_request',
    after_data: { action: 'restrict_processing' },
  });

  return { success: true };
}
