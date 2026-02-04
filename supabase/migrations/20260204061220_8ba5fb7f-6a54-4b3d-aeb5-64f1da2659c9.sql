-- Fix all encryption triggers to fail gracefully
-- If encryption key is unavailable, just proceed without encrypting

-- First, create a safe key retrieval function that returns NULL on failure
CREATE OR REPLACE FUNCTION private.get_encryption_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  -- Try to get key from vault
  BEGIN
    SELECT decrypted_secret INTO enc_key
    FROM vault.decrypted_secrets
    WHERE name = 'app_encryption_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    -- If vault access fails, return NULL (encryption will be skipped)
    RETURN NULL;
  END;
  
  RETURN enc_key;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- Now fix all the encryption trigger functions to handle NULL key gracefully

-- Fix profiles encryption trigger
CREATE OR REPLACE FUNCTION private.encrypt_profiles_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  -- Get encryption key, skip if not available
  enc_key := private.get_encryption_key();
  IF enc_key IS NULL THEN
    RETURN NEW;
  END IF;

  -- Encrypt each field if it has data
  IF NEW.first_name IS NOT NULL THEN
    NEW.first_name_encrypted := extensions.pgp_sym_encrypt(NEW.first_name, enc_key);
  END IF;
  IF NEW.last_name IS NOT NULL THEN
    NEW.last_name_encrypted := extensions.pgp_sym_encrypt(NEW.last_name, enc_key);
  END IF;
  IF NEW.phone IS NOT NULL THEN
    NEW.phone_encrypted := extensions.pgp_sym_encrypt(NEW.phone, enc_key);
  END IF;
  IF NEW.date_of_birth IS NOT NULL THEN
    NEW.date_of_birth_encrypted := extensions.pgp_sym_encrypt(NEW.date_of_birth::TEXT, enc_key);
  END IF;
  IF NEW.medical_history IS NOT NULL THEN
    NEW.medical_history_encrypted := extensions.pgp_sym_encrypt(NEW.medical_history, enc_key);
  END IF;
  IF NEW.address IS NOT NULL THEN
    NEW.address_encrypted := extensions.pgp_sym_encrypt(NEW.address, enc_key);
  END IF;
  IF NEW.emergency_contact_name IS NOT NULL THEN
    NEW.emergency_contact_encrypted := extensions.pgp_sym_encrypt(NEW.emergency_contact_name, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- If encryption fails, just proceed without encrypting
  RETURN NEW;
END;
$$;

-- Fix treatment_plans encryption trigger
CREATE OR REPLACE FUNCTION private.encrypt_treatment_plans_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();
  IF enc_key IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.diagnosis IS NOT NULL THEN
    NEW.diagnosis_encrypted := extensions.pgp_sym_encrypt(NEW.diagnosis, enc_key);
  END IF;
  IF NEW.description IS NOT NULL THEN
    NEW.description_encrypted := extensions.pgp_sym_encrypt(NEW.description, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Fix medical_records encryption trigger
CREATE OR REPLACE FUNCTION private.encrypt_medical_records_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();
  IF enc_key IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.findings IS NOT NULL THEN
    NEW.findings_encrypted := extensions.pgp_sym_encrypt(NEW.findings, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Fix notes encryption trigger
CREATE OR REPLACE FUNCTION private.encrypt_notes_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();
  IF enc_key IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.content IS NOT NULL THEN
    NEW.content_encrypted := extensions.pgp_sym_encrypt(NEW.content, enc_key);
  END IF;
  IF NEW.title IS NOT NULL THEN
    NEW.title_encrypted := extensions.pgp_sym_encrypt(NEW.title, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Fix patient_allergies encryption trigger
CREATE OR REPLACE FUNCTION private.encrypt_patient_allergies_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();
  IF enc_key IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.allergy_name IS NOT NULL THEN
    NEW.allergy_name_encrypted := extensions.pgp_sym_encrypt(NEW.allergy_name, enc_key);
  END IF;
  IF NEW.notes IS NOT NULL THEN
    NEW.notes_encrypted := extensions.pgp_sym_encrypt(NEW.notes, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Fix appointments encryption trigger
CREATE OR REPLACE FUNCTION private.encrypt_appointments_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();
  IF enc_key IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.reason IS NOT NULL THEN
    NEW.reason_encrypted := extensions.pgp_sym_encrypt(NEW.reason, enc_key);
  END IF;
  IF NEW.notes IS NOT NULL THEN
    NEW.notes_encrypted := extensions.pgp_sym_encrypt(NEW.notes, enc_key);
  END IF;
  IF NEW.consultation_notes IS NOT NULL THEN
    NEW.consultation_notes_encrypted := extensions.pgp_sym_encrypt(NEW.consultation_notes, enc_key);
  END IF;
  IF NEW.ai_summary IS NOT NULL THEN
    NEW.ai_summary_encrypted := extensions.pgp_sym_encrypt(NEW.ai_summary, enc_key);
  END IF;
  IF NEW.patient_name IS NOT NULL THEN
    NEW.patient_name_encrypted := extensions.pgp_sym_encrypt(NEW.patient_name, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Fix chat_messages encryption trigger
CREATE OR REPLACE FUNCTION private.encrypt_chat_messages_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();
  IF enc_key IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.message IS NOT NULL THEN
    NEW.message_encrypted := extensions.pgp_sym_encrypt(NEW.message, enc_key);
  END IF;
  IF NEW.metadata IS NOT NULL THEN
    NEW.metadata_encrypted := extensions.pgp_sym_encrypt(NEW.metadata::TEXT, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Fix communication_logs encryption trigger  
CREATE OR REPLACE FUNCTION private.encrypt_communication_logs_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();
  IF enc_key IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.content IS NOT NULL THEN
    NEW.content_encrypted := extensions.pgp_sym_encrypt(NEW.content, enc_key);
  END IF;
  IF NEW.subject IS NOT NULL THEN
    NEW.subject_encrypted := extensions.pgp_sym_encrypt(NEW.subject, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Fix email_logs encryption trigger
CREATE OR REPLACE FUNCTION private.encrypt_email_logs_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();
  IF enc_key IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.subject IS NOT NULL THEN
    NEW.subject_encrypted := extensions.pgp_sym_encrypt(NEW.subject, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Fix appointment_reminders encryption trigger
CREATE OR REPLACE FUNCTION private.encrypt_appointment_reminders_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();
  IF enc_key IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.error_message IS NOT NULL THEN
    NEW.error_message_encrypted := extensions.pgp_sym_encrypt(NEW.error_message, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Fix imaging_sets encryption trigger
CREATE OR REPLACE FUNCTION private.encrypt_imaging_sets_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();
  IF enc_key IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.notes IS NOT NULL THEN
    NEW.notes_encrypted := extensions.pgp_sym_encrypt(NEW.notes, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Fix imaging_files encryption trigger
CREATE OR REPLACE FUNCTION private.encrypt_imaging_files_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();
  IF enc_key IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.metadata IS NOT NULL THEN
    NEW.metadata_encrypted := extensions.pgp_sym_encrypt(NEW.metadata::TEXT, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Fix patient_documents encryption trigger
CREATE OR REPLACE FUNCTION private.encrypt_patient_documents_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();
  IF enc_key IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.title IS NOT NULL THEN
    NEW.title_encrypted := extensions.pgp_sym_encrypt(NEW.title, enc_key);
  END IF;
  IF NEW.file_name IS NOT NULL THEN
    NEW.file_name_encrypted := extensions.pgp_sym_encrypt(NEW.file_name, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;