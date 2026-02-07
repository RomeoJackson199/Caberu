import { supabase } from '@/integrations/supabase/client';

/**
 * Maps base table names to their secure (decrypting) view names.
 * Reads should go through these views to get decrypted PHI data.
 * Writes (insert/update/delete) should go directly to the base table.
 */
const SECURE_VIEW_MAP: Record<string, string> = {
  appointments: 'secure_appointments_view',
  medical_records: 'secure_medical_records_view',
  treatment_plans: 'secure_treatment_plans_view',
  notes: 'secure_notes_view',
  chat_messages: 'secure_chat_messages_view',
  messages: 'secure_messages_view',
  patient_allergies: 'secure_patient_allergies_view',
  communication_logs: 'secure_communication_logs_view',
  email_logs: 'secure_email_logs_view',
  imaging_sets: 'secure_imaging_sets_view',
  imaging_files: 'secure_imaging_files_view',
  patient_documents: 'secure_patient_documents_view',
  appointment_reminders: 'secure_appointment_reminders_view',
};

/**
 * Get the secure view name for a table, or the table itself if no view exists.
 * Use this for SELECT queries to get decrypted data.
 */
export function getSecureViewName(tableName: string): string {
  return SECURE_VIEW_MAP[tableName] || tableName;
}

/**
 * Create a Supabase query targeting the secure (decrypting) view for reads.
 * Usage: secureFrom('appointments').select('*').eq('id', id)
 */
export function secureFrom(tableName: string) {
  const viewName = getSecureViewName(tableName);
  return supabase.from(viewName as any);
}
