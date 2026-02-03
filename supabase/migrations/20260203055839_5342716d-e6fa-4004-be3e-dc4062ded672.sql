-- Phase 2: Create secure views for medium-risk tables

-- ============================================
-- 1. SECURE_APPOINTMENTS_VIEW
-- ============================================
CREATE OR REPLACE VIEW public.secure_appointments_view
WITH (security_invoker = true)
AS
SELECT 
  id,
  patient_id,
  dentist_id,
  business_id,
  appointment_date,
  duration_minutes,
  status,
  urgency,
  booking_source,
  service_id,
  appointment_type_id,
  treatment_plan_id,
  payment_status,
  payment_intent_id,
  amount_paid_cents,
  completed_at,
  conversation_transcript,
  created_at,
  updated_at,
  -- Decrypt with fallback to plaintext
  COALESCE(pgp_sym_decrypt(reason_encrypted, private.get_encryption_key()), reason) AS reason,
  COALESCE(pgp_sym_decrypt(notes_encrypted, private.get_encryption_key()), notes) AS notes,
  COALESCE(pgp_sym_decrypt(consultation_notes_encrypted, private.get_encryption_key()), consultation_notes) AS consultation_notes,
  COALESCE(pgp_sym_decrypt(ai_summary_encrypted, private.get_encryption_key()), ai_summary) AS ai_summary,
  COALESCE(pgp_sym_decrypt(patient_name_encrypted, private.get_encryption_key()), patient_name) AS patient_name
FROM public.appointments;

GRANT SELECT ON public.secure_appointments_view TO authenticated;
GRANT SELECT ON public.secure_appointments_view TO service_role;

COMMENT ON VIEW public.secure_appointments_view IS 'Secure view with transparent decryption for appointments. Use this instead of direct table access.';

-- ============================================
-- 2. SECURE_CHAT_MESSAGES_VIEW
-- ============================================
CREATE OR REPLACE VIEW public.secure_chat_messages_view
WITH (security_invoker = true)
AS
SELECT 
  id,
  session_id,
  user_id,
  is_bot,
  message_type,
  appointment_id,
  created_at,
  updated_at,
  -- Decrypt with fallback to plaintext
  COALESCE(pgp_sym_decrypt(message_encrypted, private.get_encryption_key()), message) AS message,
  -- Decrypt metadata JSON and cast back
  COALESCE(
    pgp_sym_decrypt(metadata_encrypted, private.get_encryption_key())::jsonb,
    metadata
  ) AS metadata
FROM public.chat_messages;

GRANT SELECT ON public.secure_chat_messages_view TO authenticated;
GRANT SELECT ON public.secure_chat_messages_view TO service_role;

COMMENT ON VIEW public.secure_chat_messages_view IS 'Secure view with transparent decryption for chat_messages. Use this instead of direct table access.';

-- ============================================
-- 3. SECURE_MESSAGES_VIEW
-- ============================================
CREATE OR REPLACE VIEW public.secure_messages_view
WITH (security_invoker = true)
AS
SELECT 
  id,
  business_id,
  sender_profile_id,
  recipient_profile_id,
  is_read,
  created_at,
  updated_at,
  -- Decrypt with fallback to plaintext
  COALESCE(pgp_sym_decrypt(message_text_encrypted, private.get_encryption_key()), message_text) AS message_text
FROM public.messages;

GRANT SELECT ON public.secure_messages_view TO authenticated;
GRANT SELECT ON public.secure_messages_view TO service_role;

COMMENT ON VIEW public.secure_messages_view IS 'Secure view with transparent decryption for messages. Use this instead of direct table access.';