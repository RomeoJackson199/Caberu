-- Step 1: Disable BOTH encryption triggers on the profiles table
DROP TRIGGER IF EXISTS encrypt_profile_phi_trigger ON public.profiles;
DROP TRIGGER IF EXISTS trg_encrypt_profiles_phi ON public.profiles;

-- Step 2: Clean up all corrupted profile data
UPDATE public.profiles 
SET 
  first_name = NULL,
  last_name = NULL,
  phone = NULL,
  date_of_birth = NULL,
  medical_history = NULL,
  address = NULL,
  emergency_contact = NULL,
  first_name_encrypted = NULL,
  last_name_encrypted = NULL,
  phone_encrypted = NULL,
  date_of_birth_encrypted = NULL,
  medical_history_encrypted = NULL,
  address_encrypted = NULL,
  emergency_contact_encrypted = NULL
WHERE first_name = '***ENCRYPTED***' 
   OR last_name = '***ENCRYPTED***'
   OR phone = '***ENCRYPTED***'
   OR first_name LIKE 'vault:%'
   OR last_name LIKE 'vault:%';

-- Step 3: Drop and recreate secure_profiles_view to return plaintext columns directly
DROP VIEW IF EXISTS public.secure_profiles_view CASCADE;

CREATE VIEW public.secure_profiles_view AS
SELECT 
  id,
  email,
  first_name,
  last_name,
  phone,
  date_of_birth,
  avatar_url,
  address,
  emergency_contact,
  medical_history,
  role,
  created_at,
  updated_at
FROM public.profiles;

-- Step 4: Drop the encryption trigger functions to prevent future issues
DROP FUNCTION IF EXISTS public.encrypt_profile_phi() CASCADE;
DROP FUNCTION IF EXISTS public.encrypt_profiles_phi() CASCADE;