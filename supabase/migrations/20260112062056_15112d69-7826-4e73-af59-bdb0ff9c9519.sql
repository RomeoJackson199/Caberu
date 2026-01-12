-- Create a function to clean up encrypted display values
-- This shows "Unknown" instead of ***ENCRYPTED*** for better UX

CREATE OR REPLACE FUNCTION public.clean_encrypted_display(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
    IF input_text = '***ENCRYPTED***' OR input_text IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN input_text;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Recreate the view to use clean display values
DROP VIEW IF EXISTS secure_profiles_view;

CREATE VIEW secure_profiles_view AS
SELECT 
    id,
    user_id,
    clean_encrypted_display(first_name) AS first_name,
    clean_encrypted_display(last_name) AS last_name,
    clean_encrypted_display(phone) AS phone,
    date_of_birth,
    clean_encrypted_display(medical_history) AS medical_history,
    clean_encrypted_display(address) AS address,
    clean_encrypted_display(emergency_contact) AS emergency_contact,
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

-- Grant permissions
GRANT SELECT ON secure_profiles_view TO authenticated;
GRANT SELECT ON secure_profiles_view TO service_role;