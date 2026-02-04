-- =====================================================
-- PHASE 1: Fix Profile Encryption (Remove Non-PHI Fields)
-- =====================================================

-- Drop existing trigger first
DROP TRIGGER IF EXISTS encrypt_profiles_phi_trigger ON public.profiles;

-- Replace the encrypt_profiles_phi function to only encrypt medical fields
CREATE OR REPLACE FUNCTION public.encrypt_profiles_phi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Get encryption key from Vault via private function
  encryption_key := private.get_encryption_key();
  
  -- If no key configured, skip encryption (for development/testing)
  IF encryption_key IS NULL OR encryption_key = '' THEN
    NEW.medical_history_encrypted := NULL;
    NEW.emergency_contact_encrypted := NULL;
    RETURN NEW;
  END IF;
  
  -- ONLY encrypt medical_history and emergency_contact (true PHI)
  -- DO NOT encrypt: first_name, last_name, phone, address, date_of_birth
  
  IF NEW.medical_history IS NOT NULL AND NEW.medical_history != '' THEN
    NEW.medical_history_encrypted := extensions.pgp_sym_encrypt(NEW.medical_history::text, encryption_key);
  ELSE
    NEW.medical_history_encrypted := NULL;
  END IF;
  
  IF NEW.emergency_contact IS NOT NULL AND NEW.emergency_contact != '' THEN
    NEW.emergency_contact_encrypted := extensions.pgp_sym_encrypt(NEW.emergency_contact::text, encryption_key);
  ELSE
    NEW.emergency_contact_encrypted := NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER encrypt_profiles_phi_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_profiles_phi();

-- =====================================================
-- PHASE 2: Add Missing Encrypted Columns
-- =====================================================

-- 2.1 Add conversation_transcript_encrypted to appointments
ALTER TABLE public.appointments 
  ADD COLUMN IF NOT EXISTS conversation_transcript_encrypted bytea;

-- 2.2 Add missing encrypted columns to medical_records
ALTER TABLE public.medical_records 
  ADD COLUMN IF NOT EXISTS description_encrypted bytea,
  ADD COLUMN IF NOT EXISTS treatment_provided_encrypted bytea;

-- =====================================================
-- Update encrypt_appointments function to include transcript
-- =====================================================

-- Drop existing trigger first
DROP TRIGGER IF EXISTS encrypt_appointments_phi_trigger ON public.appointments;

CREATE OR REPLACE FUNCTION public.encrypt_appointments_phi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := private.get_encryption_key();
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    NEW.reason_encrypted := NULL;
    NEW.notes_encrypted := NULL;
    NEW.consultation_notes_encrypted := NULL;
    NEW.ai_summary_encrypted := NULL;
    NEW.patient_name_encrypted := NULL;
    NEW.conversation_transcript_encrypted := NULL;
    RETURN NEW;
  END IF;
  
  -- Encrypt all PHI fields
  IF NEW.reason IS NOT NULL AND NEW.reason != '' THEN
    NEW.reason_encrypted := extensions.pgp_sym_encrypt(NEW.reason::text, encryption_key);
  ELSE
    NEW.reason_encrypted := NULL;
  END IF;
  
  IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
    NEW.notes_encrypted := extensions.pgp_sym_encrypt(NEW.notes::text, encryption_key);
  ELSE
    NEW.notes_encrypted := NULL;
  END IF;
  
  IF NEW.consultation_notes IS NOT NULL AND NEW.consultation_notes != '' THEN
    NEW.consultation_notes_encrypted := extensions.pgp_sym_encrypt(NEW.consultation_notes::text, encryption_key);
  ELSE
    NEW.consultation_notes_encrypted := NULL;
  END IF;
  
  IF NEW.ai_summary IS NOT NULL AND NEW.ai_summary != '' THEN
    NEW.ai_summary_encrypted := extensions.pgp_sym_encrypt(NEW.ai_summary::text, encryption_key);
  ELSE
    NEW.ai_summary_encrypted := NULL;
  END IF;
  
  IF NEW.patient_name IS NOT NULL AND NEW.patient_name != '' THEN
    NEW.patient_name_encrypted := extensions.pgp_sym_encrypt(NEW.patient_name::text, encryption_key);
  ELSE
    NEW.patient_name_encrypted := NULL;
  END IF;
  
  -- NEW: Encrypt conversation transcript (JSONB converted to text)
  IF NEW.conversation_transcript IS NOT NULL THEN
    NEW.conversation_transcript_encrypted := extensions.pgp_sym_encrypt(NEW.conversation_transcript::text, encryption_key);
  ELSE
    NEW.conversation_transcript_encrypted := NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER encrypt_appointments_phi_trigger
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_appointments_phi();

-- =====================================================
-- Update encrypt_medical_records function
-- =====================================================

-- Drop existing trigger first
DROP TRIGGER IF EXISTS encrypt_medical_records_phi_trigger ON public.medical_records;

CREATE OR REPLACE FUNCTION public.encrypt_medical_records_phi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := private.get_encryption_key();
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    NEW.findings_encrypted := NULL;
    NEW.description_encrypted := NULL;
    NEW.treatment_provided_encrypted := NULL;
    RETURN NEW;
  END IF;
  
  -- Encrypt findings
  IF NEW.findings IS NOT NULL AND NEW.findings != '' THEN
    NEW.findings_encrypted := extensions.pgp_sym_encrypt(NEW.findings::text, encryption_key);
  ELSE
    NEW.findings_encrypted := NULL;
  END IF;
  
  -- NEW: Encrypt description
  IF NEW.description IS NOT NULL AND NEW.description != '' THEN
    NEW.description_encrypted := extensions.pgp_sym_encrypt(NEW.description::text, encryption_key);
  ELSE
    NEW.description_encrypted := NULL;
  END IF;
  
  -- NEW: Encrypt treatment_provided
  IF NEW.treatment_provided IS NOT NULL AND NEW.treatment_provided != '' THEN
    NEW.treatment_provided_encrypted := extensions.pgp_sym_encrypt(NEW.treatment_provided::text, encryption_key);
  ELSE
    NEW.treatment_provided_encrypted := NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER encrypt_medical_records_phi_trigger
  BEFORE INSERT OR UPDATE ON public.medical_records
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_medical_records_phi();

-- =====================================================
-- PHASE 3: Create Decryption Infrastructure
-- =====================================================

-- 3.1 Create Master Decryption Function
CREATE OR REPLACE FUNCTION public.decrypt_phi(encrypted_data bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  enc_key TEXT;
BEGIN
  -- Get encryption key from Vault
  enc_key := private.get_encryption_key();
  
  -- Return NULL if no key or no data
  IF enc_key IS NULL OR enc_key = '' OR encrypted_data IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Decrypt and return
  RETURN extensions.pgp_sym_decrypt(encrypted_data, enc_key);
EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL on decryption failure (corrupted data, wrong key, etc.)
    RETURN NULL;
END;
$function$;

-- 3.2 Create helper function to get decrypted text with fallback to plaintext
CREATE OR REPLACE FUNCTION public.get_decrypted_or_plain(encrypted_data bytea, plain_data text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  decrypted TEXT;
BEGIN
  -- If we have encrypted data, try to decrypt it
  IF encrypted_data IS NOT NULL THEN
    decrypted := public.decrypt_phi(encrypted_data);
    IF decrypted IS NOT NULL THEN
      RETURN decrypted;
    END IF;
  END IF;
  
  -- Fallback to plaintext (for pre-encryption data or if decryption fails)
  RETURN plain_data;
END;
$function$;

-- =====================================================
-- 3.3 Create Decrypted Views
-- =====================================================

-- Appointments decrypted view
CREATE OR REPLACE VIEW public.v_appointments_decrypted AS
SELECT
  id,
  patient_id,
  dentist_id,
  business_id,
  appointment_date,
  status,
  urgency,
  duration_minutes,
  appointment_type_id,
  service_id,
  treatment_plan_id,
  booking_source,
  payment_status,
  payment_intent_id,
  amount_paid_cents,
  completed_at,
  created_at,
  updated_at,
  -- Decrypted PHI fields with fallback to plaintext
  public.get_decrypted_or_plain(reason_encrypted, reason) AS reason,
  public.get_decrypted_or_plain(notes_encrypted, notes) AS notes,
  public.get_decrypted_or_plain(consultation_notes_encrypted, consultation_notes) AS consultation_notes,
  public.get_decrypted_or_plain(ai_summary_encrypted, ai_summary) AS ai_summary,
  public.get_decrypted_or_plain(patient_name_encrypted, patient_name) AS patient_name,
  CASE 
    WHEN conversation_transcript_encrypted IS NOT NULL 
    THEN public.decrypt_phi(conversation_transcript_encrypted)::jsonb
    ELSE conversation_transcript
  END AS conversation_transcript
FROM public.appointments;

-- Notes decrypted view
CREATE OR REPLACE VIEW public.v_notes_decrypted AS
SELECT
  id,
  patient_id,
  dentist_id,
  appointment_id,
  created_by,
  note_type,
  is_private,
  created_at,
  updated_at,
  -- Decrypted PHI fields
  public.get_decrypted_or_plain(title_encrypted, title) AS title,
  public.get_decrypted_or_plain(content_encrypted, content) AS content
FROM public.notes;

-- Chat messages decrypted view
CREATE OR REPLACE VIEW public.v_chat_messages_decrypted AS
SELECT
  id,
  session_id,
  user_id,
  appointment_id,
  is_bot,
  message_type,
  created_at,
  updated_at,
  -- Decrypted PHI fields
  public.get_decrypted_or_plain(message_encrypted, message) AS message,
  CASE 
    WHEN metadata_encrypted IS NOT NULL 
    THEN public.decrypt_phi(metadata_encrypted)::jsonb
    ELSE metadata
  END AS metadata
FROM public.chat_messages;

-- Medical records decrypted view
CREATE OR REPLACE VIEW public.v_medical_records_decrypted AS
SELECT
  id,
  patient_id,
  dentist_id,
  business_id,
  record_date,
  record_type,
  title,
  created_at,
  updated_at,
  -- Decrypted PHI fields
  public.get_decrypted_or_plain(findings_encrypted, findings) AS findings,
  public.get_decrypted_or_plain(description_encrypted, description) AS description,
  public.get_decrypted_or_plain(treatment_provided_encrypted, treatment_provided) AS treatment_provided
FROM public.medical_records;

-- Treatment plans decrypted view (using actual column names)
CREATE OR REPLACE VIEW public.v_treatment_plans_decrypted AS
SELECT
  id,
  patient_id,
  dentist_id,
  business_id,
  title,
  status,
  priority,
  start_date,
  end_date,
  estimated_cost,
  estimated_duration_weeks,
  estimated_duration,
  total_estimated_cents,
  currency,
  procedures,
  treatment_goals,
  target_completion_date,
  notes,
  version,
  created_from_appointment_id,
  created_by_dentist_id,
  created_at,
  updated_at,
  -- Decrypted PHI fields
  public.get_decrypted_or_plain(diagnosis_encrypted, diagnosis) AS diagnosis,
  public.get_decrypted_or_plain(description_encrypted, description) AS description
FROM public.treatment_plans;

-- Profiles decrypted view (only medical fields)
CREATE OR REPLACE VIEW public.v_profiles_decrypted AS
SELECT
  id,
  user_id,
  email,
  first_name,
  last_name,
  phone,
  avatar_url,
  role,
  date_of_birth,
  address,
  profile_completion_status,
  created_at,
  updated_at,
  -- Only these medical fields are decrypted
  public.get_decrypted_or_plain(medical_history_encrypted, medical_history) AS medical_history,
  public.get_decrypted_or_plain(emergency_contact_encrypted, emergency_contact) AS emergency_contact
FROM public.profiles;

-- Communication logs decrypted view
CREATE OR REPLACE VIEW public.v_communication_logs_decrypted AS
SELECT
  id,
  patient_id,
  business_id,
  sent_by,
  channel,
  direction,
  status,
  created_at,
  -- Decrypted PHI fields
  public.get_decrypted_or_plain(subject_encrypted, subject) AS subject,
  public.get_decrypted_or_plain(content_encrypted, content) AS content
FROM public.communication_logs;

-- Patient allergies decrypted view
CREATE OR REPLACE VIEW public.v_patient_allergies_decrypted AS
SELECT
  id,
  patient_id,
  business_id,
  severity,
  created_by,
  created_at,
  updated_at,
  -- Decrypted PHI fields
  public.get_decrypted_or_plain(allergy_name_encrypted, allergy_name) AS allergy_name,
  public.get_decrypted_or_plain(notes_encrypted, notes) AS notes
FROM public.patient_allergies;

-- Messages decrypted view
CREATE OR REPLACE VIEW public.v_messages_decrypted AS
SELECT
  id,
  sender_profile_id,
  recipient_profile_id,
  business_id,
  is_read,
  created_at,
  updated_at,
  -- Decrypted PHI fields
  public.get_decrypted_or_plain(message_text_encrypted, message_text) AS message_text
FROM public.messages;

-- =====================================================
-- Grant access to decrypted views
-- =====================================================

GRANT SELECT ON public.v_appointments_decrypted TO authenticated;
GRANT SELECT ON public.v_notes_decrypted TO authenticated;
GRANT SELECT ON public.v_chat_messages_decrypted TO authenticated;
GRANT SELECT ON public.v_medical_records_decrypted TO authenticated;
GRANT SELECT ON public.v_treatment_plans_decrypted TO authenticated;
GRANT SELECT ON public.v_profiles_decrypted TO authenticated;
GRANT SELECT ON public.v_communication_logs_decrypted TO authenticated;
GRANT SELECT ON public.v_patient_allergies_decrypted TO authenticated;
GRANT SELECT ON public.v_messages_decrypted TO authenticated;
