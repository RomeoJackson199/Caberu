-- Adjust PHI encryption scope: do not encrypt patient identifiers; only encrypt appointment reason

-- ============================================
-- 1. PROFILES: disable identifier encryption
-- ============================================

-- Replace profiles trigger to stop encrypting identifiers (name, phone, address, DOB, emergency contact)
CREATE OR REPLACE FUNCTION public.encrypt_profiles_phi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, extensions'
AS $$
BEGIN
  -- Intentionally no-op to avoid encrypting patient identifiers
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_profiles_phi ON public.profiles;
CREATE TRIGGER trg_encrypt_profiles_phi
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_profiles_phi();

-- ============================================
-- 2. APPOINTMENTS: encrypt reason only
-- ============================================

CREATE OR REPLACE FUNCTION public.encrypt_appointments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, extensions'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();

  IF enc_key IS NULL OR enc_key = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.reason IS NOT NULL AND NEW.reason != '' THEN
    NEW.reason_encrypted := extensions.pgp_sym_encrypt(NEW.reason, enc_key);
  END IF;

  RETURN NEW;
END;
$$;

-- Rebind trigger to ensure updated function is used
DROP TRIGGER IF EXISTS trg_encrypt_appointments ON public.appointments;
CREATE TRIGGER trg_encrypt_appointments
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_appointments();

-- ============================================
-- 3. URGENCY ASSESSMENTS: do not encrypt symptom duration
-- ============================================

CREATE OR REPLACE FUNCTION public.encrypt_urgency_assessments_phi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, extensions'
AS $$
BEGIN
  -- Intentionally no-op to avoid encrypting symptom duration
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_urgency_assessments_phi ON public.urgency_assessments;
CREATE TRIGGER trg_encrypt_urgency_assessments_phi
  BEFORE INSERT OR UPDATE ON public.urgency_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_urgency_assessments_phi();
