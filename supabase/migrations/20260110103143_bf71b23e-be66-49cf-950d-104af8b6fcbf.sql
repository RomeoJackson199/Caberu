
-- Remove hardcoded encryption key and use Supabase Vault instead
-- The encryption key should be stored in Vault with name 'app_encryption_key'

-- Replace the hardcoded key function with Vault-based retrieval
CREATE OR REPLACE FUNCTION private.get_app_key() 
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = private, vault
AS $$
DECLARE
    encryption_key TEXT;
BEGIN
    -- Get the encryption key from Supabase Vault
    SELECT decrypted_secret INTO encryption_key
    FROM vault.decrypted_secrets
    WHERE name = 'app_encryption_key'
    LIMIT 1;
    
    IF encryption_key IS NULL THEN
        RAISE EXCEPTION 'Encryption key not found in vault. Please add a secret named "app_encryption_key" in Supabase Vault.';
    END IF;
    
    RETURN encryption_key;
END;
$$;

-- Revoke direct access to the private schema from public roles
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT USAGE ON SCHEMA private TO service_role;
