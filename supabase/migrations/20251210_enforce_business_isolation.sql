-- Migration: Enforce Business Isolation
-- Fixes Critical Vulnerability: Nullable business_id allowed data leakage between tenants

-- 1. Backfill NULL business_ids (This part assumes a default business exists or simply deletes orphaned health data)
-- SAFETY: For this migration script, we will DELETE orphaned health records that have no business_id.

DELETE FROM medical_records WHERE business_id IS NULL;
-- DELETE FROM prescriptions WHERE business_id IS NULL; -- Table does not exist
DELETE FROM treatment_plans WHERE business_id IS NULL;
DELETE FROM appointments WHERE business_id IS NULL;
DELETE FROM payment_requests WHERE business_id IS NULL;

-- 2. Add NOT NULL Constraints
ALTER TABLE medical_records ALTER COLUMN business_id SET NOT NULL;
-- ALTER TABLE prescriptions ALTER COLUMN business_id SET NOT NULL; -- Table does not exist
ALTER TABLE treatment_plans ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE appointments ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE payment_requests ALTER COLUMN business_id SET NOT NULL;

-- 3. Update/Verify RLS Policies
-- Example: Strict Appointment Access
DROP POLICY IF EXISTS "Dentist access appointments" ON appointments;
CREATE POLICY "Dentist access appointments"
ON appointments FOR ALL
TO authenticated
USING (
  -- User must be a member of the appointment's business
  EXISTS (
    SELECT 1 FROM business_members bm
    WHERE bm.business_id = appointments.business_id
    AND bm.profile_id = auth.uid()
  )
  OR
  -- Or be the patient (Read Only - handled by separate policy usually)
  patient_id = auth.uid()
);
