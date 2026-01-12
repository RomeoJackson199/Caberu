-- Fix the encryption system completely
-- This migration:
-- 1. Updates the vault key function with proper fallback
-- 2. Updates all encryption triggers to use the vault key
-- 3. Restores proper decryption logic in views
-- 4. Re-enables all triggers

-- First, ensure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update the vault key function with better fallback logic
CREATE OR REPLACE FUNCTION private.get_app_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
    encryption_key TEXT;
BEGIN
    -- Try to get the encryption key from Supabase Vault first
    BEGIN
        SELECT decrypted_secret INTO encryption_key
        FROM vault.decrypted_secrets
        WHERE name = 'app_encryption_key'
        LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        -- Vault may not be available, continue to fallback
        encryption_key := NULL;
    END;

    -- Fallback to current_setting if vault is not configured
    IF encryption_key IS NULL OR encryption_key = '' THEN
        encryption_key := current_setting('app.encryption_key', true);
    END IF;

    -- If still no key, generate a default one for development
    -- WARNING: In production, you MUST set a proper key in Vault!
    IF encryption_key IS NULL OR encryption_key = '' THEN
        -- Use a deterministic but secure key for development
        encryption_key := encode(digest('caberu_dev_key_' || current_database(), 'sha256'), 'hex');
    END IF;

    RETURN encryption_key;
END;
$$;

-- Update encrypt_profile_phi to use vault key
CREATE OR REPLACE FUNCTION encrypt_profile_phi()
RETURNS TRIGGER AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Get encryption key from vault with fallback
  encryption_key := private.get_app_key();

  -- Encrypt PHI fields if they have values
  IF NEW.first_name IS NOT NULL AND NEW.first_name != '' THEN
    NEW.first_name_encrypted := pgp_sym_encrypt(NEW.first_name::text, encryption_key);
    NEW.first_name := '***ENCRYPTED***';
  END IF;

  IF NEW.last_name IS NOT NULL AND NEW.last_name != '' THEN
    NEW.last_name_encrypted := pgp_sym_encrypt(NEW.last_name::text, encryption_key);
    NEW.last_name := '***ENCRYPTED***';
  END IF;

  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    NEW.phone_encrypted := pgp_sym_encrypt(NEW.phone::text, encryption_key);
    NEW.phone := '***ENCRYPTED***';
  END IF;

  IF NEW.date_of_birth IS NOT NULL THEN
    NEW.date_of_birth_encrypted := pgp_sym_encrypt(NEW.date_of_birth::text, encryption_key);
  END IF;

  IF NEW.medical_history IS NOT NULL AND NEW.medical_history != '' THEN
    NEW.medical_history_encrypted := pgp_sym_encrypt(NEW.medical_history::text, encryption_key);
    NEW.medical_history := '***ENCRYPTED***';
  END IF;

  IF NEW.address IS NOT NULL AND NEW.address != '' THEN
    NEW.address_encrypted := pgp_sym_encrypt(NEW.address::text, encryption_key);
    NEW.address := '***ENCRYPTED***';
  END IF;

  IF NEW.emergency_contact IS NOT NULL AND NEW.emergency_contact != '' THEN
    NEW.emergency_contact_encrypted := pgp_sym_encrypt(NEW.emergency_contact::text, encryption_key);
    NEW.emergency_contact := '***ENCRYPTED***';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private;

-- Update encrypt_notes_phi to use vault key
CREATE OR REPLACE FUNCTION encrypt_notes_phi()
RETURNS TRIGGER AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := private.get_app_key();

  IF NEW.content IS NOT NULL AND NEW.content != '' THEN
    NEW.content_encrypted := pgp_sym_encrypt(NEW.content::text, encryption_key);
  END IF;

  IF NEW.title IS NOT NULL AND NEW.title != '' THEN
    NEW.title_encrypted := pgp_sym_encrypt(NEW.title::text, encryption_key);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private;

-- Update encrypt_patient_allergies_phi to use vault key
CREATE OR REPLACE FUNCTION encrypt_patient_allergies_phi()
RETURNS TRIGGER AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := private.get_app_key();

  IF NEW.allergy_name IS NOT NULL AND NEW.allergy_name != '' THEN
    NEW.allergy_name_encrypted := pgp_sym_encrypt(NEW.allergy_name::text, encryption_key);
  END IF;

  IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
    NEW.notes_encrypted := pgp_sym_encrypt(NEW.notes::text, encryption_key);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private;

-- Update encrypt_treatment_plan_phi to use vault key
CREATE OR REPLACE FUNCTION encrypt_treatment_plan_phi()
RETURNS TRIGGER AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := private.get_app_key();

  IF NEW.diagnosis IS NOT NULL AND NEW.diagnosis != '' THEN
    NEW.diagnosis_encrypted := pgp_sym_encrypt(NEW.diagnosis::text, encryption_key);
  END IF;

  IF NEW.description IS NOT NULL AND NEW.description != '' THEN
    NEW.description_encrypted := pgp_sym_encrypt(NEW.description::text, encryption_key);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private;

-- Update encrypt_medical_record_phi to use vault key
CREATE OR REPLACE FUNCTION encrypt_medical_record_phi()
RETURNS TRIGGER AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := private.get_app_key();

  IF NEW.findings IS NOT NULL AND NEW.findings != '' THEN
    NEW.findings_encrypted := pgp_sym_encrypt(NEW.findings::text, encryption_key);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private;

-- Re-enable all encryption triggers
DROP TRIGGER IF EXISTS encrypt_profile_phi_trigger ON profiles;
CREATE TRIGGER encrypt_profile_phi_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_profile_phi();

DROP TRIGGER IF EXISTS encrypt_notes_phi_trigger ON notes;
CREATE TRIGGER encrypt_notes_phi_trigger
  BEFORE INSERT OR UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_notes_phi();

DROP TRIGGER IF EXISTS encrypt_patient_allergies_phi_trigger ON patient_allergies;
CREATE TRIGGER encrypt_patient_allergies_phi_trigger
  BEFORE INSERT OR UPDATE ON patient_allergies
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_patient_allergies_phi();

DROP TRIGGER IF EXISTS encrypt_treatment_plan_phi_trigger ON treatment_plans;
CREATE TRIGGER encrypt_treatment_plan_phi_trigger
  BEFORE INSERT OR UPDATE ON treatment_plans
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_treatment_plan_phi();

DROP TRIGGER IF EXISTS encrypt_medical_record_phi_trigger ON medical_records;
CREATE TRIGGER encrypt_medical_record_phi_trigger
  BEFORE INSERT OR UPDATE ON medical_records
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_medical_record_phi();

-- Recreate secure_profiles_view with proper decryption
DROP VIEW IF EXISTS public.secure_profiles_view;
CREATE VIEW public.secure_profiles_view
WITH (security_invoker = true)
AS
SELECT
  id,
  user_id,
  email,
  -- Decrypt PHI fields, handling both encrypted and plaintext data
  CASE
    WHEN first_name_encrypted IS NOT NULL AND first_name_encrypted != '\x'::bytea THEN
      pgp_sym_decrypt(first_name_encrypted, private.get_app_key())
    WHEN first_name IS NOT NULL AND first_name != '***ENCRYPTED***' THEN
      first_name
    ELSE NULL
  END as first_name,
  CASE
    WHEN last_name_encrypted IS NOT NULL AND last_name_encrypted != '\x'::bytea THEN
      pgp_sym_decrypt(last_name_encrypted, private.get_app_key())
    WHEN last_name IS NOT NULL AND last_name != '***ENCRYPTED***' THEN
      last_name
    ELSE NULL
  END as last_name,
  CASE
    WHEN phone_encrypted IS NOT NULL AND phone_encrypted != '\x'::bytea THEN
      pgp_sym_decrypt(phone_encrypted, private.get_app_key())
    WHEN phone IS NOT NULL AND phone != '***ENCRYPTED***' THEN
      phone
    ELSE NULL
  END as phone,
  CASE
    WHEN date_of_birth_encrypted IS NOT NULL AND date_of_birth_encrypted != '\x'::bytea THEN
      pgp_sym_decrypt(date_of_birth_encrypted, private.get_app_key())::date
    ELSE date_of_birth
  END as date_of_birth,
  CASE
    WHEN address_encrypted IS NOT NULL AND address_encrypted != '\x'::bytea THEN
      pgp_sym_decrypt(address_encrypted, private.get_app_key())
    WHEN address IS NOT NULL AND address != '***ENCRYPTED***' THEN
      address
    ELSE NULL
  END as address,
  CASE
    WHEN medical_history_encrypted IS NOT NULL AND medical_history_encrypted != '\x'::bytea THEN
      pgp_sym_decrypt(medical_history_encrypted, private.get_app_key())
    WHEN medical_history IS NOT NULL AND medical_history != '***ENCRYPTED***' THEN
      medical_history
    ELSE NULL
  END as medical_history,
  CASE
    WHEN emergency_contact_encrypted IS NOT NULL AND emergency_contact_encrypted != '\x'::bytea THEN
      pgp_sym_decrypt(emergency_contact_encrypted, private.get_app_key())
    WHEN emergency_contact IS NOT NULL AND emergency_contact != '***ENCRYPTED***' THEN
      emergency_contact
    ELSE NULL
  END as emergency_contact,
  avatar_url,
  profile_picture_url,
  created_at,
  updated_at,
  role,
  bio,
  onboarding_completed,
  business_id,
  patient_status,
  last_contact_at,
  next_recall_date,
  is_vip,
  ai_opt_out,
  profile_completion_status
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.secure_profiles_view TO authenticated;
GRANT SELECT ON public.secure_profiles_view TO anon;

-- Create secure_treatment_plans_view with proper decryption
DROP VIEW IF EXISTS public.secure_treatment_plans_view;
CREATE VIEW public.secure_treatment_plans_view
WITH (security_invoker = true)
AS
SELECT
  id,
  patient_id,
  dentist_id,
  CASE
    WHEN diagnosis_encrypted IS NOT NULL AND diagnosis_encrypted != '\x'::bytea THEN
      pgp_sym_decrypt(diagnosis_encrypted, private.get_app_key())
    ELSE diagnosis
  END as diagnosis,
  CASE
    WHEN description_encrypted IS NOT NULL AND description_encrypted != '\x'::bytea THEN
      pgp_sym_decrypt(description_encrypted, private.get_app_key())
    ELSE description
  END as description,
  status,
  start_date,
  end_date,
  created_at,
  updated_at
FROM public.treatment_plans;

-- Grant access to the view
GRANT SELECT ON public.secure_treatment_plans_view TO authenticated;
GRANT SELECT ON public.secure_treatment_plans_view TO anon;

-- Add comment for documentation
COMMENT ON VIEW public.secure_profiles_view IS 'Secure view that decrypts PHI data on-the-fly using vault key. Handles both encrypted and legacy plaintext data.';
COMMENT ON VIEW public.secure_treatment_plans_view IS 'Secure view that decrypts treatment plan PHI data on-the-fly using vault key.';
COMMENT ON FUNCTION private.get_app_key() IS 'Gets encryption key from Vault with fallbacks to current_setting and dev key. Production should use Vault secret named app_encryption_key.';
