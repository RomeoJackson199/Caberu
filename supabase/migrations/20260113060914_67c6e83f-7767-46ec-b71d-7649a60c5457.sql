-- Clean up remaining corrupted plaintext fields in profiles
-- These show '***ENCRYPTED***' which is not usable data
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
   OR phone = '***ENCRYPTED***';