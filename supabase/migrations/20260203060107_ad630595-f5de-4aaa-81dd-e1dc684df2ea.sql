-- Phase 3: Create remaining secure views (profiles already exists)

-- Drop and recreate treatment_plans view
DROP VIEW IF EXISTS public.secure_treatment_plans_view;
CREATE VIEW public.secure_treatment_plans_view
WITH (security_invoker = true)
AS
SELECT 
  id,
  patient_id,
  dentist_id,
  business_id,
  title,
  status,
  priority,
  start_date,
  end_date,
  estimated_cost,
  estimated_duration_weeks,
  estimated_duration,
  total_estimated_cents,
  currency,
  notes,
  procedures,
  treatment_goals,
  target_completion_date,
  version,
  created_from_appointment_id,
  created_by_dentist_id,
  created_at,
  updated_at,
  COALESCE(pgp_sym_decrypt(diagnosis_encrypted, private.get_encryption_key()), diagnosis) AS diagnosis,
  COALESCE(pgp_sym_decrypt(description_encrypted, private.get_encryption_key()), description) AS description
FROM public.treatment_plans;

GRANT SELECT ON public.secure_treatment_plans_view TO authenticated;
GRANT SELECT ON public.secure_treatment_plans_view TO service_role;

-- Create medical records view
DROP VIEW IF EXISTS public.secure_medical_records_view;
CREATE VIEW public.secure_medical_records_view
WITH (security_invoker = true)
AS
SELECT 
  id,
  patient_id,
  dentist_id,
  business_id,
  title,
  description,
  record_type,
  record_date,
  treatment_provided,
  created_at,
  updated_at,
  COALESCE(pgp_sym_decrypt(findings_encrypted, private.get_encryption_key()), findings) AS findings
FROM public.medical_records;

GRANT SELECT ON public.secure_medical_records_view TO authenticated;
GRANT SELECT ON public.secure_medical_records_view TO service_role;

-- Create notes view
DROP VIEW IF EXISTS public.secure_notes_view;
CREATE VIEW public.secure_notes_view
WITH (security_invoker = true)
AS
SELECT 
  id,
  patient_id,
  appointment_id,
  dentist_id,
  created_by,
  note_type,
  is_private,
  created_at,
  updated_at,
  COALESCE(pgp_sym_decrypt(content_encrypted, private.get_encryption_key()), content) AS content,
  COALESCE(pgp_sym_decrypt(title_encrypted, private.get_encryption_key()), title) AS title
FROM public.notes;

GRANT SELECT ON public.secure_notes_view TO authenticated;
GRANT SELECT ON public.secure_notes_view TO service_role;

-- Create patient allergies view
DROP VIEW IF EXISTS public.secure_patient_allergies_view;
CREATE VIEW public.secure_patient_allergies_view
WITH (security_invoker = true)
AS
SELECT 
  id,
  patient_id,
  business_id,
  severity,
  created_by,
  created_at,
  updated_at,
  COALESCE(pgp_sym_decrypt(allergy_name_encrypted, private.get_encryption_key()), allergy_name) AS allergy_name,
  COALESCE(pgp_sym_decrypt(notes_encrypted, private.get_encryption_key()), notes) AS notes
FROM public.patient_allergies;

GRANT SELECT ON public.secure_patient_allergies_view TO authenticated;
GRANT SELECT ON public.secure_patient_allergies_view TO service_role;