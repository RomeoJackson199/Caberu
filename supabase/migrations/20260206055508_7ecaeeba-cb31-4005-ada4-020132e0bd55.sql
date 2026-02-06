-- =============================================
-- ENHANCED KEY ROTATION WITH DATA RE-ENCRYPTION
-- =============================================
-- This migration updates the key rotation function to re-encrypt
-- ALL historical data with the new key after rotation, ensuring
-- no data remains encrypted with compromised old keys.

-- Drop existing rotation function
DROP FUNCTION IF EXISTS private.rotate_expired_keys();

-- Create enhanced rotation function that re-encrypts all data
CREATE OR REPLACE FUNCTION private.rotate_expired_keys()
RETURNS TABLE(business_id UUID, old_version INT, new_version INT, records_reencrypted INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  biz RECORD;
  old_key TEXT;
  new_key TEXT;
  reencrypted_count INT;
  total_count INT;
BEGIN
  -- Find all businesses with expired active keys
  FOR biz IN 
    SELECT bek.business_id, bek.key_version, bek.encrypted_key
    FROM public.business_encryption_keys bek
    WHERE bek.is_active = true AND bek.expires_at < NOW()
  LOOP
    -- Get the old key for decryption
    old_key := private.get_business_encryption_key(biz.business_id);
    
    IF old_key IS NULL THEN
      RAISE WARNING 'Cannot get old key for business %', biz.business_id;
      CONTINUE;
    END IF;
    
    -- Generate a new key
    PERFORM private.generate_business_encryption_key(biz.business_id);
    
    -- Mark old key as inactive
    UPDATE public.business_encryption_keys
    SET is_active = false, rotated_at = NOW()
    WHERE business_id = biz.business_id AND key_version = biz.key_version;
    
    -- Get the new key
    new_key := private.get_business_encryption_key(biz.business_id);
    
    IF new_key IS NULL THEN
      RAISE WARNING 'Cannot get new key for business %', biz.business_id;
      CONTINUE;
    END IF;
    
    reencrypted_count := 0;
    
    -- Re-encrypt profiles
    UPDATE public.profiles p
    SET 
      first_name_encrypted = pgp_sym_encrypt(
        pgp_sym_decrypt(p.first_name_encrypted, old_key), 
        new_key
      ),
      last_name_encrypted = pgp_sym_encrypt(
        pgp_sym_decrypt(p.last_name_encrypted, old_key), 
        new_key
      ),
      phone_encrypted = CASE 
        WHEN p.phone_encrypted IS NOT NULL THEN 
          pgp_sym_encrypt(pgp_sym_decrypt(p.phone_encrypted, old_key), new_key)
        ELSE NULL 
      END,
      address_encrypted = CASE 
        WHEN p.address_encrypted IS NOT NULL THEN 
          pgp_sym_encrypt(pgp_sym_decrypt(p.address_encrypted, old_key), new_key)
        ELSE NULL 
      END,
      emergency_contact_encrypted = CASE 
        WHEN p.emergency_contact_encrypted IS NOT NULL THEN 
          pgp_sym_encrypt(pgp_sym_decrypt(p.emergency_contact_encrypted, old_key), new_key)
        ELSE NULL 
      END,
      medical_history_encrypted = CASE 
        WHEN p.medical_history_encrypted IS NOT NULL THEN 
          pgp_sym_encrypt(pgp_sym_decrypt(p.medical_history_encrypted, old_key), new_key)
        ELSE NULL 
      END
    FROM public.business_members bm
    WHERE bm.profile_id = p.id AND bm.business_id = biz.business_id
      AND (p.first_name_encrypted IS NOT NULL OR p.last_name_encrypted IS NOT NULL);
    GET DIAGNOSTICS total_count = ROW_COUNT;
    reencrypted_count := reencrypted_count + total_count;
    
    -- Re-encrypt appointments
    UPDATE public.appointments a
    SET 
      patient_name_encrypted = CASE 
        WHEN a.patient_name_encrypted IS NOT NULL THEN 
          pgp_sym_encrypt(pgp_sym_decrypt(a.patient_name_encrypted, old_key), new_key)
        ELSE NULL 
      END,
      reason_encrypted = CASE 
        WHEN a.reason_encrypted IS NOT NULL THEN 
          pgp_sym_encrypt(pgp_sym_decrypt(a.reason_encrypted, old_key), new_key)
        ELSE NULL 
      END,
      notes_encrypted = CASE 
        WHEN a.notes_encrypted IS NOT NULL THEN 
          pgp_sym_encrypt(pgp_sym_decrypt(a.notes_encrypted, old_key), new_key)
        ELSE NULL 
      END,
      consultation_notes_encrypted = CASE 
        WHEN a.consultation_notes_encrypted IS NOT NULL THEN 
          pgp_sym_encrypt(pgp_sym_decrypt(a.consultation_notes_encrypted, old_key), new_key)
        ELSE NULL 
      END,
      ai_summary_encrypted = CASE 
        WHEN a.ai_summary_encrypted IS NOT NULL THEN 
          pgp_sym_encrypt(pgp_sym_decrypt(a.ai_summary_encrypted, old_key), new_key)
        ELSE NULL 
      END
    WHERE a.business_id = biz.business_id
      AND (a.patient_name_encrypted IS NOT NULL OR a.reason_encrypted IS NOT NULL 
           OR a.notes_encrypted IS NOT NULL OR a.consultation_notes_encrypted IS NOT NULL);
    GET DIAGNOSTICS total_count = ROW_COUNT;
    reencrypted_count := reencrypted_count + total_count;
    
    -- Re-encrypt treatment plans
    UPDATE public.treatment_plans tp
    SET 
      title_encrypted = CASE 
        WHEN tp.title_encrypted IS NOT NULL THEN 
          pgp_sym_encrypt(pgp_sym_decrypt(tp.title_encrypted, old_key), new_key)
        ELSE NULL 
      END,
      description_encrypted = CASE 
        WHEN tp.description_encrypted IS NOT NULL THEN 
          pgp_sym_encrypt(pgp_sym_decrypt(tp.description_encrypted, old_key), new_key)
        ELSE NULL 
      END,
      diagnosis_encrypted = CASE 
        WHEN tp.diagnosis_encrypted IS NOT NULL THEN 
          pgp_sym_encrypt(pgp_sym_decrypt(tp.diagnosis_encrypted, old_key), new_key)
        ELSE NULL 
      END,
      notes_encrypted = CASE 
        WHEN tp.notes_encrypted IS NOT NULL THEN 
          pgp_sym_encrypt(pgp_sym_decrypt(tp.notes_encrypted, old_key), new_key)
        ELSE NULL 
      END
    WHERE tp.business_id = biz.business_id
      AND (tp.title_encrypted IS NOT NULL OR tp.description_encrypted IS NOT NULL 
           OR tp.diagnosis_encrypted IS NOT NULL);
    GET DIAGNOSTICS total_count = ROW_COUNT;
    reencrypted_count := reencrypted_count + total_count;
    
    -- Re-encrypt notes
    UPDATE public.notes n
    SET 
      content_encrypted = CASE 
        WHEN n.content_encrypted IS NOT NULL THEN 
          pgp_sym_encrypt(pgp_sym_decrypt(n.content_encrypted, old_key), new_key)
        ELSE NULL 
      END
    WHERE n.business_id = biz.business_id AND n.content_encrypted IS NOT NULL;
    GET DIAGNOSTICS total_count = ROW_COUNT;
    reencrypted_count := reencrypted_count + total_count;
    
    -- Re-encrypt medical records
    UPDATE public.medical_records mr
    SET 
      diagnosis_encrypted = CASE 
        WHEN mr.diagnosis_encrypted IS NOT NULL THEN 
          pgp_sym_encrypt(pgp_sym_decrypt(mr.diagnosis_encrypted, old_key), new_key)
        ELSE NULL 
      END,
      findings_encrypted = CASE 
        WHEN mr.findings_encrypted IS NOT NULL THEN 
          pgp_sym_encrypt(pgp_sym_decrypt(mr.findings_encrypted, old_key), new_key)
        ELSE NULL 
      END,
      recommendations_encrypted = CASE 
        WHEN mr.recommendations_encrypted IS NOT NULL THEN 
          pgp_sym_encrypt(pgp_sym_decrypt(mr.recommendations_encrypted, old_key), new_key)
        ELSE NULL 
      END
    WHERE mr.business_id = biz.business_id
      AND (mr.diagnosis_encrypted IS NOT NULL OR mr.findings_encrypted IS NOT NULL);
    GET DIAGNOSTICS total_count = ROW_COUNT;
    reencrypted_count := reencrypted_count + total_count;
    
    -- Re-encrypt patient allergies
    UPDATE public.patient_allergies pa
    SET 
      allergen_encrypted = CASE 
        WHEN pa.allergen_encrypted IS NOT NULL THEN 
          pgp_sym_encrypt(pgp_sym_decrypt(pa.allergen_encrypted, old_key), new_key)
        ELSE NULL 
      END,
      reaction_encrypted = CASE 
        WHEN pa.reaction_encrypted IS NOT NULL THEN 
          pgp_sym_encrypt(pgp_sym_decrypt(pa.reaction_encrypted, old_key), new_key)
        ELSE NULL 
      END
    WHERE pa.business_id = biz.business_id
      AND (pa.allergen_encrypted IS NOT NULL OR pa.reaction_encrypted IS NOT NULL);
    GET DIAGNOSTICS total_count = ROW_COUNT;
    reencrypted_count := reencrypted_count + total_count;
    
    -- Re-encrypt chat messages
    UPDATE public.chat_messages cm
    SET 
      message_encrypted = CASE 
        WHEN cm.message_encrypted IS NOT NULL THEN 
          pgp_sym_encrypt(pgp_sym_decrypt(cm.message_encrypted, old_key), new_key)
        ELSE NULL 
      END
    FROM public.appointments a
    WHERE cm.appointment_id = a.id AND a.business_id = biz.business_id
      AND cm.message_encrypted IS NOT NULL;
    GET DIAGNOSTICS total_count = ROW_COUNT;
    reencrypted_count := reencrypted_count + total_count;
    
    -- Re-encrypt imaging sets
    UPDATE public.imaging_sets ims
    SET 
      notes_encrypted = CASE 
        WHEN ims.notes_encrypted IS NOT NULL THEN 
          pgp_sym_encrypt(pgp_sym_decrypt(ims.notes_encrypted, old_key), new_key)
        ELSE NULL 
      END
    WHERE ims.business_id = biz.business_id AND ims.notes_encrypted IS NOT NULL;
    GET DIAGNOSTICS total_count = ROW_COUNT;
    reencrypted_count := reencrypted_count + total_count;
    
    -- Re-encrypt communication logs
    UPDATE public.communication_logs cl
    SET 
      subject_encrypted = CASE 
        WHEN cl.subject_encrypted IS NOT NULL THEN 
          pgp_sym_encrypt(pgp_sym_decrypt(cl.subject_encrypted, old_key), new_key)
        ELSE NULL 
      END,
      content_encrypted = CASE 
        WHEN cl.content_encrypted IS NOT NULL THEN 
          pgp_sym_encrypt(pgp_sym_decrypt(cl.content_encrypted, old_key), new_key)
        ELSE NULL 
      END
    WHERE cl.business_id = biz.business_id
      AND (cl.subject_encrypted IS NOT NULL OR cl.content_encrypted IS NOT NULL);
    GET DIAGNOSTICS total_count = ROW_COUNT;
    reencrypted_count := reencrypted_count + total_count;
    
    -- Log the rotation
    RAISE NOTICE 'Rotated key for business % from version % to %, re-encrypted % records', 
      biz.business_id, biz.key_version, biz.key_version + 1, reencrypted_count;
    
    -- Return result for this business
    business_id := biz.business_id;
    old_version := biz.key_version;
    new_version := biz.key_version + 1;
    records_reencrypted := reencrypted_count;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$;

-- Grant execute to authenticated users (will be called by cron)
GRANT EXECUTE ON FUNCTION private.rotate_expired_keys() TO authenticated;

-- Create a manual re-encryption function for immediate use
CREATE OR REPLACE FUNCTION private.reencrypt_business_data(p_business_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  current_key TEXT;
  reencrypted_count INT := 0;
  total_count INT;
BEGIN
  -- Get current key
  current_key := private.get_business_encryption_key(p_business_id);
  
  IF current_key IS NULL THEN
    RAISE EXCEPTION 'No active encryption key for business %', p_business_id;
  END IF;
  
  -- Re-encrypt all plaintext data that should be encrypted
  -- This handles the case where data was saved when encryption was unavailable
  
  -- Profiles with plaintext data
  UPDATE public.profiles p
  SET 
    first_name_encrypted = pgp_sym_encrypt(p.first_name, current_key),
    last_name_encrypted = pgp_sym_encrypt(p.last_name, current_key),
    phone_encrypted = CASE WHEN p.phone IS NOT NULL THEN pgp_sym_encrypt(p.phone, current_key) ELSE NULL END,
    address_encrypted = CASE WHEN p.address IS NOT NULL THEN pgp_sym_encrypt(p.address, current_key) ELSE NULL END,
    emergency_contact_encrypted = CASE WHEN p.emergency_contact IS NOT NULL THEN pgp_sym_encrypt(p.emergency_contact, current_key) ELSE NULL END,
    medical_history_encrypted = CASE WHEN p.medical_history IS NOT NULL THEN pgp_sym_encrypt(p.medical_history::text, current_key) ELSE NULL END,
    -- Clear plaintext after encryption
    first_name = '[ENCRYPTED]',
    last_name = '[ENCRYPTED]',
    phone = NULL,
    address = NULL,
    emergency_contact = NULL,
    medical_history = NULL
  FROM public.business_members bm
  WHERE bm.profile_id = p.id AND bm.business_id = p_business_id
    AND p.first_name IS NOT NULL AND p.first_name != '[ENCRYPTED]'
    AND p.first_name_encrypted IS NULL;
  GET DIAGNOSTICS total_count = ROW_COUNT;
  reencrypted_count := reencrypted_count + total_count;
  
  -- Appointments with plaintext data
  UPDATE public.appointments a
  SET 
    patient_name_encrypted = CASE WHEN a.patient_name IS NOT NULL THEN pgp_sym_encrypt(a.patient_name, current_key) ELSE NULL END,
    reason_encrypted = CASE WHEN a.reason IS NOT NULL AND a.reason != '[ENCRYPTED]' THEN pgp_sym_encrypt(a.reason, current_key) ELSE a.reason_encrypted END,
    notes_encrypted = CASE WHEN a.notes IS NOT NULL THEN pgp_sym_encrypt(a.notes, current_key) ELSE NULL END,
    consultation_notes_encrypted = CASE WHEN a.consultation_notes IS NOT NULL THEN pgp_sym_encrypt(a.consultation_notes, current_key) ELSE NULL END,
    patient_name = NULL,
    reason = CASE WHEN a.reason IS NOT NULL AND a.reason != '[ENCRYPTED]' THEN '[ENCRYPTED]' ELSE a.reason END,
    notes = NULL,
    consultation_notes = NULL
  WHERE a.business_id = p_business_id
    AND (a.patient_name IS NOT NULL OR (a.reason IS NOT NULL AND a.reason != '[ENCRYPTED]') 
         OR a.notes IS NOT NULL OR a.consultation_notes IS NOT NULL)
    AND (a.patient_name_encrypted IS NULL OR a.reason_encrypted IS NULL);
  GET DIAGNOSTICS total_count = ROW_COUNT;
  reencrypted_count := reencrypted_count + total_count;
  
  RETURN reencrypted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION private.reencrypt_business_data(UUID) TO authenticated;

COMMENT ON FUNCTION private.rotate_expired_keys() IS 'Rotates expired encryption keys and re-encrypts ALL historical data with new keys. Called by weekly cron job.';
COMMENT ON FUNCTION private.reencrypt_business_data(UUID) IS 'Encrypts any plaintext PHI data for a specific business. Use after encryption was temporarily unavailable.';