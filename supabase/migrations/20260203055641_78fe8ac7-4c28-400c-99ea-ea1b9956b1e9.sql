-- Phase 1, Step 1: Create unified encryption key retrieval function
-- This function provides consistent key access from Vault across all triggers

-- Create private schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS private;

-- Grant usage on private schema to postgres role
GRANT USAGE ON SCHEMA private TO postgres;

-- Create the unified key retrieval function
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
  -- Retrieve key from Supabase Vault
  SELECT decrypted_secret INTO enc_key
  FROM vault.decrypted_secrets
  WHERE name = 'app_encryption_key'
  LIMIT 1;
  
  -- Return NULL if key not found (encryption will be skipped)
  RETURN enc_key;
END;
$$;

-- Revoke execute from public for security
REVOKE EXECUTE ON FUNCTION private.get_encryption_key() FROM PUBLIC;

-- Grant execute only to postgres (used by triggers)
GRANT EXECUTE ON FUNCTION private.get_encryption_key() TO postgres;

-- Add comment for documentation
COMMENT ON FUNCTION private.get_encryption_key() IS 'Retrieves encryption key from Vault for PHI encryption. SECURITY DEFINER ensures only authorized access.';