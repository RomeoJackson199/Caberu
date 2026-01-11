-- ============================================================================
-- DIAGNOSTIC QUERIES: Dentist Portal Encryption Issue
-- ============================================================================
-- Run these queries one by one in Supabase SQL Editor to diagnose the issue
-- ============================================================================

-- Query 1: Check if secure_profiles_view exists
-- Expected: Should return 1 row with the view definition
SELECT
    schemaname,
    viewname,
    viewowner,
    definition
FROM pg_views
WHERE viewname = 'secure_profiles_view';

-- ============================================================================

-- Query 2: Check if private.get_app_key() function exists
-- Expected: Should return 1 row showing the function exists
SELECT
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'private' AND p.proname = 'get_app_key';

-- ============================================================================

-- Query 3: Check if encrypted columns exist in profiles table
-- Expected: Should return rows for *_encrypted columns
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name LIKE '%encrypted%'
ORDER BY column_name;

-- ============================================================================

-- Query 4: Check sample data from profiles table (raw encrypted data)
-- Expected: Should show encrypted columns with base64 data or NULL
SELECT
    id,
    first_name,
    first_name_encrypted IS NOT NULL as has_encrypted_fname,
    last_name,
    last_name_encrypted IS NOT NULL as has_encrypted_lname,
    role
FROM public.profiles
WHERE role = 'patient'
LIMIT 3;

-- ============================================================================

-- Query 5: Test decryption directly (this will show if the key is working)
-- Expected: Should decrypt successfully or show an error
SELECT
    id,
    role,
    first_name as plaintext_fname,
    CASE
        WHEN first_name_encrypted IS NOT NULL AND first_name_encrypted != '' THEN
            'HAS_ENCRYPTED_DATA'
        ELSE 'NO_ENCRYPTED_DATA'
    END as encryption_status,
    CASE
        WHEN first_name_encrypted IS NOT NULL AND first_name_encrypted != '' THEN
            pgp_sym_decrypt(decode(first_name_encrypted::text, 'base64'), private.get_app_key())::text
        ELSE first_name
    END as decrypted_fname
FROM public.profiles
WHERE role = 'patient'
LIMIT 3;

-- ============================================================================

-- Query 6: Check what secure_profiles_view returns
-- Expected: Should return decrypted patient data
SELECT
    id,
    first_name,
    last_name,
    email,
    role
FROM public.secure_profiles_view
WHERE role = 'patient'
LIMIT 3;

-- ============================================================================

-- Query 7: Check if encryption key is set in vault
-- Expected: Should return 1 row if the key exists
SELECT
    name,
    description,
    created_at
FROM vault.secrets
WHERE name = 'app_encryption_key';

-- ============================================================================

-- Query 8: Test if we can retrieve the key (this will fail if key doesn't exist)
-- Expected: Should return the key or an error
SELECT private.get_app_key() as encryption_key_status;

-- ============================================================================
-- INSTRUCTIONS:
-- Run each query above one by one and share the results.
-- If any query returns an error, that's where the problem is!
-- ============================================================================
