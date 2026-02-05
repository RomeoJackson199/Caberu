
-- Fix the get_business_encryption_key function to use extensions schema correctly
CREATE OR REPLACE FUNCTION private.get_business_encryption_key(p_business_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, private, extensions
AS $$
DECLARE
  master_key TEXT;
  encrypted_key_val TEXT;
  decrypted_key TEXT;
BEGIN
  -- Get master key using the vault wrapper
  master_key := private.vault_get_secret('app_encryption_key');
  
  IF master_key IS NULL OR master_key = '' THEN
    RETURN NULL;
  END IF;
  
  -- Get active encrypted key for business
  SELECT bek.encrypted_key INTO encrypted_key_val
  FROM public.business_encryption_keys bek
  WHERE bek.business_id = p_business_id AND bek.is_active = true
  LIMIT 1;
  
  IF encrypted_key_val IS NULL THEN
    RETURN NULL; -- No key exists yet
  END IF;
  
  -- Decrypt the business key using master key
  BEGIN
    decrypted_key := extensions.pgp_sym_decrypt(decode(encrypted_key_val, 'base64'), master_key);
    RETURN decrypted_key;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Decryption error: %', SQLERRM;
    RETURN NULL;
  END;
END;
$$;

-- Also fix the generate function
CREATE OR REPLACE FUNCTION private.generate_business_encryption_key(p_business_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions
AS $$
DECLARE
  master_key TEXT;
  new_key TEXT;
  encrypted_new_key TEXT;
  current_version INTEGER;
BEGIN
  master_key := private.vault_get_secret('app_encryption_key');
  
  IF master_key IS NULL OR master_key = '' THEN
    RETURN NULL;
  END IF;
  
  new_key := encode(gen_random_bytes(32), 'hex');
  encrypted_new_key := encode(extensions.pgp_sym_encrypt(new_key, master_key), 'base64');
  
  SELECT COALESCE(MAX(key_version), 0) INTO current_version
  FROM public.business_encryption_keys
  WHERE business_id = p_business_id;
  
  UPDATE public.business_encryption_keys
  SET is_active = false, rotated_at = now()
  WHERE business_id = p_business_id AND is_active = true;
  
  INSERT INTO public.business_encryption_keys (
    business_id, key_version, encrypted_key, is_active, expires_at
  ) VALUES (
    p_business_id, current_version + 1, encrypted_new_key, true, now() + INTERVAL '1 year'
  );
  
  RETURN new_key;
END;
$$;

-- Update the encryption trigger to use extensions schema
CREATE OR REPLACE FUNCTION private.encrypt_phi_with_business_key()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions
AS $$
DECLARE
  enc_key TEXT;
  business_id_val UUID;
BEGIN
  -- Get business_id based on table
  CASE TG_TABLE_NAME
    WHEN 'profiles' THEN
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
      SELECT sb.business_id INTO business_id_val
      FROM public.session_business sb
      WHERE sb.user_id = NEW.user_id
      ORDER BY sb.updated_at DESC
      LIMIT 1;
    ELSE
      business_id_val := NULL;
  END CASE;

  IF business_id_val IS NULL THEN
    RETURN NEW;
  END IF;

  enc_key := private.get_business_encryption_key(business_id_val);
  
  IF enc_key IS NULL THEN
    RETURN NEW;
  END IF;

  CASE TG_TABLE_NAME
    WHEN 'profiles' THEN
      IF NEW.first_name IS NOT NULL THEN
        NEW.first_name_encrypted := encode(extensions.pgp_sym_encrypt(NEW.first_name, enc_key), 'base64');
      END IF;
      IF NEW.last_name IS NOT NULL THEN
        NEW.last_name_encrypted := encode(extensions.pgp_sym_encrypt(NEW.last_name, enc_key), 'base64');
      END IF;
      IF NEW.phone IS NOT NULL THEN
        NEW.phone_encrypted := encode(extensions.pgp_sym_encrypt(NEW.phone, enc_key), 'base64');
      END IF;
      IF NEW.date_of_birth IS NOT NULL THEN
        NEW.date_of_birth_encrypted := encode(extensions.pgp_sym_encrypt(NEW.date_of_birth::TEXT, enc_key), 'base64');
      END IF;
      IF NEW.medical_history IS NOT NULL THEN
        NEW.medical_history_encrypted := encode(extensions.pgp_sym_encrypt(NEW.medical_history, enc_key), 'base64');
      END IF;
      IF NEW.address IS NOT NULL THEN
        NEW.address_encrypted := encode(extensions.pgp_sym_encrypt(NEW.address, enc_key), 'base64');
      END IF;
      IF NEW.emergency_contact IS NOT NULL THEN
        NEW.emergency_contact_encrypted := encode(extensions.pgp_sym_encrypt(NEW.emergency_contact, enc_key), 'base64');
      END IF;
      
    WHEN 'appointments' THEN
      IF NEW.reason IS NOT NULL THEN
        NEW.reason_encrypted := encode(extensions.pgp_sym_encrypt(NEW.reason, enc_key), 'base64');
      END IF;
      IF NEW.notes IS NOT NULL THEN
        NEW.notes_encrypted := encode(extensions.pgp_sym_encrypt(NEW.notes, enc_key), 'base64');
      END IF;
      IF NEW.consultation_notes IS NOT NULL THEN
        NEW.consultation_notes_encrypted := encode(extensions.pgp_sym_encrypt(NEW.consultation_notes, enc_key), 'base64');
      END IF;
      IF NEW.ai_summary IS NOT NULL THEN
        NEW.ai_summary_encrypted := encode(extensions.pgp_sym_encrypt(NEW.ai_summary, enc_key), 'base64');
      END IF;
      IF NEW.patient_name IS NOT NULL THEN
        NEW.patient_name_encrypted := encode(extensions.pgp_sym_encrypt(NEW.patient_name, enc_key), 'base64');
      END IF;
      
    WHEN 'treatment_plans' THEN
      IF NEW.diagnosis IS NOT NULL THEN
        NEW.diagnosis_encrypted := encode(extensions.pgp_sym_encrypt(NEW.diagnosis, enc_key), 'base64');
      END IF;
      IF NEW.description IS NOT NULL THEN
        NEW.description_encrypted := encode(extensions.pgp_sym_encrypt(NEW.description, enc_key), 'base64');
      END IF;
      
    WHEN 'medical_records' THEN
      IF NEW.findings IS NOT NULL THEN
        NEW.findings_encrypted := encode(extensions.pgp_sym_encrypt(NEW.findings, enc_key), 'base64');
      END IF;
      
    WHEN 'notes' THEN
      IF NEW.content IS NOT NULL THEN
        NEW.content_encrypted := encode(extensions.pgp_sym_encrypt(NEW.content, enc_key), 'base64');
      END IF;
      IF NEW.title IS NOT NULL THEN
        NEW.title_encrypted := encode(extensions.pgp_sym_encrypt(NEW.title, enc_key), 'base64');
      END IF;
      
    WHEN 'patient_allergies' THEN
      IF NEW.allergy_name IS NOT NULL THEN
        NEW.allergy_name_encrypted := encode(extensions.pgp_sym_encrypt(NEW.allergy_name, enc_key), 'base64');
      END IF;
      IF NEW.notes IS NOT NULL THEN
        NEW.notes_encrypted := encode(extensions.pgp_sym_encrypt(NEW.notes, enc_key), 'base64');
      END IF;
      
    WHEN 'imaging_sets' THEN
      IF NEW.notes IS NOT NULL THEN
        NEW.notes_encrypted := encode(extensions.pgp_sym_encrypt(NEW.notes, enc_key), 'base64');
      END IF;
      
    WHEN 'chat_messages' THEN
      IF NEW.message IS NOT NULL THEN
        NEW.message_encrypted := encode(extensions.pgp_sym_encrypt(NEW.message, enc_key), 'base64');
      END IF;
  END CASE;

  RETURN NEW;
END;
$$;
