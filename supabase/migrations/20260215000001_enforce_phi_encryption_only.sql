-- Ensure PHI plaintext columns are not stored once encrypted

-- Appointments (legacy trigger)
CREATE OR REPLACE FUNCTION public.encrypt_appointments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, extensions'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();

  IF enc_key IS NULL OR enc_key = '' THEN
    NEW.reason := NULL;
    NEW.notes := NULL;
    NEW.consultation_notes := NULL;
    NEW.ai_summary := NULL;
    NEW.patient_name := NULL;
    RETURN NEW;
  END IF;

  IF NEW.reason IS NOT NULL AND NEW.reason != '' THEN
    NEW.reason_encrypted := extensions.pgp_sym_encrypt(NEW.reason, enc_key);
  ELSE
    NEW.reason_encrypted := NULL;
  END IF;

  IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
    NEW.notes_encrypted := extensions.pgp_sym_encrypt(NEW.notes, enc_key);
  ELSE
    NEW.notes_encrypted := NULL;
  END IF;

  IF NEW.consultation_notes IS NOT NULL AND NEW.consultation_notes != '' THEN
    NEW.consultation_notes_encrypted := extensions.pgp_sym_encrypt(NEW.consultation_notes, enc_key);
  ELSE
    NEW.consultation_notes_encrypted := NULL;
  END IF;

  IF NEW.ai_summary IS NOT NULL AND NEW.ai_summary != '' THEN
    NEW.ai_summary_encrypted := extensions.pgp_sym_encrypt(NEW.ai_summary, enc_key);
  ELSE
    NEW.ai_summary_encrypted := NULL;
  END IF;

  IF NEW.patient_name IS NOT NULL AND NEW.patient_name != '' THEN
    NEW.patient_name_encrypted := extensions.pgp_sym_encrypt(NEW.patient_name, enc_key);
  ELSE
    NEW.patient_name_encrypted := NULL;
  END IF;

  NEW.reason := NULL;
  NEW.notes := NULL;
  NEW.consultation_notes := NULL;
  NEW.ai_summary := NULL;
  NEW.patient_name := NULL;

  RETURN NEW;
END;
$$;

-- Appointments PHI trigger (current)
CREATE OR REPLACE FUNCTION public.encrypt_appointments_phi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public, extensions'
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

    NEW.reason := NULL;
    NEW.notes := NULL;
    NEW.consultation_notes := NULL;
    NEW.ai_summary := NULL;
    NEW.patient_name := NULL;
    NEW.conversation_transcript := NULL;
    RETURN NEW;
  END IF;

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

  IF NEW.conversation_transcript IS NOT NULL THEN
    NEW.conversation_transcript_encrypted := extensions.pgp_sym_encrypt(NEW.conversation_transcript::text, encryption_key);
  ELSE
    NEW.conversation_transcript_encrypted := NULL;
  END IF;

  NEW.reason := NULL;
  NEW.notes := NULL;
  NEW.consultation_notes := NULL;
  NEW.ai_summary := NULL;
  NEW.patient_name := NULL;
  NEW.conversation_transcript := NULL;

  RETURN NEW;
END;
$function$;

-- Chat messages
CREATE OR REPLACE FUNCTION public.encrypt_chat_messages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, extensions'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();

  IF enc_key IS NULL OR enc_key = '' THEN
    NEW.message := NULL;
    NEW.metadata := NULL;
    NEW.message_encrypted := NULL;
    NEW.metadata_encrypted := NULL;
    RETURN NEW;
  END IF;

  IF NEW.message IS NOT NULL AND NEW.message != '' THEN
    NEW.message_encrypted := extensions.pgp_sym_encrypt(NEW.message, enc_key);
  ELSE
    NEW.message_encrypted := NULL;
  END IF;

  IF NEW.metadata IS NOT NULL THEN
    NEW.metadata_encrypted := extensions.pgp_sym_encrypt(NEW.metadata::text, enc_key);
  ELSE
    NEW.metadata_encrypted := NULL;
  END IF;

  NEW.message := NULL;
  NEW.metadata := NULL;

  RETURN NEW;
END;
$$;

-- Messages
CREATE OR REPLACE FUNCTION public.encrypt_messages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, extensions'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();

  IF enc_key IS NULL OR enc_key = '' THEN
    NEW.message_text := NULL;
    NEW.message_text_encrypted := NULL;
    RETURN NEW;
  END IF;

  IF NEW.message_text IS NOT NULL AND NEW.message_text != '' THEN
    NEW.message_text_encrypted := extensions.pgp_sym_encrypt(NEW.message_text, enc_key);
  ELSE
    NEW.message_text_encrypted := NULL;
  END IF;

  NEW.message_text := NULL;

  RETURN NEW;
END;
$$;

-- Profiles (only medical fields)
CREATE OR REPLACE FUNCTION public.encrypt_profiles_phi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, extensions'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();

  IF enc_key IS NULL OR enc_key = '' THEN
    NEW.medical_history := NULL;
    NEW.emergency_contact := NULL;
    NEW.medical_history_encrypted := NULL;
    NEW.emergency_contact_encrypted := NULL;
    RETURN NEW;
  END IF;

  IF NEW.medical_history IS NOT NULL AND NEW.medical_history != '' THEN
    NEW.medical_history_encrypted := extensions.pgp_sym_encrypt(NEW.medical_history, enc_key);
  ELSE
    NEW.medical_history_encrypted := NULL;
  END IF;

  IF NEW.emergency_contact IS NOT NULL AND NEW.emergency_contact != '' THEN
    NEW.emergency_contact_encrypted := extensions.pgp_sym_encrypt(NEW.emergency_contact, enc_key);
  ELSE
    NEW.emergency_contact_encrypted := NULL;
  END IF;

  NEW.medical_history := NULL;
  NEW.emergency_contact := NULL;

  RETURN NEW;
END;
$$;

-- Treatment plans
CREATE OR REPLACE FUNCTION public.encrypt_treatment_plans_phi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, extensions'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();

  IF enc_key IS NULL OR enc_key = '' THEN
    NEW.diagnosis := NULL;
    NEW.description := NULL;
    NEW.diagnosis_encrypted := NULL;
    NEW.description_encrypted := NULL;
    RETURN NEW;
  END IF;

  IF NEW.diagnosis IS NOT NULL AND NEW.diagnosis != '' THEN
    NEW.diagnosis_encrypted := extensions.pgp_sym_encrypt(NEW.diagnosis, enc_key);
  ELSE
    NEW.diagnosis_encrypted := NULL;
  END IF;

  IF NEW.description IS NOT NULL AND NEW.description != '' THEN
    NEW.description_encrypted := extensions.pgp_sym_encrypt(NEW.description, enc_key);
  ELSE
    NEW.description_encrypted := NULL;
  END IF;

  NEW.diagnosis := NULL;
  NEW.description := NULL;

  RETURN NEW;
END;
$$;

-- Medical records
CREATE OR REPLACE FUNCTION public.encrypt_medical_records_phi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, extensions'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();

  IF enc_key IS NULL OR enc_key = '' THEN
    NEW.findings := NULL;
    NEW.description := NULL;
    NEW.treatment_provided := NULL;
    NEW.findings_encrypted := NULL;
    NEW.description_encrypted := NULL;
    NEW.treatment_provided_encrypted := NULL;
    RETURN NEW;
  END IF;

  IF NEW.findings IS NOT NULL AND NEW.findings != '' THEN
    NEW.findings_encrypted := extensions.pgp_sym_encrypt(NEW.findings, enc_key);
  ELSE
    NEW.findings_encrypted := NULL;
  END IF;

  IF NEW.description IS NOT NULL AND NEW.description != '' THEN
    NEW.description_encrypted := extensions.pgp_sym_encrypt(NEW.description, enc_key);
  ELSE
    NEW.description_encrypted := NULL;
  END IF;

  IF NEW.treatment_provided IS NOT NULL AND NEW.treatment_provided != '' THEN
    NEW.treatment_provided_encrypted := extensions.pgp_sym_encrypt(NEW.treatment_provided, enc_key);
  ELSE
    NEW.treatment_provided_encrypted := NULL;
  END IF;

  NEW.findings := NULL;
  NEW.description := NULL;
  NEW.treatment_provided := NULL;

  RETURN NEW;
END;
$$;

-- Notes
CREATE OR REPLACE FUNCTION public.encrypt_notes_phi_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, extensions'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();

  IF enc_key IS NULL OR enc_key = '' THEN
    NEW.content := NULL;
    NEW.title := NULL;
    NEW.content_encrypted := NULL;
    NEW.title_encrypted := NULL;
    RETURN NEW;
  END IF;

  IF NEW.content IS NOT NULL AND NEW.content != '' THEN
    NEW.content_encrypted := extensions.pgp_sym_encrypt(NEW.content, enc_key);
  ELSE
    NEW.content_encrypted := NULL;
  END IF;

  IF NEW.title IS NOT NULL AND NEW.title != '' THEN
    NEW.title_encrypted := extensions.pgp_sym_encrypt(NEW.title, enc_key);
  ELSE
    NEW.title_encrypted := NULL;
  END IF;

  NEW.content := NULL;
  NEW.title := NULL;

  RETURN NEW;
END;
$$;

-- Patient allergies
CREATE OR REPLACE FUNCTION public.encrypt_patient_allergies_phi_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, extensions'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();

  IF enc_key IS NULL OR enc_key = '' THEN
    NEW.allergy_name := NULL;
    NEW.notes := NULL;
    NEW.allergy_name_encrypted := NULL;
    NEW.notes_encrypted := NULL;
    RETURN NEW;
  END IF;

  IF NEW.allergy_name IS NOT NULL AND NEW.allergy_name != '' THEN
    NEW.allergy_name_encrypted := extensions.pgp_sym_encrypt(NEW.allergy_name, enc_key);
  ELSE
    NEW.allergy_name_encrypted := NULL;
  END IF;

  IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
    NEW.notes_encrypted := extensions.pgp_sym_encrypt(NEW.notes, enc_key);
  ELSE
    NEW.notes_encrypted := NULL;
  END IF;

  NEW.allergy_name := NULL;
  NEW.notes := NULL;

  RETURN NEW;
END;
$$;

-- Communication logs
CREATE OR REPLACE FUNCTION public.encrypt_communication_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, extensions'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();

  IF enc_key IS NULL OR enc_key = '' THEN
    NEW.content := NULL;
    NEW.subject := NULL;
    NEW.content_encrypted := NULL;
    NEW.subject_encrypted := NULL;
    RETURN NEW;
  END IF;

  IF NEW.content IS NOT NULL AND NEW.content != '' THEN
    NEW.content_encrypted := extensions.pgp_sym_encrypt(NEW.content, enc_key);
  ELSE
    NEW.content_encrypted := NULL;
  END IF;

  IF NEW.subject IS NOT NULL AND NEW.subject != '' THEN
    NEW.subject_encrypted := extensions.pgp_sym_encrypt(NEW.subject, enc_key);
  ELSE
    NEW.subject_encrypted := NULL;
  END IF;

  NEW.content := NULL;
  NEW.subject := NULL;

  RETURN NEW;
END;
$$;
