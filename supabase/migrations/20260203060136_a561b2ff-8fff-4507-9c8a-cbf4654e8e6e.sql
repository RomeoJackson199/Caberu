-- Phase 4: Encrypt clinical imaging & documents

-- ============================================
-- 1. IMAGING_SETS - Add encrypted columns
-- ============================================
ALTER TABLE public.imaging_sets 
ADD COLUMN IF NOT EXISTS notes_encrypted BYTEA;

CREATE OR REPLACE FUNCTION public.encrypt_imaging_sets()
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
  
  IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
    NEW.notes_encrypted := pgp_sym_encrypt(NEW.notes, enc_key);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_imaging_sets ON public.imaging_sets;
CREATE TRIGGER trg_encrypt_imaging_sets
  BEFORE INSERT OR UPDATE ON public.imaging_sets
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_imaging_sets();

-- ============================================
-- 2. IMAGING_FILES - Add encrypted columns
-- ============================================
ALTER TABLE public.imaging_files 
ADD COLUMN IF NOT EXISTS metadata_encrypted BYTEA;

CREATE OR REPLACE FUNCTION public.encrypt_imaging_files()
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
  
  IF NEW.metadata IS NOT NULL THEN
    NEW.metadata_encrypted := pgp_sym_encrypt(NEW.metadata::text, enc_key);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_imaging_files ON public.imaging_files;
CREATE TRIGGER trg_encrypt_imaging_files
  BEFORE INSERT OR UPDATE ON public.imaging_files
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_imaging_files();

-- ============================================
-- 3. PATIENT_DOCUMENTS - Add encrypted columns
-- ============================================
ALTER TABLE public.patient_documents 
ADD COLUMN IF NOT EXISTS title_encrypted BYTEA,
ADD COLUMN IF NOT EXISTS file_name_encrypted BYTEA;

CREATE OR REPLACE FUNCTION public.encrypt_patient_documents()
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
  
  IF NEW.title IS NOT NULL AND NEW.title != '' THEN
    NEW.title_encrypted := pgp_sym_encrypt(NEW.title, enc_key);
  END IF;
  
  IF NEW.file_name IS NOT NULL AND NEW.file_name != '' THEN
    NEW.file_name_encrypted := pgp_sym_encrypt(NEW.file_name, enc_key);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_patient_documents ON public.patient_documents;
CREATE TRIGGER trg_encrypt_patient_documents
  BEFORE INSERT OR UPDATE ON public.patient_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_patient_documents();