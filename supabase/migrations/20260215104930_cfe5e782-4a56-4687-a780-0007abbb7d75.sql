
-- Migrate existing keys to vault
DO $$
DECLARE
  rec RECORD;
  v_master_key TEXT;
  v_decrypted_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_master_key
  FROM vault.decrypted_secrets
  WHERE name = 'app_encryption_key'
  LIMIT 1;

  IF v_master_key IS NULL THEN
    RAISE WARNING 'No master key found, skipping migration';
    RETURN;
  END IF;

  FOR rec IN
    SELECT business_id, encrypted_key, key_version
    FROM public.business_encryption_keys
    WHERE is_active = true AND encrypted_key IS NOT NULL AND encrypted_key NOT LIKE 'vault:%'
  LOOP
    BEGIN
      v_decrypted_key := pgp_sym_decrypt(decode(rec.encrypted_key, 'base64'), v_master_key);
      
      DELETE FROM vault.secrets WHERE name = 'bek_' || rec.business_id::text;
      
      INSERT INTO vault.secrets (name, secret, description)
      VALUES (
        'bek_' || rec.business_id::text,
        v_decrypted_key,
        'Business encryption key v' || rec.key_version || ' for ' || rec.business_id::text
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to migrate key for business %: %', rec.business_id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Update get_business_encryption_key to read from vault
CREATE OR REPLACE FUNCTION private.get_business_encryption_key(p_business_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, private
AS $$
DECLARE
  decrypted_key TEXT;
BEGIN
  SELECT decrypted_secret INTO decrypted_key
  FROM vault.decrypted_secrets
  WHERE name = 'bek_' || p_business_id::text
  LIMIT 1;

  IF decrypted_key IS NOT NULL THEN
    RETURN decrypted_key;
  END IF;

  decrypted_key := private.generate_business_encryption_key(p_business_id);
  RETURN decrypted_key;
END;
$$;

-- Update generate to write to vault
CREATE OR REPLACE FUNCTION private.generate_business_encryption_key(p_business_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  new_key TEXT;
  current_version INTEGER;
BEGIN
  new_key := encode(gen_random_bytes(32), 'hex');

  SELECT COALESCE(MAX(key_version), 0) INTO current_version
  FROM public.business_encryption_keys
  WHERE business_id = p_business_id;

  UPDATE public.business_encryption_keys
  SET is_active = false, rotated_at = now()
  WHERE business_id = p_business_id AND is_active = true;

  INSERT INTO public.business_encryption_keys (
    business_id, key_version, encrypted_key, is_active, expires_at
  ) VALUES (
    p_business_id, current_version + 1, 'vault:bek_' || p_business_id::text, true, now() + INTERVAL '1 year'
  );

  DELETE FROM vault.secrets WHERE name = 'bek_' || p_business_id::text;

  INSERT INTO vault.secrets (name, secret, description)
  VALUES (
    'bek_' || p_business_id::text,
    new_key,
    'Business encryption key v' || (current_version + 1) || ' for ' || p_business_id::text
  );

  RETURN new_key;
END;
$$;

-- Update auto_create trigger to use vault
CREATE OR REPLACE FUNCTION public.auto_create_business_encryption_key()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new_key TEXT;
BEGIN
  v_new_key := encode(gen_random_bytes(32), 'hex');

  INSERT INTO public.business_encryption_keys (
    business_id, encrypted_key, key_version, is_active, expires_at
  ) VALUES (
    NEW.id, 'vault:bek_' || NEW.id::text, 1, true, NOW() + INTERVAL '1 year'
  );

  INSERT INTO vault.secrets (name, secret, description)
  VALUES (
    'bek_' || NEW.id::text,
    v_new_key,
    'Business encryption key v1 for ' || NEW.id::text
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create encryption key for business %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

-- Update rotate function
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

-- Clear encrypted_key column values (replace with vault references)
UPDATE public.business_encryption_keys
SET encrypted_key = 'vault:bek_' || business_id::text
WHERE encrypted_key NOT LIKE 'vault:%';
