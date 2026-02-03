-- Phase 1, Step 2: Add encrypted columns and triggers for low-risk tables
-- Tables: communication_logs, email_logs, appointment_reminders

-- ============================================
-- 1. COMMUNICATION_LOGS - Add encrypted columns
-- ============================================
ALTER TABLE public.communication_logs 
ADD COLUMN IF NOT EXISTS content_encrypted BYTEA,
ADD COLUMN IF NOT EXISTS subject_encrypted BYTEA;

-- Create trigger function for communication_logs
CREATE OR REPLACE FUNCTION public.encrypt_communication_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  -- Get encryption key from Vault
  enc_key := private.get_encryption_key();
  
  -- Skip encryption if no key configured
  IF enc_key IS NULL OR enc_key = '' THEN
    RETURN NEW;
  END IF;
  
  -- Encrypt content (keep plaintext for now - non-destructive)
  IF NEW.content IS NOT NULL AND NEW.content != '' THEN
    NEW.content_encrypted := pgp_sym_encrypt(NEW.content, enc_key);
  END IF;
  
  -- Encrypt subject
  IF NEW.subject IS NOT NULL AND NEW.subject != '' THEN
    NEW.subject_encrypted := pgp_sym_encrypt(NEW.subject, enc_key);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_encrypt_communication_logs ON public.communication_logs;
CREATE TRIGGER trg_encrypt_communication_logs
  BEFORE INSERT OR UPDATE ON public.communication_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_communication_logs();

-- ============================================
-- 2. EMAIL_LOGS - Add encrypted columns
-- ============================================
ALTER TABLE public.email_logs 
ADD COLUMN IF NOT EXISTS subject_encrypted BYTEA;

-- Create trigger function for email_logs
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
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_encrypt_email_logs ON public.email_logs;
CREATE TRIGGER trg_encrypt_email_logs
  BEFORE INSERT OR UPDATE ON public.email_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_email_logs();

-- ============================================
-- 3. APPOINTMENT_REMINDERS - Add encrypted columns
-- ============================================
ALTER TABLE public.appointment_reminders 
ADD COLUMN IF NOT EXISTS error_message_encrypted BYTEA;

-- Create trigger function for appointment_reminders
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
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_encrypt_appointment_reminders ON public.appointment_reminders;
CREATE TRIGGER trg_encrypt_appointment_reminders
  BEFORE INSERT OR UPDATE ON public.appointment_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_appointment_reminders();

-- Add comments for documentation
COMMENT ON COLUMN public.communication_logs.content_encrypted IS 'AES-256 encrypted content via pgp_sym_encrypt';
COMMENT ON COLUMN public.communication_logs.subject_encrypted IS 'AES-256 encrypted subject via pgp_sym_encrypt';
COMMENT ON COLUMN public.email_logs.subject_encrypted IS 'AES-256 encrypted subject via pgp_sym_encrypt';
COMMENT ON COLUMN public.appointment_reminders.error_message_encrypted IS 'AES-256 encrypted error_message via pgp_sym_encrypt';