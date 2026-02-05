
-- The issue is vault.decrypted_secrets requires postgres role
-- Let's create a function that can properly access it

-- First, let's check what role owns the vault functions
-- We need to ensure our SECURITY DEFINER function runs as the right role

-- Create a wrapper that postgres can use
CREATE OR REPLACE FUNCTION private.vault_get_secret(secret_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
DECLARE
  secret_value TEXT;
BEGIN
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;
  RETURN secret_value;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- Grant execute to service_role
GRANT EXECUTE ON FUNCTION private.vault_get_secret(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION private.vault_get_secret(TEXT) TO postgres;
GRANT EXECUTE ON FUNCTION private.vault_get_secret(TEXT) TO authenticated;

-- Now update the get_business_encryption_key to use this wrapper
CREATE OR REPLACE FUNCTION private.get_business_encryption_key(p_business_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, private
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

-- Update generate function to use vault wrapper
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
  -- Get master key using the vault wrapper
  master_key := private.vault_get_secret('app_encryption_key');
  
  IF master_key IS NULL OR master_key = '' THEN
    RAISE NOTICE 'Master encryption key not found in vault';
    RETURN NULL;
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
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error generating key: %', SQLERRM;
  RETURN NULL;
END;
$$;

-- Now generate keys for all businesses
DO $$
DECLARE
  biz RECORD;
  generated_key TEXT;
BEGIN
  FOR biz IN SELECT id FROM public.businesses LOOP
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM public.business_encryption_keys 
        WHERE business_id = biz.id AND is_active = true
      ) THEN
        generated_key := private.generate_business_encryption_key(biz.id);
        IF generated_key IS NOT NULL THEN
          RAISE NOTICE 'Generated key for business %', biz.id;
        ELSE
          RAISE NOTICE 'Failed to generate key for business %', biz.id;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error for business %: %', biz.id, SQLERRM;
    END;
  END LOOP;
END;
$$;
