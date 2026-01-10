-- Run this in Supabase SQL Editor to debug the onboarding issue

-- 1. Check if encrypted columns exist
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name LIKE '%encrypted%'
ORDER BY column_name;

-- 2. Check your current profile data
SELECT
  user_id,
  email,
  first_name,
  last_name,
  date_of_birth,
  onboarding_completed,
  role,
  created_at,
  updated_at
FROM public.profiles
ORDER BY updated_at DESC
LIMIT 5;

-- 3. Check if the encryption trigger exists
SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
  AND trigger_name LIKE '%encrypt%';

-- 4. Check for any errors in recent updates (if you have logging)
-- This will tell us if the trigger is failing
SELECT current_setting('app.encryption_key', true) as encryption_key_status;
