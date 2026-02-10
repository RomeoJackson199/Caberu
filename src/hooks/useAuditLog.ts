/**
 * React hook for querying GDPR audit logs.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const AUDIT_LOG_KEY = 'gdpr-audit-log';

interface AuditLogFilters {
  patientId?: string;
  actorId?: string;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  patient_id: string | null;
  purpose_code: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  created_at: string;
}

async function fetchAuditLogs(filters: AuditLogFilters): Promise<AuditLogEntry[]> {
  let query = supabase
    .from('gdpr_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 100);

  if (filters.patientId) {
    query = query.eq('patient_id', filters.patientId);
  }
  if (filters.actorId) {
    query = query.eq('actor_id', filters.actorId);
  }
  if (filters.action) {
    query = query.eq('action', filters.action);
  }
  if (filters.entityType) {
    query = query.eq('entity_type', filters.entityType);
  }
  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[AuditLog] Failed to fetch:', error.message);
    return [];
  }

  return (data ?? []) as AuditLogEntry[];
}

export function useAuditLog(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: [AUDIT_LOG_KEY, filters],
    queryFn: () => fetchAuditLogs(filters),
    refetchInterval: 30_000,
  });
}

export function usePatientAuditLog(patientId: string | undefined) {
  return useQuery({
    queryKey: [AUDIT_LOG_KEY, 'patient', patientId],
    queryFn: () => fetchAuditLogs({ patientId: patientId! }),
    enabled: !!patientId,
  });
}
