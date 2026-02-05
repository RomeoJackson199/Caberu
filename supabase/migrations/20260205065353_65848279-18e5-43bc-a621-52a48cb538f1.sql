
-- Generate encryption keys for all existing businesses
DO $$
DECLARE
  biz RECORD;
  generated_key TEXT;
BEGIN
  FOR biz IN SELECT id FROM public.businesses LOOP
    BEGIN
      -- Check if key already exists
      IF NOT EXISTS (
        SELECT 1 FROM public.business_encryption_keys 
        WHERE business_id = biz.id AND is_active = true
      ) THEN
        generated_key := private.generate_business_encryption_key(biz.id);
        RAISE NOTICE 'Generated key for business %', biz.id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed to generate key for business %: %', biz.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Create a backfill function that can be run to encrypt existing data
CREATE OR REPLACE FUNCTION private.backfill_encrypt_phi()
RETURNS TABLE(table_name TEXT, records_encrypted INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  enc_key TEXT;
  biz RECORD;
  updated_count INTEGER;
BEGIN
  -- Process each business
  FOR biz IN SELECT id FROM businesses LOOP
    enc_key := private.get_business_encryption_key(biz.id);
    
    IF enc_key IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Encrypt profiles (via session_business link)
    UPDATE profiles p
    SET 
      first_name_encrypted = CASE WHEN first_name IS NOT NULL AND first_name_encrypted IS NULL 
        THEN encode(pgp_sym_encrypt(first_name, enc_key), 'base64') ELSE first_name_encrypted END,
      last_name_encrypted = CASE WHEN last_name IS NOT NULL AND last_name_encrypted IS NULL 
        THEN encode(pgp_sym_encrypt(last_name, enc_key), 'base64') ELSE last_name_encrypted END,
      phone_encrypted = CASE WHEN phone IS NOT NULL AND phone_encrypted IS NULL 
        THEN encode(pgp_sym_encrypt(phone, enc_key), 'base64') ELSE phone_encrypted END,
      date_of_birth_encrypted = CASE WHEN date_of_birth IS NOT NULL AND date_of_birth_encrypted IS NULL 
        THEN encode(pgp_sym_encrypt(date_of_birth::TEXT, enc_key), 'base64') ELSE date_of_birth_encrypted END,
      medical_history_encrypted = CASE WHEN medical_history IS NOT NULL AND medical_history_encrypted IS NULL 
        THEN encode(pgp_sym_encrypt(medical_history, enc_key), 'base64') ELSE medical_history_encrypted END,
      address_encrypted = CASE WHEN address IS NOT NULL AND address_encrypted IS NULL 
        THEN encode(pgp_sym_encrypt(address, enc_key), 'base64') ELSE address_encrypted END,
      emergency_contact_encrypted = CASE WHEN emergency_contact IS NOT NULL AND emergency_contact_encrypted IS NULL 
        THEN encode(pgp_sym_encrypt(emergency_contact, enc_key), 'base64') ELSE emergency_contact_encrypted END
    WHERE p.id IN (
      SELECT DISTINCT a.patient_id FROM appointments a WHERE a.business_id = biz.id
      UNION
      SELECT DISTINCT bm.profile_id FROM business_members bm WHERE bm.business_id = biz.id
    );
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count > 0 THEN
      table_name := 'profiles';
      records_encrypted := updated_count;
      RETURN NEXT;
    END IF;
    
    -- Encrypt appointments
    UPDATE appointments a
    SET 
      reason_encrypted = CASE WHEN reason IS NOT NULL AND reason_encrypted IS NULL 
        THEN encode(pgp_sym_encrypt(reason, enc_key), 'base64') ELSE reason_encrypted END,
      notes_encrypted = CASE WHEN notes IS NOT NULL AND a.notes_encrypted IS NULL 
        THEN encode(pgp_sym_encrypt(notes, enc_key), 'base64') ELSE a.notes_encrypted END,
      consultation_notes_encrypted = CASE WHEN consultation_notes IS NOT NULL AND consultation_notes_encrypted IS NULL 
        THEN encode(pgp_sym_encrypt(consultation_notes, enc_key), 'base64') ELSE consultation_notes_encrypted END,
      ai_summary_encrypted = CASE WHEN ai_summary IS NOT NULL AND ai_summary_encrypted IS NULL 
        THEN encode(pgp_sym_encrypt(ai_summary, enc_key), 'base64') ELSE ai_summary_encrypted END,
      patient_name_encrypted = CASE WHEN patient_name IS NOT NULL AND patient_name_encrypted IS NULL 
        THEN encode(pgp_sym_encrypt(patient_name, enc_key), 'base64') ELSE patient_name_encrypted END
    WHERE a.business_id = biz.id
    AND (reason_encrypted IS NULL OR notes_encrypted IS NULL OR consultation_notes_encrypted IS NULL);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count > 0 THEN
      table_name := 'appointments';
      records_encrypted := updated_count;
      RETURN NEXT;
    END IF;
    
    -- Encrypt treatment_plans
    UPDATE treatment_plans tp
    SET 
      diagnosis_encrypted = CASE WHEN diagnosis IS NOT NULL AND diagnosis_encrypted IS NULL 
        THEN encode(pgp_sym_encrypt(diagnosis, enc_key), 'base64') ELSE diagnosis_encrypted END,
      description_encrypted = CASE WHEN description IS NOT NULL AND description_encrypted IS NULL 
        THEN encode(pgp_sym_encrypt(description, enc_key), 'base64') ELSE description_encrypted END
    WHERE tp.business_id = biz.id
    AND (diagnosis_encrypted IS NULL OR description_encrypted IS NULL);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count > 0 THEN
      table_name := 'treatment_plans';
      records_encrypted := updated_count;
      RETURN NEXT;
    END IF;
    
    -- Encrypt notes
    UPDATE notes n
    SET 
      content_encrypted = CASE WHEN content IS NOT NULL AND content_encrypted IS NULL 
        THEN encode(pgp_sym_encrypt(content, enc_key), 'base64') ELSE content_encrypted END,
      title_encrypted = CASE WHEN title IS NOT NULL AND title_encrypted IS NULL 
        THEN encode(pgp_sym_encrypt(title, enc_key), 'base64') ELSE title_encrypted END
    WHERE n.business_id = biz.id
    AND (content_encrypted IS NULL OR title_encrypted IS NULL);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count > 0 THEN
      table_name := 'notes';
      records_encrypted := updated_count;
      RETURN NEXT;
    END IF;
    
    -- Encrypt patient_allergies
    UPDATE patient_allergies pa
    SET 
      allergy_name_encrypted = CASE WHEN allergy_name IS NOT NULL AND allergy_name_encrypted IS NULL 
        THEN encode(pgp_sym_encrypt(allergy_name, enc_key), 'base64') ELSE allergy_name_encrypted END,
      notes_encrypted = CASE WHEN pa.notes IS NOT NULL AND pa.notes_encrypted IS NULL 
        THEN encode(pgp_sym_encrypt(pa.notes, enc_key), 'base64') ELSE pa.notes_encrypted END
    WHERE pa.business_id = biz.id
    AND (allergy_name_encrypted IS NULL OR pa.notes_encrypted IS NULL);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count > 0 THEN
      table_name := 'patient_allergies';
      records_encrypted := updated_count;
      RETURN NEXT;
    END IF;
    
    -- Encrypt imaging_sets
    UPDATE imaging_sets ims
    SET 
      notes_encrypted = CASE WHEN ims.notes IS NOT NULL AND ims.notes_encrypted IS NULL 
        THEN encode(pgp_sym_encrypt(ims.notes, enc_key), 'base64') ELSE ims.notes_encrypted END
    WHERE ims.business_id = biz.id
    AND ims.notes_encrypted IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count > 0 THEN
      table_name := 'imaging_sets';
      records_encrypted := updated_count;
      RETURN NEXT;
    END IF;
    
  END LOOP;
  
  RETURN;
END;
$$;

-- Run the backfill
SELECT * FROM private.backfill_encrypt_phi();
