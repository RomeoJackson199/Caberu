
-- Fix security definer view by making it SECURITY INVOKER
ALTER VIEW public.admin_encryption_key_status SET (security_invoker = on);
