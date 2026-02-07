
-- ============================================================
-- Convert all encrypted bytea columns to TEXT (base64 encoded)
-- This allows frontend to write plaintext, triggers encrypt on write
-- ============================================================

-- Drop all existing views first (they reference these columns)
DROP VIEW IF EXISTS secure_appointments_view CASCADE;
DROP VIEW IF EXISTS secure_medical_records_view CASCADE;
DROP VIEW IF EXISTS secure_treatment_plans_view CASCADE;
DROP VIEW IF EXISTS secure_notes_view CASCADE;
DROP VIEW IF EXISTS secure_chat_messages_view CASCADE;
DROP VIEW IF EXISTS secure_messages_view CASCADE;
DROP VIEW IF EXISTS secure_patient_allergies_view CASCADE;
DROP VIEW IF EXISTS secure_communication_logs_view CASCADE;
DROP VIEW IF EXISTS secure_email_logs_view CASCADE;
DROP VIEW IF EXISTS secure_imaging_sets_view CASCADE;
DROP VIEW IF EXISTS secure_imaging_files_view CASCADE;
DROP VIEW IF EXISTS secure_patient_documents_view CASCADE;
DROP VIEW IF EXISTS secure_appointment_reminders_view CASCADE;

-- ============================================================
-- Convert bytea -> TEXT with base64 encoding for existing data
-- ============================================================

-- Appointments
ALTER TABLE appointments ALTER COLUMN reason TYPE TEXT USING encode(reason, 'base64');
ALTER TABLE appointments ALTER COLUMN notes TYPE TEXT USING encode(notes, 'base64');
ALTER TABLE appointments ALTER COLUMN consultation_notes TYPE TEXT USING encode(consultation_notes, 'base64');
ALTER TABLE appointments ALTER COLUMN ai_summary TYPE TEXT USING encode(ai_summary, 'base64');
ALTER TABLE appointments ALTER COLUMN patient_name TYPE TEXT USING encode(patient_name, 'base64');
ALTER TABLE appointments ALTER COLUMN conversation_transcript TYPE TEXT USING encode(conversation_transcript, 'base64');

-- Medical records
ALTER TABLE medical_records ALTER COLUMN findings TYPE TEXT USING encode(findings, 'base64');
ALTER TABLE medical_records ALTER COLUMN description TYPE TEXT USING encode(description, 'base64');
ALTER TABLE medical_records ALTER COLUMN treatment_provided TYPE TEXT USING encode(treatment_provided, 'base64');

-- Treatment plans
ALTER TABLE treatment_plans ALTER COLUMN diagnosis TYPE TEXT USING encode(diagnosis, 'base64');
ALTER TABLE treatment_plans ALTER COLUMN description TYPE TEXT USING encode(description, 'base64');

-- Notes
ALTER TABLE notes ALTER COLUMN content TYPE TEXT USING encode(content, 'base64');
ALTER TABLE notes ALTER COLUMN title TYPE TEXT USING encode(title, 'base64');

-- Chat messages
ALTER TABLE chat_messages ALTER COLUMN message TYPE TEXT USING encode(message, 'base64');
ALTER TABLE chat_messages ALTER COLUMN metadata TYPE TEXT USING encode(metadata, 'base64');

-- Messages
ALTER TABLE messages ALTER COLUMN message_text TYPE TEXT USING encode(message_text, 'base64');

-- Patient allergies
ALTER TABLE patient_allergies ALTER COLUMN allergy_name TYPE TEXT USING encode(allergy_name, 'base64');
ALTER TABLE patient_allergies ALTER COLUMN notes TYPE TEXT USING encode(notes, 'base64');

-- Communication logs
ALTER TABLE communication_logs ALTER COLUMN content TYPE TEXT USING encode(content, 'base64');
ALTER TABLE communication_logs ALTER COLUMN subject TYPE TEXT USING encode(subject, 'base64');

-- Email logs
ALTER TABLE email_logs ALTER COLUMN subject TYPE TEXT USING encode(subject, 'base64');

-- Imaging sets
ALTER TABLE imaging_sets ALTER COLUMN notes TYPE TEXT USING encode(notes, 'base64');

-- Imaging files
ALTER TABLE imaging_files ALTER COLUMN metadata TYPE TEXT USING encode(metadata, 'base64');

-- Patient documents
ALTER TABLE patient_documents ALTER COLUMN title TYPE TEXT USING encode(title, 'base64');
ALTER TABLE patient_documents ALTER COLUMN file_name TYPE TEXT USING encode(file_name, 'base64');

-- Appointment reminders
ALTER TABLE appointment_reminders ALTER COLUMN error_message TYPE TEXT USING encode(error_message, 'base64');

-- Set default for reason (required field)
ALTER TABLE appointments ALTER COLUMN reason SET DEFAULT '';

-- ============================================================
-- Drop ALL old encryption triggers (they reference old schema)
-- ============================================================
DROP TRIGGER IF EXISTS trg_encrypt_appointments ON appointments;
DROP TRIGGER IF EXISTS trg_encrypt_medical_records_phi ON medical_records;
DROP TRIGGER IF EXISTS trg_encrypt_treatment_plans_phi ON treatment_plans;
DROP TRIGGER IF EXISTS trg_encrypt_notes_phi_v2 ON notes;
DROP TRIGGER IF EXISTS trg_encrypt_chat_messages ON chat_messages;
DROP TRIGGER IF EXISTS trg_encrypt_messages ON messages;
DROP TRIGGER IF EXISTS trg_encrypt_patient_allergies_phi_v2 ON patient_allergies;
DROP TRIGGER IF EXISTS trg_encrypt_communication_logs ON communication_logs;
DROP TRIGGER IF EXISTS trg_encrypt_email_logs ON email_logs;
DROP TRIGGER IF EXISTS trg_encrypt_imaging_sets ON imaging_sets;
DROP TRIGGER IF EXISTS trg_encrypt_imaging_files ON imaging_files;
DROP TRIGGER IF EXISTS trg_encrypt_patient_documents ON patient_documents;
DROP TRIGGER IF EXISTS trg_encrypt_appointment_reminders ON appointment_reminders;

-- ============================================================
-- Create unified encrypt-on-write function
-- Encrypts a plaintext value to base64-encoded ciphertext
-- ============================================================
CREATE OR REPLACE FUNCTION private.encrypt_to_base64(plaintext TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  IF plaintext IS NULL OR plaintext = '' THEN
    RETURN plaintext;
  END IF;
  
  enc_key := private.get_encryption_key();
  IF enc_key IS NULL OR enc_key = '' THEN
    RETURN plaintext; -- Graceful degradation: store plaintext if no key
  END IF;
  
  RETURN encode(pgp_sym_encrypt(plaintext, enc_key), 'base64');
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Encryption failed: %. Storing plaintext.', SQLERRM;
  RETURN plaintext;
END;
$$;

-- ============================================================
-- Create decrypt function for base64-encoded ciphertext
-- ============================================================
CREATE OR REPLACE FUNCTION private.decrypt_from_base64(ciphertext_b64 TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  IF ciphertext_b64 IS NULL OR ciphertext_b64 = '' THEN
    RETURN ciphertext_b64;
  END IF;
  
  enc_key := private.get_encryption_key();
  IF enc_key IS NULL OR enc_key = '' THEN
    RETURN ciphertext_b64;
  END IF;
  
  RETURN pgp_sym_decrypt(decode(ciphertext_b64, 'base64'), enc_key);
EXCEPTION WHEN OTHERS THEN
  -- If decryption fails, the data might be plaintext (pre-encryption)
  RETURN ciphertext_b64;
END;
$$;

-- ============================================================
-- Create per-table encryption triggers
-- Only encrypt if the value changed (prevents double-encryption on partial updates)
-- ============================================================

-- APPOINTMENTS
CREATE OR REPLACE FUNCTION private.trg_encrypt_appointments()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.reason IS DISTINCT FROM OLD.reason THEN
    NEW.reason := private.encrypt_to_base64(NEW.reason);
  END IF;
  IF TG_OP = 'INSERT' OR NEW.notes IS DISTINCT FROM OLD.notes THEN
    NEW.notes := private.encrypt_to_base64(NEW.notes);
  END IF;
  IF TG_OP = 'INSERT' OR NEW.consultation_notes IS DISTINCT FROM OLD.consultation_notes THEN
    NEW.consultation_notes := private.encrypt_to_base64(NEW.consultation_notes);
  END IF;
  IF TG_OP = 'INSERT' OR NEW.ai_summary IS DISTINCT FROM OLD.ai_summary THEN
    NEW.ai_summary := private.encrypt_to_base64(NEW.ai_summary);
  END IF;
  IF TG_OP = 'INSERT' OR NEW.patient_name IS DISTINCT FROM OLD.patient_name THEN
    NEW.patient_name := private.encrypt_to_base64(NEW.patient_name);
  END IF;
  IF TG_OP = 'INSERT' OR NEW.conversation_transcript IS DISTINCT FROM OLD.conversation_transcript THEN
    NEW.conversation_transcript := private.encrypt_to_base64(NEW.conversation_transcript);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_encrypt_appointments
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION private.trg_encrypt_appointments();

-- MEDICAL RECORDS
CREATE OR REPLACE FUNCTION private.trg_encrypt_medical_records()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.findings IS DISTINCT FROM OLD.findings THEN
    NEW.findings := private.encrypt_to_base64(NEW.findings);
  END IF;
  IF TG_OP = 'INSERT' OR NEW.description IS DISTINCT FROM OLD.description THEN
    NEW.description := private.encrypt_to_base64(NEW.description);
  END IF;
  IF TG_OP = 'INSERT' OR NEW.treatment_provided IS DISTINCT FROM OLD.treatment_provided THEN
    NEW.treatment_provided := private.encrypt_to_base64(NEW.treatment_provided);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_encrypt_medical_records
  BEFORE INSERT OR UPDATE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION private.trg_encrypt_medical_records();

-- TREATMENT PLANS
CREATE OR REPLACE FUNCTION private.trg_encrypt_treatment_plans()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.diagnosis IS DISTINCT FROM OLD.diagnosis THEN
    NEW.diagnosis := private.encrypt_to_base64(NEW.diagnosis);
  END IF;
  IF TG_OP = 'INSERT' OR NEW.description IS DISTINCT FROM OLD.description THEN
    NEW.description := private.encrypt_to_base64(NEW.description);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_encrypt_treatment_plans
  BEFORE INSERT OR UPDATE ON treatment_plans
  FOR EACH ROW EXECUTE FUNCTION private.trg_encrypt_treatment_plans();

-- NOTES
CREATE OR REPLACE FUNCTION private.trg_encrypt_notes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.content IS DISTINCT FROM OLD.content THEN
    NEW.content := private.encrypt_to_base64(NEW.content);
  END IF;
  IF TG_OP = 'INSERT' OR NEW.title IS DISTINCT FROM OLD.title THEN
    NEW.title := private.encrypt_to_base64(NEW.title);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_encrypt_notes
  BEFORE INSERT OR UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION private.trg_encrypt_notes();

-- CHAT MESSAGES
CREATE OR REPLACE FUNCTION private.trg_encrypt_chat_messages()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.message IS DISTINCT FROM OLD.message THEN
    NEW.message := private.encrypt_to_base64(NEW.message);
  END IF;
  IF TG_OP = 'INSERT' OR NEW.metadata IS DISTINCT FROM OLD.metadata THEN
    NEW.metadata := private.encrypt_to_base64(NEW.metadata);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_encrypt_chat_messages
  BEFORE INSERT OR UPDATE ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION private.trg_encrypt_chat_messages();

-- MESSAGES
CREATE OR REPLACE FUNCTION private.trg_encrypt_messages()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.message_text IS DISTINCT FROM OLD.message_text THEN
    NEW.message_text := private.encrypt_to_base64(NEW.message_text);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_encrypt_messages
  BEFORE INSERT OR UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION private.trg_encrypt_messages();

-- PATIENT ALLERGIES
CREATE OR REPLACE FUNCTION private.trg_encrypt_patient_allergies()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.allergy_name IS DISTINCT FROM OLD.allergy_name THEN
    NEW.allergy_name := private.encrypt_to_base64(NEW.allergy_name);
  END IF;
  IF TG_OP = 'INSERT' OR NEW.notes IS DISTINCT FROM OLD.notes THEN
    NEW.notes := private.encrypt_to_base64(NEW.notes);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_encrypt_patient_allergies
  BEFORE INSERT OR UPDATE ON patient_allergies
  FOR EACH ROW EXECUTE FUNCTION private.trg_encrypt_patient_allergies();

-- COMMUNICATION LOGS
CREATE OR REPLACE FUNCTION private.trg_encrypt_communication_logs()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.content IS DISTINCT FROM OLD.content THEN
    NEW.content := private.encrypt_to_base64(NEW.content);
  END IF;
  IF TG_OP = 'INSERT' OR NEW.subject IS DISTINCT FROM OLD.subject THEN
    NEW.subject := private.encrypt_to_base64(NEW.subject);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_encrypt_communication_logs
  BEFORE INSERT OR UPDATE ON communication_logs
  FOR EACH ROW EXECUTE FUNCTION private.trg_encrypt_communication_logs();

-- EMAIL LOGS
CREATE OR REPLACE FUNCTION private.trg_encrypt_email_logs()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.subject IS DISTINCT FROM OLD.subject THEN
    NEW.subject := private.encrypt_to_base64(NEW.subject);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_encrypt_email_logs
  BEFORE INSERT OR UPDATE ON email_logs
  FOR EACH ROW EXECUTE FUNCTION private.trg_encrypt_email_logs();

-- IMAGING SETS
CREATE OR REPLACE FUNCTION private.trg_encrypt_imaging_sets()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.notes IS DISTINCT FROM OLD.notes THEN
    NEW.notes := private.encrypt_to_base64(NEW.notes);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_encrypt_imaging_sets
  BEFORE INSERT OR UPDATE ON imaging_sets
  FOR EACH ROW EXECUTE FUNCTION private.trg_encrypt_imaging_sets();

-- IMAGING FILES
CREATE OR REPLACE FUNCTION private.trg_encrypt_imaging_files()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.metadata IS DISTINCT FROM OLD.metadata THEN
    NEW.metadata := private.encrypt_to_base64(NEW.metadata);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_encrypt_imaging_files
  BEFORE INSERT OR UPDATE ON imaging_files
  FOR EACH ROW EXECUTE FUNCTION private.trg_encrypt_imaging_files();

-- PATIENT DOCUMENTS
CREATE OR REPLACE FUNCTION private.trg_encrypt_patient_documents()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.title IS DISTINCT FROM OLD.title THEN
    NEW.title := private.encrypt_to_base64(NEW.title);
  END IF;
  IF TG_OP = 'INSERT' OR NEW.file_name IS DISTINCT FROM OLD.file_name THEN
    NEW.file_name := private.encrypt_to_base64(NEW.file_name);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_encrypt_patient_documents
  BEFORE INSERT OR UPDATE ON patient_documents
  FOR EACH ROW EXECUTE FUNCTION private.trg_encrypt_patient_documents();

-- APPOINTMENT REMINDERS
CREATE OR REPLACE FUNCTION private.trg_encrypt_appointment_reminders()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.error_message IS DISTINCT FROM OLD.error_message THEN
    NEW.error_message := private.encrypt_to_base64(NEW.error_message);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_encrypt_appointment_reminders
  BEFORE INSERT OR UPDATE ON appointment_reminders
  FOR EACH ROW EXECUTE FUNCTION private.trg_encrypt_appointment_reminders();

-- ============================================================
-- Recreate secure views using decrypt_from_base64
-- These are the ONLY way to read PHI data as plaintext
-- ============================================================

CREATE OR REPLACE VIEW secure_appointments_view
WITH (security_invoker = on) AS
SELECT id, patient_id, dentist_id, business_id, appointment_date, duration_minutes,
  status, urgency, booking_source, service_id, appointment_type_id, treatment_plan_id,
  payment_status, payment_intent_id, amount_paid_cents, completed_at, created_at, updated_at,
  private.decrypt_from_base64(reason) AS reason,
  private.decrypt_from_base64(notes) AS notes,
  private.decrypt_from_base64(consultation_notes) AS consultation_notes,
  private.decrypt_from_base64(ai_summary) AS ai_summary,
  private.decrypt_from_base64(patient_name) AS patient_name,
  private.decrypt_from_base64(conversation_transcript)::jsonb AS conversation_transcript
FROM appointments;

CREATE OR REPLACE VIEW secure_medical_records_view
WITH (security_invoker = on) AS
SELECT id, patient_id, dentist_id, business_id, title, record_type, record_date,
  created_at, updated_at,
  private.decrypt_from_base64(findings) AS findings,
  private.decrypt_from_base64(description) AS description,
  private.decrypt_from_base64(treatment_provided) AS treatment_provided
FROM medical_records;

CREATE OR REPLACE VIEW secure_treatment_plans_view
WITH (security_invoker = on) AS
SELECT id, patient_id, dentist_id, business_id, title, status, priority,
  start_date, end_date, estimated_cost, estimated_duration_weeks, estimated_duration,
  total_estimated_cents, currency, notes, procedures, treatment_goals,
  target_completion_date, version, created_from_appointment_id, created_by_dentist_id,
  created_at, updated_at,
  private.decrypt_from_base64(diagnosis) AS diagnosis,
  private.decrypt_from_base64(description) AS description
FROM treatment_plans;

CREATE OR REPLACE VIEW secure_notes_view
WITH (security_invoker = on) AS
SELECT id, patient_id, appointment_id, dentist_id, created_by, note_type,
  is_private, created_at, updated_at,
  private.decrypt_from_base64(content) AS content,
  private.decrypt_from_base64(title) AS title
FROM notes;

CREATE OR REPLACE VIEW secure_chat_messages_view
WITH (security_invoker = on) AS
SELECT id, session_id, user_id, is_bot, message_type, appointment_id,
  created_at, updated_at,
  private.decrypt_from_base64(message) AS message,
  private.decrypt_from_base64(metadata)::jsonb AS metadata
FROM chat_messages;

CREATE OR REPLACE VIEW secure_messages_view
WITH (security_invoker = on) AS
SELECT id, sender_profile_id, recipient_profile_id, business_id, is_read,
  created_at, updated_at,
  private.decrypt_from_base64(message_text) AS message_text
FROM messages;

CREATE OR REPLACE VIEW secure_patient_allergies_view
WITH (security_invoker = on) AS
SELECT id, patient_id, business_id, severity, created_by, created_at, updated_at,
  private.decrypt_from_base64(allergy_name) AS allergy_name,
  private.decrypt_from_base64(notes) AS notes
FROM patient_allergies;

CREATE OR REPLACE VIEW secure_communication_logs_view
WITH (security_invoker = on) AS
SELECT id, business_id, patient_id, channel, direction, status, sent_by, created_at,
  private.decrypt_from_base64(content) AS content,
  private.decrypt_from_base64(subject) AS subject
FROM communication_logs;

CREATE OR REPLACE VIEW secure_email_logs_view
WITH (security_invoker = on) AS
SELECT id, business_id, email_type, recipient_email, recipient_name, status,
  sent_at, created_at,
  private.decrypt_from_base64(subject) AS subject
FROM email_logs;

CREATE OR REPLACE VIEW secure_imaging_sets_view
WITH (security_invoker = on) AS
SELECT id, business_id, patient_id, appointment_id, uploaded_by, imaging_type,
  treatment_plan_id, created_at, updated_at,
  private.decrypt_from_base64(notes) AS notes
FROM imaging_sets;

CREATE OR REPLACE VIEW secure_imaging_files_view
WITH (security_invoker = on) AS
SELECT id, imaging_set_id, storage_path, filename, original_filename, mime_type,
  size_bytes, width, height, thumbnail_path, created_at,
  private.decrypt_from_base64(metadata)::jsonb AS metadata
FROM imaging_files;

CREATE OR REPLACE VIEW secure_patient_documents_view
WITH (security_invoker = on) AS
SELECT id, patient_id, business_id, document_type, file_path, file_size_bytes,
  mime_type, uploaded_by, created_at,
  private.decrypt_from_base64(title) AS title,
  private.decrypt_from_base64(file_name) AS file_name
FROM patient_documents;

CREATE OR REPLACE VIEW secure_appointment_reminders_view
WITH (security_invoker = on) AS
SELECT id, appointment_id, reminder_type, notification_method, scheduled_for,
  sent_at, status, created_at, updated_at,
  private.decrypt_from_base64(error_message) AS error_message
FROM appointment_reminders;

-- ============================================================
-- Drop old decrypt function that expected bytea
-- ============================================================
DROP FUNCTION IF EXISTS public.decrypt_phi(bytea) CASCADE;
DROP FUNCTION IF EXISTS private.encrypt_field(text) CASCADE;
