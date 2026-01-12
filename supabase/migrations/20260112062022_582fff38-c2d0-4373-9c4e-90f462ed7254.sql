-- Temporarily disable encryption for the secure_profiles_view
-- This allows the dashboard to work while we fix the encryption key issue
-- The plaintext columns will show ***ENCRYPTED*** but at least the view won't crash

DROP VIEW IF EXISTS secure_profiles_view;

CREATE VIEW secure_profiles_view AS
SELECT 
    id,
    user_id,
    -- Skip decryption for now, just use plaintext columns
    first_name,
    last_name,
    phone,
    date_of_birth,
    medical_history,
    address,
    emergency_contact,
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

-- Add a comment explaining the temporary state
COMMENT ON VIEW secure_profiles_view IS 'Temporary view without decryption - encryption key mismatch needs to be resolved';