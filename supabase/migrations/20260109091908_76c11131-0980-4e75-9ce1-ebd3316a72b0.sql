-- Fix the infinite recursion in business_members policy
-- The previous policy was querying business_members within its own policy, causing recursion

DROP POLICY IF EXISTS "Business members can view their colleagues" ON public.business_members;

-- Create a simpler policy that checks if the user is a member via profiles table only
CREATE POLICY "Business members can view their colleagues"
ON public.business_members FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = business_members.profile_id
    AND p.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles p
    INNER JOIN business_members bm_check ON bm_check.profile_id = p.id
    WHERE p.user_id = auth.uid()
    AND bm_check.business_id = business_members.business_id
  )
);

-- Actually, the above still has recursion. Let's use a simpler approach with a security definer function.
DROP POLICY IF EXISTS "Business members can view their colleagues" ON public.business_members;

-- Create a helper function to check business membership without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_business_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bm.business_id
  FROM business_members bm
  INNER JOIN profiles p ON p.id = bm.profile_id
  WHERE p.user_id = auth.uid();
$$;

-- Now create the policy using the function
CREATE POLICY "Business members can view their colleagues"
ON public.business_members FOR SELECT
TO authenticated
USING (
  business_id IN (SELECT get_user_business_ids())
);

-- Also fix the businesses policy if it has similar issues
DROP POLICY IF EXISTS "Users can view businesses they belong to" ON public.businesses;

CREATE POLICY "Users can view businesses they belong to"
ON public.businesses FOR SELECT
TO authenticated
USING (
  id IN (SELECT get_user_business_ids())
  OR
  owner_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);