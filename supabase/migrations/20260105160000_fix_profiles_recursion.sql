-- ============================================
-- FIX PROFILES RLS INFINITE RECURSION
-- ============================================
-- Problem: Policies on profiles table call helper functions that query
-- profiles table, causing infinite recursion
-- Solution: Create a SECURITY DEFINER function that bypasses RLS

-- Drop the problematic policies from the latest migration
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Dentists view patient profiles" ON public.profiles;
DROP POLICY IF EXISTS "Business staff view patient profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;

-- Drop any other potentially conflicting policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_access_policy" ON public.profiles;
DROP POLICY IF EXISTS "Dentists can update patient profiles" ON public.profiles;

-- Create a single SECURITY DEFINER function to check profile access
-- This function bypasses RLS when querying profiles, breaking the recursion
CREATE OR REPLACE FUNCTION public.can_access_profile(target_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer_profile_id UUID;
BEGIN
  -- Get viewer's profile_id (this query bypasses RLS due to SECURITY DEFINER)
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

  RETURN FALSE;
END;
$$;

-- Create a single SECURITY DEFINER function to check if user can modify profile
CREATE OR REPLACE FUNCTION public.can_modify_profile(target_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer_profile_id UUID;
BEGIN
  -- Get viewer's profile_id
  SELECT id INTO viewer_profile_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- 1. Users can modify their own profile
  IF target_profile_id = viewer_profile_id THEN
    RETURN TRUE;
  END IF;

  -- 2. Dentists can modify their patients' profiles
  IF EXISTS (
    SELECT 1
    FROM public.dentists d
    JOIN public.appointments a ON a.dentist_id = d.id
    WHERE d.profile_id = viewer_profile_id
    AND a.patient_id = target_profile_id
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Create simple, non-recursive policies using the SECURITY DEFINER functions

-- SELECT policy
CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.can_access_profile(id));

-- INSERT policy - users can only insert their own profile
CREATE POLICY "profiles_insert_policy"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE policy
CREATE POLICY "profiles_update_policy"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.can_modify_profile(id))
WITH CHECK (public.can_modify_profile(id));

-- DELETE policy - users can only delete their own profile
CREATE POLICY "profiles_delete_policy"
ON public.profiles
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.can_access_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_modify_profile TO authenticated;
