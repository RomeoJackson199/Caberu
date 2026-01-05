-- =========================================================
-- SECURITY FIX: Tighten overly permissive RLS policies
-- Date: 2026-01-05
-- Purpose: Replace USING(true) and WITH CHECK(true) with proper authorization
-- =========================================================
--
-- This migration fixes RLS policies that are too permissive.
-- Policies with USING(true) or WITH CHECK(true) allow any authenticated
-- user to access or modify data, which is a security risk.
--
-- Tables affected:
-- 1. patient_preferences - restrict to business scope
-- 2. security_audit_logs - restrict INSERT to proper authorization
-- 3. Various other tables with overly permissive policies
-- =========================================================

BEGIN;

-- =========================================================
-- PART 1: Fix patient_preferences policies
-- =========================================================

-- Drop the overly permissive "System can manage patient preferences" policy
DROP POLICY IF EXISTS "System can manage patient preferences" ON public.patient_preferences;

-- Create properly scoped policies for patient_preferences
-- Only allow business members to manage preferences for patients in their business
CREATE POLICY "Business members can manage patient preferences" ON public.patient_preferences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.business_members bm
      JOIN public.profiles p ON p.id = bm.profile_id
      JOIN public.profiles patient ON patient.id = patient_preferences.patient_id
      WHERE p.user_id = auth.uid()
      AND bm.business_id = patient.business_id
      AND bm.role IN ('admin', 'dentist', 'staff')
    )
  );

-- =========================================================
-- PART 2: Fix security_audit_logs INSERT policy
-- =========================================================

-- The current INSERT policy allows any authenticated user to insert logs
-- This should only be done via server-side operations

DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.security_audit_logs;

-- Only allow users to insert audit logs for themselves
-- (Server-side operations use service_role which bypasses RLS)
CREATE POLICY "Users can insert own security logs" ON public.security_audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- PART 3: Fix phone_usage_tracking policies
-- =========================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'phone_usage_tracking') THEN
    DROP POLICY IF EXISTS "Business members can insert usage" ON public.phone_usage_tracking;

    -- Only allow business members to insert usage for their business
    CREATE POLICY "Business members can insert usage for their business" ON public.phone_usage_tracking
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.business_members bm
          JOIN public.profiles p ON p.id = bm.profile_id
          WHERE p.user_id = auth.uid()
          AND bm.business_id = phone_usage_tracking.business_id
        )
      );
  END IF;
END $$;

-- =========================================================
-- PART 4: Fix invitation policies
-- =========================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invitations') THEN
    -- Drop overly permissive INSERT policy
    DROP POLICY IF EXISTS "Dentists can create invitations" ON public.invitations;

    -- Create properly scoped INSERT policy
    CREATE POLICY "Business members can create invitations" ON public.invitations
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.business_members bm
          JOIN public.profiles p ON p.id = bm.profile_id
          WHERE p.user_id = auth.uid()
          AND bm.business_id = invitations.business_id
          AND bm.role IN ('admin', 'dentist', 'owner')
        )
      );
  END IF;
END $$;

-- =========================================================
-- PART 5: Fix reviews policies
-- =========================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reviews') THEN
    DROP POLICY IF EXISTS "Anyone can insert reviews" ON public.reviews;
    DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON public.reviews;

    -- Only allow patients to insert reviews for appointments they attended
    CREATE POLICY "Patients can review their appointments" ON public.reviews
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.appointments a
          JOIN public.profiles p ON p.id = a.patient_id
          WHERE p.user_id = auth.uid()
          AND a.id = reviews.appointment_id
          AND a.status = 'completed'
        )
      );
  END IF;
END $$;

-- =========================================================
-- PART 6: Fix form_submissions policies (if exists)
-- =========================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'form_submissions') THEN
    DROP POLICY IF EXISTS "Anyone can submit forms" ON public.form_submissions;

    -- Only allow authenticated users to submit forms
    CREATE POLICY "Authenticated users can submit forms" ON public.form_submissions
      FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- =========================================================
-- PART 7: Fix contact_submissions policies (if exists)
-- =========================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contact_submissions') THEN
    DROP POLICY IF EXISTS "Anyone can submit contact form" ON public.contact_submissions;

    -- Allow public contact form submissions but rate limit via application
    -- This is intentionally permissive as contact forms should be accessible
    -- Rate limiting should be done at the application/edge function level
    CREATE POLICY "Public can submit contact forms" ON public.contact_submissions
      FOR INSERT
      WITH CHECK (true);
      -- Note: Rate limiting is enforced at the application level
  END IF;
END $$;

-- =========================================================
-- PART 8: Fix slot_recommendations system policy
-- =========================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'slot_recommendations') THEN
    DROP POLICY IF EXISTS "System can manage recommendations" ON public.slot_recommendations;

    -- Only allow business admins/dentists to manage recommendations
    CREATE POLICY "Business staff can manage recommendations" ON public.slot_recommendations
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.business_members bm
          JOIN public.profiles p ON p.id = bm.profile_id
          JOIN public.dentists d ON d.id = slot_recommendations.dentist_id
          WHERE p.user_id = auth.uid()
          AND bm.business_id = d.business_id
          AND bm.role IN ('admin', 'dentist')
        )
      );
  END IF;
END $$;

COMMIT;

-- =========================================================
-- SUMMARY OF CHANGES
-- =========================================================
--
-- Fixed Tables:
-- 1. patient_preferences - Now requires business membership
-- 2. security_audit_logs - Now restricted to own user_id
-- 3. phone_usage_tracking - Now requires business membership
-- 4. invitations - Now requires admin/dentist/owner role
-- 5. reviews - Now requires completed appointment
-- 6. form_submissions - Now requires authentication
-- 7. slot_recommendations - Now requires business staff role
--
-- NOTE: Some public tables (contact_submissions) intentionally
-- keep permissive policies but rate limiting should be enforced
-- at the application/edge function level.
--
-- =========================================================
