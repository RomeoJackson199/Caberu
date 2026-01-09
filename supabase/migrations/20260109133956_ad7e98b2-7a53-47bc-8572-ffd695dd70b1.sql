-- GDPR/HIPAA: Consent enforcement functions for patient_consents table
-- Check if patient has valid health data consent at a specific practice

CREATE OR REPLACE FUNCTION public.has_valid_health_consent(
  p_patient_id uuid,
  p_practice_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM patient_consents
    WHERE patient_id = p_patient_id
    AND practice_id = p_practice_id
    AND health_data_consent = true
    AND data_processing_consent = true
    AND withdrawn_at IS NULL
  );
$$;

-- Check if patient has any valid consent (not withdrawn)
CREATE OR REPLACE FUNCTION public.has_active_consent(
  p_patient_id uuid,
  p_practice_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM patient_consents
    WHERE patient_id = p_patient_id
    AND practice_id = p_practice_id
    AND withdrawn_at IS NULL
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.has_valid_health_consent(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_consent(uuid, uuid) TO authenticated;