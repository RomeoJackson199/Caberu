-- Fix secure_profiles_view to properly decrypt bytea columns
-- The encrypted columns are already in bytea format from pgp_sym_encrypt
-- They don't need to be decoded from base64

-- Create or replace the get_app_key function to also fallback to current_setting
CREATE OR REPLACE FUNCTION private.get_app_key()
RETURNS TEXT AS $$
DECLARE
    encryption_key TEXT;
BEGIN
    -- First try to get from Vault
    BEGIN
        SELECT decrypted_secret INTO encryption_key
        FROM vault.decrypted_secrets
        WHERE name = 'app_encryption_key'
        LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        encryption_key := NULL;
    END;
    
    -- Fallback to current_setting if vault key not found
    IF encryption_key IS NULL OR encryption_key = '' THEN
        encryption_key := current_setting('app.encryption_key', true);
    END IF;
    
    -- Return NULL if no key found (will cause view to return plaintext)
    RETURN encryption_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop and recreate the secure_profiles_view with proper bytea handling
DROP VIEW IF EXISTS secure_profiles_view;

CREATE VIEW secure_profiles_view AS
SELECT 
    id,
    user_id,
    CASE
        WHEN first_name_encrypted IS NOT NULL 
             AND first_name_encrypted <> '\x'::bytea 
             AND private.get_app_key() IS NOT NULL 
        THEN extensions.pgp_sym_decrypt(first_name_encrypted, private.get_app_key())
        ELSE first_name
    END AS first_name,
    CASE
        WHEN last_name_encrypted IS NOT NULL 
             AND last_name_encrypted <> '\x'::bytea 
             AND private.get_app_key() IS NOT NULL 
        THEN extensions.pgp_sym_decrypt(last_name_encrypted, private.get_app_key())
        ELSE last_name
    END AS last_name,
    CASE
        WHEN phone_encrypted IS NOT NULL 
             AND phone_encrypted <> '\x'::bytea 
             AND private.get_app_key() IS NOT NULL 
        THEN extensions.pgp_sym_decrypt(phone_encrypted, private.get_app_key())
        ELSE phone
    END AS phone,
    CASE
        WHEN date_of_birth_encrypted IS NOT NULL 
             AND date_of_birth_encrypted <> '\x'::bytea 
             AND private.get_app_key() IS NOT NULL 
        THEN (extensions.pgp_sym_decrypt(date_of_birth_encrypted, private.get_app_key()))::date
        ELSE date_of_birth
    END AS date_of_birth,
    CASE
        WHEN medical_history_encrypted IS NOT NULL 
             AND medical_history_encrypted <> '\x'::bytea 
             AND private.get_app_key() IS NOT NULL 
        THEN extensions.pgp_sym_decrypt(medical_history_encrypted, private.get_app_key())
        ELSE medical_history
    END AS medical_history,
    CASE
        WHEN address_encrypted IS NOT NULL 
             AND address_encrypted <> '\x'::bytea 
             AND private.get_app_key() IS NOT NULL 
        THEN extensions.pgp_sym_decrypt(address_encrypted, private.get_app_key())
        ELSE address
    END AS address,
    CASE
        WHEN emergency_contact_encrypted IS NOT NULL 
             AND emergency_contact_encrypted <> '\x'::bytea 
             AND private.get_app_key() IS NOT NULL 
        THEN extensions.pgp_sym_decrypt(emergency_contact_encrypted, private.get_app_key())
        ELSE emergency_contact
    END AS emergency_contact,
    email,
    avatar_url,
    profile_picture_url,
    created_at,
    updated_at,
    role,
    ai_opt_out,
    profile_completion_status,
    onboarding_completed,
    is_vip,
    patient_status,
    last_contact_at,
    next_recall_date,
    google_calendar_connected,
    google_calendar_refresh_token,
    business_id,
    bio
FROM profiles;

-- Grant appropriate permissions
GRANT SELECT ON secure_profiles_view TO authenticated;
GRANT SELECT ON secure_profiles_view TO service_role;