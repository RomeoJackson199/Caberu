-- Fix generate_business_encryption_key to use extensions schema for pgcrypto functions
CREATE OR REPLACE FUNCTION private.generate_business_encryption_key(p_business_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  master_key TEXT;
  new_key TEXT;
  encrypted_new_key TEXT;
  current_version INTEGER;
BEGIN
  SELECT decrypted_secret INTO master_key
  FROM vault.decrypted_secrets
  WHERE name = 'app_encryption_key'
  LIMIT 1;
  
  IF master_key IS NULL THEN
    RAISE EXCEPTION 'Master encryption key not found in vault';
  END IF;
  
  new_key := encode(extensions.gen_random_bytes(32), 'hex');
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

-- Also wrap the get_business_encryption_key call in decrypt_with_business_key 
-- inside a BEGIN/EXCEPTION block so fallback to app_key works
CREATE OR REPLACE FUNCTION private.decrypt_with_business_key(ciphertext TEXT, p_business_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  biz_key TEXT;
  decrypted TEXT;
  app_key TEXT;
BEGIN
  IF ciphertext IS NULL OR ciphertext = '' THEN
    RETURN NULL;
  END IF;

  -- Try business key first
  IF p_business_id IS NOT NULL THEN
    BEGIN
      biz_key := private.get_business_encryption_key(p_business_id);
      IF biz_key IS NOT NULL AND biz_key != '' THEN
        decrypted := extensions.pgp_sym_decrypt(decode(ciphertext, 'base64'), biz_key);
        RETURN decrypted;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Business key didn't work, fall through to app key
      NULL;
    END;
  END IF;

  -- Fallback: try app_encryption_key (for legacy data)
  SELECT decrypted_secret INTO app_key
  FROM vault.decrypted_secrets
  WHERE name = 'app_encryption_key'
  LIMIT 1;

  IF app_key IS NULL OR app_key = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    decrypted := extensions.pgp_sym_decrypt(decode(ciphertext, 'base64'), app_key);
    RETURN decrypted;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;