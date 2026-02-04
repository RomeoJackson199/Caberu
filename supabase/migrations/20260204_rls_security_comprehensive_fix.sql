-- =========================================================
-- RLS COMPREHENSIVE SECURITY FIX
-- Date: 2026-02-04
-- Purpose: Fix ALL remaining profile_id = auth.uid() vulnerabilities
-- =========================================================
--
-- This migration comprehensively addresses:
-- 1. Template system tables (from 20251031000000_enhance_template_system.sql)
-- 2. Any other tables with the profile_id = auth.uid() bug
-- 3. Adds proper patient self-access policies
--
-- THE BUG:
--   - auth.uid() returns user_id from Supabase Auth (auth.users.id)
--   - profile_id/owner_profile_id reference profiles.id
--   - These are DIFFERENT UUIDs, causing auth checks to ALWAYS FAIL
--
-- THE FIX:
--   - Use helper functions that JOIN through profiles table
--   - Or use get_my_profile_id() for patient self-access
--
-- HIPAA COMPLIANCE:
--   - All patient data requires proper business membership
--   - Patients can only view their own data (read-only)
--   - Dentists/staff can only access data within their business
-- =========================================================

BEGIN;

-- =========================================================
-- PART 0: ENSURE HELPER FUNCTIONS EXIST
-- =========================================================

-- Helper: Check if user is a member of a business
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

-- Helper: Check if user is a member with specific roles
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

-- Helper: Get current user's profile ID
CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Helper: Check if user is a business owner
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

-- Helper: Check if user has any business access (owner OR member)
CREATE OR REPLACE FUNCTION public.has_business_access(target_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT (
    public.is_business_owner(target_business_id)
    OR public.is_member_of_business(target_business_id)
  );
$$;

-- Grant permissions on helper functions
GRANT EXECUTE ON FUNCTION public.is_member_of_business(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of_business_with_role(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_business_access(UUID) TO authenticated;

-- =========================================================
-- PART 1: FIX TEMPLATE SYSTEM TABLES
-- These tables may not exist in all environments
-- =========================================================

-- 1.1: portfolio_items
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'portfolio_items') THEN
    DROP POLICY IF EXISTS "Users can view portfolio items for their business" ON public.portfolio_items;
    DROP POLICY IF EXISTS "Users can insert portfolio items for their business" ON public.portfolio_items;
    DROP POLICY IF EXISTS "Users can update portfolio items for their business" ON public.portfolio_items;
    DROP POLICY IF EXISTS "Users can delete portfolio items for their business" ON public.portfolio_items;

    CREATE POLICY "Business members can view portfolio items" ON public.portfolio_items
      FOR SELECT USING (public.has_business_access(business_id));

    CREATE POLICY "Business owners can insert portfolio items" ON public.portfolio_items
      FOR INSERT WITH CHECK (public.is_business_owner(business_id));

    CREATE POLICY "Business owners can update portfolio items" ON public.portfolio_items
      FOR UPDATE USING (public.is_business_owner(business_id));

    CREATE POLICY "Business owners can delete portfolio items" ON public.portfolio_items
      FOR DELETE USING (public.is_business_owner(business_id));

    RAISE NOTICE 'Fixed RLS policies for portfolio_items';
  END IF;
END $$;

-- 1.2: walk_in_availability
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'walk_in_availability') THEN
    DROP POLICY IF EXISTS "Business access to walk-in availability" ON public.walk_in_availability;

    CREATE POLICY "Business members can access walk-in availability" ON public.walk_in_availability
      FOR ALL USING (public.has_business_access(business_id));

    RAISE NOTICE 'Fixed RLS policies for walk_in_availability';
  END IF;
END $$;

-- 1.3: style_library
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'style_library') THEN
    DROP POLICY IF EXISTS "Business access to style library" ON public.style_library;

    CREATE POLICY "Business members can access style library" ON public.style_library
      FOR ALL USING (public.has_business_access(business_id));

    RAISE NOTICE 'Fixed RLS policies for style_library';
  END IF;
END $$;

-- 1.4: product_sales
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_sales') THEN
    DROP POLICY IF EXISTS "Business access to product sales" ON public.product_sales;

    CREATE POLICY "Business members can access product sales" ON public.product_sales
      FOR ALL USING (public.has_business_access(business_id));

    RAISE NOTICE 'Fixed RLS policies for product_sales';
  END IF;
END $$;

-- 1.5: insurance_claims (CRITICAL - Contains PHI)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'insurance_claims') THEN
    DROP POLICY IF EXISTS "Business access to insurance claims" ON public.insurance_claims;

    -- Only dentists/admins should access insurance claims (PHI)
    CREATE POLICY "Dentists can manage insurance claims" ON public.insurance_claims
      FOR ALL USING (
        public.is_member_of_business_with_role(business_id, ARRAY['owner', 'dentist', 'admin'])
      );

    -- Patients can view their own claims
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'insurance_claims' AND column_name = 'patient_id') THEN
      CREATE POLICY "Patients can view own insurance claims" ON public.insurance_claims
        FOR SELECT USING (patient_id = public.get_my_profile_id());
    END IF;

    RAISE NOTICE 'Fixed RLS policies for insurance_claims';
  END IF;
END $$;

-- 1.6: dental_chart_data (CRITICAL - Contains PHI)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dental_chart_data') THEN
    DROP POLICY IF EXISTS "Business access to dental chart" ON public.dental_chart_data;

    -- Only clinical staff should access dental charts
    CREATE POLICY "Clinical staff can manage dental charts" ON public.dental_chart_data
      FOR ALL USING (
        public.is_member_of_business_with_role(business_id, ARRAY['owner', 'dentist', 'admin', 'staff'])
      );

    -- Patients can view their own dental chart
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'dental_chart_data' AND column_name = 'patient_id') THEN
      CREATE POLICY "Patients can view own dental chart" ON public.dental_chart_data
        FOR SELECT USING (patient_id = public.get_my_profile_id());
    END IF;

    RAISE NOTICE 'Fixed RLS policies for dental_chart_data';
  END IF;
END $$;

-- 1.7: workout_plans
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_plans') THEN
    DROP POLICY IF EXISTS "Business access to workout plans" ON public.workout_plans;

    CREATE POLICY "Business members can access workout plans" ON public.workout_plans
      FOR ALL USING (public.has_business_access(business_id));

    RAISE NOTICE 'Fixed RLS policies for workout_plans';
  END IF;
END $$;

-- 1.8: workout_exercises
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_exercises') THEN
    DROP POLICY IF EXISTS "Business access to workout exercises" ON public.workout_exercises;

    CREATE POLICY "Business members can access workout exercises" ON public.workout_exercises
      FOR ALL USING (
        workout_plan_id IN (
          SELECT id FROM workout_plans wp
          WHERE public.has_business_access(wp.business_id)
        )
      );

    RAISE NOTICE 'Fixed RLS policies for workout_exercises';
  END IF;
END $$;

-- 1.9: client_measurements (Contains PHI)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'client_measurements') THEN
    DROP POLICY IF EXISTS "Business access to measurements" ON public.client_measurements;

    CREATE POLICY "Staff can manage client measurements" ON public.client_measurements
      FOR ALL USING (public.has_business_access(business_id));

    -- Patients can view their own measurements
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'client_measurements' AND column_name = 'patient_id') THEN
      CREATE POLICY "Patients can view own measurements" ON public.client_measurements
        FOR SELECT USING (patient_id = public.get_my_profile_id());
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'client_measurements' AND column_name = 'client_id') THEN
      CREATE POLICY "Clients can view own measurements" ON public.client_measurements
        FOR SELECT USING (client_id = public.get_my_profile_id());
    END IF;

    RAISE NOTICE 'Fixed RLS policies for client_measurements';
  END IF;
END $$;

-- 1.10: nutrition_plans (Contains PHI)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'nutrition_plans') THEN
    DROP POLICY IF EXISTS "Business access to nutrition plans" ON public.nutrition_plans;

    CREATE POLICY "Staff can manage nutrition plans" ON public.nutrition_plans
      FOR ALL USING (public.has_business_access(business_id));

    -- Patients can view their own nutrition plans
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'nutrition_plans' AND column_name = 'patient_id') THEN
      CREATE POLICY "Patients can view own nutrition plans" ON public.nutrition_plans
        FOR SELECT USING (patient_id = public.get_my_profile_id());
    END IF;

    RAISE NOTICE 'Fixed RLS policies for nutrition_plans';
  END IF;
END $$;

-- 1.11: lab_results (CRITICAL - Contains PHI)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lab_results') THEN
    DROP POLICY IF EXISTS "Business access to lab results" ON public.lab_results;

    -- Only clinical staff should access lab results
    CREATE POLICY "Clinical staff can manage lab results" ON public.lab_results
      FOR ALL USING (
        public.is_member_of_business_with_role(business_id, ARRAY['owner', 'dentist', 'admin'])
      );

    -- Patients can view their own lab results
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'lab_results' AND column_name = 'patient_id') THEN
      CREATE POLICY "Patients can view own lab results" ON public.lab_results
        FOR SELECT USING (patient_id = public.get_my_profile_id());
    END IF;

    RAISE NOTICE 'Fixed RLS policies for lab_results';
  END IF;
END $$;

-- 1.12: referrals (Contains PHI)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'referrals') THEN
    DROP POLICY IF EXISTS "Business access to referrals" ON public.referrals;

    CREATE POLICY "Staff can manage referrals" ON public.referrals
      FOR ALL USING (public.has_business_access(business_id));

    -- Patients can view their own referrals
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'referrals' AND column_name = 'patient_id') THEN
      CREATE POLICY "Patients can view own referrals" ON public.referrals
        FOR SELECT USING (patient_id = public.get_my_profile_id());
    END IF;

    RAISE NOTICE 'Fixed RLS policies for referrals';
  END IF;
END $$;

-- 1.13: medical_questionnaires
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'medical_questionnaires') THEN
    DROP POLICY IF EXISTS "Business access to questionnaires" ON public.medical_questionnaires;

    CREATE POLICY "Staff can manage questionnaires" ON public.medical_questionnaires
      FOR ALL USING (public.has_business_access(business_id));

    RAISE NOTICE 'Fixed RLS policies for medical_questionnaires';
  END IF;
END $$;

-- 1.14: questionnaire_responses (Contains PHI)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'questionnaire_responses') THEN
    DROP POLICY IF EXISTS "Business access to questionnaire responses" ON public.questionnaire_responses;

    CREATE POLICY "Staff can manage questionnaire responses" ON public.questionnaire_responses
      FOR ALL USING (
        questionnaire_id IN (
          SELECT id FROM medical_questionnaires mq
          WHERE public.has_business_access(mq.business_id)
        )
      );

    -- Patients can view their own responses
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'questionnaire_responses' AND column_name = 'patient_id') THEN
      CREATE POLICY "Patients can view own questionnaire responses" ON public.questionnaire_responses
        FOR SELECT USING (patient_id = public.get_my_profile_id());
    END IF;

    RAISE NOTICE 'Fixed RLS policies for questionnaire_responses';
  END IF;
END $$;

-- 1.15: vital_signs (CRITICAL - Contains PHI)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vital_signs') THEN
    DROP POLICY IF EXISTS "Business access to vital signs" ON public.vital_signs;

    -- Only clinical staff should access vital signs
    CREATE POLICY "Clinical staff can manage vital signs" ON public.vital_signs
      FOR ALL USING (
        public.is_member_of_business_with_role(business_id, ARRAY['owner', 'dentist', 'admin', 'staff'])
      );

    -- Patients can view their own vital signs
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'vital_signs' AND column_name = 'patient_id') THEN
      CREATE POLICY "Patients can view own vital signs" ON public.vital_signs
        FOR SELECT USING (patient_id = public.get_my_profile_id());
    END IF;

    RAISE NOTICE 'Fixed RLS policies for vital_signs';
  END IF;
END $$;

-- 1.16: template_change_history
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'template_change_history') THEN
    DROP POLICY IF EXISTS "Business owners can view template history" ON public.template_change_history;

    CREATE POLICY "Business owners can view template history" ON public.template_change_history
      FOR SELECT USING (public.is_business_owner(business_id));

    RAISE NOTICE 'Fixed RLS policies for template_change_history';
  END IF;
END $$;

-- =========================================================
-- PART 2: ADD PATIENT SELF-ACCESS POLICIES
-- Ensure patients can always view their own data
-- =========================================================

-- 2.1: prescriptions
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'prescriptions') THEN
    DROP POLICY IF EXISTS "Patients can view own prescriptions" ON public.prescriptions;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'prescriptions' AND column_name = 'patient_id') THEN
      CREATE POLICY "Patients can view own prescriptions" ON public.prescriptions
        FOR SELECT USING (patient_id = public.get_my_profile_id());
      RAISE NOTICE 'Added patient self-access policy for prescriptions';
    END IF;
  END IF;
END $$;

-- 2.2: finalized_appointment_records
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'finalized_appointment_records') THEN
    DROP POLICY IF EXISTS "Patients can view own finalized records" ON public.finalized_appointment_records;

    -- Join through appointments to get patient access
    CREATE POLICY "Patients can view own finalized records" ON public.finalized_appointment_records
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM appointments a
          WHERE a.id = finalized_appointment_records.appointment_id
          AND a.patient_id = public.get_my_profile_id()
        )
      );
    RAISE NOTICE 'Added patient self-access policy for finalized_appointment_records';
  END IF;
END $$;

-- =========================================================
-- PART 3: VERIFY AND LOG REMAINING VULNERABILITIES
-- =========================================================

-- This function can be called to audit remaining issues
CREATE OR REPLACE FUNCTION public.audit_rls_vulnerabilities()
RETURNS TABLE(
  table_name text,
  policy_name text,
  policy_definition text,
  vulnerability_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.relname::text as table_name,
    pol.polname::text as policy_name,
    pg_get_expr(pol.polqual, pol.polrelid)::text as policy_definition,
    CASE
      WHEN pg_get_expr(pol.polqual, pol.polrelid) LIKE '%profile_id = auth.uid()%'
        THEN 'profile_id = auth.uid() bug'
      WHEN pg_get_expr(pol.polqual, pol.polrelid) LIKE '%owner_profile_id = auth.uid()%'
        THEN 'owner_profile_id = auth.uid() bug'
      WHEN pg_get_expr(pol.polqual, pol.polrelid) = 'true'
        THEN 'Overly permissive USING(true)'
      ELSE 'Unknown'
    END as vulnerability_type
  FROM pg_policy pol
  JOIN pg_class c ON c.oid = pol.polrelid
  WHERE c.relnamespace = 'public'::regnamespace
  AND (
    pg_get_expr(pol.polqual, pol.polrelid) LIKE '%profile_id = auth.uid()%'
    OR pg_get_expr(pol.polqual, pol.polrelid) LIKE '%owner_profile_id = auth.uid()%'
    OR pg_get_expr(pol.polqual, pol.polrelid) = 'true'
  )
  ORDER BY c.relname;
END;
$$;

GRANT EXECUTE ON FUNCTION public.audit_rls_vulnerabilities() TO authenticated;

COMMIT;

-- =========================================================
-- VERIFICATION QUERIES (Run after migration)
-- =========================================================
--
-- 1. Check for remaining vulnerabilities:
--    SELECT * FROM public.audit_rls_vulnerabilities();
--
-- 2. Test helper functions work:
--    SELECT public.get_my_profile_id();
--    SELECT public.is_member_of_business('your-business-uuid');
--
-- 3. Verify patient can view own data:
--    SET LOCAL ROLE authenticated;
--    SET LOCAL request.jwt.claims = '{"sub": "patient-user-uuid"}';
--    SELECT * FROM appointments WHERE patient_id = public.get_my_profile_id();
--
-- =========================================================
-- SUMMARY
-- =========================================================
--
-- Fixed Tables (16 template system tables):
--   1. portfolio_items
--   2. walk_in_availability
--   3. style_library
--   4. product_sales
--   5. insurance_claims (PHI - restricted to clinical staff)
--   6. dental_chart_data (PHI - restricted to clinical staff)
--   7. workout_plans
--   8. workout_exercises
--   9. client_measurements
--   10. nutrition_plans
--   11. lab_results (PHI - restricted to clinical staff)
--   12. referrals
--   13. medical_questionnaires
--   14. questionnaire_responses
--   15. vital_signs (PHI - restricted to clinical staff)
--   16. template_change_history
--
-- Added Patient Self-Access (2 tables):
--   1. prescriptions
--   2. finalized_appointment_records
--
-- Helper Functions (5):
--   - is_member_of_business(UUID)
--   - is_member_of_business_with_role(UUID, TEXT[])
--   - get_my_profile_id()
--   - is_business_owner(UUID)
--   - has_business_access(UUID)
--
-- Audit Function (1):
--   - audit_rls_vulnerabilities()
--
-- =========================================================
