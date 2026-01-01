-- Drop the existing inadequate policy
DROP POLICY IF EXISTS "imaging_files_select" ON imaging_files;

-- Create a better policy that explicitly checks patient access
CREATE POLICY "imaging_files_select_patient" ON imaging_files
FOR SELECT
USING (
  imaging_set_id IN (
    SELECT is2.id FROM imaging_sets is2
    WHERE is2.patient_id IN (
      SELECT p.id FROM profiles p WHERE p.user_id = auth.uid()
    )
  )
);

-- Also allow business members to see imaging files
CREATE POLICY "imaging_files_select_business" ON imaging_files
FOR SELECT
USING (
  imaging_set_id IN (
    SELECT is2.id FROM imaging_sets is2
    WHERE is2.business_id IN (
      SELECT bm.business_id 
      FROM business_members bm
      JOIN profiles p ON p.id = bm.profile_id
      WHERE p.user_id = auth.uid()
    )
  )
);