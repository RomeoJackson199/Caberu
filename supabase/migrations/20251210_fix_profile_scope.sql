-- Migration: Scoped Profile Access
-- Fixes Critical Vulnerability: Over-permissive profiles RLS allowed global read

-- 1. Drop existing permissive policy
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;

-- 2. Create Scoped Policies

-- A. Users can view their own profile (Base)
CREATE POLICY "profiles_view_own"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- B. Business Peers: Members can view other members of the SAME business
-- (Dentists/Staff seeing each other)
CREATE POLICY "profiles_view_business_peers"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM business_members bm_me
    JOIN business_members bm_peer ON bm_me.business_id = bm_peer.business_id
    WHERE bm_me.profile_id = auth.uid()
    AND bm_peer.profile_id = profiles.user_id
  )
);

-- C. Provider-Patient: Dentists/Staff can view profiles of Patients associated with their Business via Appointments
CREATE POLICY "profiles_view_patients"
ON public.profiles FOR SELECT
TO authenticated
USING (
  -- The target profile is a patient
  profiles.role = 'patient'
  AND (
    -- Directly linked appointment
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.patient_id = profiles.user_id
        AND a.dentist_id = auth.uid()
    )
    OR
    -- Linked via Business (Staff seeing patients of the clinic)
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN business_members bm ON bm.business_id = a.business_id
      WHERE a.patient_id = profiles.user_id
        AND bm.profile_id = auth.uid()
    )
  )
);

-- Note: We generally prefer using RPCs like 'get_dentist_patients' for lists to avoid RLS overhead,
-- but these policies are essential safeguards for direct queries.
