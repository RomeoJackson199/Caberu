
-- =====================================================
-- Per-Business Encryption Keys with Yearly Rotation
-- =====================================================

-- 1. Create table for per-business encryption keys
CREATE TABLE IF NOT EXISTS public.business_encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  key_version INTEGER NOT NULL DEFAULT 1,
  encrypted_key TEXT NOT NULL, -- Encrypted with master vault key
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 year'),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(business_id, key_version)
);

-- Index for fast lookups
CREATE INDEX idx_business_encryption_keys_active ON public.business_encryption_keys(business_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.business_encryption_keys ENABLE ROW LEVEL SECURITY;

-- Only super admins and system can access keys
CREATE POLICY "Only system can access encryption keys"
  ON public.business_encryption_keys
  FOR ALL
  USING (false);

-- 2. Function to generate a new encryption key for a business
CREATE OR REPLACE FUNCTION private.generate_business_encryption_key(p_business_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  master_key TEXT;
  new_key TEXT;
  encrypted_new_key TEXT;
  current_version INTEGER;
BEGIN
  -- Get master key from vault
  SELECT decrypted_secret INTO master_key
  FROM vault.decrypted_secrets
  WHERE name = 'app_encryption_key'
  LIMIT 1;
  
  IF master_key IS NULL THEN
    RAISE EXCEPTION 'Master encryption key not found in vault';
  END IF;
  
  -- Generate a random 32-character key
  new_key := encode(gen_random_bytes(32), 'hex');
  
  -- Encrypt the new key with master key
  encrypted_new_key := encode(pgp_sym_encrypt(new_key, master_key), 'base64');
  
  -- Get current version
  SELECT COALESCE(MAX(key_version), 0) INTO current_version
  FROM public.business_encryption_keys
  WHERE business_id = p_business_id;
  
  -- Deactivate previous keys
  UPDATE public.business_encryption_keys
  SET is_active = false, rotated_at = now()
  WHERE business_id = p_business_id AND is_active = true;
  
  -- Insert new key
  INSERT INTO public.business_encryption_keys (
    business_id, key_version, encrypted_key, is_active, expires_at
  ) VALUES (
    p_business_id, current_version + 1, encrypted_new_key, true, now() + INTERVAL '1 year'
  );
  
  RETURN new_key;
END;
$$;

-- 3. Function to get active encryption key for a business
CREATE OR REPLACE FUNCTION private.get_business_encryption_key(p_business_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, private
AS $$
DECLARE
  master_key TEXT;
  encrypted_key TEXT;
  decrypted_key TEXT;
BEGIN
  -- Get master key from vault
  SELECT decrypted_secret INTO master_key
  FROM vault.decrypted_secrets
  WHERE name = 'app_encryption_key'
  LIMIT 1;
  
  IF master_key IS NULL THEN
    RETURN NULL; -- Graceful failure
  END IF;
  
  -- Get active encrypted key for business
  SELECT bek.encrypted_key INTO encrypted_key
  FROM public.business_encryption_keys bek
  WHERE bek.business_id = p_business_id AND bek.is_active = true
  LIMIT 1;
  
  IF encrypted_key IS NULL THEN
    -- Auto-generate key for new business
    decrypted_key := private.generate_business_encryption_key(p_business_id);
    RETURN decrypted_key;
  END IF;
  
  -- Decrypt the business key using master key
  BEGIN
    decrypted_key := pgp_sym_decrypt(decode(encrypted_key, 'base64'), master_key);
    RETURN decrypted_key;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

-- 4. Function to rotate keys for a specific business
CREATE OR REPLACE FUNCTION private.rotate_business_encryption_key(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  new_key TEXT;
BEGIN
  new_key := private.generate_business_encryption_key(p_business_id);
  RETURN new_key IS NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

-- 5. Function to check and rotate expired keys (run via cron)
CREATE OR REPLACE FUNCTION private.rotate_expired_keys()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  rotated_count INTEGER := 0;
  expired_business RECORD;
BEGIN
  FOR expired_business IN
    SELECT DISTINCT business_id
    FROM public.business_encryption_keys
    WHERE is_active = true AND expires_at < now()
  LOOP
    IF private.rotate_business_encryption_key(expired_business.business_id) THEN
      rotated_count := rotated_count + 1;
    END IF;
  END LOOP;
  
  RETURN rotated_count;
END;
$$;

-- 6. Grant necessary permissions
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_business_encryption_key(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.generate_business_encryption_key(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION private.rotate_business_encryption_key(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION private.rotate_expired_keys() TO service_role;

-- 7. Drop old duplicate/broken triggers
DROP TRIGGER IF EXISTS trg_encrypt_profiles ON public.profiles;
DROP TRIGGER IF EXISTS encrypt_profiles_trigger ON public.profiles;
DROP TRIGGER IF EXISTS trg_encrypt_treatment_plans ON public.treatment_plans;
DROP TRIGGER IF EXISTS encrypt_treatment_plans_trigger ON public.treatment_plans;
DROP TRIGGER IF EXISTS trg_encrypt_medical_records ON public.medical_records;
DROP TRIGGER IF EXISTS encrypt_medical_records_trigger ON public.medical_records;
DROP TRIGGER IF EXISTS trg_encrypt_notes ON public.notes;
DROP TRIGGER IF EXISTS encrypt_notes_trigger ON public.notes;
DROP TRIGGER IF EXISTS trg_encrypt_patient_allergies ON public.patient_allergies;
DROP TRIGGER IF EXISTS encrypt_patient_allergies_trigger ON public.patient_allergies;

-- 8. Create unified encryption trigger function using per-business keys
CREATE OR REPLACE FUNCTION private.encrypt_phi_with_business_key()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  enc_key TEXT;
  business_id_val UUID;
BEGIN
  -- Get business_id based on table
  CASE TG_TABLE_NAME
    WHEN 'profiles' THEN
      -- Profiles don't have business_id directly, use session or skip
      SELECT sb.business_id INTO business_id_val
      FROM public.session_business sb
      WHERE sb.user_id = NEW.user_id
      ORDER BY sb.updated_at DESC
      LIMIT 1;
    WHEN 'appointments' THEN
      business_id_val := NEW.business_id;
    WHEN 'treatment_plans' THEN
      business_id_val := NEW.business_id;
    WHEN 'medical_records' THEN
      business_id_val := NEW.business_id;
    WHEN 'notes' THEN
      business_id_val := NEW.business_id;
    WHEN 'patient_allergies' THEN
      business_id_val := NEW.business_id;
    WHEN 'imaging_sets' THEN
      business_id_val := NEW.business_id;
    WHEN 'chat_messages' THEN
      -- Get business from session
      SELECT sb.business_id INTO business_id_val
      FROM public.session_business sb
      WHERE sb.user_id = NEW.user_id
      ORDER BY sb.updated_at DESC
      LIMIT 1;
    ELSE
      business_id_val := NULL;
  END CASE;

  -- If no business context, allow save without encryption
  IF business_id_val IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get business-specific encryption key
  enc_key := private.get_business_encryption_key(business_id_val);
  
  IF enc_key IS NULL THEN
    -- No key available, save without encryption
    RETURN NEW;
  END IF;

  -- Encrypt PHI fields based on table (only PHI, not dates/times/IDs)
  CASE TG_TABLE_NAME
    WHEN 'profiles' THEN
      IF NEW.first_name IS NOT NULL THEN
        NEW.first_name_encrypted := encode(pgp_sym_encrypt(NEW.first_name, enc_key), 'base64');
      END IF;
      IF NEW.last_name IS NOT NULL THEN
        NEW.last_name_encrypted := encode(pgp_sym_encrypt(NEW.last_name, enc_key), 'base64');
      END IF;
      IF NEW.phone IS NOT NULL THEN
        NEW.phone_encrypted := encode(pgp_sym_encrypt(NEW.phone, enc_key), 'base64');
      END IF;
      IF NEW.date_of_birth IS NOT NULL THEN
        NEW.date_of_birth_encrypted := encode(pgp_sym_encrypt(NEW.date_of_birth::TEXT, enc_key), 'base64');
      END IF;
      IF NEW.medical_history IS NOT NULL THEN
        NEW.medical_history_encrypted := encode(pgp_sym_encrypt(NEW.medical_history, enc_key), 'base64');
      END IF;
      IF NEW.address IS NOT NULL THEN
        NEW.address_encrypted := encode(pgp_sym_encrypt(NEW.address, enc_key), 'base64');
      END IF;
      IF NEW.emergency_contact IS NOT NULL THEN
        NEW.emergency_contact_encrypted := encode(pgp_sym_encrypt(NEW.emergency_contact, enc_key), 'base64');
      END IF;
      
    WHEN 'appointments' THEN
      -- Only encrypt PHI: reason, notes, consultation_notes, ai_summary, patient_name
      -- NOT: appointment_date, duration_minutes, status, etc.
      IF NEW.reason IS NOT NULL THEN
        NEW.reason_encrypted := encode(pgp_sym_encrypt(NEW.reason, enc_key), 'base64');
      END IF;
      IF NEW.notes IS NOT NULL THEN
        NEW.notes_encrypted := encode(pgp_sym_encrypt(NEW.notes, enc_key), 'base64');
      END IF;
      IF NEW.consultation_notes IS NOT NULL THEN
        NEW.consultation_notes_encrypted := encode(pgp_sym_encrypt(NEW.consultation_notes, enc_key), 'base64');
      END IF;
      IF NEW.ai_summary IS NOT NULL THEN
        NEW.ai_summary_encrypted := encode(pgp_sym_encrypt(NEW.ai_summary, enc_key), 'base64');
      END IF;
      IF NEW.patient_name IS NOT NULL THEN
        NEW.patient_name_encrypted := encode(pgp_sym_encrypt(NEW.patient_name, enc_key), 'base64');
      END IF;
      
    WHEN 'treatment_plans' THEN
      IF NEW.diagnosis IS NOT NULL THEN
        NEW.diagnosis_encrypted := encode(pgp_sym_encrypt(NEW.diagnosis, enc_key), 'base64');
      END IF;
      IF NEW.description IS NOT NULL THEN
        NEW.description_encrypted := encode(pgp_sym_encrypt(NEW.description, enc_key), 'base64');
      END IF;
      
    WHEN 'medical_records' THEN
      IF NEW.findings IS NOT NULL THEN
        NEW.findings_encrypted := encode(pgp_sym_encrypt(NEW.findings, enc_key), 'base64');
      END IF;
      
    WHEN 'notes' THEN
      IF NEW.content IS NOT NULL THEN
        NEW.content_encrypted := encode(pgp_sym_encrypt(NEW.content, enc_key), 'base64');
      END IF;
      IF NEW.title IS NOT NULL THEN
        NEW.title_encrypted := encode(pgp_sym_encrypt(NEW.title, enc_key), 'base64');
      END IF;
      
    WHEN 'patient_allergies' THEN
      IF NEW.allergy_name IS NOT NULL THEN
        NEW.allergy_name_encrypted := encode(pgp_sym_encrypt(NEW.allergy_name, enc_key), 'base64');
      END IF;
      IF NEW.notes IS NOT NULL THEN
        NEW.notes_encrypted := encode(pgp_sym_encrypt(NEW.notes, enc_key), 'base64');
      END IF;
      
    WHEN 'imaging_sets' THEN
      IF NEW.notes IS NOT NULL THEN
        NEW.notes_encrypted := encode(pgp_sym_encrypt(NEW.notes, enc_key), 'base64');
      END IF;
      
    WHEN 'chat_messages' THEN
      IF NEW.message IS NOT NULL THEN
        NEW.message_encrypted := encode(pgp_sym_encrypt(NEW.message, enc_key), 'base64');
      END IF;
  END CASE;

  RETURN NEW;
END;
$$;

-- 9. Create triggers for PHI tables
CREATE TRIGGER encrypt_profiles_phi
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.encrypt_phi_with_business_key();

CREATE TRIGGER encrypt_appointments_phi
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION private.encrypt_phi_with_business_key();

CREATE TRIGGER encrypt_treatment_plans_phi
  BEFORE INSERT OR UPDATE ON public.treatment_plans
  FOR EACH ROW EXECUTE FUNCTION private.encrypt_phi_with_business_key();

CREATE TRIGGER encrypt_medical_records_phi
  BEFORE INSERT OR UPDATE ON public.medical_records
  FOR EACH ROW EXECUTE FUNCTION private.encrypt_phi_with_business_key();

CREATE TRIGGER encrypt_notes_phi
  BEFORE INSERT OR UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION private.encrypt_phi_with_business_key();

CREATE TRIGGER encrypt_patient_allergies_phi
  BEFORE INSERT OR UPDATE ON public.patient_allergies
  FOR EACH ROW EXECUTE FUNCTION private.encrypt_phi_with_business_key();

CREATE TRIGGER encrypt_imaging_sets_phi
  BEFORE INSERT OR UPDATE ON public.imaging_sets
  FOR EACH ROW EXECUTE FUNCTION private.encrypt_phi_with_business_key();

CREATE TRIGGER encrypt_chat_messages_phi
  BEFORE INSERT OR UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION private.encrypt_phi_with_business_key();
