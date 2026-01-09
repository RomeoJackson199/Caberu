-- Add patient read policies for their own medical data (GDPR Article 15, HIPAA Privacy Rule)

-- Allow patients to view their own medical records
CREATE POLICY "Patients can view their own medical records"
ON public.medical_records
FOR SELECT
TO authenticated
USING (
  patient_id IN (
    SELECT p.id FROM profiles p WHERE p.user_id = auth.uid()
  )
);

-- Allow patients to view their own treatment plans
CREATE POLICY "Patients can view their own treatment plans"
ON public.treatment_plans
FOR SELECT
TO authenticated
USING (
  patient_id IN (
    SELECT p.id FROM profiles p WHERE p.user_id = auth.uid()
  )
);