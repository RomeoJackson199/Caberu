-- Drop existing policy and recreate with proper INSERT support
DROP POLICY IF EXISTS "Dentists can manage notes" ON public.notes;

-- Create separate policies for SELECT/UPDATE/DELETE and INSERT
CREATE POLICY "Dentists can read notes" 
ON public.notes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM dentists d
    JOIN profiles p ON d.profile_id = p.id
    WHERE (d.id = notes.dentist_id OR d.id = notes.created_by)
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Dentists can insert notes" 
ON public.notes 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM dentists d
    JOIN profiles p ON d.profile_id = p.id
    WHERE (d.id = dentist_id OR d.id = created_by)
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Dentists can update notes" 
ON public.notes 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM dentists d
    JOIN profiles p ON d.profile_id = p.id
    WHERE (d.id = notes.dentist_id OR d.id = notes.created_by)
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Dentists can delete notes" 
ON public.notes 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM dentists d
    JOIN profiles p ON d.profile_id = p.id
    WHERE (d.id = notes.dentist_id OR d.id = notes.created_by)
    AND p.user_id = auth.uid()
  )
);