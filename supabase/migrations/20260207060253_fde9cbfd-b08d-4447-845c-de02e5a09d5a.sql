
-- ============================================================
-- STEP 1: Backfill any remaining plaintext data into encrypted columns
-- Uses private.get_encryption_key() which retrieves from Vault
-- ============================================================

DO $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();
  
  IF enc_key IS NULL OR enc_key = '' THEN
    RAISE EXCEPTION 'Encryption key not available - cannot proceed with backfill';
  END IF;
  
  -- Appointments: backfill plaintext -> encrypted where encrypted is NULL
  UPDATE appointments SET reason_encrypted = pgp_sym_encrypt(reason, enc_key)
  WHERE reason IS NOT NULL AND reason != '[encrypted]' AND reason_encrypted IS NULL;
  
  UPDATE appointments SET notes_encrypted = pgp_sym_encrypt(notes, enc_key)
  WHERE notes IS NOT NULL AND notes != '[encrypted]' AND notes_encrypted IS NULL;
  
  UPDATE appointments SET consultation_notes_encrypted = pgp_sym_encrypt(consultation_notes, enc_key)
  WHERE consultation_notes IS NOT NULL AND consultation_notes != '[encrypted]' AND consultation_notes_encrypted IS NULL;
  
  UPDATE appointments SET ai_summary_encrypted = pgp_sym_encrypt(ai_summary, enc_key)
  WHERE ai_summary IS NOT NULL AND ai_summary != '[encrypted]' AND ai_summary_encrypted IS NULL;
  
  UPDATE appointments SET patient_name_encrypted = pgp_sym_encrypt(patient_name, enc_key)
  WHERE patient_name IS NOT NULL AND patient_name != '[encrypted]' AND patient_name_encrypted IS NULL;
  
  UPDATE appointments SET conversation_transcript_encrypted = pgp_sym_encrypt(conversation_transcript::text, enc_key)
  WHERE conversation_transcript IS NOT NULL AND conversation_transcript_encrypted IS NULL;

  -- Medical records
  UPDATE medical_records SET findings_encrypted = pgp_sym_encrypt(findings, enc_key)
  WHERE findings IS NOT NULL AND findings != '[encrypted]' AND findings_encrypted IS NULL;
  
  UPDATE medical_records SET description_encrypted = pgp_sym_encrypt(description, enc_key)
  WHERE description IS NOT NULL AND description != '[encrypted]' AND description_encrypted IS NULL;
  
  UPDATE medical_records SET treatment_provided_encrypted = pgp_sym_encrypt(treatment_provided, enc_key)
  WHERE treatment_provided IS NOT NULL AND treatment_provided != '[encrypted]' AND treatment_provided_encrypted IS NULL;

  -- Treatment plans
  UPDATE treatment_plans SET diagnosis_encrypted = pgp_sym_encrypt(diagnosis, enc_key)
  WHERE diagnosis IS NOT NULL AND diagnosis != '[encrypted]' AND diagnosis_encrypted IS NULL;
  
  UPDATE treatment_plans SET description_encrypted = pgp_sym_encrypt(description, enc_key)
  WHERE description IS NOT NULL AND description != '[encrypted]' AND description_encrypted IS NULL;

  -- Notes
  UPDATE notes SET content_encrypted = pgp_sym_encrypt(content, enc_key)
  WHERE content IS NOT NULL AND content != '[encrypted]' AND content_encrypted IS NULL;
  
  UPDATE notes SET title_encrypted = pgp_sym_encrypt(title, enc_key)
  WHERE title IS NOT NULL AND title != '[encrypted]' AND title_encrypted IS NULL;

  -- Chat messages
  UPDATE chat_messages SET message_encrypted = pgp_sym_encrypt(message, enc_key)
  WHERE message IS NOT NULL AND message != '[encrypted]' AND message_encrypted IS NULL;
  
  UPDATE chat_messages SET metadata_encrypted = pgp_sym_encrypt(metadata::text, enc_key)
  WHERE metadata IS NOT NULL AND metadata_encrypted IS NULL;

  -- Messages
  UPDATE messages SET message_text_encrypted = pgp_sym_encrypt(message_text, enc_key)
  WHERE message_text IS NOT NULL AND message_text != '[encrypted]' AND message_text_encrypted IS NULL;

  -- Patient allergies
  UPDATE patient_allergies SET allergy_name_encrypted = pgp_sym_encrypt(allergy_name, enc_key)
  WHERE allergy_name IS NOT NULL AND allergy_name != '[encrypted]' AND allergy_name_encrypted IS NULL;
  
  UPDATE patient_allergies SET notes_encrypted = pgp_sym_encrypt(notes, enc_key)
  WHERE notes IS NOT NULL AND notes != '[encrypted]' AND notes_encrypted IS NULL;

  -- Communication logs
  UPDATE communication_logs SET content_encrypted = pgp_sym_encrypt(content, enc_key)
  WHERE content IS NOT NULL AND content != '[encrypted]' AND content_encrypted IS NULL;
  
  UPDATE communication_logs SET subject_encrypted = pgp_sym_encrypt(subject, enc_key)
  WHERE subject IS NOT NULL AND subject != '[encrypted]' AND subject_encrypted IS NULL;

  -- Email logs
  UPDATE email_logs SET subject_encrypted = pgp_sym_encrypt(subject, enc_key)
  WHERE subject IS NOT NULL AND subject != '[encrypted]' AND subject_encrypted IS NULL;

  -- Imaging sets
  UPDATE imaging_sets SET notes_encrypted = pgp_sym_encrypt(notes, enc_key)
  WHERE notes IS NOT NULL AND notes != '[encrypted]' AND notes_encrypted IS NULL;

  -- Imaging files
  UPDATE imaging_files SET metadata_encrypted = pgp_sym_encrypt(metadata::text, enc_key)
  WHERE metadata IS NOT NULL AND metadata_encrypted IS NULL;

  -- Patient documents
  UPDATE patient_documents SET title_encrypted = pgp_sym_encrypt(title, enc_key)
  WHERE title IS NOT NULL AND title != '[encrypted]' AND title_encrypted IS NULL;
  
  UPDATE patient_documents SET file_name_encrypted = pgp_sym_encrypt(file_name, enc_key)
  WHERE file_name IS NOT NULL AND file_name != '[encrypted]' AND file_name_encrypted IS NULL;

  -- Appointment reminders
  UPDATE appointment_reminders SET error_message_encrypted = pgp_sym_encrypt(error_message, enc_key)
  WHERE error_message IS NOT NULL AND error_message != '[encrypted]' AND error_message_encrypted IS NULL;
  
  RAISE NOTICE 'Backfill complete';
END $$;

-- ============================================================
-- STEP 2: Drop ALL duplicate v_*_decrypted views
-- ============================================================
DROP VIEW IF EXISTS v_appointments_decrypted CASCADE;
DROP VIEW IF EXISTS v_chat_messages_decrypted CASCADE;
DROP VIEW IF EXISTS v_communication_logs_decrypted CASCADE;
DROP VIEW IF EXISTS v_medical_records_decrypted CASCADE;
DROP VIEW IF EXISTS v_messages_decrypted CASCADE;
DROP VIEW IF EXISTS v_notes_decrypted CASCADE;
DROP VIEW IF EXISTS v_patient_allergies_decrypted CASCADE;
DROP VIEW IF EXISTS v_treatment_plans_decrypted CASCADE;

-- ============================================================
-- STEP 3: Drop ALL existing secure views (will recreate after column drops)
-- ============================================================
DROP VIEW IF EXISTS secure_appointments_view CASCADE;
DROP VIEW IF EXISTS secure_chat_messages_view CASCADE;
DROP VIEW IF EXISTS secure_communication_logs_view CASCADE;
DROP VIEW IF EXISTS secure_email_logs_view CASCADE;
DROP VIEW IF EXISTS secure_imaging_files_view CASCADE;
DROP VIEW IF EXISTS secure_imaging_sets_view CASCADE;
DROP VIEW IF EXISTS secure_medical_records_view CASCADE;
DROP VIEW IF EXISTS secure_messages_view CASCADE;
DROP VIEW IF EXISTS secure_notes_view CASCADE;
DROP VIEW IF EXISTS secure_patient_allergies_view CASCADE;
DROP VIEW IF EXISTS secure_patient_documents_view CASCADE;
DROP VIEW IF EXISTS secure_treatment_plans_view CASCADE;
DROP VIEW IF EXISTS secure_appointment_reminders_view CASCADE;

-- ============================================================
-- STEP 4: Drop duplicate encryption triggers (keep only trg_encrypt_* pattern)
-- ============================================================

-- Appointments: keep trg_encrypt_appointments, drop others
DROP TRIGGER IF EXISTS encrypt_appointments_phi ON appointments;
DROP TRIGGER IF EXISTS encrypt_appointments_phi_trigger ON appointments;

-- Medical records: keep trg_encrypt_medical_records_phi, drop others
DROP TRIGGER IF EXISTS encrypt_medical_record_phi_trigger ON medical_records;
DROP TRIGGER IF EXISTS encrypt_medical_records_phi_trigger ON medical_records;
DROP TRIGGER IF EXISTS encrypt_medical_records_phi ON medical_records;

-- Treatment plans: keep trg_encrypt_treatment_plans_phi, drop others
DROP TRIGGER IF EXISTS trg_encrypt_treatment_plan ON treatment_plans;
DROP TRIGGER IF EXISTS encrypt_treatment_plan_phi_trigger ON treatment_plans;
DROP TRIGGER IF EXISTS encrypt_treatment_plans_phi ON treatment_plans;

-- Notes: keep trg_encrypt_notes_phi_v2, drop others
DROP TRIGGER IF EXISTS encrypt_notes_phi ON notes;
DROP TRIGGER IF EXISTS encrypt_notes_phi_trigger ON notes;

-- Chat messages: keep trg_encrypt_chat_messages, drop others
DROP TRIGGER IF EXISTS encrypt_chat_messages_phi ON chat_messages;

-- Imaging sets: keep trg_encrypt_imaging_sets, drop others
DROP TRIGGER IF EXISTS encrypt_imaging_sets_phi ON imaging_sets;

-- Patient allergies: keep trg_encrypt_patient_allergies_phi_v2, drop others
DROP TRIGGER IF EXISTS encrypt_patient_allergies_phi_trigger ON patient_allergies;
DROP TRIGGER IF EXISTS encrypt_patient_allergies_phi ON patient_allergies;

-- ============================================================
-- STEP 5: Drop plaintext PHI columns from all tables
-- ============================================================

-- Appointments
ALTER TABLE appointments DROP COLUMN IF EXISTS reason;
ALTER TABLE appointments DROP COLUMN IF EXISTS notes;
ALTER TABLE appointments DROP COLUMN IF EXISTS consultation_notes;
ALTER TABLE appointments DROP COLUMN IF EXISTS ai_summary;
ALTER TABLE appointments DROP COLUMN IF EXISTS patient_name;
ALTER TABLE appointments DROP COLUMN IF EXISTS conversation_transcript;

-- Medical records
ALTER TABLE medical_records DROP COLUMN IF EXISTS findings;
ALTER TABLE medical_records DROP COLUMN IF EXISTS description;
ALTER TABLE medical_records DROP COLUMN IF EXISTS treatment_provided;

-- Treatment plans
ALTER TABLE treatment_plans DROP COLUMN IF EXISTS diagnosis;
ALTER TABLE treatment_plans DROP COLUMN IF EXISTS description;

-- Notes
ALTER TABLE notes DROP COLUMN IF EXISTS content;
ALTER TABLE notes DROP COLUMN IF EXISTS title;

-- Chat messages
ALTER TABLE chat_messages DROP COLUMN IF EXISTS message;
ALTER TABLE chat_messages DROP COLUMN IF EXISTS metadata;

-- Messages
ALTER TABLE messages DROP COLUMN IF EXISTS message_text;

-- Patient allergies
ALTER TABLE patient_allergies DROP COLUMN IF EXISTS allergy_name;
ALTER TABLE patient_allergies DROP COLUMN IF EXISTS notes;

-- Communication logs
ALTER TABLE communication_logs DROP COLUMN IF EXISTS content;
ALTER TABLE communication_logs DROP COLUMN IF EXISTS subject;

-- Email logs
ALTER TABLE email_logs DROP COLUMN IF EXISTS subject;

-- Imaging sets
ALTER TABLE imaging_sets DROP COLUMN IF EXISTS notes;

-- Imaging files
ALTER TABLE imaging_files DROP COLUMN IF EXISTS metadata;

-- Patient documents
ALTER TABLE patient_documents DROP COLUMN IF EXISTS title;
ALTER TABLE patient_documents DROP COLUMN IF EXISTS file_name;

-- Appointment reminders
ALTER TABLE appointment_reminders DROP COLUMN IF EXISTS error_message;

-- ============================================================
-- STEP 6: Rename _encrypted columns to clean names
-- ============================================================

-- Appointments
ALTER TABLE appointments RENAME COLUMN reason_encrypted TO reason;
ALTER TABLE appointments RENAME COLUMN notes_encrypted TO notes;
ALTER TABLE appointments RENAME COLUMN consultation_notes_encrypted TO consultation_notes;
ALTER TABLE appointments RENAME COLUMN ai_summary_encrypted TO ai_summary;
ALTER TABLE appointments RENAME COLUMN patient_name_encrypted TO patient_name;
ALTER TABLE appointments RENAME COLUMN conversation_transcript_encrypted TO conversation_transcript;

-- Medical records
ALTER TABLE medical_records RENAME COLUMN findings_encrypted TO findings;
ALTER TABLE medical_records RENAME COLUMN description_encrypted TO description;
ALTER TABLE medical_records RENAME COLUMN treatment_provided_encrypted TO treatment_provided;

-- Treatment plans
ALTER TABLE treatment_plans RENAME COLUMN diagnosis_encrypted TO diagnosis;
ALTER TABLE treatment_plans RENAME COLUMN description_encrypted TO description;

-- Notes
ALTER TABLE notes RENAME COLUMN content_encrypted TO content;
ALTER TABLE notes RENAME COLUMN title_encrypted TO title;

-- Chat messages
ALTER TABLE chat_messages RENAME COLUMN message_encrypted TO message;
ALTER TABLE chat_messages RENAME COLUMN metadata_encrypted TO metadata;

-- Messages
ALTER TABLE messages RENAME COLUMN message_text_encrypted TO message_text;

-- Patient allergies
ALTER TABLE patient_allergies RENAME COLUMN allergy_name_encrypted TO allergy_name;
ALTER TABLE patient_allergies RENAME COLUMN notes_encrypted TO notes;

-- Communication logs
ALTER TABLE communication_logs RENAME COLUMN content_encrypted TO content;
ALTER TABLE communication_logs RENAME COLUMN subject_encrypted TO subject;

-- Email logs
ALTER TABLE email_logs RENAME COLUMN subject_encrypted TO subject;

-- Imaging sets
ALTER TABLE imaging_sets RENAME COLUMN notes_encrypted TO notes;

-- Imaging files
ALTER TABLE imaging_files RENAME COLUMN metadata_encrypted TO metadata;

-- Patient documents
ALTER TABLE patient_documents RENAME COLUMN title_encrypted TO title;
ALTER TABLE patient_documents RENAME COLUMN file_name_encrypted TO file_name;

-- Appointment reminders
ALTER TABLE appointment_reminders RENAME COLUMN error_message_encrypted TO error_message;

-- ============================================================
-- STEP 7: Recreate secure views that decrypt from the renamed columns
-- These are the ONLY way to read PHI data
-- ============================================================

CREATE OR REPLACE VIEW secure_appointments_view AS
SELECT id, patient_id, dentist_id, business_id, appointment_date, duration_minutes,
  status, urgency, booking_source, service_id, appointment_type_id, treatment_plan_id,
  payment_status, payment_intent_id, amount_paid_cents, completed_at, created_at, updated_at,
  decrypt_phi(reason) AS reason,
  decrypt_phi(notes) AS notes,
  decrypt_phi(consultation_notes) AS consultation_notes,
  decrypt_phi(ai_summary) AS ai_summary,
  decrypt_phi(patient_name) AS patient_name,
  (decrypt_phi(conversation_transcript))::jsonb AS conversation_transcript
FROM appointments;

CREATE OR REPLACE VIEW secure_medical_records_view AS
SELECT id, patient_id, dentist_id, business_id, title, record_type, record_date,
  created_at, updated_at,
  decrypt_phi(findings) AS findings,
  decrypt_phi(description) AS description,
  decrypt_phi(treatment_provided) AS treatment_provided
FROM medical_records;

CREATE OR REPLACE VIEW secure_treatment_plans_view AS
SELECT id, patient_id, dentist_id, business_id, title, status, priority,
  start_date, end_date, estimated_cost, estimated_duration_weeks, estimated_duration,
  total_estimated_cents, currency, notes, procedures, treatment_goals,
  target_completion_date, version, created_from_appointment_id, created_by_dentist_id,
  created_at, updated_at,
  decrypt_phi(diagnosis) AS diagnosis,
  decrypt_phi(description) AS description
FROM treatment_plans;

CREATE OR REPLACE VIEW secure_notes_view AS
SELECT id, patient_id, appointment_id, dentist_id, created_by, note_type,
  is_private, created_at, updated_at,
  decrypt_phi(content) AS content,
  decrypt_phi(title) AS title
FROM notes;

CREATE OR REPLACE VIEW secure_chat_messages_view AS
SELECT id, session_id, user_id, is_bot, message_type, appointment_id,
  created_at, updated_at,
  decrypt_phi(message) AS message,
  (decrypt_phi(metadata))::jsonb AS metadata
FROM chat_messages;

CREATE OR REPLACE VIEW secure_messages_view AS
SELECT id, sender_profile_id, recipient_profile_id, business_id, is_read,
  created_at, updated_at,
  decrypt_phi(message_text) AS message_text
FROM messages;

CREATE OR REPLACE VIEW secure_patient_allergies_view AS
SELECT id, patient_id, business_id, severity, created_by, created_at, updated_at,
  decrypt_phi(allergy_name) AS allergy_name,
  decrypt_phi(notes) AS notes
FROM patient_allergies;

CREATE OR REPLACE VIEW secure_communication_logs_view AS
SELECT id, business_id, patient_id, channel, direction, status, sent_by, created_at,
  decrypt_phi(content) AS content,
  decrypt_phi(subject) AS subject
FROM communication_logs;

CREATE OR REPLACE VIEW secure_email_logs_view AS
SELECT id, business_id, email_type, recipient_email, recipient_name, status,
  sent_at, created_at,
  decrypt_phi(subject) AS subject
FROM email_logs;

CREATE OR REPLACE VIEW secure_imaging_sets_view AS
SELECT id, business_id, patient_id, appointment_id, uploaded_by, imaging_type,
  treatment_plan_id, created_at, updated_at,
  decrypt_phi(notes) AS notes
FROM imaging_sets;

CREATE OR REPLACE VIEW secure_imaging_files_view AS
SELECT id, imaging_set_id, storage_path, filename, original_filename, mime_type,
  size_bytes, width, height, thumbnail_path, created_at,
  (decrypt_phi(metadata))::jsonb AS metadata
FROM imaging_files;

CREATE OR REPLACE VIEW secure_patient_documents_view AS
SELECT id, patient_id, business_id, document_type, file_path, file_size_bytes,
  mime_type, uploaded_by, created_at,
  decrypt_phi(title) AS title,
  decrypt_phi(file_name) AS file_name
FROM patient_documents;

CREATE OR REPLACE VIEW secure_appointment_reminders_view AS
SELECT id, appointment_id, reminder_type, notification_method, scheduled_for,
  sent_at, status, created_at, updated_at,
  decrypt_phi(error_message) AS error_message
FROM appointment_reminders;

-- ============================================================
-- STEP 8: Update encryption triggers to write to renamed columns
-- The triggers now write directly to the column (which is bytea/encrypted)
-- ============================================================

-- Unified encryption trigger function for all tables
CREATE OR REPLACE FUNCTION private.encrypt_field(plaintext TEXT)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  IF plaintext IS NULL THEN
    RETURN NULL;
  END IF;
  
  enc_key := private.get_encryption_key();
  IF enc_key IS NULL OR enc_key = '' THEN
    -- Cannot encrypt - return NULL (data won't be saved)
    RAISE WARNING 'Encryption key unavailable - data cannot be stored';
    RETURN NULL;
  END IF;
  
  RETURN pgp_sym_encrypt(plaintext, enc_key);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Encryption failed: %', SQLERRM;
  RETURN NULL;
END;
$$;

-- Drop old trigger functions that reference removed columns
DROP FUNCTION IF EXISTS public.encrypt_notes_phi() CASCADE;
DROP FUNCTION IF EXISTS public.encrypt_patient_allergies_phi() CASCADE;
DROP FUNCTION IF EXISTS public.encrypt_treatment_plan_phi() CASCADE;
DROP FUNCTION IF EXISTS public.encrypt_medical_record_phi() CASCADE;

-- Drop the get_decrypted_or_plain function (no longer needed, no plaintext fallback)
DROP FUNCTION IF EXISTS public.get_decrypted_or_plain(bytea, text) CASCADE;
DROP FUNCTION IF EXISTS public.clean_encrypted_display(text) CASCADE;
