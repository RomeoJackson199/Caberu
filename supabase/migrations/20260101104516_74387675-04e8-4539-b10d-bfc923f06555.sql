-- Fix the incorrect RLS policy that compares patient_id (profile ID) to auth.uid() (user ID)
-- Drop the incorrect policy
DROP POLICY IF EXISTS "Patients can view their own treatment_plans" ON public.treatment_plans;

-- The correct policy already exists: "Patients can view own non-draft treatment plans"
-- which correctly checks patient_id against profiles.id where profiles.user_id = auth.uid()
-- No additional policy needed since that one handles it correctly