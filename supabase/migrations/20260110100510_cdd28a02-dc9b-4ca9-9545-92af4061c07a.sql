
-- Add encrypted columns to notes table for PHI content
ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS content_encrypted TEXT,
ADD COLUMN IF NOT EXISTS title_encrypted TEXT;

-- Add encrypted columns to patient_allergies table
ALTER TABLE public.patient_allergies 
ADD COLUMN IF NOT EXISTS allergy_name_encrypted TEXT,
ADD COLUMN IF NOT EXISTS notes_encrypted TEXT;

-- Create or replace encryption trigger function for notes
CREATE OR REPLACE FUNCTION encrypt_notes_phi()
RETURNS TRIGGER AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Get encryption key from app settings (should be set via Vault in production)
  encryption_key := current_setting('app.encryption_key', true);
  
  -- If no key configured, store data without encryption (for development)
  IF encryption_key IS NULL OR encryption_key = '' THEN
    NEW.content_encrypted := NULL;
    NEW.title_encrypted := NULL;
    RETURN NEW;
  END IF;
  
  -- Encrypt PHI fields if they have values
  IF NEW.content IS NOT NULL THEN
    NEW.content_encrypted := encode(
      pgp_sym_encrypt(NEW.content::text, encryption_key),
      'base64'
    );
  END IF;
  
  IF NEW.title IS NOT NULL THEN
    NEW.title_encrypted := encode(
      pgp_sym_encrypt(NEW.title::text, encryption_key),
      'base64'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create or replace encryption trigger function for patient_allergies
CREATE OR REPLACE FUNCTION encrypt_patient_allergies_phi()
RETURNS TRIGGER AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := current_setting('app.encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    NEW.allergy_name_encrypted := NULL;
    NEW.notes_encrypted := NULL;
    RETURN NEW;
  END IF;
  
  IF NEW.allergy_name IS NOT NULL THEN
    NEW.allergy_name_encrypted := encode(
      pgp_sym_encrypt(NEW.allergy_name::text, encryption_key),
      'base64'
    );
  END IF;
  
  IF NEW.notes IS NOT NULL THEN
    NEW.notes_encrypted := encode(
      pgp_sym_encrypt(NEW.notes::text, encryption_key),
      'base64'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
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

-- Also ensure existing encryption triggers are properly set for profiles
CREATE OR REPLACE FUNCTION encrypt_profile_phi()
RETURNS TRIGGER AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := current_setting('app.encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RETURN NEW;
  END IF;
  
  IF NEW.first_name IS NOT NULL THEN
    NEW.first_name_encrypted := encode(pgp_sym_encrypt(NEW.first_name::text, encryption_key), 'base64');
  END IF;
  
  IF NEW.last_name IS NOT NULL THEN
    NEW.last_name_encrypted := encode(pgp_sym_encrypt(NEW.last_name::text, encryption_key), 'base64');
  END IF;
  
  IF NEW.phone IS NOT NULL THEN
    NEW.phone_encrypted := encode(pgp_sym_encrypt(NEW.phone::text, encryption_key), 'base64');
  END IF;
  
  IF NEW.date_of_birth IS NOT NULL THEN
    NEW.date_of_birth_encrypted := encode(pgp_sym_encrypt(NEW.date_of_birth::text, encryption_key), 'base64');
  END IF;
  
  IF NEW.medical_history IS NOT NULL THEN
    NEW.medical_history_encrypted := encode(pgp_sym_encrypt(NEW.medical_history::text, encryption_key), 'base64');
  END IF;
  
  IF NEW.address IS NOT NULL THEN
    NEW.address_encrypted := encode(pgp_sym_encrypt(NEW.address::text, encryption_key), 'base64');
  END IF;
  
  IF NEW.emergency_contact IS NOT NULL THEN
    NEW.emergency_contact_encrypted := encode(pgp_sym_encrypt(NEW.emergency_contact::text, encryption_key), 'base64');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS encrypt_profile_phi_trigger ON profiles;
CREATE TRIGGER encrypt_profile_phi_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_profile_phi();

-- Ensure treatment_plans encryption trigger exists
CREATE OR REPLACE FUNCTION encrypt_treatment_plan_phi()
RETURNS TRIGGER AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := current_setting('app.encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RETURN NEW;
  END IF;
  
  IF NEW.diagnosis IS NOT NULL THEN
    NEW.diagnosis_encrypted := encode(pgp_sym_encrypt(NEW.diagnosis::text, encryption_key), 'base64');
  END IF;
  
  IF NEW.description IS NOT NULL THEN
    NEW.description_encrypted := encode(pgp_sym_encrypt(NEW.description::text, encryption_key), 'base64');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS encrypt_treatment_plan_phi_trigger ON treatment_plans;
CREATE TRIGGER encrypt_treatment_plan_phi_trigger
  BEFORE INSERT OR UPDATE ON treatment_plans
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_treatment_plan_phi();

-- Ensure medical_records encryption trigger exists
CREATE OR REPLACE FUNCTION encrypt_medical_record_phi()
RETURNS TRIGGER AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := current_setting('app.encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RETURN NEW;
  END IF;
  
  IF NEW.findings IS NOT NULL THEN
    NEW.findings_encrypted := encode(pgp_sym_encrypt(NEW.findings::text, encryption_key), 'base64');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS encrypt_medical_record_phi_trigger ON medical_records;
CREATE TRIGGER encrypt_medical_record_phi_trigger
  BEFORE INSERT OR UPDATE ON medical_records
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_medical_record_phi();

-- Add comment for documentation
COMMENT ON COLUMN notes.content_encrypted IS 'PGP encrypted clinical note content (PHI)';
COMMENT ON COLUMN notes.title_encrypted IS 'PGP encrypted note title (PHI)';
COMMENT ON COLUMN patient_allergies.allergy_name_encrypted IS 'PGP encrypted allergy name (PHI)';
COMMENT ON COLUMN patient_allergies.notes_encrypted IS 'PGP encrypted allergy notes (PHI)';
