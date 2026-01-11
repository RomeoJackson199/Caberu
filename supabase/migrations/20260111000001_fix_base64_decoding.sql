-- Fix base64 decoding error in secure_profiles_view
-- This fixes: "invalid symbol '\' found while decoding base64 sequence"
-- Root cause: View was using current_setting('app.encryption_key') which returns NULL, breaking decryption

DROP VIEW IF EXISTS public.secure_profiles_view;

CREATE VIEW public.secure_profiles_view
WITH (security_invoker = true)
AS
SELECT
    id,
    user_id,
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
    email,
    avatar_url,
    profile_picture_url,
    created_at,
    updated_at,
    role,
    ai_opt_out,
    profile_completion_status
FROM public.profiles;
