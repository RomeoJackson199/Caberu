-- Run this in your Supabase SQL Editor to add the missing encrypted columns
-- This will fix the repeated onboarding issue caused by the encryption trigger failing

BEGIN;

-- Add missing encrypted columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name_encrypted TEXT,
ADD COLUMN IF NOT EXISTS last_name_encrypted TEXT,
ADD COLUMN IF NOT EXISTS phone_encrypted TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth_encrypted TEXT,
ADD COLUMN IF NOT EXISTS medical_history_encrypted TEXT,
ADD COLUMN IF NOT EXISTS address_encrypted TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_encrypted TEXT;

-- Verify the columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name LIKE '%encrypted%'
ORDER BY column_name;

COMMIT;

-- After running this, check your onboarding_completed status:
SELECT user_id, first_name, last_name, date_of_birth, onboarding_completed
FROM public.profiles
LIMIT 5;
