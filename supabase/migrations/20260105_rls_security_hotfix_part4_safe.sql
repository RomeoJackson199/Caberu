-- =========================================================
-- RLS SECURITY HOTFIX - PART 4 (SAFE VERSION)
-- Date: 2026-01-05
-- Purpose: Fix profile_id = auth.uid() vulnerabilities (tables that exist)
-- =========================================================
--
-- This migration fixes critical authentication bugs in tables that exist.
-- Only creates policies for tables that are present in the database.
--
-- BUG: profile_id = auth.uid() and owner_profile_id = auth.uid()
--   - auth.uid() returns user_id from auth.users
--   - profile_id/owner_profile_id reference profiles.id
--   - These are DIFFERENT UUIDs!
--
-- SOLUTION: Use helper functions or JOIN through profiles table
-- =========================================================

BEGIN;

-- =========================================================
-- PART 1: VERIFY HELPER FUNCTIONS EXIST
-- =========================================================

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

CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

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

CREATE OR REPLACE FUNCTION public.has_business_access_via_membership(target_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT (
    public.is_business_owner(target_business_id)
    OR
    public.is_member_of_business(target_business_id)
  );
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.is_member_of_business(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of_business_with_role(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_business_access_via_membership(UUID) TO authenticated;

-- =========================================================
-- PART 2: FIX PATIENT MANAGEMENT TABLES (Migration 20251223154449)
-- =========================================================

-- 2.1: Fix patient_tags policies
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'patient_tags') THEN
    DROP POLICY IF EXISTS "Business members can view tags" ON public.patient_tags;
    DROP POLICY IF EXISTS "Business owners/dentists can manage tags" ON public.patient_tags;

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
  END IF;
END $$;

-- 2.2: Fix patient_tag_assignments policies
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'patient_tag_assignments') THEN
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
  END IF;
END $$;

-- 2.3: Fix patient_allergies policies
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'patient_allergies') THEN
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

    CREATE POLICY "Patients can view own allergies" ON public.patient_allergies
      FOR SELECT USING (
        patient_id = public.get_my_profile_id()
      );
  END IF;
END $$;

-- 2.4: Fix patient_documents policies
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'patient_documents') THEN
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
  END IF;
END $$;

-- 2.5: Fix communication_logs policies
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'communication_logs') THEN
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
  END IF;
END $$;

-- 2.6: Fix storage policies for patient-documents bucket
DROP POLICY IF EXISTS "Business members can view patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Dentists can upload patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Dentists can delete patient documents" ON storage.objects;

CREATE POLICY "Business members can view patient documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'patient-documents'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT bm.business_id::text
        FROM business_members bm
        JOIN profiles p ON p.id = bm.profile_id
        WHERE p.user_id = auth.uid()
      )
      OR (storage.foldername(name))[2] = (SELECT id::text FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Dentists can upload patient documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'patient-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT bm.business_id::text
      FROM business_members bm
      JOIN profiles p ON p.id = bm.profile_id
      WHERE p.user_id = auth.uid()
      AND bm.role IN ('admin', 'dentist', 'staff')
    )
  );

CREATE POLICY "Dentists can delete patient documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'patient-documents'
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
-- SUMMARY
-- =========================================================
--
-- Fixed Tables (if they exist):
--   1. patient_tags (2 policies)
--   2. patient_tag_assignments (2 policies)
--   3. patient_allergies (3 policies)
--   4. patient_documents (3 policies)
--   5. communication_logs (2 policies)
--   6. storage.objects - patient-documents bucket (3 policies)
--
-- Helper Functions Created:
--   - is_member_of_business(UUID)
--   - is_member_of_business_with_role(UUID, TEXT[])
--   - get_my_profile_id()
--   - is_business_owner(UUID)
--   - has_business_access_via_membership(UUID)
--
-- Note: Template system tables (portfolio_items, workout_plans, etc.)
-- are skipped as they don't exist in this database yet.
-- =========================================================
