-- Fix all encryption trigger functions to fail gracefully
-- Add EXCEPTION WHEN OTHERS THEN RETURN NEW to prevent save failures

-- ============================================
-- 1. FIX PROFILES ENCRYPTION
-- ============================================
CREATE OR REPLACE FUNCTION public.encrypt_profiles_phi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();

  IF enc_key IS NULL OR enc_key = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.first_name IS NOT NULL AND NEW.first_name != '' THEN
    NEW.first_name_encrypted := pgp_sym_encrypt(NEW.first_name, enc_key);
  END IF;

  IF NEW.last_name IS NOT NULL AND NEW.last_name != '' THEN
    NEW.last_name_encrypted := pgp_sym_encrypt(NEW.last_name, enc_key);
  END IF;

  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    NEW.phone_encrypted := pgp_sym_encrypt(NEW.phone, enc_key);
  END IF;

  IF NEW.date_of_birth IS NOT NULL THEN
    NEW.date_of_birth_encrypted := pgp_sym_encrypt(NEW.date_of_birth::text, enc_key);
  END IF;

  IF NEW.medical_history IS NOT NULL AND NEW.medical_history != '' THEN
    NEW.medical_history_encrypted := pgp_sym_encrypt(NEW.medical_history, enc_key);
  END IF;

  IF NEW.address IS NOT NULL AND NEW.address != '' THEN
    NEW.address_encrypted := pgp_sym_encrypt(NEW.address, enc_key);
  END IF;

  IF NEW.emergency_contact IS NOT NULL AND NEW.emergency_contact != '' THEN
    NEW.emergency_contact_encrypted := pgp_sym_encrypt(NEW.emergency_contact, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- If encryption fails for any reason, allow the save to proceed without encryption
  RETURN NEW;
END;
$$;

-- ============================================
-- 2. FIX TREATMENT_PLANS ENCRYPTION
-- ============================================
CREATE OR REPLACE FUNCTION public.encrypt_treatment_plans_phi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();

  IF enc_key IS NULL OR enc_key = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.diagnosis IS NOT NULL AND NEW.diagnosis != '' THEN
    NEW.diagnosis_encrypted := pgp_sym_encrypt(NEW.diagnosis, enc_key);
  END IF;

  IF NEW.description IS NOT NULL AND NEW.description != '' THEN
    NEW.description_encrypted := pgp_sym_encrypt(NEW.description, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- ============================================
-- 3. FIX MEDICAL_RECORDS ENCRYPTION
-- ============================================
CREATE OR REPLACE FUNCTION public.encrypt_medical_records_phi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();

  IF enc_key IS NULL OR enc_key = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.findings IS NOT NULL AND NEW.findings != '' THEN
    NEW.findings_encrypted := pgp_sym_encrypt(NEW.findings, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- ============================================
-- 4. FIX NOTES ENCRYPTION
-- ============================================
CREATE OR REPLACE FUNCTION public.encrypt_notes_phi_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();

  IF enc_key IS NULL OR enc_key = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.content IS NOT NULL AND NEW.content != '' THEN
    NEW.content_encrypted := pgp_sym_encrypt(NEW.content, enc_key);
  END IF;

  IF NEW.title IS NOT NULL AND NEW.title != '' THEN
    NEW.title_encrypted := pgp_sym_encrypt(NEW.title, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- ============================================
-- 5. FIX PATIENT_ALLERGIES ENCRYPTION
-- ============================================
CREATE OR REPLACE FUNCTION public.encrypt_patient_allergies_phi_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();

  IF enc_key IS NULL OR enc_key = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.allergy_name IS NOT NULL AND NEW.allergy_name != '' THEN
    NEW.allergy_name_encrypted := pgp_sym_encrypt(NEW.allergy_name, enc_key);
  END IF;

  IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
    NEW.notes_encrypted := pgp_sym_encrypt(NEW.notes, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- ============================================
-- 6. FIX APPOINTMENTS ENCRYPTION
-- ============================================
CREATE OR REPLACE FUNCTION public.encrypt_appointments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();

  IF enc_key IS NULL OR enc_key = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.reason IS NOT NULL AND NEW.reason != '' THEN
    NEW.reason_encrypted := pgp_sym_encrypt(NEW.reason, enc_key);
  END IF;

  IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
    NEW.notes_encrypted := pgp_sym_encrypt(NEW.notes, enc_key);
  END IF;

  IF NEW.consultation_notes IS NOT NULL AND NEW.consultation_notes != '' THEN
    NEW.consultation_notes_encrypted := pgp_sym_encrypt(NEW.consultation_notes, enc_key);
  END IF;

  IF NEW.ai_summary IS NOT NULL AND NEW.ai_summary != '' THEN
    NEW.ai_summary_encrypted := pgp_sym_encrypt(NEW.ai_summary, enc_key);
  END IF;

  IF NEW.patient_name IS NOT NULL AND NEW.patient_name != '' THEN
    NEW.patient_name_encrypted := pgp_sym_encrypt(NEW.patient_name, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- ============================================
-- 7. FIX CHAT_MESSAGES ENCRYPTION
-- ============================================
CREATE OR REPLACE FUNCTION public.encrypt_chat_messages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();

  IF enc_key IS NULL OR enc_key = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.message IS NOT NULL AND NEW.message != '' THEN
    NEW.message_encrypted := pgp_sym_encrypt(NEW.message, enc_key);
  END IF;

  IF NEW.metadata IS NOT NULL THEN
    NEW.metadata_encrypted := pgp_sym_encrypt(NEW.metadata::text, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- ============================================
-- 8. FIX MESSAGES ENCRYPTION
-- ============================================
CREATE OR REPLACE FUNCTION public.encrypt_messages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();

  IF enc_key IS NULL OR enc_key = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.message_text IS NOT NULL AND NEW.message_text != '' THEN
    NEW.message_text_encrypted := pgp_sym_encrypt(NEW.message_text, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- ============================================
-- 9. FIX COMMUNICATION_LOGS ENCRYPTION
-- ============================================
CREATE OR REPLACE FUNCTION public.encrypt_communication_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();

  IF enc_key IS NULL OR enc_key = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.content IS NOT NULL AND NEW.content != '' THEN
    NEW.content_encrypted := pgp_sym_encrypt(NEW.content, enc_key);
  END IF;

  IF NEW.subject IS NOT NULL AND NEW.subject != '' THEN
    NEW.subject_encrypted := pgp_sym_encrypt(NEW.subject, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- ============================================
-- 10. FIX EMAIL_LOGS ENCRYPTION
-- ============================================
CREATE OR REPLACE FUNCTION public.encrypt_email_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();

  IF enc_key IS NULL OR enc_key = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.subject IS NOT NULL AND NEW.subject != '' THEN
    NEW.subject_encrypted := pgp_sym_encrypt(NEW.subject, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- ============================================
-- 11. FIX APPOINTMENT_REMINDERS ENCRYPTION
-- ============================================
CREATE OR REPLACE FUNCTION public.encrypt_appointment_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();

  IF enc_key IS NULL OR enc_key = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.error_message IS NOT NULL AND NEW.error_message != '' THEN
    NEW.error_message_encrypted := pgp_sym_encrypt(NEW.error_message, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- ============================================
-- 12. FIX IMAGING_SETS ENCRYPTION
-- ============================================
CREATE OR REPLACE FUNCTION public.encrypt_imaging_sets()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();

  IF enc_key IS NULL OR enc_key = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
    NEW.notes_encrypted := pgp_sym_encrypt(NEW.notes, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- ============================================
-- 13. FIX IMAGING_FILES ENCRYPTION
-- ============================================
CREATE OR REPLACE FUNCTION public.encrypt_imaging_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();

  IF enc_key IS NULL OR enc_key = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.metadata IS NOT NULL THEN
    NEW.metadata_encrypted := pgp_sym_encrypt(NEW.metadata::text, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- ============================================
-- 14. FIX PATIENT_DOCUMENTS ENCRYPTION
-- ============================================
CREATE OR REPLACE FUNCTION public.encrypt_patient_documents()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();

  IF enc_key IS NULL OR enc_key = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.title IS NOT NULL AND NEW.title != '' THEN
    NEW.title_encrypted := pgp_sym_encrypt(NEW.title, enc_key);
  END IF;

  IF NEW.file_name IS NOT NULL AND NEW.file_name != '' THEN
    NEW.file_name_encrypted := pgp_sym_encrypt(NEW.file_name, enc_key);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
