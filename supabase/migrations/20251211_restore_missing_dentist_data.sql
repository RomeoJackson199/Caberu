-- Auto-fix: Restore missing test data for John Jackson dentist
-- This migration ensures the business, dentist, and membership records exist

DO $$
DECLARE
  v_smile_business_id uuid := 'b9876543-1234-5678-9abc-def012345678'::uuid;
  v_owner_profile_id uuid := '2f7646a7-ae3a-4edc-8ec5-0120671b7433'::uuid;
  v_john_dentist_id uuid := 'de234567-89ab-cdef-0123-456789abcdef'::uuid;
BEGIN
  -- 1. Create Business if missing
  INSERT INTO public.businesses (id, name, slug, owner_profile_id, tagline, specialty_type)
  VALUES (
    v_smile_business_id,
    'Smile Dental Clinic',
    'smile-dental',
    v_owner_profile_id,
    'Your smile is our priority',
    'dentist'
  )
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  -- 2. Create Dentist if missing
  INSERT INTO public.dentists (id, profile_id, first_name, last_name, email, specialization, is_active)
  VALUES (
    v_john_dentist_id,
    v_owner_profile_id,
    'John',
    'Jackson',
    'romeojulianjackson@gmail.com',
    'General Dentistry',
    true
  )
  ON CONFLICT (id) DO UPDATE SET is_active = true;

  -- 3. Create Business Membership if missing
  INSERT INTO public.business_members (profile_id, business_id, role)
  VALUES (v_owner_profile_id, v_smile_business_id, 'owner')
  ON CONFLICT (profile_id, business_id) DO NOTHING;
  
END $$;
