/**
 * GDPR Data Breach Detection & Response System
 * Monitors for suspicious data access patterns and manages breach incidents.
 */
import { supabase } from '@/integrations/supabase/client';
import { logAuditEvent } from './auditLogger';

export type BreachSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BreachStatus = 'reported' | 'investigating' | 'contained' | 'resolved' | 'closed';

export interface BreachIncident {
  id: string;
  title: string;
  description: string | null;
  severity: BreachSeverity;
  status: BreachStatus;
  affected_records_count: number;
  data_categories: string[];
  root_cause: string | null;
  mitigation_steps: string | null;
  discovered_at: string;
  contained_at: string | null;
  resolved_at: string | null;
  authority_notified_at: string | null;
  patients_notified_at: string | null;
  reporter_id: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Report a new breach incident.
 */
export async function reportBreachIncident(params: {
  title: string;
  description: string;
  severity: BreachSeverity;
  affectedRecordsCount: number;
  dataCategories: string[];
  reporterId: string;
}): Promise<{ success: boolean; incidentId?: string; error?: string }> {
  const { data, error } = await supabase
    .from('breach_incidents')
    .insert({
      title: params.title,
      description: params.description,
      severity: params.severity,
      status: 'reported',
      affected_records_count: params.affectedRecordsCount,
      data_categories: params.dataCategories,
      discovered_at: new Date().toISOString(),
      reporter_id: params.reporterId,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    actor_id: params.reporterId,
    action: 'create',
    entity_type: 'breach_incidents',
    entity_id: data.id,
    purpose_code: 'security',
    after_data: { severity: params.severity, title: params.title },
  });

  return { success: true, incidentId: data.id };
}

/**
 * Get all breach incidents, ordered by most recent.
 */
export async function getBreachIncidents(): Promise<BreachIncident[]> {
  const { data, error } = await supabase
    .from('breach_incidents')
    .select('*')
    .order('discovered_at', { ascending: false });

  if (error) {
    console.error('[BreachDetection] Failed to fetch incidents:', error.message);
    return [];
  }

  return (data ?? []) as BreachIncident[];
}

/**
 * Update breach incident status with timestamps.
 */
export async function updateBreachStatus(
  incidentId: string,
  status: BreachStatus,
  actorId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const updateData: Record<string, unknown> = { status };

  if (status === 'contained') {
    updateData.contained_at = new Date().toISOString();
  } else if (status === 'resolved') {
    updateData.resolved_at = new Date().toISOString();
  }

  if (notes) {
    updateData.mitigation_steps = notes;
  }

  const { error } = await supabase
    .from('breach_incidents')
    .update(updateData)
    .eq('id', incidentId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    actor_id: actorId,
    action: 'update',
    entity_type: 'breach_incidents',
    entity_id: incidentId,
    purpose_code: 'security',
    after_data: { status, notes },
  });

  return { success: true };
}

/**
 * Record that the data protection authority has been notified.
 */
export async function markAuthorityNotified(
  incidentId: string,
  actorId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('breach_incidents')
    .update({ authority_notified_at: new Date().toISOString() })
    .eq('id', incidentId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    actor_id: actorId,
    action: 'update',
    entity_type: 'breach_incidents',
    entity_id: incidentId,
    purpose_code: 'security',
    after_data: { action: 'authority_notified' },
  });

  return { success: true };
}

/**
 * Record that affected patients have been notified.
 */
export async function markPatientsNotified(
  incidentId: string,
  actorId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('breach_incidents')
    .update({ patients_notified_at: new Date().toISOString() })
    .eq('id', incidentId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    actor_id: actorId,
    action: 'update',
    entity_type: 'breach_incidents',
    entity_id: incidentId,
    purpose_code: 'security',
    after_data: { action: 'patients_notified' },
  });

  return { success: true };
}

/**
 * Calculate hours remaining until the 72-hour GDPR notification deadline.
 */
export function getNotificationDeadlineHours(discoveredAt: string): number {
  const discovered = new Date(discoveredAt).getTime();
  const deadline = discovered + 72 * 60 * 60 * 1000;
  const now = Date.now();
  return Math.max(0, (deadline - now) / (60 * 60 * 1000));
}
