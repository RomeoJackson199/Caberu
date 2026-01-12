-- Encrypt existing plaintext data
-- This migration updates all existing rows to trigger encryption
-- It's safe to run because the triggers handle both NULL and existing values

-- Encrypt existing profile PHI data
-- Only update rows that have plaintext PHI (not already marked as encrypted)
UPDATE public.profiles
SET updated_at = updated_at  -- This will trigger the encryption trigger
WHERE (first_name IS NOT NULL AND first_name != '***ENCRYPTED***' AND first_name != '')
   OR (last_name IS NOT NULL AND last_name != '***ENCRYPTED***' AND last_name != '')
   OR (phone IS NOT NULL AND phone != '***ENCRYPTED***' AND phone != '')
   OR (medical_history IS NOT NULL AND medical_history != '***ENCRYPTED***' AND medical_history != '')
   OR (address IS NOT NULL AND address != '***ENCRYPTED***' AND address != '')
   OR (emergency_contact IS NOT NULL AND emergency_contact != '***ENCRYPTED***' AND emergency_contact != '')
   OR (date_of_birth IS NOT NULL AND date_of_birth_encrypted IS NULL);

-- Encrypt existing notes PHI data
UPDATE public.notes
SET updated_at = updated_at
WHERE (content IS NOT NULL AND content != '' AND content_encrypted IS NULL)
   OR (title IS NOT NULL AND title != '' AND title_encrypted IS NULL);

-- Encrypt existing patient allergies PHI data
UPDATE public.patient_allergies
SET updated_at = COALESCE(updated_at, created_at)
WHERE (allergy_name IS NOT NULL AND allergy_name != '' AND allergy_name_encrypted IS NULL)
   OR (notes IS NOT NULL AND notes != '' AND notes_encrypted IS NULL);

-- Encrypt existing treatment plan PHI data
UPDATE public.treatment_plans
SET updated_at = updated_at
WHERE (diagnosis IS NOT NULL AND diagnosis != '' AND diagnosis_encrypted IS NULL)
   OR (description IS NOT NULL AND description != '' AND description_encrypted IS NULL);

-- Encrypt existing medical record PHI data
UPDATE public.medical_records
SET updated_at = updated_at
WHERE findings IS NOT NULL AND findings != '' AND findings_encrypted IS NULL;

-- Add helpful comment
COMMENT ON TABLE public.profiles IS 'User profiles with PHI encrypted on-the-fly. Use secure_profiles_view to access decrypted data.';
