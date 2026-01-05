-- ============================================
-- SECURITY IMPROVEMENTS - PHASE 4
-- Strengthen Profiles and Chat Messages RLS
-- ============================================

-- ============================================
-- PROFILES - Secure PII
-- ============================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Dentists view patient profiles" ON public.profiles;
DROP POLICY IF EXISTS "Business staff view patient profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert during signup" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Dentists can view profiles of their patients (through appointments)
CREATE POLICY "Dentists view patient profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.dentist_has_patient_access(auth.uid(), id)
);

-- Business staff can view profiles of patients with appointments at their business
CREATE POLICY "Business staff view patient profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT DISTINCT a.patient_id
    FROM public.appointments a
    WHERE public.is_user_member_of_business(auth.uid(), a.business_id)
  )
);

-- Users can update their own profile
CREATE POLICY "Users update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "Users insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- ============================================
-- CHAT MESSAGES - Secure conversation data
-- ============================================

DROP POLICY IF EXISTS "Users can view own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Dentists can view patient chat for their appointments" ON public.chat_messages;
DROP POLICY IF EXISTS "Users view own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users insert own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Dentists view appointment chat" ON public.chat_messages;

-- Users can view their own chat messages
CREATE POLICY "Users view own chat messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own chat messages
CREATE POLICY "Users insert own chat messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Dentists can view chat messages linked to their appointments
CREATE POLICY "Dentists view appointment chat"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  appointment_id IN (
    SELECT a.id FROM public.appointments a
    JOIN public.dentists d ON d.id = a.dentist_id
    JOIN public.profiles p ON p.id = d.profile_id
    WHERE p.user_id = auth.uid()
  )
);

-- ============================================
-- IMAGING SETS - Secure medical images
-- ============================================

DROP POLICY IF EXISTS "imaging_sets_select" ON public.imaging_sets;
DROP POLICY IF EXISTS "imaging_sets_insert" ON public.imaging_sets;
DROP POLICY IF EXISTS "imaging_sets_update" ON public.imaging_sets;
DROP POLICY IF EXISTS "imaging_sets_delete" ON public.imaging_sets;
DROP POLICY IF EXISTS "Patients view own imaging" ON public.imaging_sets;

-- Patients can view their own imaging
CREATE POLICY "Patients view own imaging"
ON public.imaging_sets
FOR SELECT
TO authenticated
USING (patient_id = public.get_user_profile_id(auth.uid()));

-- Business staff can view imaging for their business
CREATE POLICY "Business staff view imaging"
ON public.imaging_sets
FOR SELECT
TO authenticated
USING (public.is_business_staff(auth.uid(), business_id));

-- Business staff can insert imaging
CREATE POLICY "Business staff insert imaging"
ON public.imaging_sets
FOR INSERT
TO authenticated
WITH CHECK (public.is_business_staff(auth.uid(), business_id));

-- Business staff can update imaging
CREATE POLICY "Business staff update imaging"
ON public.imaging_sets
FOR UPDATE
TO authenticated
USING (public.is_business_staff(auth.uid(), business_id));

-- ============================================
-- FIX BUSINESSES TABLE - Remove "true" policy
-- ============================================

DROP POLICY IF EXISTS "businesses_authenticated_all" ON public.businesses;
DROP POLICY IF EXISTS "businesses_authenticated_read" ON public.businesses;

-- Anyone can view business public info (needed for booking)
CREATE POLICY "Public can view businesses"
ON public.businesses
FOR SELECT
TO authenticated
USING (true);

-- Only business owners can update their business
CREATE POLICY "Owners can update business"
ON public.businesses
FOR UPDATE
TO authenticated
USING (public.is_business_owner(auth.uid(), id))
WITH CHECK (public.is_business_owner(auth.uid(), id));

-- Only business owners can delete their business
CREATE POLICY "Owners can delete business"
ON public.businesses
FOR DELETE
TO authenticated
USING (public.is_business_owner(auth.uid(), id));

-- Users can create businesses
CREATE POLICY "Users can create business"
ON public.businesses
FOR INSERT
TO authenticated
WITH CHECK (
  owner_profile_id = public.get_user_profile_id(auth.uid())
);