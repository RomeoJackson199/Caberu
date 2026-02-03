-- Fix: Convert views to SECURITY INVOKER (respects RLS of calling user)
-- This is the secure approach for views accessing encrypted data

-- ============================================
-- 1. Fix SECURE_COMMUNICATION_LOGS_VIEW
-- ============================================
DROP VIEW IF EXISTS public.secure_communication_logs_view;

CREATE VIEW public.secure_communication_logs_view
WITH (security_invoker = true)
AS
SELECT 
  id,
  business_id,
  patient_id,
  channel,
  direction,
  status,
  sent_by,
  created_at,
  COALESCE(
    pgp_sym_decrypt(content_encrypted, private.get_encryption_key()),
    content
  ) AS content,
  COALESCE(
    pgp_sym_decrypt(subject_encrypted, private.get_encryption_key()),
    subject
  ) AS subject
FROM public.communication_logs;

GRANT SELECT ON public.secure_communication_logs_view TO authenticated;
GRANT SELECT ON public.secure_communication_logs_view TO service_role;

-- ============================================
-- 2. Fix SECURE_EMAIL_LOGS_VIEW
-- ============================================
DROP VIEW IF EXISTS public.secure_email_logs_view;

CREATE VIEW public.secure_email_logs_view
WITH (security_invoker = true)
AS
SELECT 
  id,
  business_id,
  email_type,
  recipient_email,
  recipient_name,
  status,
  sent_at,
  created_at,
  COALESCE(
    pgp_sym_decrypt(subject_encrypted, private.get_encryption_key()),
    subject
  ) AS subject
FROM public.email_logs;

GRANT SELECT ON public.secure_email_logs_view TO authenticated;
GRANT SELECT ON public.secure_email_logs_view TO service_role;

-- ============================================
-- 3. Fix SECURE_APPOINTMENT_REMINDERS_VIEW
-- ============================================
DROP VIEW IF EXISTS public.secure_appointment_reminders_view;

CREATE VIEW public.secure_appointment_reminders_view
WITH (security_invoker = true)
AS
SELECT 
  id,
  appointment_id,
  reminder_type,
  notification_method,
  scheduled_for,
  sent_at,
  status,
  created_at,
  updated_at,
  COALESCE(
    pgp_sym_decrypt(error_message_encrypted, private.get_encryption_key()),
    error_message
  ) AS error_message
FROM public.appointment_reminders;

GRANT SELECT ON public.secure_appointment_reminders_view TO authenticated;
GRANT SELECT ON public.secure_appointment_reminders_view TO service_role;