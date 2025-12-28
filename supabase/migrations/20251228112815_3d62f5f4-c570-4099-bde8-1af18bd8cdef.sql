-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Dentists can manage allergies" ON patient_allergies;
DROP POLICY IF EXISTS "Business members can view allergies" ON patient_allergies;
DROP POLICY IF EXISTS "Patients can view own allergies" ON patient_allergies;

-- Create corrected policies using viewer_profile_id function
CREATE POLICY "Dentists can manage allergies" ON patient_allergies
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM business_members
    WHERE business_members.business_id = patient_allergies.business_id
    AND business_members.profile_id = viewer_profile_id(auth.uid())
    AND business_members.role IN ('owner', 'dentist', 'admin')
  )
);

CREATE POLICY "Business members can view allergies" ON patient_allergies
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM business_members
    WHERE business_members.business_id = patient_allergies.business_id
    AND business_members.profile_id = viewer_profile_id(auth.uid())
  )
);

CREATE POLICY "Patients can view own allergies" ON patient_allergies
FOR SELECT USING (
  patient_id = viewer_profile_id(auth.uid())
);