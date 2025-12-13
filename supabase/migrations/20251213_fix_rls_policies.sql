-- Fix RLS policies for treatment_plans table
-- Current policy checks if dentist_id matches the user, but the check is complex

-- Drop existing insert policy and create a simpler one
DROP POLICY IF EXISTS "Dentists can create treatment plans for their patients" ON public.treatment_plans;

-- Create a new insert policy that allows dentists to insert with their own dentist_id
CREATE POLICY "Dentists can insert treatment plans" ON public.treatment_plans
  FOR INSERT WITH CHECK (
    dentist_id IN (
      SELECT d.id FROM public.dentists d
      JOIN public.profiles p ON p.id = d.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Also fix SELECT policy to be simpler
DROP POLICY IF EXISTS "Dentists can view their patients' treatment plans" ON public.treatment_plans;

CREATE POLICY "Dentists can view treatment plans" ON public.treatment_plans
  FOR SELECT USING (
    dentist_id IN (
      SELECT d.id FROM public.dentists d
      JOIN public.profiles p ON p.id = d.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Fix UPDATE policy
DROP POLICY IF EXISTS "Dentists can update their patients' treatment plans" ON public.treatment_plans;

CREATE POLICY "Dentists can update treatment plans" ON public.treatment_plans
  FOR UPDATE USING (
    dentist_id IN (
      SELECT d.id FROM public.dentists d
      JOIN public.profiles p ON p.id = d.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Add DELETE policy for treatment plans
CREATE POLICY "Dentists can delete treatment plans" ON public.treatment_plans
  FOR DELETE USING (
    dentist_id IN (
      SELECT d.id FROM public.dentists d
      JOIN public.profiles p ON p.id = d.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Fix profiles update policy for dentists to update their patients
-- First check if there's an existing policy
DROP POLICY IF EXISTS "Dentists can update patient profiles" ON public.profiles;

-- Create policy allowing dentists to update patient profiles they have appointments with
CREATE POLICY "Dentists can update patient profiles" ON public.profiles
  FOR UPDATE USING (
    -- Allow users to update their own profile
    user_id = auth.uid()
    OR
    -- Allow dentists to update profiles of their patients (patients they have appointments with)
    id IN (
      SELECT DISTINCT a.patient_id 
      FROM public.appointments a
      JOIN public.dentists d ON d.id = a.dentist_id
      JOIN public.profiles p ON p.id = d.profile_id
      WHERE p.user_id = auth.uid()
    )
  );
