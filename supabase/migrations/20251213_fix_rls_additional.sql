-- Additional RLS policy fixes for appointments, profiles, and patient_notes

-- =============================================
-- APPOINTMENTS - Dentists can SELECT their own appointments
-- =============================================
DROP POLICY IF EXISTS "Dentists can view appointments" ON public.appointments;

CREATE POLICY "Dentists can view appointments" ON public.appointments
  FOR SELECT USING (
    dentist_id IN (
      SELECT d.id FROM public.dentists d
      JOIN public.profiles p ON p.id = d.profile_id
      WHERE p.user_id = auth.uid()
    )
    OR
    -- Patients can view their own appointments
    patient_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- =============================================  
-- PROFILES - Dentists can SELECT their patients' profiles
-- =============================================
DROP POLICY IF EXISTS "Dentists can view patient profiles" ON public.profiles;

CREATE POLICY "Dentists can view patient profiles" ON public.profiles
  FOR SELECT USING (
    -- Everyone can read their own profile
    user_id = auth.uid()
    OR
    -- Dentists can read profiles of patients they have appointments with
    id IN (
      SELECT DISTINCT a.patient_id 
      FROM public.appointments a
      JOIN public.dentists d ON d.id = a.dentist_id
      JOIN public.profiles p ON p.id = d.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

-- =============================================
-- PATIENT_NOTES - Dentists can INSERT, SELECT, UPDATE, DELETE
-- =============================================
DROP POLICY IF EXISTS "Dentists can view their patients' notes" ON public.patient_notes;
DROP POLICY IF EXISTS "Dentists can create notes for their patients" ON public.patient_notes;
DROP POLICY IF EXISTS "Dentists can update their patients' notes" ON public.patient_notes;
DROP POLICY IF EXISTS "Dentists can delete patient notes" ON public.patient_notes;

-- SELECT
CREATE POLICY "Dentists can view patient notes" ON public.patient_notes
  FOR SELECT USING (
    dentist_id IN (
      SELECT d.id FROM public.dentists d
      JOIN public.profiles p ON p.id = d.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

-- INSERT  
CREATE POLICY "Dentists can insert patient notes" ON public.patient_notes
  FOR INSERT WITH CHECK (
    dentist_id IN (
      SELECT d.id FROM public.dentists d
      JOIN public.profiles p ON p.id = d.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

-- UPDATE
CREATE POLICY "Dentists can update patient notes" ON public.patient_notes
  FOR UPDATE USING (
    dentist_id IN (
      SELECT d.id FROM public.dentists d
      JOIN public.profiles p ON p.id = d.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

-- DELETE
CREATE POLICY "Dentists can delete patient notes" ON public.patient_notes
  FOR DELETE USING (
    dentist_id IN (
      SELECT d.id FROM public.dentists d
      JOIN public.profiles p ON p.id = d.profile_id
      WHERE p.user_id = auth.uid()
    )
  );
