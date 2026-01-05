-- =========================================================
-- RLS SECURITY HOTFIX - PART 2 (P1 Priority)
-- Date: 2026-01-05
-- Purpose: Fix remaining profile_id = auth.uid() issues
-- =========================================================
-- 
-- This migration continues the security fixes started in
-- 20260105_rls_security_hotfix.sql and addresses:
-- - Appointments policy
-- - Medical records policy
-- - Treatment plans policy
-- 
-- NOTE: Template system tables (portfolio_items, etc.) do not exist
-- in this schema, so those fixes have been removed.
-- =========================================================

BEGIN;

-- =========================================================
-- PART 1: CREATE HELPER FUNCTIONS
-- =========================================================

-- Helper function to check if user owns a business or is a business member
CREATE OR REPLACE FUNCTION public.has_business_access(target_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    -- User is business owner
    SELECT 1 FROM businesses b
    JOIN profiles p ON p.id = b.owner_profile_id
    WHERE b.id = target_business_id
    AND p.user_id = auth.uid()
  )
  OR EXISTS (
    -- User is a business member
    SELECT 1 FROM business_members bm
    JOIN profiles p ON p.id = bm.profile_id
    WHERE bm.business_id = target_business_id
    AND p.user_id = auth.uid()
  );
$$;

-- Helper for owner-only access
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

GRANT EXECUTE ON FUNCTION public.has_business_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_owner(UUID) TO authenticated;

-- =========================================================
-- PART 2: FIX APPOINTMENTS POLICY (20251210_enforce_business_isolation.sql)
-- =========================================================

DROP POLICY IF EXISTS "Dentist access appointments" ON appointments;
CREATE POLICY "Dentist access appointments"
ON appointments FOR ALL
TO authenticated
USING (
  -- User must be a member of the appointment's business
  public.is_member_of_business(business_id)
  OR
  -- Or be the patient (patient_id references profiles.id)
  patient_id = public.get_my_profile_id()
);

-- =========================================================
-- PART 3: FIX MEDICAL RECORDS POLICIES (20251210_revoke_patient_write.sql)
-- =========================================================

DROP POLICY IF EXISTS "Patients can view their own medical_records" ON medical_records;
DROP POLICY IF EXISTS "Dentists can manage medical_records" ON medical_records;

-- Patient Read-Only (patient_id references profiles.id)
CREATE POLICY "Patients can view their own medical_records"
ON medical_records FOR SELECT
TO authenticated
USING (
  patient_id = public.get_my_profile_id()
);

-- Dentist Full Access (via Business)
CREATE POLICY "Dentists can manage medical_records"
ON medical_records FOR ALL 
TO authenticated
USING (
  public.is_member_of_business_with_role(business_id, ARRAY['dentist', 'owner', 'admin'])
  OR 
  -- Fallback: Dentist created the record (dentist_id references user_id)
  dentist_id = auth.uid()
);

-- =========================================================
-- PART 4: FIX TREATMENT PLANS POLICIES (20251210_revoke_patient_write.sql)
-- =========================================================

DROP POLICY IF EXISTS "Patients can view their own treatment_plans" ON treatment_plans;
DROP POLICY IF EXISTS "Dentists can manage treatment_plans" ON treatment_plans;

-- Patient Read-Only
CREATE POLICY "Patients can view their own treatment_plans"
ON treatment_plans FOR SELECT
TO authenticated
USING (
  patient_id = public.get_my_profile_id()
);

-- Dentist Full Access
CREATE POLICY "Dentists can manage treatment_plans"
ON treatment_plans FOR ALL
TO authenticated
USING (
  public.is_member_of_business_with_role(business_id, ARRAY['dentist', 'owner', 'admin'])
  OR dentist_id = auth.uid()
);

COMMIT;

-- =========================================================
-- SUMMARY OF FIXES
-- =========================================================
-- 
-- Helper Functions Added (2):
--   - has_business_access(UUID)
--   - is_business_owner(UUID)
--
-- Policies Fixed (5):
--   - appointments (1)
--   - medical_records (2)
--   - treatment_plans (2)
--
-- NOTE: Template system tables (portfolio_items, walk_in_availability, 
-- style_library, etc.) do not exist in this schema and were skipped.
-- =========================================================
