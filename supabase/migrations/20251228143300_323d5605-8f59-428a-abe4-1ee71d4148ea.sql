-- Update patient view policy to exclude drafts
DROP POLICY IF EXISTS "Patients can view their notes" ON public.notes;

CREATE POLICY "Patients can view their notes" 
ON public.notes 
FOR SELECT 
USING (
  is_private = false 
  AND note_type NOT IN ('draft_charges', 'draft')
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = notes.patient_id AND p.user_id = auth.uid()
  )
);