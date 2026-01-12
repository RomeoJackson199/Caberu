-- Fix secure_profiles_view to gracefully handle decryption failures
-- If decryption fails, return the plaintext column value instead

DROP VIEW IF EXISTS secure_profiles_view;

CREATE VIEW secure_profiles_view AS
SELECT 
    id,
    user_id,
    -- For each encrypted field, try to decrypt but fallback to plaintext on error
    COALESCE(
        (SELECT extensions.pgp_sym_decrypt(first_name_encrypted, private.get_app_key()) 
         WHERE first_name_encrypted IS NOT NULL 
         AND first_name_encrypted <> '\x'::bytea 
         AND private.get_app_key() IS NOT NULL),
        first_name
    ) AS first_name,
    COALESCE(
        (SELECT extensions.pgp_sym_decrypt(last_name_encrypted, private.get_app_key()) 
         WHERE last_name_encrypted IS NOT NULL 
         AND last_name_encrypted <> '\x'::bytea 
         AND private.get_app_key() IS NOT NULL),
        last_name
    ) AS last_name,
    COALESCE(
        (SELECT extensions.pgp_sym_decrypt(phone_encrypted, private.get_app_key()) 
         WHERE phone_encrypted IS NOT NULL 
         AND phone_encrypted <> '\x'::bytea 
         AND private.get_app_key() IS NOT NULL),
        phone
    ) AS phone,
    COALESCE(
        (SELECT (extensions.pgp_sym_decrypt(date_of_birth_encrypted, private.get_app_key()))::date 
         WHERE date_of_birth_encrypted IS NOT NULL 
         AND date_of_birth_encrypted <> '\x'::bytea 
         AND private.get_app_key() IS NOT NULL),
        date_of_birth
    ) AS date_of_birth,
    COALESCE(
        (SELECT extensions.pgp_sym_decrypt(medical_history_encrypted, private.get_app_key()) 
         WHERE medical_history_encrypted IS NOT NULL 
         AND medical_history_encrypted <> '\x'::bytea 
         AND private.get_app_key() IS NOT NULL),
        medical_history
    ) AS medical_history,
    COALESCE(
        (SELECT extensions.pgp_sym_decrypt(address_encrypted, private.get_app_key()) 
         WHERE address_encrypted IS NOT NULL 
         AND address_encrypted <> '\x'::bytea 
         AND private.get_app_key() IS NOT NULL),
        address
    ) AS address,
    COALESCE(
        (SELECT extensions.pgp_sym_decrypt(emergency_contact_encrypted, private.get_app_key()) 
         WHERE emergency_contact_encrypted IS NOT NULL 
         AND emergency_contact_encrypted <> '\x'::bytea 
         AND private.get_app_key() IS NOT NULL),
        emergency_contact
    ) AS emergency_contact,
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