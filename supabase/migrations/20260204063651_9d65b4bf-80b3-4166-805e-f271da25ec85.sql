-- Ensure private schema exists
CREATE SCHEMA IF NOT EXISTS private;

-- Grant usage to authenticated users (needed for trigger execution)
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

-- Create the key retrieval function that accesses vault
CREATE OR REPLACE FUNCTION private.get_encryption_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  -- Try to get key from vault
  BEGIN
    SELECT decrypted_secret INTO enc_key
    FROM vault.decrypted_secrets
    WHERE name = 'app_encryption_key'
    LIMIT 1;
    
    RETURN enc_key;
  EXCEPTION WHEN OTHERS THEN
    -- If vault access fails, return NULL (encryption will be skipped)
    RETURN NULL;
  END;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION private.get_encryption_key() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_encryption_key() TO service_role;