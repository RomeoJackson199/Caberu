-- Phase 4: Create secure views for clinical imaging & documents

-- ============================================
-- 1. SECURE_IMAGING_SETS_VIEW
-- ============================================
CREATE OR REPLACE VIEW public.secure_imaging_sets_view
WITH (security_invoker = true)
AS
SELECT 
  id,
  business_id,
  patient_id,
  appointment_id,
  uploaded_by,
  imaging_type,
  treatment_plan_id,
  created_at,
  updated_at,
  COALESCE(pgp_sym_decrypt(notes_encrypted, private.get_encryption_key()), notes) AS notes
FROM public.imaging_sets;

GRANT SELECT ON public.secure_imaging_sets_view TO authenticated;
GRANT SELECT ON public.secure_imaging_sets_view TO service_role;

-- ============================================
-- 2. SECURE_IMAGING_FILES_VIEW
-- ============================================
CREATE OR REPLACE VIEW public.secure_imaging_files_view
WITH (security_invoker = true)
AS
SELECT 
  id,
  imaging_set_id,
  storage_path,
  filename,
  original_filename,
  mime_type,
  size_bytes,
  width,
  height,
  thumbnail_path,
  created_at,
  COALESCE(
    pgp_sym_decrypt(metadata_encrypted, private.get_encryption_key())::jsonb,
    metadata
  ) AS metadata
FROM public.imaging_files;

GRANT SELECT ON public.secure_imaging_files_view TO authenticated;
GRANT SELECT ON public.secure_imaging_files_view TO service_role;

-- ============================================
-- 3. SECURE_PATIENT_DOCUMENTS_VIEW
-- ============================================
CREATE OR REPLACE VIEW public.secure_patient_documents_view
WITH (security_invoker = true)
AS
SELECT 
  id,
  patient_id,
  business_id,
  document_type,
  file_path,
  file_size_bytes,
  mime_type,
  uploaded_by,
  created_at,
  COALESCE(pgp_sym_decrypt(title_encrypted, private.get_encryption_key()), title) AS title,
  COALESCE(pgp_sym_decrypt(file_name_encrypted, private.get_encryption_key()), file_name) AS file_name
FROM public.patient_documents;

GRANT SELECT ON public.secure_patient_documents_view TO authenticated;
GRANT SELECT ON public.secure_patient_documents_view TO service_role;