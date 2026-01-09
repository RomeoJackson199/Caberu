-- ============================================
-- CRITICAL SECURITY FIX: HIPAA/GDPR Compliance
-- ============================================

-- Phase 1: Drop dangerous overly permissive RLS policies

-- 1. DROP the profiles_authenticated_read policy that allows ANY authenticated user 
--    to read ALL patient profiles (CRITICAL HIPAA VIOLATION)
DROP POLICY IF EXISTS "profiles_authenticated_read" ON public.profiles;

-- 2. DROP the overly permissive business_members policy
DROP POLICY IF EXISTS "Anyone can view business members for dentist discovery" ON public.business_members;

-- 3. CREATE secure business_members policy that restricts viewing to colleagues only
CREATE POLICY "Business members can view their colleagues"
ON public.business_members FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT bm.business_id 
    FROM public.business_members bm 
    WHERE bm.profile_id IN (
      SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  )
);

-- 4. DROP the overly permissive businesses SELECT policy if it exists with USING (true)
DROP POLICY IF EXISTS "Anyone can view businesses" ON public.businesses;

-- 5. CREATE secure businesses SELECT policy - only allow viewing businesses user is member of
--    or public business info via the public_businesses_view
CREATE POLICY "Authenticated users can view businesses they belong to"
ON public.businesses FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT bm.business_id 
    FROM public.business_members bm 
    WHERE bm.profile_id IN (
      SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  )
  OR owner_profile_id IN (
    SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid()
  )
);