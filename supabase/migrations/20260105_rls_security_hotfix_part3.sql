-- =========================================================
-- RLS SECURITY HOTFIX - PART 3 (P1 Priority)
-- Date: 2026-01-05
-- Purpose: Fix owner_profile_id = auth.uid() bug in patient_tags
-- =========================================================

BEGIN;

-- =========================================================
-- PART 1: CREATE HELPER FUNCTION
-- =========================================================

CREATE OR REPLACE FUNCTION public.is_business_owner(target_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM businesses b
    JOIN profiles p ON p.id = b.owner_profile_id
    WHERE b.id = target_business_id
    AND p.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_business_owner(UUID) TO authenticated;

-- =========================================================
-- PART 2: FIX PATIENT TAGS POLICIES  
-- (from 20251223154449_*.sql - has owner_profile_id = auth.uid())
-- =========================================================

DROP POLICY IF EXISTS "Business members can view tags" ON patient_tags;
DROP POLICY IF EXISTS "Business owners/dentists can manage tags" ON patient_tags;

CREATE POLICY "Business members can view tags" ON public.patient_tags
  FOR SELECT USING (
    public.is_member_of_business(business_id)
    OR public.is_business_owner(business_id)
  );

CREATE POLICY "Business owners/dentists can manage tags" ON public.patient_tags
  FOR ALL USING (
    public.is_business_owner(business_id)
    OR public.is_member_of_business_with_role(business_id, ARRAY['owner', 'dentist', 'admin'])
  );

COMMIT;

-- =========================================================
-- SUMMARY: Fixed owner_profile_id = auth.uid() bug in patient_tags
-- =========================================================
