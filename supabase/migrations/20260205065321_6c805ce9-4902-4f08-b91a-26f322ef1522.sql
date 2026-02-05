
-- Fix permissions for encryption functions
-- The issue is that triggers run as the table owner, which needs access to private schema

-- Grant execute to public role (used by triggers)
GRANT EXECUTE ON FUNCTION private.get_business_encryption_key(UUID) TO postgres;
GRANT EXECUTE ON FUNCTION private.generate_business_encryption_key(UUID) TO postgres;

-- Also grant to anon for edge cases
GRANT EXECUTE ON FUNCTION private.get_business_encryption_key(UUID) TO anon;

-- Make sure the encrypt function can be executed
GRANT EXECUTE ON FUNCTION private.encrypt_phi_with_business_key() TO postgres;

-- Grant select on vault.decrypted_secrets to service_role (for the SECURITY DEFINER function)
-- This is already done implicitly, but let's ensure the function owner has access

-- Recreate the key retrieval with broader permissions
CREATE OR REPLACE FUNCTION private.get_business_encryption_key(p_business_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, private, vault
AS $$
DECLARE
  master_key TEXT;
  encrypted_key_val TEXT;
  decrypted_key TEXT;
BEGIN
  -- Get master key from vault
  BEGIN
    SELECT decrypted_secret INTO master_key
    FROM vault.decrypted_secrets
    WHERE name = 'app_encryption_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
  
  IF master_key IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get active encrypted key for business
  SELECT bek.encrypted_key INTO encrypted_key_val
  FROM public.business_encryption_keys bek
  WHERE bek.business_id = p_business_id AND bek.is_active = true
  LIMIT 1;
  
  IF encrypted_key_val IS NULL THEN
    -- Auto-generate key for new business
    BEGIN
      decrypted_key := private.generate_business_encryption_key(p_business_id);
      RETURN decrypted_key;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
  END IF;
  
  -- Decrypt the business key using master key
  BEGIN
    decrypted_key := pgp_sym_decrypt(decode(encrypted_key_val, 'base64'), master_key);
    RETURN decrypted_key;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

-- Recreate generate function with proper search_path
CREATE OR REPLACE FUNCTION private.generate_business_encryption_key(p_business_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, vault
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

-- Alter owner to postgres for trigger execution
ALTER FUNCTION private.encrypt_phi_with_business_key() OWNER TO postgres;
ALTER FUNCTION private.get_business_encryption_key(UUID) OWNER TO postgres;
ALTER FUNCTION private.generate_business_encryption_key(UUID) OWNER TO postgres;
