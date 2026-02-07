import { supabase } from '@/integrations/supabase/client';

/**
 * Maps base table names to their secure (decrypting) view names.
 * Reads should go through these views to get decrypted PHI data.
 * Writes (insert/update/delete) should go directly to the base table.
 */
const SECURE_VIEW_MAP: Record<string, string> = {
  appointments: 'appointments_decrypted',
  medical_records: 'medical_records_decrypted',
  treatment_plans: 'treatment_plans_decrypted',
  notes: 'notes_decrypted',
  chat_messages: 'chat_messages_decrypted',
  messages: 'messages_decrypted',
  patient_allergies: 'patient_allergies_decrypted',
  communication_logs: 'communication_logs_decrypted',
  email_logs: 'email_logs_decrypted',
  imaging_sets: 'imaging_sets_decrypted',
  imaging_files: 'imaging_files_decrypted',
  patient_documents: 'patient_documents_decrypted',
  appointment_reminders: 'appointment_reminders_decrypted',
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
