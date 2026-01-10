-- Add missing encrypted columns to profiles table
-- These columns are referenced by the encrypt_profile_phi() trigger
-- but were not created in the original encryption migration

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name_encrypted TEXT,
ADD COLUMN IF NOT EXISTS last_name_encrypted TEXT,
ADD COLUMN IF NOT EXISTS phone_encrypted TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth_encrypted TEXT,
ADD COLUMN IF NOT EXISTS medical_history_encrypted TEXT,
ADD COLUMN IF NOT EXISTS address_encrypted TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_encrypted TEXT;

-- Add comment explaining the encryption approach
COMMENT ON COLUMN public.profiles.first_name_encrypted IS 'Encrypted PHI field - contains pgp_sym_encrypt output encoded as base64';
COMMENT ON COLUMN public.profiles.last_name_encrypted IS 'Encrypted PHI field - contains pgp_sym_encrypt output encoded as base64';
COMMENT ON COLUMN public.profiles.phone_encrypted IS 'Encrypted PHI field - contains pgp_sym_encrypt output encoded as base64';
COMMENT ON COLUMN public.profiles.date_of_birth_encrypted IS 'Encrypted PHI field - contains pgp_sym_encrypt output encoded as base64';
COMMENT ON COLUMN public.profiles.medical_history_encrypted IS 'Encrypted PHI field - contains pgp_sym_encrypt output encoded as base64';
COMMENT ON COLUMN public.profiles.address_encrypted IS 'Encrypted PHI field - contains pgp_sym_encrypt output encoded as base64';
COMMENT ON COLUMN public.profiles.emergency_contact_encrypted IS 'Encrypted PHI field - contains pgp_sym_encrypt output encoded as base64';
