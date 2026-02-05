
-- Fix: Store as raw bytea instead of base64 text
-- Update backfill to store raw pgp_sym_encrypt output

DO $$
DECLARE
  enc_key TEXT;
  biz_id UUID := 'c2ba8198-a90a-4802-8405-b8ac51cc2a00';
  updated_count INTEGER;
BEGIN
  enc_key := private.get_business_encryption_key(biz_id);
  
  IF enc_key IS NULL THEN
    RAISE EXCEPTION 'Could not get encryption key';
  END IF;
  
  -- Profiles (store as raw bytea)
  UPDATE profiles SET first_name_encrypted = extensions.pgp_sym_encrypt(first_name, enc_key)
  WHERE first_name IS NOT NULL AND first_name_encrypted IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Encrypted % profile first_names', updated_count;
  
  UPDATE profiles SET last_name_encrypted = extensions.pgp_sym_encrypt(last_name, enc_key)
  WHERE last_name IS NOT NULL AND last_name_encrypted IS NULL;
  
  UPDATE profiles SET phone_encrypted = extensions.pgp_sym_encrypt(phone, enc_key)
  WHERE phone IS NOT NULL AND phone_encrypted IS NULL;
  
  UPDATE profiles SET date_of_birth_encrypted = extensions.pgp_sym_encrypt(date_of_birth::TEXT, enc_key)
  WHERE date_of_birth IS NOT NULL AND date_of_birth_encrypted IS NULL;
  
  UPDATE profiles SET medical_history_encrypted = extensions.pgp_sym_encrypt(medical_history, enc_key)
  WHERE medical_history IS NOT NULL AND medical_history_encrypted IS NULL;
  
  UPDATE profiles SET address_encrypted = extensions.pgp_sym_encrypt(address, enc_key)
  WHERE address IS NOT NULL AND address_encrypted IS NULL;
  
  UPDATE profiles SET emergency_contact_encrypted = extensions.pgp_sym_encrypt(emergency_contact, enc_key)
  WHERE emergency_contact IS NOT NULL AND emergency_contact_encrypted IS NULL;
  
  RAISE NOTICE 'Profiles backfill complete';
END;
$$;
