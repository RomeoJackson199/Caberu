
-- Fix all secure views to use SECURITY INVOKER (respects caller's RLS)
-- This means only users who pass RLS on the base tables can read decrypted data

ALTER VIEW secure_appointments_view SET (security_invoker = on);
ALTER VIEW secure_medical_records_view SET (security_invoker = on);
ALTER VIEW secure_treatment_plans_view SET (security_invoker = on);
ALTER VIEW secure_notes_view SET (security_invoker = on);
ALTER VIEW secure_chat_messages_view SET (security_invoker = on);
ALTER VIEW secure_messages_view SET (security_invoker = on);
ALTER VIEW secure_patient_allergies_view SET (security_invoker = on);
ALTER VIEW secure_communication_logs_view SET (security_invoker = on);
ALTER VIEW secure_email_logs_view SET (security_invoker = on);
ALTER VIEW secure_imaging_sets_view SET (security_invoker = on);
ALTER VIEW secure_imaging_files_view SET (security_invoker = on);
ALTER VIEW secure_patient_documents_view SET (security_invoker = on);
ALTER VIEW secure_appointment_reminders_view SET (security_invoker = on);
ALTER VIEW secure_profiles_view SET (security_invoker = on);
