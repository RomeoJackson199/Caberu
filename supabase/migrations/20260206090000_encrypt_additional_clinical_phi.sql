-- Encrypt additional clinical PHI fields (prescriptions, treatment plans/procedures, medical records, symptoms)

-- ============================================
-- 1. ADD ENCRYPTED COLUMNS
-- ============================================

-- Prescriptions
ALTER TABLE IF EXISTS public.prescriptions
  ADD COLUMN IF NOT EXISTS medication_name_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS dosage_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS frequency_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS duration_days_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS instructions_encrypted BYTEA;

-- Treatment plans
ALTER TABLE IF EXISTS public.treatment_plans
  ADD COLUMN IF NOT EXISTS title_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS notes_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS procedures_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS treatment_goals_encrypted BYTEA;

-- Treatment procedures
ALTER TABLE IF EXISTS public.treatment_procedures
  ADD COLUMN IF NOT EXISTS procedure_name_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS description_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS notes_encrypted BYTEA;

-- Medical records
ALTER TABLE IF EXISTS public.medical_records
  ADD COLUMN IF NOT EXISTS title_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS description_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS treatment_provided_encrypted BYTEA;

-- Symptoms captured in urgency assessments
ALTER TABLE IF EXISTS public.urgency_assessments
  ADD COLUMN IF NOT EXISTS duration_symptoms_encrypted BYTEA;

-- ============================================
-- 2. UPDATE/ADD ENCRYPTION TRIGGERS
-- ============================================

-- Prescriptions
CREATE OR REPLACE FUNCTION public.encrypt_prescriptions_phi()
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

  IF NEW.medication_name IS NOT NULL AND NEW.medication_name != '' THEN
    NEW.medication_name_encrypted := extensions.pgp_sym_encrypt(NEW.medication_name, enc_key);
  END IF;

  IF NEW.dosage IS NOT NULL AND NEW.dosage != '' THEN
    NEW.dosage_encrypted := extensions.pgp_sym_encrypt(NEW.dosage, enc_key);
  END IF;

  IF NEW.frequency IS NOT NULL AND NEW.frequency != '' THEN
    NEW.frequency_encrypted := extensions.pgp_sym_encrypt(NEW.frequency, enc_key);
  END IF;

  IF NEW.duration_days IS NOT NULL THEN
    NEW.duration_days_encrypted := extensions.pgp_sym_encrypt(NEW.duration_days::text, enc_key);
  END IF;

  IF NEW.instructions IS NOT NULL AND NEW.instructions != '' THEN
    NEW.instructions_encrypted := extensions.pgp_sym_encrypt(NEW.instructions, enc_key);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_prescriptions_phi ON public.prescriptions;
CREATE TRIGGER trg_encrypt_prescriptions_phi
  BEFORE INSERT OR UPDATE ON public.prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_prescriptions_phi();

-- Treatment plans (extend existing trigger)
CREATE OR REPLACE FUNCTION public.encrypt_treatment_plans_phi()
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

  IF NEW.diagnosis IS NOT NULL AND NEW.diagnosis != '' THEN
    NEW.diagnosis_encrypted := extensions.pgp_sym_encrypt(NEW.diagnosis, enc_key);
  END IF;

  IF NEW.description IS NOT NULL AND NEW.description != '' THEN
    NEW.description_encrypted := extensions.pgp_sym_encrypt(NEW.description, enc_key);
  END IF;

  IF NEW.title IS NOT NULL AND NEW.title != '' THEN
    NEW.title_encrypted := extensions.pgp_sym_encrypt(NEW.title, enc_key);
  END IF;

  IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
    NEW.notes_encrypted := extensions.pgp_sym_encrypt(NEW.notes, enc_key);
  END IF;

  IF NEW.procedures IS NOT NULL THEN
    NEW.procedures_encrypted := extensions.pgp_sym_encrypt(to_jsonb(NEW.procedures)::text, enc_key);
  END IF;

  IF NEW.treatment_goals IS NOT NULL THEN
    NEW.treatment_goals_encrypted := extensions.pgp_sym_encrypt(to_jsonb(NEW.treatment_goals)::text, enc_key);
  END IF;

  RETURN NEW;
END;
$$;

-- Treatment procedures
CREATE OR REPLACE FUNCTION public.encrypt_treatment_procedures_phi()
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

  IF NEW.procedure_name IS NOT NULL AND NEW.procedure_name != '' THEN
    NEW.procedure_name_encrypted := extensions.pgp_sym_encrypt(NEW.procedure_name, enc_key);
  END IF;

  IF NEW.description IS NOT NULL AND NEW.description != '' THEN
    NEW.description_encrypted := extensions.pgp_sym_encrypt(NEW.description, enc_key);
  END IF;

  IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
    NEW.notes_encrypted := extensions.pgp_sym_encrypt(NEW.notes, enc_key);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_treatment_procedures_phi ON public.treatment_procedures;
CREATE TRIGGER trg_encrypt_treatment_procedures_phi
  BEFORE INSERT OR UPDATE ON public.treatment_procedures
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_treatment_procedures_phi();

-- Medical records (extend existing trigger)
CREATE OR REPLACE FUNCTION public.encrypt_medical_records_phi()
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

  IF NEW.findings IS NOT NULL AND NEW.findings != '' THEN
    NEW.findings_encrypted := extensions.pgp_sym_encrypt(NEW.findings, enc_key);
  END IF;

  IF NEW.title IS NOT NULL AND NEW.title != '' THEN
    NEW.title_encrypted := extensions.pgp_sym_encrypt(NEW.title, enc_key);
  END IF;

  IF NEW.description IS NOT NULL AND NEW.description != '' THEN
    NEW.description_encrypted := extensions.pgp_sym_encrypt(NEW.description, enc_key);
  END IF;

  IF NEW.treatment_provided IS NOT NULL AND NEW.treatment_provided != '' THEN
    NEW.treatment_provided_encrypted := extensions.pgp_sym_encrypt(NEW.treatment_provided, enc_key);
  END IF;

  RETURN NEW;
END;
$$;

-- Symptoms in urgency assessments
CREATE OR REPLACE FUNCTION public.encrypt_urgency_assessments_phi()
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

  IF NEW.duration_symptoms IS NOT NULL AND NEW.duration_symptoms != '' THEN
    NEW.duration_symptoms_encrypted := extensions.pgp_sym_encrypt(NEW.duration_symptoms, enc_key);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_urgency_assessments_phi ON public.urgency_assessments;
CREATE TRIGGER trg_encrypt_urgency_assessments_phi
  BEFORE INSERT OR UPDATE ON public.urgency_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_urgency_assessments_phi();

-- ============================================
-- 3. UPDATE SECURE VIEWS
-- ============================================

-- Treatment plans view
DROP VIEW IF EXISTS public.secure_treatment_plans_view;
CREATE VIEW public.secure_treatment_plans_view
WITH (security_invoker = true)
AS
SELECT 
  id,
  patient_id,
  dentist_id,
  business_id,
  COALESCE(pgp_sym_decrypt(title_encrypted, private.get_encryption_key()), title) AS title,
  status,
  priority,
  start_date,
  end_date,
  estimated_cost,
  estimated_duration_weeks,
  estimated_duration,
  total_estimated_cents,
  currency,
  COALESCE(pgp_sym_decrypt(notes_encrypted, private.get_encryption_key()), notes) AS notes,
  CASE
    WHEN procedures_encrypted IS NOT NULL THEN
      COALESCE(
        (
          SELECT ARRAY(
            SELECT jsonb_array_elements_text(
              pgp_sym_decrypt(procedures_encrypted, private.get_encryption_key())::jsonb
            )
          )
        ),
        procedures
      )
    ELSE procedures
  END AS procedures,
  CASE
    WHEN treatment_goals_encrypted IS NOT NULL THEN
      COALESCE(
        (
          SELECT ARRAY(
            SELECT jsonb_array_elements_text(
              pgp_sym_decrypt(treatment_goals_encrypted, private.get_encryption_key())::jsonb
            )
          )
        ),
        treatment_goals
      )
    ELSE treatment_goals
  END AS treatment_goals,
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

-- Medical records view
DROP VIEW IF EXISTS public.secure_medical_records_view;
CREATE VIEW public.secure_medical_records_view
WITH (security_invoker = true)
AS
SELECT 
  id,
  patient_id,
  dentist_id,
  business_id,
  COALESCE(pgp_sym_decrypt(title_encrypted, private.get_encryption_key()), title) AS title,
  COALESCE(pgp_sym_decrypt(description_encrypted, private.get_encryption_key()), description) AS description,
  record_type,
  record_date,
  COALESCE(pgp_sym_decrypt(treatment_provided_encrypted, private.get_encryption_key()), treatment_provided) AS treatment_provided,
  created_at,
  updated_at,
  COALESCE(pgp_sym_decrypt(findings_encrypted, private.get_encryption_key()), findings) AS findings
FROM public.medical_records;

GRANT SELECT ON public.secure_medical_records_view TO authenticated;
GRANT SELECT ON public.secure_medical_records_view TO service_role;

-- Prescriptions view
DROP VIEW IF EXISTS public.secure_prescriptions_view;
CREATE VIEW public.secure_prescriptions_view
WITH (security_invoker = true)
AS
SELECT
  id,
  patient_id,
  dentist_id,
  business_id,
  status,
  prescribed_date,
  expiry_date,
  created_at,
  updated_at,
  COALESCE(pgp_sym_decrypt(medication_name_encrypted, private.get_encryption_key()), medication_name) AS medication_name,
  COALESCE(pgp_sym_decrypt(dosage_encrypted, private.get_encryption_key()), dosage) AS dosage,
  COALESCE(pgp_sym_decrypt(frequency_encrypted, private.get_encryption_key()), frequency) AS frequency,
  COALESCE(
    (pgp_sym_decrypt(duration_days_encrypted, private.get_encryption_key())::text)::int,
    duration_days
  ) AS duration_days,
  COALESCE(pgp_sym_decrypt(instructions_encrypted, private.get_encryption_key()), instructions) AS instructions
FROM public.prescriptions;

GRANT SELECT ON public.secure_prescriptions_view TO authenticated;
GRANT SELECT ON public.secure_prescriptions_view TO service_role;

-- Treatment procedures view
DROP VIEW IF EXISTS public.secure_treatment_procedures_view;
CREATE VIEW public.secure_treatment_procedures_view
WITH (security_invoker = true)
AS
SELECT
  id,
  treatment_plan_id,
  status,
  cost,
  scheduled_date,
  completed_date,
  created_at,
  updated_at,
  COALESCE(pgp_sym_decrypt(procedure_name_encrypted, private.get_encryption_key()), procedure_name) AS procedure_name,
  COALESCE(pgp_sym_decrypt(description_encrypted, private.get_encryption_key()), description) AS description,
  COALESCE(pgp_sym_decrypt(notes_encrypted, private.get_encryption_key()), notes) AS notes
FROM public.treatment_procedures;

GRANT SELECT ON public.secure_treatment_procedures_view TO authenticated;
GRANT SELECT ON public.secure_treatment_procedures_view TO service_role;
