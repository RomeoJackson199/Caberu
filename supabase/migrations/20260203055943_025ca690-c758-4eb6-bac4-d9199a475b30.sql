-- Phase 3 continued: Fix notes and patient_allergies encryption
-- Drop TEXT columns and recreate as BYTEA

-- ============================================
-- 4. FIX NOTES ENCRYPTION
-- ============================================
-- Drop old TEXT columns and recreate as BYTEA
ALTER TABLE public.notes DROP COLUMN IF EXISTS content_encrypted;
ALTER TABLE public.notes DROP COLUMN IF EXISTS title_encrypted;
ALTER TABLE public.notes ADD COLUMN content_encrypted BYTEA;
ALTER TABLE public.notes ADD COLUMN title_encrypted BYTEA;

CREATE OR REPLACE FUNCTION public.encrypt_notes_phi_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();
  
  IF enc_key IS NULL OR enc_key = '' THEN
    RETURN NEW;
  END IF;
  
  IF NEW.content IS NOT NULL AND NEW.content != '' THEN
    NEW.content_encrypted := pgp_sym_encrypt(NEW.content, enc_key);
  END IF;
  
  IF NEW.title IS NOT NULL AND NEW.title != '' THEN
    NEW.title_encrypted := pgp_sym_encrypt(NEW.title, enc_key);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_notes_phi ON public.notes;
DROP TRIGGER IF EXISTS trg_encrypt_notes_phi_v2 ON public.notes;
CREATE TRIGGER trg_encrypt_notes_phi_v2
  BEFORE INSERT OR UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_notes_phi_v2();

-- ============================================
-- 5. FIX PATIENT_ALLERGIES ENCRYPTION
-- ============================================
ALTER TABLE public.patient_allergies DROP COLUMN IF EXISTS allergy_name_encrypted;
ALTER TABLE public.patient_allergies DROP COLUMN IF EXISTS notes_encrypted;
ALTER TABLE public.patient_allergies ADD COLUMN allergy_name_encrypted BYTEA;
ALTER TABLE public.patient_allergies ADD COLUMN notes_encrypted BYTEA;

CREATE OR REPLACE FUNCTION public.encrypt_patient_allergies_phi_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := private.get_encryption_key();
  
  IF enc_key IS NULL OR enc_key = '' THEN
    RETURN NEW;
  END IF;
  
  IF NEW.allergy_name IS NOT NULL AND NEW.allergy_name != '' THEN
    NEW.allergy_name_encrypted := pgp_sym_encrypt(NEW.allergy_name, enc_key);
  END IF;
  
  IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
    NEW.notes_encrypted := pgp_sym_encrypt(NEW.notes, enc_key);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_patient_allergies_phi ON public.patient_allergies;
DROP TRIGGER IF EXISTS trg_encrypt_patient_allergies_phi_v2 ON public.patient_allergies;
CREATE TRIGGER trg_encrypt_patient_allergies_phi_v2
  BEFORE INSERT OR UPDATE ON public.patient_allergies
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_patient_allergies_phi_v2();