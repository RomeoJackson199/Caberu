-- Fix auto_create_business_encryption_key to use extensions schema
CREATE OR REPLACE FUNCTION public.auto_create_business_encryption_key()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  v_new_key := encode(extensions.gen_random_bytes(32), 'hex');
  v_encrypted_key := encode(extensions.pgp_sym_encrypt(v_new_key, v_master_key), 'base64');

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
$$;