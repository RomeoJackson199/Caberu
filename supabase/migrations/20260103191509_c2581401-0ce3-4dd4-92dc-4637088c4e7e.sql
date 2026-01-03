-- Fix Security Definer Views by recreating them with SECURITY INVOKER
-- This ensures RLS policies of the querying user are enforced

-- 1. Drop and recreate providers view with SECURITY INVOKER
DROP VIEW IF EXISTS public.providers;
CREATE VIEW public.providers WITH (security_invoker = true) AS
SELECT 
    id,
    profile_id,
    is_active,
    specialization,
    license_number,
    updated_at,
    created_at,
    wait_time_score,
    communication_score,
    total_ratings,
    average_rating
FROM dentists d;

-- 2. Drop and recreate public_businesses_view with SECURITY INVOKER  
DROP VIEW IF EXISTS public.public_businesses_view;
CREATE VIEW public.public_businesses_view WITH (security_invoker = true) AS
SELECT 
    id,
    name,
    slug,
    logo_url,
    tagline,
    template_type,
    custom_config
FROM businesses;

-- 3. Fix trigger functions that don't have search_path set
CREATE OR REPLACE FUNCTION public.update_treatment_plan_items_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_imaging_sets_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_slot_availability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_available = false AND NEW.appointment_id IS NULL THEN
    RAISE EXCEPTION 'Cannot mark slot as unavailable without an appointment_id';
  END IF;
  
  IF NEW.appointment_id IS NULL AND OLD.appointment_id IS NOT NULL THEN
    NEW.is_available := true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Add function to update updated_at column with proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;