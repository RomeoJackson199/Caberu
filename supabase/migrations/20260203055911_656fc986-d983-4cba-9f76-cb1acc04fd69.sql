-- Phase 3: Fix PHI table encryption triggers
-- Using unified key retrieval and non-destructive approach

-- ============================================
-- 1. FIX PROFILES ENCRYPTION
-- ============================================
-- First convert any TEXT encrypted columns to BYTEA for consistency
ALTER TABLE public.profiles 
ALTER COLUMN first_name_encrypted TYPE BYTEA USING first_name_encrypted::bytea,
ALTER COLUMN last_name_encrypted TYPE BYTEA USING last_name_encrypted::bytea,
ALTER COLUMN phone_encrypted TYPE BYTEA USING phone_encrypted::bytea,
ALTER COLUMN date_of_birth_encrypted TYPE BYTEA USING date_of_birth_encrypted::bytea,
ALTER COLUMN medical_history_encrypted TYPE BYTEA USING medical_history_encrypted::bytea,
ALTER COLUMN address_encrypted TYPE BYTEA USING address_encrypted::bytea,
ALTER COLUMN emergency_contact_encrypted TYPE BYTEA USING emergency_contact_encrypted::bytea;

-- Create fixed trigger function
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
  
  -- Encrypt each PHI field (non-destructive - keep plaintext)
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
END;
$$;

-- Re-enable trigger
DROP TRIGGER IF EXISTS trg_encrypt_profiles_phi ON public.profiles;
CREATE TRIGGER trg_encrypt_profiles_phi
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_profiles_phi();

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
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_treatment_plans_phi ON public.treatment_plans;
DROP TRIGGER IF EXISTS trg_encrypt_treatment_plan_phi ON public.treatment_plans;
CREATE TRIGGER trg_encrypt_treatment_plans_phi
  BEFORE INSERT OR UPDATE ON public.treatment_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_treatment_plans_phi();

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
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_medical_records_phi ON public.medical_records;
DROP TRIGGER IF EXISTS trg_encrypt_medical_record_phi ON public.medical_records;
CREATE TRIGGER trg_encrypt_medical_records_phi
  BEFORE INSERT OR UPDATE ON public.medical_records
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_medical_records_phi();