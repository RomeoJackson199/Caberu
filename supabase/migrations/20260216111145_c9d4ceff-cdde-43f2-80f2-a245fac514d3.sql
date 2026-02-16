
-- 1a. Add status column to businesses
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- 1b. Add status column to dentists  
ALTER TABLE public.dentists ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Sync existing is_active=false dentists
UPDATE public.dentists SET status = 'inactive' WHERE is_active = false;

-- 1c. Add patient_status to profiles if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='patient_status') THEN
    ALTER TABLE public.profiles ADD COLUMN patient_status TEXT NOT NULL DEFAULT 'active';
  END IF;
END $$;

-- ============================================
-- safe_deactivate_dentist
-- ============================================
CREATE OR REPLACE FUNCTION public.safe_deactivate_dentist(
  p_dentist_id UUID,
  p_business_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_profile_id UUID;
  v_remaining INT;
  v_user_id UUID;
  v_cancelled INT := 0;
BEGIN
  -- Get profile_id for this dentist
  SELECT profile_id INTO v_profile_id FROM public.dentists WHERE id = p_dentist_id;
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Dentist not found';
  END IF;

  -- Set dentist status to inactive
  UPDATE public.dentists
  SET status = 'inactive', is_active = false, updated_at = now()
  WHERE id = p_dentist_id;

  -- Remove from business_members for this business
  DELETE FROM public.business_members
  WHERE profile_id = v_profile_id AND business_id = p_business_id;

  -- Cancel future pending/confirmed appointments
  UPDATE public.appointments
  SET status = 'cancelled', updated_at = now()
  WHERE dentist_id = p_dentist_id
    AND business_id = p_business_id
    AND appointment_date > now()
    AND status IN ('pending', 'confirmed');
  GET DIAGNOSTICS v_cancelled = ROW_COUNT;

  -- Check if dentist has other business memberships
  SELECT count(*) INTO v_remaining
  FROM public.business_members WHERE profile_id = v_profile_id;

  IF v_remaining = 0 THEN
    -- Revoke provider role
    SELECT user_id INTO v_user_id FROM public.profiles WHERE id = v_profile_id;
    IF v_user_id IS NOT NULL THEN
      DELETE FROM public.user_roles WHERE user_id = v_user_id AND role = 'provider'::public.app_role;
    END IF;
  END IF;

  -- Audit log
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, changes)
  VALUES (
    auth.uid(),
    'deactivate',
    'dentists',
    p_dentist_id::text,
    jsonb_build_object(
      'operation', 'safe_deactivate_dentist',
      'business_id', p_business_id,
      'cancelled_appointments', v_cancelled
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'cancelled_appointments', v_cancelled,
    'remaining_businesses', v_remaining
  );
END;
$fn$;

-- ============================================
-- safe_anonymize_patient
-- ============================================
CREATE OR REPLACE FUNCTION public.safe_anonymize_patient(
  p_profile_id UUID,
  p_actor_id UUID,
  p_reason TEXT DEFAULT 'patient_request'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_anon_id TEXT;
BEGIN
  v_anon_id := 'ANON-' || upper(substr(p_profile_id::text, 1, 8));

  -- Anonymize profile PII
  UPDATE public.profiles SET
    first_name = 'Deleted',
    last_name = 'Patient',
    email = lower(v_anon_id) || '@deleted.local',
    phone = NULL,
    address = NULL,
    date_of_birth = NULL,
    medical_history = NULL,
    emergency_contact = NULL,
    avatar_url = NULL,
    profile_picture_url = NULL,
    patient_status = 'anonymized',
    updated_at = now()
  WHERE id = p_profile_id;

  -- Redact appointment free-text but preserve structure
  UPDATE public.appointments SET
    reason = '[REDACTED]',
    notes = NULL,
    consultation_notes = NULL,
    ai_summary = NULL,
    conversation_transcript = NULL,
    updated_at = now()
  WHERE patient_id = p_profile_id;

  -- Redact treatment plan notes
  UPDATE public.treatment_plans SET
    notes = '[REDACTED]',
    updated_at = now()
  WHERE patient_id = p_profile_id;

  -- Delete re-identifying clinical records
  DELETE FROM public.prescriptions WHERE patient_id = p_profile_id;
  DELETE FROM public.patient_notes WHERE patient_id = p_profile_id;
  DELETE FROM public.patient_documents WHERE patient_id = p_profile_id;
  DELETE FROM public.communication_logs WHERE patient_id = p_profile_id;
  DELETE FROM public.patient_allergies WHERE patient_id = p_profile_id;

  -- Withdraw all active consents
  UPDATE public.consent_records
  SET status = 'withdrawn', withdrawn_at = now()
  WHERE patient_id = p_profile_id AND status = 'granted';

  -- Audit log
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, changes)
  VALUES (
    p_actor_id,
    'anonymize',
    'profiles',
    p_profile_id::text,
    jsonb_build_object(
      'operation', 'safe_anonymize_patient',
      'reason', p_reason,
      'anonymized_at', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'anonymized_id', v_anon_id,
    'anonymized_at', now()
  );
END;
$fn$;

-- ============================================
-- safe_archive_business
-- ============================================
CREATE OR REPLACE FUNCTION public.safe_archive_business(
  p_business_id UUID,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_cancelled INT := 0;
  v_members INT := 0;
  v_dentist RECORD;
BEGIN
  -- Archive the business
  UPDATE public.businesses SET
    status = 'archived',
    subscription_status = 'cancelled',
    updated_at = now()
  WHERE id = p_business_id;

  -- Remove session_business entries
  DELETE FROM public.session_business WHERE business_id = p_business_id;

  -- Cancel all future appointments
  UPDATE public.appointments SET
    status = 'cancelled',
    updated_at = now()
  WHERE business_id = p_business_id
    AND appointment_date > now()
    AND status IN ('pending', 'confirmed');
  GET DIAGNOSTICS v_cancelled = ROW_COUNT;

  -- Deactivate all dentists in this business
  FOR v_dentist IN
    SELECT d.id FROM public.dentists d
    JOIN public.business_members bm ON bm.profile_id = d.profile_id
    WHERE bm.business_id = p_business_id
  LOOP
    UPDATE public.dentists SET status = 'inactive', is_active = false, updated_at = now()
    WHERE id = v_dentist.id;
  END LOOP;

  -- Count members before removing
  SELECT count(*) INTO v_members FROM public.business_members WHERE business_id = p_business_id;

  -- Remove all business_members (revokes access)
  DELETE FROM public.business_members WHERE business_id = p_business_id;

  -- Audit log
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, changes)
  VALUES (
    p_actor_id,
    'archive',
    'businesses',
    p_business_id::text,
    jsonb_build_object(
      'operation', 'safe_archive_business',
      'cancelled_appointments', v_cancelled,
      'removed_members', v_members
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'cancelled_appointments', v_cancelled,
    'removed_members', v_members
  );
END;
$fn$;
