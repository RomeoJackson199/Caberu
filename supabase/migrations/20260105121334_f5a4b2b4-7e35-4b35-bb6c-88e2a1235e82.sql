-- ============================================
-- SECURITY IMPROVEMENTS - PHASE 1
-- Fix function search_paths and add new helpers
-- ============================================

-- 1. Update is_business_member with matching param names
CREATE OR REPLACE FUNCTION public.is_business_member(p_profile_id uuid, p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.business_members bm
    WHERE bm.profile_id = p_profile_id 
      AND bm.business_id = p_business_id
  )
$$;

-- 2. Update viewer_profile_id with matching param name
CREATE OR REPLACE FUNCTION public.viewer_profile_id(_viewer_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = _viewer_user_id LIMIT 1
$$;

-- 3. Update update_updated_at_column with proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 4. Create new helper function: get_user_profile_id
CREATE OR REPLACE FUNCTION public.get_user_profile_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- 5. Create new helper function: is_dentist
CREATE OR REPLACE FUNCTION public.is_dentist(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.dentists d
    JOIN public.profiles p ON p.id = d.profile_id
    WHERE p.user_id = _user_id AND d.is_active = true
  )
$$;

-- 6. Create helper function: dentist_has_patient_access
CREATE OR REPLACE FUNCTION public.dentist_has_patient_access(_user_id uuid, _patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.appointments a
    JOIN public.dentists d ON d.id = a.dentist_id
    JOIN public.profiles p ON p.id = d.profile_id
    WHERE a.patient_id = _patient_id 
      AND p.user_id = _user_id
  )
$$;

-- 7. Create helper function: is_business_staff
CREATE OR REPLACE FUNCTION public.is_business_staff(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.business_members bm
    JOIN public.profiles p ON p.id = bm.profile_id
    WHERE bm.business_id = _business_id 
      AND p.user_id = _user_id
      AND bm.role IN ('owner', 'admin', 'dentist')
  )
$$;