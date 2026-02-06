
-- ============================================
-- Clear Plaintext PHI Fields (Keep Non-PHI)
-- Only clears where encrypted version exists
-- ============================================

-- 1. PROFILES - Clear PHI only (keep id, user_id, email, role, dates, etc.)
UPDATE public.profiles
SET 
  first_name = NULL,
  last_name = NULL,
  medical_history = NULL,
  emergency_contact = NULL,
  address = NULL
WHERE first_name_encrypted IS NOT NULL 
   OR last_name_encrypted IS NOT NULL
   OR medical_history_encrypted IS NOT NULL
   OR emergency_contact_encrypted IS NOT NULL
   OR address_encrypted IS NOT NULL;

-- 2. APPOINTMENTS - Clear PHI only (keep appointment_date, status, duration_minutes, urgency, etc.)
UPDATE public.appointments
SET 
  reason = '[encrypted]',
  consultation_notes = NULL,
  patient_name = NULL,
  notes = NULL,
  ai_summary = NULL
WHERE reason_encrypted IS NOT NULL 
   OR consultation_notes_encrypted IS NOT NULL
   OR patient_name_encrypted IS NOT NULL
   OR notes_encrypted IS NOT NULL
   OR ai_summary_encrypted IS NOT NULL;

-- 3. NOTES - Clear PHI content
UPDATE public.notes
SET 
  title = '[encrypted]',
  content = '[encrypted]'
WHERE title_encrypted IS NOT NULL 
   OR content_encrypted IS NOT NULL;

-- 4. TREATMENT_PLANS - Clear PHI (keep status, priority, dates, costs)
UPDATE public.treatment_plans
SET 
  diagnosis = NULL,
  description = NULL
WHERE diagnosis_encrypted IS NOT NULL 
   OR description_encrypted IS NOT NULL;

-- 5. MEDICAL_RECORDS - Clear PHI (keep record_type, record_date)
UPDATE public.medical_records
SET 
  findings = NULL,
  description = NULL,
  treatment_provided = NULL
WHERE findings_encrypted IS NOT NULL 
   OR description_encrypted IS NOT NULL
   OR treatment_provided_encrypted IS NOT NULL;

-- 6. PATIENT_ALLERGIES - Clear PHI (keep severity) - using correct column names
UPDATE public.patient_allergies
SET 
  allergy_name = '[encrypted]',
  notes = NULL
WHERE allergy_name_encrypted IS NOT NULL 
   OR notes_encrypted IS NOT NULL;

-- 7. CHAT_MESSAGES - Clear PHI (keep is_bot, message_type, created_at)
UPDATE public.chat_messages
SET 
  message = '[encrypted]',
  metadata = NULL
WHERE message_encrypted IS NOT NULL 
   OR metadata_encrypted IS NOT NULL;

-- 8. COMMUNICATION_LOGS - Clear PHI (keep channel, direction, status)
UPDATE public.communication_logs
SET 
  subject = NULL,
  content = NULL
WHERE subject_encrypted IS NOT NULL 
   OR content_encrypted IS NOT NULL;

-- 9. APPOINTMENT_REMINDERS - Clear error messages if encrypted
UPDATE public.appointment_reminders
SET 
  error_message = NULL
WHERE error_message_encrypted IS NOT NULL;

-- 10. EMAIL_LOGS - Clear subject if encrypted (keep email_type, status)
UPDATE public.email_logs
SET 
  subject = NULL
WHERE subject_encrypted IS NOT NULL;

-- 11. IMAGING_SETS - Clear PHI (keep imaging_type, captured_at)
UPDATE public.imaging_sets
SET 
  notes = NULL
WHERE notes_encrypted IS NOT NULL;

-- 12. IMAGING_FILES - Clear metadata if encrypted
UPDATE public.imaging_files
SET 
  metadata = NULL
WHERE metadata_encrypted IS NOT NULL;
