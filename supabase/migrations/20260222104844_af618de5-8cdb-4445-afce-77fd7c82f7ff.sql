-- Add phone_verified and onboarding_completed to secure_profiles_view
DROP VIEW IF EXISTS public.secure_profiles_view;

CREATE VIEW public.secure_profiles_view
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  email,
  first_name,
  last_name,
  phone,
  date_of_birth,
  avatar_url,
  avatar_url AS profile_picture_url,
  address,
  emergency_contact,
  medical_history,
  role,
  ai_opt_out,
  patient_status,
  profile_completion_status,
  import_session_id,
  phone_verified,
  onboarding_completed,
  created_at,
  updated_at
FROM public.profiles;

GRANT SELECT ON public.secure_profiles_view TO authenticated;
GRANT SELECT ON public.secure_profiles_view TO anon;
GRANT SELECT ON public.secure_profiles_view TO service_role;