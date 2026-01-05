-- =========================================================
-- RLS SECURITY HOTFIX MIGRATION
-- Date: 2026-01-05
-- Purpose: Fix critical authentication logic vulnerabilities
-- =========================================================
-- 
-- This migration fixes the profile_id = auth.uid() bug where:
--   - auth.uid() returns user_id from Supabase Auth
--   - profile_id references profiles.id, NOT profiles.user_id
--   - These are DIFFERENT UUIDs, causing all auth checks to fail
--
-- Pattern Change:
--   BEFORE: WHERE bm.profile_id = auth.uid()
--   AFTER:  WHERE bm.profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
-- =========================================================

BEGIN;

-- =========================================================
-- PART 1: CREATE HELPER FUNCTION
-- =========================================================

-- Helper function to check if current user is a member of a business
-- Uses SECURITY DEFINER to avoid RLS recursion issues
CREATE OR REPLACE FUNCTION public.is_member_of_business(target_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_members bm
    JOIN profiles p ON p.id = bm.profile_id
    WHERE bm.business_id = target_business_id
    AND p.user_id = auth.uid()
  );
$$;

-- Helper function to check if user is a member with specific roles
CREATE OR REPLACE FUNCTION public.is_member_of_business_with_role(
  target_business_id UUID, 
  allowed_roles TEXT[]
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_members bm
    JOIN profiles p ON p.id = bm.profile_id
    WHERE bm.business_id = target_business_id
    AND p.user_id = auth.uid()
    AND bm.role = ANY(allowed_roles)
  );
$$;

-- Helper function to get current user's profile id
CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_member_of_business(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of_business_with_role(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile_id() TO authenticated;

-- =========================================================
-- PART 2: FIX fn_can_view_profile (from 20251210_fix_profile_recursion_final.sql)
-- =========================================================

CREATE OR REPLACE FUNCTION public.fn_can_view_profile(target_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_profile_id UUID;
BEGIN
  -- Get current user's profile id
  SELECT id INTO my_profile_id FROM profiles WHERE user_id = auth.uid();
  
  -- 1. View Own Profile
  IF target_profile_id = my_profile_id THEN
    RETURN TRUE;
  END IF;

  -- 2. Business Peer (Same Business)
  -- Check if executing user and target user share ANY business
  IF EXISTS (
    SELECT 1 
    FROM business_members bm_me
    JOIN business_members bm_target ON bm_me.business_id = bm_target.business_id
    WHERE bm_me.profile_id = my_profile_id
    AND bm_target.profile_id = target_profile_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- 3. Patient-Provider Relationship via appointments
  IF EXISTS (
    SELECT 1 FROM appointments a
    JOIN business_members bm ON bm.business_id = a.business_id
    WHERE a.patient_id = target_profile_id
    AND bm.profile_id = my_profile_id
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- =========================================================
-- PART 3: FIX patient_tags POLICIES
-- =========================================================

DROP POLICY IF EXISTS "Business members can view tags" ON public.patient_tags;
DROP POLICY IF EXISTS "Business owners/dentists can manage tags" ON public.patient_tags;

CREATE POLICY "Business members can view tags" ON public.patient_tags
  FOR SELECT USING (
    public.is_member_of_business(business_id)
    OR EXISTS (
      SELECT 1 FROM businesses b
      JOIN profiles p ON p.id = b.owner_profile_id
      WHERE b.id = patient_tags.business_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners/dentists can manage tags" ON public.patient_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses b
      JOIN profiles p ON p.id = b.owner_profile_id
      WHERE b.id = patient_tags.business_id
      AND p.user_id = auth.uid()
    )
    OR public.is_member_of_business_with_role(business_id, ARRAY['owner', 'dentist', 'admin'])
  );

-- =========================================================
-- PART 4: FIX patient_tag_assignments POLICIES
-- =========================================================

DROP POLICY IF EXISTS "Business members can view tag assignments" ON public.patient_tag_assignments;
DROP POLICY IF EXISTS "Dentists can manage tag assignments" ON public.patient_tag_assignments;

CREATE POLICY "Business members can view tag assignments" ON public.patient_tag_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patient_tags pt
      WHERE pt.id = patient_tag_assignments.tag_id
      AND public.is_member_of_business(pt.business_id)
    )
  );

CREATE POLICY "Dentists can manage tag assignments" ON public.patient_tag_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM patient_tags pt
      WHERE pt.id = patient_tag_assignments.tag_id
      AND public.is_member_of_business_with_role(pt.business_id, ARRAY['owner', 'dentist', 'admin'])
    )
  );

-- =========================================================
-- PART 5: FIX patient_allergies POLICIES
-- =========================================================

DROP POLICY IF EXISTS "Business members can view allergies" ON public.patient_allergies;
DROP POLICY IF EXISTS "Dentists can manage allergies" ON public.patient_allergies;
DROP POLICY IF EXISTS "Patients can view own allergies" ON public.patient_allergies;

CREATE POLICY "Business members can view allergies" ON public.patient_allergies
  FOR SELECT USING (
    public.is_member_of_business(business_id)
  );

CREATE POLICY "Dentists can manage allergies" ON public.patient_allergies
  FOR ALL USING (
    public.is_member_of_business_with_role(business_id, ARRAY['owner', 'dentist', 'admin'])
  );

-- Patients can view their own allergies (patient_id references profiles.id)
CREATE POLICY "Patients can view own allergies" ON public.patient_allergies
  FOR SELECT USING (
    patient_id = public.get_my_profile_id()
  );

-- =========================================================
-- PART 6: FIX patient_documents POLICIES
-- =========================================================

DROP POLICY IF EXISTS "Business members can view documents" ON public.patient_documents;
DROP POLICY IF EXISTS "Dentists can manage documents" ON public.patient_documents;
DROP POLICY IF EXISTS "Patients can view own documents" ON public.patient_documents;

CREATE POLICY "Business members can view documents" ON public.patient_documents
  FOR SELECT USING (
    public.is_member_of_business(business_id)
  );

CREATE POLICY "Dentists can manage documents" ON public.patient_documents
  FOR ALL USING (
    public.is_member_of_business_with_role(business_id, ARRAY['owner', 'dentist', 'admin'])
  );

CREATE POLICY "Patients can view own documents" ON public.patient_documents
  FOR SELECT USING (
    patient_id = public.get_my_profile_id()
  );

-- =========================================================
-- PART 7: FIX communication_logs POLICIES
-- =========================================================

DROP POLICY IF EXISTS "Business members can view communication logs" ON public.communication_logs;
DROP POLICY IF EXISTS "Dentists can create communication logs" ON public.communication_logs;

CREATE POLICY "Business members can view communication logs" ON public.communication_logs
  FOR SELECT USING (
    public.is_member_of_business(business_id)
  );

CREATE POLICY "Dentists can create communication logs" ON public.communication_logs
  FOR INSERT WITH CHECK (
    public.is_member_of_business(business_id)
  );

-- =========================================================
-- PART 8: FIX imaging_sets POLICIES
-- =========================================================

DROP POLICY IF EXISTS "imaging_sets_select_business" ON public.imaging_sets;
DROP POLICY IF EXISTS "imaging_sets_select_patient" ON public.imaging_sets;
DROP POLICY IF EXISTS "imaging_sets_insert" ON public.imaging_sets;
DROP POLICY IF EXISTS "imaging_sets_update" ON public.imaging_sets;
DROP POLICY IF EXISTS "imaging_sets_delete" ON public.imaging_sets;

CREATE POLICY "imaging_sets_select_business" ON public.imaging_sets
  FOR SELECT USING (
    public.is_member_of_business(business_id)
  );

CREATE POLICY "imaging_sets_select_patient" ON public.imaging_sets
  FOR SELECT USING (
    patient_id = public.get_my_profile_id()
  );

CREATE POLICY "imaging_sets_insert" ON public.imaging_sets
  FOR INSERT WITH CHECK (
    public.is_member_of_business_with_role(business_id, ARRAY['admin', 'dentist', 'staff'])
  );

CREATE POLICY "imaging_sets_update" ON public.imaging_sets
  FOR UPDATE USING (
    public.is_member_of_business_with_role(business_id, ARRAY['admin', 'dentist', 'staff'])
  );

CREATE POLICY "imaging_sets_delete" ON public.imaging_sets
  FOR DELETE USING (
    public.is_member_of_business_with_role(business_id, ARRAY['admin', 'dentist'])
  );

-- =========================================================
-- PART 9: FIX imaging_files POLICIES
-- =========================================================

DROP POLICY IF EXISTS "imaging_files_select" ON public.imaging_files;
DROP POLICY IF EXISTS "imaging_files_insert" ON public.imaging_files;
DROP POLICY IF EXISTS "imaging_files_delete" ON public.imaging_files;

-- Files inherit access from their parent imaging_set via RLS chain
CREATE POLICY "imaging_files_select" ON public.imaging_files
  FOR SELECT USING (
    imaging_set_id IN (SELECT id FROM imaging_sets)
  );

CREATE POLICY "imaging_files_insert" ON public.imaging_files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM imaging_sets is2
      WHERE is2.id = imaging_files.imaging_set_id
      AND public.is_member_of_business_with_role(is2.business_id, ARRAY['admin', 'dentist', 'staff'])
    )
  );

CREATE POLICY "imaging_files_delete" ON public.imaging_files
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM imaging_sets is2
      WHERE is2.id = imaging_files.imaging_set_id
      AND public.is_member_of_business_with_role(is2.business_id, ARRAY['admin', 'dentist'])
    )
  );

-- =========================================================
-- PART 10: FIX STORAGE POLICIES (clinic-imaging bucket)
-- =========================================================

DROP POLICY IF EXISTS "clinic_imaging_insert" ON storage.objects;
DROP POLICY IF EXISTS "clinic_imaging_select" ON storage.objects;
DROP POLICY IF EXISTS "clinic_imaging_delete" ON storage.objects;

CREATE POLICY "clinic_imaging_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'clinic-imaging'
    AND (storage.foldername(name))[1] IN (
      SELECT bm.business_id::text 
      FROM business_members bm
      JOIN profiles p ON p.id = bm.profile_id
      WHERE p.user_id = auth.uid()
      AND bm.role IN ('admin', 'dentist', 'staff')
    )
  );

CREATE POLICY "clinic_imaging_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'clinic-imaging'
    AND (
      -- Business members can view all business files
      (storage.foldername(name))[1] IN (
        SELECT bm.business_id::text 
        FROM business_members bm
        JOIN profiles p ON p.id = bm.profile_id
        WHERE p.user_id = auth.uid()
      )
      -- OR patient can view files in their folder (using profile id)
      OR (storage.foldername(name))[2] = (SELECT id::text FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "clinic_imaging_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'clinic-imaging'
    AND (storage.foldername(name))[1] IN (
      SELECT bm.business_id::text 
      FROM business_members bm
      JOIN profiles p ON p.id = bm.profile_id
      WHERE p.user_id = auth.uid()
      AND bm.role IN ('admin', 'dentist')
    )
  );

COMMIT;

-- =========================================================
-- VERIFICATION QUERIES (Run manually to test)
-- =========================================================
-- 
-- Test 1: Check if helper functions work
-- SELECT public.get_my_profile_id();
-- SELECT public.is_member_of_business('your-business-uuid-here');
-- 
-- Test 2: Verify business member can see their data
-- SELECT * FROM patient_tags LIMIT 5;
-- SELECT * FROM imaging_sets LIMIT 5;
-- 
-- Test 3: Verify cross-business isolation (as different user)
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims = '{"sub": "other-user-uuid"}';
-- SELECT * FROM patient_tags; -- Should return empty or different results
-- =========================================================
