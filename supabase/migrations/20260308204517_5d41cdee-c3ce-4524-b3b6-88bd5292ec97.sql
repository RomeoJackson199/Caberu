
-- Drop and recreate secure_profiles_view with bio column
DROP VIEW IF EXISTS public.secure_profiles_view;

CREATE VIEW public.secure_profiles_view
WITH (security_invoker = on) AS
SELECT 
    id,
    user_id,
    email,
    first_name,
    last_name,
    phone,
    date_of_birth,
    avatar_url,
    profile_picture_url,
    address,
    emergency_contact,
    medical_history,
    bio,
    role,
    ai_opt_out,
    patient_status,
    profile_completion_status,
    import_session_id,
    phone_verified,
    onboarding_completed,
    created_at,
    updated_at
FROM profiles;
