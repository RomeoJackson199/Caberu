
-- Fix: Allow patients to view profiles of dentists/staff at businesses they have appointments with
CREATE OR REPLACE FUNCTION public.can_access_profile(target_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  viewer_profile_id UUID;
BEGIN
  SELECT id INTO viewer_profile_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- 1. Users can view their own profile
  IF target_profile_id = viewer_profile_id THEN
    RETURN TRUE;
  END IF;

  -- 2. Business members can view profiles of patients with appointments at their business
  IF EXISTS (
    SELECT 1
    FROM public.business_members bm
    JOIN public.appointments a ON a.business_id = bm.business_id
    WHERE bm.profile_id = viewer_profile_id
    AND a.patient_id = target_profile_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- 3. Dentists can view their patients' profiles
  IF EXISTS (
    SELECT 1
    FROM public.dentists d
    JOIN public.appointments a ON a.dentist_id = d.id
    WHERE d.profile_id = viewer_profile_id
    AND a.patient_id = target_profile_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- 4. Business members can view other business members in the same business
  IF EXISTS (
    SELECT 1
    FROM public.business_members bm1
    JOIN public.business_members bm2 ON bm1.business_id = bm2.business_id
    WHERE bm1.profile_id = viewer_profile_id
    AND bm2.profile_id = target_profile_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- 5. Patients can view profiles of dentists/staff at businesses they have appointments with
  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.dentists d ON d.id = a.dentist_id
    WHERE a.patient_id = viewer_profile_id
    AND d.profile_id = target_profile_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- 6. Patients can view profiles of business members at businesses they have appointments with
  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.business_members bm ON bm.business_id = a.business_id
    WHERE a.patient_id = viewer_profile_id
    AND bm.profile_id = target_profile_id
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;
