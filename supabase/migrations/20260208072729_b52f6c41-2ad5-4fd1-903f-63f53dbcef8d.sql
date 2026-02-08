
-- ============================================================
-- PART A: Drop 13 broken secure_*_view views
-- (Keep secure_profiles_view — it's a passthrough used by 63+ files)
-- ============================================================
DROP VIEW IF EXISTS public.secure_appointments_view;
DROP VIEW IF EXISTS public.secure_notes_view;
DROP VIEW IF EXISTS public.secure_medical_records_view;
DROP VIEW IF EXISTS public.secure_treatment_plans_view;
DROP VIEW IF EXISTS public.secure_messages_view;
DROP VIEW IF EXISTS public.secure_chat_messages_view;
DROP VIEW IF EXISTS public.secure_patient_allergies_view;
DROP VIEW IF EXISTS public.secure_communication_logs_view;
DROP VIEW IF EXISTS public.secure_email_logs_view;
DROP VIEW IF EXISTS public.secure_imaging_sets_view;
DROP VIEW IF EXISTS public.secure_imaging_files_view;
DROP VIEW IF EXISTS public.secure_patient_documents_view;
DROP VIEW IF EXISTS public.secure_appointment_reminders_view;

-- ============================================================
-- PART B: Fix the 2 remaining triggers that still use master key
-- ============================================================

-- B1: appointment_reminders — look up business_id via appointments
CREATE OR REPLACE FUNCTION private.trg_encrypt_appointment_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_biz_id UUID;
BEGIN
  IF TG_OP = 'INSERT' OR NEW.error_message IS DISTINCT FROM OLD.error_message THEN
    SELECT business_id INTO v_biz_id
    FROM public.appointments
    WHERE id = NEW.appointment_id
    LIMIT 1;

    NEW.error_message := private.encrypt_with_business_key(NEW.error_message, v_biz_id);
  END IF;
  RETURN NEW;
END;
$function$;

-- B2: imaging_files — look up business_id via imaging_sets
CREATE OR REPLACE FUNCTION private.trg_encrypt_imaging_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_biz_id UUID;
BEGIN
  IF TG_OP = 'INSERT' OR NEW.metadata IS DISTINCT FROM OLD.metadata THEN
    SELECT business_id INTO v_biz_id
    FROM public.imaging_sets
    WHERE id = NEW.imaging_set_id
    LIMIT 1;

    NEW.metadata := private.encrypt_with_business_key(NEW.metadata, v_biz_id);
  END IF;
  RETURN NEW;
END;
$function$;

-- ============================================================
-- PART C: Create missing *_decrypted views for the 2 tables
-- ============================================================

-- C1: appointment_reminders_decrypted
CREATE OR REPLACE VIEW public.appointment_reminders_decrypted
WITH (security_invoker = on)
AS
SELECT
  ar.id,
  ar.appointment_id,
  ar.reminder_type,
  ar.notification_method,
  ar.scheduled_for,
  ar.sent_at,
  ar.status,
  ar.created_at,
  ar.updated_at,
  private.decrypt_with_business_key(ar.error_message, a.business_id) AS error_message
FROM public.appointment_reminders ar
LEFT JOIN public.appointments a ON a.id = ar.appointment_id;

-- C2: imaging_files_decrypted
CREATE OR REPLACE VIEW public.imaging_files_decrypted
WITH (security_invoker = on)
AS
SELECT
  f.id,
  f.imaging_set_id,
  f.storage_path,
  f.filename,
  f.original_filename,
  f.mime_type,
  f.size_bytes,
  f.width,
  f.height,
  f.thumbnail_path,
  f.created_at,
  private.decrypt_with_business_key(f.metadata, s.business_id) AS metadata
FROM public.imaging_files f
LEFT JOIN public.imaging_sets s ON s.id = f.imaging_set_id;

-- ============================================================
-- PART D: Re-encrypt data in appointment_reminders and imaging_files
-- from master key to business key
-- ============================================================
DO $$
DECLARE
  rec RECORD;
  v_biz_id UUID;
  v_decrypted TEXT;
  v_app_key TEXT;
  v_biz_key TEXT;
BEGIN
  -- Get master app key
  SELECT decrypted_secret INTO v_app_key
  FROM vault.decrypted_secrets
  WHERE name = 'app_encryption_key'
  LIMIT 1;

  IF v_app_key IS NULL OR v_app_key = '' THEN
    RAISE NOTICE 'No app_encryption_key found in vault, skipping re-encryption';
    RETURN;
  END IF;

  -- Re-encrypt appointment_reminders.error_message
  FOR rec IN
    SELECT ar.id, ar.error_message, a.business_id
    FROM public.appointment_reminders ar
    JOIN public.appointments a ON a.id = ar.appointment_id
    WHERE ar.error_message IS NOT NULL AND ar.error_message != ''
  LOOP
    v_biz_key := private.get_business_encryption_key(rec.business_id);
    IF v_biz_key IS NOT NULL AND v_biz_key != '' THEN
      BEGIN
        v_decrypted := extensions.pgp_sym_decrypt(decode(rec.error_message, 'base64'), v_app_key);
        UPDATE public.appointment_reminders
        SET error_message = encode(extensions.pgp_sym_encrypt(v_decrypted, v_biz_key), 'base64')
        WHERE id = rec.id;
      EXCEPTION WHEN OTHERS THEN
        -- Already encrypted with business key or corrupt, skip
        NULL;
      END;
    END IF;
  END LOOP;

  -- Re-encrypt imaging_files.metadata
  FOR rec IN
    SELECT f.id, f.metadata, s.business_id
    FROM public.imaging_files f
    JOIN public.imaging_sets s ON s.id = f.imaging_set_id
    WHERE f.metadata IS NOT NULL AND f.metadata != ''
  LOOP
    v_biz_key := private.get_business_encryption_key(rec.business_id);
    IF v_biz_key IS NOT NULL AND v_biz_key != '' THEN
      BEGIN
        v_decrypted := extensions.pgp_sym_decrypt(decode(rec.metadata, 'base64'), v_app_key);
        UPDATE public.imaging_files
        SET metadata = encode(extensions.pgp_sym_encrypt(v_decrypted, v_biz_key), 'base64')
        WHERE id = rec.id;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END LOOP;

  RAISE NOTICE 'Re-encryption complete for appointment_reminders and imaging_files';
END;
$$;
