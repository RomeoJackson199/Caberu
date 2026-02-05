
-- Generate keys for each business directly using SQL
DO $$
DECLARE
  master_key TEXT;
  new_key TEXT;
  encrypted_key TEXT;
  biz_id UUID;
BEGIN
  -- Get master key
  master_key := private.vault_get_secret('app_encryption_key');
  
  IF master_key IS NULL THEN
    RAISE EXCEPTION 'Master key not found';
  END IF;
  
  -- Generate for Healthcare
  biz_id := 'c2ba8198-a90a-4802-8405-b8ac51cc2a00'::UUID;
  new_key := encode(gen_random_bytes(32), 'hex');
  encrypted_key := encode(pgp_sym_encrypt(new_key, master_key), 'base64');
  INSERT INTO business_encryption_keys (business_id, key_version, encrypted_key, is_active, expires_at)
  VALUES (biz_id, 1, encrypted_key, true, now() + INTERVAL '1 year')
  ON CONFLICT (business_id, key_version) DO NOTHING;
  
  -- Generate for Petite Normandie
  biz_id := 'b6a69bfd-f92d-4a41-9f41-bfbb50e6f2d5'::UUID;
  new_key := encode(gen_random_bytes(32), 'hex');
  encrypted_key := encode(pgp_sym_encrypt(new_key, master_key), 'base64');
  INSERT INTO business_encryption_keys (business_id, key_version, encrypted_key, is_active, expires_at)
  VALUES (biz_id, 1, encrypted_key, true, now() + INTERVAL '1 year')
  ON CONFLICT (business_id, key_version) DO NOTHING;
  
  -- Generate for DEMO
  biz_id := '74a81837-4758-497b-a909-b3f42b2097f3'::UUID;
  new_key := encode(gen_random_bytes(32), 'hex');
  encrypted_key := encode(pgp_sym_encrypt(new_key, master_key), 'base64');
  INSERT INTO business_encryption_keys (business_id, key_version, encrypted_key, is_active, expires_at)
  VALUES (biz_id, 1, encrypted_key, true, now() + INTERVAL '1 year')
  ON CONFLICT (business_id, key_version) DO NOTHING;
  
  RAISE NOTICE 'Generated keys for all 3 businesses';
END;
$$;

-- Verify keys exist
SELECT business_id, key_version, is_active, created_at, expires_at FROM business_encryption_keys;
