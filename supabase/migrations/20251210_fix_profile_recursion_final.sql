-- Migration: Fix Recursive RLS on Profiles
-- Strategy: Use a SECURITY DEFINER function to break the infinite loop in policy checks

-- 1. Create Helper Function (SECURITY DEFINER bypasses RLS for internal logic)
CREATE OR REPLACE FUNCTION public.fn_can_view_profile(target_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. View Own Profile
  IF target_profile_id = auth.uid() THEN
    RETURN TRUE;
  END IF;

  -- 2. Business Peer (Same Business)
  -- Check if executing user and target user share ANY business
  -- (Staff/Dentists seeing each other)
  IF EXISTS (
    SELECT 1 
    FROM business_members bm_me
    JOIN business_members bm_target ON bm_me.business_id = bm_target.business_id
    WHERE bm_me.profile_id = auth.uid()
    AND bm_target.profile_id = target_profile_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- 3. Patient-Provider Relationship
  -- Check if Target is a patient and Executing User is a provider (via appointments)
  -- Or linked via Business (Staff seeing patients of the clinic)
  IF EXISTS (
    SELECT 1 FROM appointments a
    JOIN business_members bm ON bm.business_id = a.business_id
    WHERE a.patient_id = target_profile_id
    AND bm.profile_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 2. Drop Old Recursive Policies
DROP POLICY IF EXISTS "profiles_view_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_view_business_peers" ON public.profiles;
DROP POLICY IF EXISTS "profiles_view_patients" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles; -- ensure this is gone

-- 3. Apply New Non-Recursive Policy
CREATE POLICY "profiles_access_policy"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.fn_can_view_profile(id)
);

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.fn_can_view_profile TO authenticated;
