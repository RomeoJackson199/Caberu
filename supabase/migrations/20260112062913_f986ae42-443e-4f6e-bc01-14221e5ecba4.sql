
-- Fix the security definer view by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.secure_profiles_view;
CREATE VIEW public.secure_profiles_view 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  email,
  CASE 
    WHEN first_name = '***ENCRYPTED***' OR first_name IS NULL THEN NULL
    ELSE first_name 
  END as first_name,
  CASE 
    WHEN last_name = '***ENCRYPTED***' OR last_name IS NULL THEN NULL
    ELSE last_name 
  END as last_name,
  CASE 
    WHEN phone = '***ENCRYPTED***' OR phone IS NULL THEN NULL
    ELSE phone 
  END as phone,
  date_of_birth,
  CASE 
    WHEN address = '***ENCRYPTED***' OR address IS NULL THEN NULL
    ELSE address 
  END as address,
  CASE 
    WHEN medical_history = '***ENCRYPTED***' OR medical_history IS NULL THEN NULL
    ELSE medical_history 
  END as medical_history,
  CASE 
    WHEN emergency_contact = '***ENCRYPTED***' OR emergency_contact IS NULL THEN NULL
    ELSE emergency_contact 
  END as emergency_contact,
  avatar_url,
  profile_picture_url,
  created_at,
  updated_at,
  role,
  bio,
  onboarding_completed,
  business_id,
  patient_status,
  last_contact_at,
  next_recall_date,
  is_vip,
  ai_opt_out,
  profile_completion_status
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.secure_profiles_view TO authenticated;
GRANT SELECT ON public.secure_profiles_view TO anon;
