-- ============================================================================
-- FIX: Dentist Portal Encryption - COMPLETE VERSION with ALL columns
-- ============================================================================
-- This script creates the secure_profiles_view with ALL columns
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Step 1: Drop the existing view if it exists (to recreate it correctly)
DROP VIEW IF EXISTS public.secure_profiles_view CASCADE;

-- Step 2: Create the secure_profiles_view with proper decryption and ALL columns
CREATE VIEW public.secure_profiles_view
WITH (security_invoker = true)
AS
SELECT
    id,
    user_id,
    -- Decrypt PHI fields using private.get_app_key() instead of current_setting
    CASE
        WHEN first_name_encrypted IS NOT NULL AND first_name_encrypted != '' THEN
            pgp_sym_decrypt(decode(first_name_encrypted::text, 'base64'), private.get_app_key())::text
        ELSE first_name
    END AS first_name,
    CASE
        WHEN last_name_encrypted IS NOT NULL AND last_name_encrypted != '' THEN
            pgp_sym_decrypt(decode(last_name_encrypted::text, 'base64'), private.get_app_key())::text
        ELSE last_name
    END AS last_name,
    CASE
        WHEN phone_encrypted IS NOT NULL AND phone_encrypted != '' THEN
            pgp_sym_decrypt(decode(phone_encrypted::text, 'base64'), private.get_app_key())::text
        ELSE phone
    END AS phone,
    CASE
        WHEN date_of_birth_encrypted IS NOT NULL AND date_of_birth_encrypted != '' THEN
            (pgp_sym_decrypt(decode(date_of_birth_encrypted::text, 'base64'), private.get_app_key())::text)::date
        ELSE date_of_birth
    END AS date_of_birth,
    CASE
        WHEN medical_history_encrypted IS NOT NULL AND medical_history_encrypted != '' THEN
            pgp_sym_decrypt(decode(medical_history_encrypted::text, 'base64'), private.get_app_key())::text
        ELSE medical_history
    END AS medical_history,
    CASE
        WHEN address_encrypted IS NOT NULL AND address_encrypted != '' THEN
            pgp_sym_decrypt(decode(address_encrypted::text, 'base64'), private.get_app_key())::text
        ELSE address
    END AS address,
    CASE
        WHEN emergency_contact_encrypted IS NOT NULL AND emergency_contact_encrypted != '' THEN
            pgp_sym_decrypt(decode(emergency_contact_encrypted::text, 'base64'), private.get_app_key())::text
        ELSE emergency_contact
    END AS emergency_contact,
    -- All other non-encrypted fields
    email,
    username,
    avatar_url,
    profile_picture_url,
    created_at,
    updated_at,
    role,
    stripe_customer_id,
    stripe_subscription_id,
    subscription_status,
    subscription_plan,
    subscription_ends_at,
    business_id,
    health_insurance_provider,
    health_insurance_number,
    terms_accepted_at,
    privacy_accepted_at,
    ai_opt_out,
    profile_completion_status,
    language_preference,
    gdpr_deletion_requested_at,
    is_demo_profile
FROM public.profiles;

-- Step 3: Grant access to authenticated users
GRANT SELECT ON public.secure_profiles_view TO authenticated;

-- Step 4: Add comment for documentation
COMMENT ON VIEW public.secure_profiles_view IS 'Decrypts PHI fields from profiles table. Uses security_invoker=true to enforce RLS policies from the underlying table.';

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this to verify the view is working correctly:
-- SELECT id, first_name, last_name, email FROM public.secure_profiles_view WHERE role = 'patient' LIMIT 5;
-- ============================================================================
