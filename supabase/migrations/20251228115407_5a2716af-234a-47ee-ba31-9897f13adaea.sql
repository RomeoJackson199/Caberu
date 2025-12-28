-- Fix the RLS policy for patient_documents
-- The current policy uses patient_id = auth.uid() which is wrong
-- patient_id references profiles.id, not auth.uid() directly

-- Drop the incorrect policy
DROP POLICY IF EXISTS "Patients can view own documents" ON patient_documents;

-- Create the corrected policy
CREATE POLICY "Patients can view own documents" 
ON patient_documents 
FOR SELECT 
USING (
  patient_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);