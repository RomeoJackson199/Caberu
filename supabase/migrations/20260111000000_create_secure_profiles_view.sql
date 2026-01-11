-- Create secure_profiles_view to decrypt PHI data
-- This view provides decrypted patient data for authorized users
-- Similar to secure_treatment_plans_view, this handles automatic decryption

CREATE OR REPLACE VIEW public.secure_profiles_view
WITH (security_invoker = true)
AS
SELECT
    id,
    user_id,
    -- Decrypt PHI fields or return plain text if encrypted is null (fallback for non-encrypted data)
    CASE
        WHEN first_name_encrypted IS NOT NULL AND first_name_encrypted != '' THEN
            convert_from(pgp_sym_decrypt(decode(first_name_encrypted, 'base64'), current_setting('app.encryption_key', true)), 'UTF8')
        ELSE first_name
    END AS first_name,
    CASE
        WHEN last_name_encrypted IS NOT NULL AND last_name_encrypted != '' THEN
            convert_from(pgp_sym_decrypt(decode(last_name_encrypted, 'base64'), current_setting('app.encryption_key', true)), 'UTF8')
        ELSE last_name
    END AS last_name,
    CASE
        WHEN phone_encrypted IS NOT NULL AND phone_encrypted != '' THEN
            convert_from(pgp_sym_decrypt(decode(phone_encrypted, 'base64'), current_setting('app.encryption_key', true)), 'UTF8')
        ELSE phone
    END AS phone,
    CASE
        WHEN date_of_birth_encrypted IS NOT NULL AND date_of_birth_encrypted != '' THEN
            convert_from(pgp_sym_decrypt(decode(date_of_birth_encrypted, 'base64'), current_setting('app.encryption_key', true)), 'UTF8')
        ELSE date_of_birth
    END AS date_of_birth,
    CASE
        WHEN medical_history_encrypted IS NOT NULL AND medical_history_encrypted != '' THEN
            convert_from(pgp_sym_decrypt(decode(medical_history_encrypted, 'base64'), current_setting('app.encryption_key', true)), 'UTF8')
        ELSE medical_history
    END AS medical_history,
    CASE
        WHEN address_encrypted IS NOT NULL AND address_encrypted != '' THEN
            convert_from(pgp_sym_decrypt(decode(address_encrypted, 'base64'), current_setting('app.encryption_key', true)), 'UTF8')
        ELSE address
    END AS address,
    CASE
        WHEN emergency_contact_encrypted IS NOT NULL AND emergency_contact_encrypted != '' THEN
            convert_from(pgp_sym_decrypt(decode(emergency_contact_encrypted, 'base64'), current_setting('app.encryption_key', true)), 'UTF8')
        ELSE emergency_contact
    END AS emergency_contact,
    -- Non-encrypted fields
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

-- Grant access to authenticated users (RLS policies on the underlying profiles table will still apply)
GRANT SELECT ON public.secure_profiles_view TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.secure_profiles_view IS 'Decrypts PHI fields from profiles table. Uses security_invoker=true to enforce RLS policies from the underlying table.';
