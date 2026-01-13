-- Fix secure_profiles_view by adding missing user_id column
DROP VIEW IF EXISTS public.secure_profiles_view CASCADE;

CREATE VIEW public.secure_profiles_view WITH (security_invoker = on) AS
SELECT 
  id,
  id AS user_id,  -- user_id is same as id for profiles
  email,
  first_name,
  last_name,
  phone,
  date_of_birth,
  avatar_url,
  address,
  emergency_contact,
  medical_history,
  role,
  created_at,
  updated_at
FROM public.profiles;