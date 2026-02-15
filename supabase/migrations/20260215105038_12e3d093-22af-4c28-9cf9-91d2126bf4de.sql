
-- Revert functions to use PGP encryption with master vault key (proven secure approach)
-- The master key is already in vault.secrets - per-business keys are PGP-encrypted with it

-- Restore get_business_encryption_key to original PGP approach
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
  SELECT decrypted_secret INTO master_key
  FROM vault.decrypted_secrets
  WHERE name = 'app_encryption_key'
  LIMIT 1;
  
  IF master_key IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT bek.encrypted_key INTO encrypted_key_val
  FROM public.business_encryption_keys bek
  WHERE bek.business_id = p_business_id AND bek.is_active = true
  LIMIT 1;
  
  IF encrypted_key_val IS NULL OR encrypted_key_val LIKE 'vault:%' THEN
    -- Key missing or was corrupted, regenerate
    decrypted_key := private.generate_business_encryption_key(p_business_id);
    RETURN decrypted_key;
  END IF;
  
  BEGIN
    decrypted_key := pgp_sym_decrypt(decode(encrypted_key_val, 'base64'), master_key);
    RETURN decrypted_key;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

-- Restore generate to PGP approach
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
  SELECT decrypted_secret INTO master_key
  FROM vault.decrypted_secrets
  WHERE name = 'app_encryption_key'
  LIMIT 1;
  
  IF master_key IS NULL THEN
    RAISE EXCEPTION 'Master encryption key not found in vault';
  END IF;
  
  new_key := encode(gen_random_bytes(32), 'hex');
  encrypted_new_key := encode(pgp_sym_encrypt(new_key, master_key), 'base64');
  
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

-- Restore auto_create trigger to PGP approach
CREATE OR REPLACE FUNCTION public.auto_create_business_encryption_key()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_master_key TEXT;
  v_new_key TEXT;
  v_encrypted_key TEXT;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_master_key
    FROM vault.decrypted_secrets
    WHERE name = 'app_encryption_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_master_key := NULL;
  END;

  IF v_master_key IS NULL OR v_master_key = '' THEN
    RETURN NEW;
  END IF;

  v_new_key := encode(gen_random_bytes(32), 'hex');
  v_encrypted_key := encode(pgp_sym_encrypt(v_new_key, v_master_key), 'base64');

  INSERT INTO public.business_encryption_keys (
    business_id, encrypted_key, key_version, is_active, expires_at
  ) VALUES (
    NEW.id, v_encrypted_key, 1, true, NOW() + INTERVAL '1 year'
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create encryption key for business %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

-- Now regenerate keys for businesses that have corrupted 'vault:' references
DO $$
DECLARE
  rec RECORD;
  v_master_key TEXT;
  v_new_key TEXT;
  v_encrypted_key TEXT;
  v_current_version INTEGER;
BEGIN
  SELECT decrypted_secret INTO v_master_key
  FROM vault.decrypted_secrets
  WHERE name = 'app_encryption_key'
  LIMIT 1;

  IF v_master_key IS NULL THEN
    RAISE WARNING 'No master key, cannot regenerate';
    RETURN;
  END IF;

  FOR rec IN
    SELECT business_id, key_version
    FROM public.business_encryption_keys
    WHERE is_active = true AND encrypted_key LIKE 'vault:%'
  LOOP
    v_new_key := encode(gen_random_bytes(32), 'hex');
    v_encrypted_key := encode(pgp_sym_encrypt(v_new_key, v_master_key), 'base64');
    
    -- Update in place (same version, just fix the key)
    UPDATE public.business_encryption_keys
    SET encrypted_key = v_encrypted_key
    WHERE business_id = rec.business_id AND is_active = true;
  END LOOP;
END;
$$;

-- Create a secure view that NEVER exposes encrypted_key
CREATE OR REPLACE VIEW public.admin_encryption_key_status AS
SELECT 
  id, 
  business_id, 
  key_version, 
  is_active, 
  created_at, 
  rotated_at, 
  expires_at, 
  created_by
FROM public.business_encryption_keys;

-- Revoke direct SELECT on encrypted_key from all roles except service_role
REVOKE ALL ON public.business_encryption_keys FROM anon, authenticated;
GRANT SELECT (id, business_id, key_version, is_active, created_at, rotated_at, expires_at, created_by) 
  ON public.business_encryption_keys TO authenticated;
