-- Fix the secure_profiles_view to use SECURITY INVOKER (default) instead of SECURITY DEFINER
-- This ensures RLS policies on the profiles table are respected
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
    avatar_url as profile_picture_url,
    address,
    emergency_contact,
    medical_history,
    role,
    ai_opt_out,
    created_at,
    updated_at
FROM profiles;

-- Grant access to authenticated users
GRANT SELECT ON public.secure_profiles_view TO authenticated;
GRANT SELECT ON public.secure_profiles_view TO anon;