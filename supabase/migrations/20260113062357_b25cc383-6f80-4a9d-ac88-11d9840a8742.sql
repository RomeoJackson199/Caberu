-- Fix the SECURITY DEFINER view issue by setting it to INVOKER
ALTER VIEW public.secure_profiles_view SET (security_invoker = on);