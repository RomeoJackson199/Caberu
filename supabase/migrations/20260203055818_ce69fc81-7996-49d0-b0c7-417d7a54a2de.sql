-- Phase 2: Medium-Risk Data Encryption
-- Tables: appointments, chat_messages, messages

-- ============================================
-- 1. APPOINTMENTS - Add encrypted columns
-- ============================================
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS reason_encrypted BYTEA,
ADD COLUMN IF NOT EXISTS notes_encrypted BYTEA,
ADD COLUMN IF NOT EXISTS consultation_notes_encrypted BYTEA,
ADD COLUMN IF NOT EXISTS ai_summary_encrypted BYTEA,
ADD COLUMN IF NOT EXISTS patient_name_encrypted BYTEA;

-- Create trigger function for appointments
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
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_appointments ON public.appointments;
CREATE TRIGGER trg_encrypt_appointments
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_appointments();

-- ============================================
-- 2. CHAT_MESSAGES - Add encrypted columns
-- ============================================
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS message_encrypted BYTEA,
ADD COLUMN IF NOT EXISTS metadata_encrypted BYTEA;

-- Create trigger function for chat_messages
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
  
  -- Encrypt metadata as JSON string
  IF NEW.metadata IS NOT NULL THEN
    NEW.metadata_encrypted := pgp_sym_encrypt(NEW.metadata::text, enc_key);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_chat_messages ON public.chat_messages;
CREATE TRIGGER trg_encrypt_chat_messages
  BEFORE INSERT OR UPDATE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_chat_messages();

-- ============================================
-- 3. MESSAGES - Add encrypted columns
-- ============================================
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS message_text_encrypted BYTEA;

-- Create trigger function for messages
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
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_messages ON public.messages;
CREATE TRIGGER trg_encrypt_messages
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_messages();

-- Add column comments
COMMENT ON COLUMN public.appointments.reason_encrypted IS 'AES-256 encrypted reason';
COMMENT ON COLUMN public.appointments.notes_encrypted IS 'AES-256 encrypted notes';
COMMENT ON COLUMN public.appointments.consultation_notes_encrypted IS 'AES-256 encrypted consultation_notes';
COMMENT ON COLUMN public.appointments.ai_summary_encrypted IS 'AES-256 encrypted ai_summary';
COMMENT ON COLUMN public.appointments.patient_name_encrypted IS 'AES-256 encrypted patient_name';
COMMENT ON COLUMN public.chat_messages.message_encrypted IS 'AES-256 encrypted message';
COMMENT ON COLUMN public.chat_messages.metadata_encrypted IS 'AES-256 encrypted metadata JSON';
COMMENT ON COLUMN public.messages.message_text_encrypted IS 'AES-256 encrypted message_text';