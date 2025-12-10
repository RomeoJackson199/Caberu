-- Migration: Revoke patient write access to medical data
-- Fixes Critical Vulnerability: Patients could previously modify their own medical records

-- 1. MEDICAL RECORDS
DROP POLICY IF EXISTS "Patients can manage their own medical_records" ON medical_records;
DROP POLICY IF EXISTS "Patients can insert their own medical_records" ON medical_records;
DROP POLICY IF EXISTS "Patients can update their own medical_records" ON medical_records;
DROP POLICY IF EXISTS "Patients can delete their own medical_records" ON medical_records;
DROP POLICY IF EXISTS "Patients can view their own medical_records" ON medical_records;

-- Patient Read-Only (Select)
CREATE POLICY "Patients can view their own medical_records"
ON medical_records FOR SELECT
TO authenticated
USING (
  patient_id = auth.uid()
);

-- Dentist Full Access (via Business or Direct Assignment)
CREATE POLICY "Dentists can manage medical_records"
ON medical_records FOR ALL 
TO authenticated
USING (
  -- Dentist is a member of the business the record belongs to
  EXISTS (
    SELECT 1 FROM business_members bm
    WHERE bm.business_id = medical_records.business_id
    AND bm.profile_id = auth.uid()
    AND bm.role IN ('dentist', 'owner', 'admin')
  )
  OR 
  -- Fallback: Dentist created the record (for older records without business_id if any)
  dentist_id = auth.uid()
);


-- 2. PRESCRIPTIONS
DROP POLICY IF EXISTS "Patients can manage their own prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Patients can view their own prescriptions" ON prescriptions;

-- Patient Read-Only
CREATE POLICY "Patients can view their own prescriptions"
ON prescriptions FOR SELECT
TO authenticated
USING (
  patient_id = auth.uid()
);

-- Dentist Full Access
CREATE POLICY "Dentists can manage prescriptions"
ON prescriptions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM business_members bm
    WHERE bm.business_id = prescriptions.business_id
    AND bm.profile_id = auth.uid()
    AND bm.role IN ('dentist', 'owner', 'admin')
  )
  OR dentist_id = auth.uid()
);


-- 3. TREATMENT PLANS
DROP POLICY IF EXISTS "Patients can manage their own treatment_plans" ON treatment_plans;
DROP POLICY IF EXISTS "Patients can view their own treatment_plans" ON treatment_plans;

-- Patient Read-Only
CREATE POLICY "Patients can view their own treatment_plans"
ON treatment_plans FOR SELECT
TO authenticated
USING (
  patient_id = auth.uid()
);

-- Dentist Full Access
CREATE POLICY "Dentists can manage treatment_plans"
ON treatment_plans FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM business_members bm
    WHERE bm.business_id = treatment_plans.business_id
    AND bm.profile_id = auth.uid()
    AND bm.role IN ('dentist', 'owner', 'admin')
  )
  OR dentist_id = auth.uid()
);
