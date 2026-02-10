/**
 * GDPR Audit Logging System
 * Provides comprehensive audit trail for all data access and modifications.
 * Logs to the gdpr_audit_log table with structured metadata.
 */
import { supabase } from '@/integrations/supabase/client';

export type AuditAction =
  | 'login'
  | 'logout'
  | 'view_phi'
  | 'create'
  | 'update'
  | 'delete'
  | 'export'
  | 'consent_change'
  | 'gdpr_request'
  | 'price_override'
  | 'backup'
  | 'restore';

export type PurposeCode = 'care' | 'billing' | 'support' | 'admin' | 'gdpr_request' | 'security';

export interface AuditLogEntry {
  actor_id: string | null;
  actor_role?: string;
  action: AuditAction;
  entity_type: string;
  entity_id?: string;
  patient_id?: string;
  purpose_code?: PurposeCode;
  before_data?: Record<string, unknown>;
  after_data?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
}

/**
 * Log an audit event to the gdpr_audit_log table.
 * Non-blocking: errors are caught and logged to console but do not throw.
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const { error } = await supabase.from('gdpr_audit_log').insert({
      actor_id: entry.actor_id,
      actor_role: entry.actor_role ?? null,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id ?? null,
      patient_id: entry.patient_id ?? null,
      purpose_code: entry.purpose_code ?? null,
      before_data: entry.before_data ?? null,
      after_data: entry.after_data ?? null,
      ip_address: entry.ip_address ?? null,
      user_agent: entry.user_agent ?? navigator.userAgent,
      session_id: entry.session_id ?? null,
    });

    if (error) {
      console.error('[AuditLogger] Failed to write audit log:', error.message);
    }
  } catch (err) {
    console.error('[AuditLogger] Unexpected error:', err);
  }
}

/**
 * Log data access (viewing PHI).
 */
export async function logDataAccess(
  userId: string,
  resourceType: string,
  resourceId: string,
  patientId?: string,
  purpose: PurposeCode = 'care'
): Promise<void> {
  await logAuditEvent({
    actor_id: userId,
    action: 'view_phi',
    entity_type: resourceType,
    entity_id: resourceId,
    patient_id: patientId,
    purpose_code: purpose,
  });
}

/**
 * Log authentication events (login, logout).
 */
export async function logAuthEvent(
  userId: string | null,
  event: 'login' | 'logout',
  success: boolean
): Promise<void> {
  await logAuditEvent({
    actor_id: userId,
    action: event,
    entity_type: 'auth',
    after_data: { success },
  });
}

/**
 * Log data export events.
 */
export async function logExport(
  userId: string,
  dataType: string,
  recordCount: number,
  patientId?: string
): Promise<void> {
  await logAuditEvent({
    actor_id: userId,
    action: 'export',
    entity_type: dataType,
    patient_id: patientId,
    purpose_code: 'gdpr_request',
    after_data: { record_count: recordCount },
  });
}

/**
 * Log data deletion events.
 */
export async function logDeletion(
  userId: string,
  resourceType: string,
  resourceId: string,
  reason: string,
  patientId?: string
): Promise<void> {
  await logAuditEvent({
    actor_id: userId,
    action: 'delete',
    entity_type: resourceType,
    entity_id: resourceId,
    patient_id: patientId,
    purpose_code: 'gdpr_request',
    after_data: { reason },
  });
}

/**
 * Log consent changes.
 */
export async function logConsentChange(
  userId: string,
  patientId: string,
  consentType: string,
  granted: boolean
): Promise<void> {
  await logAuditEvent({
    actor_id: userId,
    action: 'consent_change',
    entity_type: 'consent_records',
    patient_id: patientId,
    after_data: { consent_type: consentType, granted },
  });
}
