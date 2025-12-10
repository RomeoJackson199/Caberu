-- Migration: Secure the Decrypted View
-- Fixes Vulnerability: View was bypassing RLS because 'security_invoker' was not set.

-- 1. Redefine View with Security Invoker
-- 'security_invoker = true' means the view will check RLS policies of the underlying table
-- against the *current user* instead of the view owner.
CREATE OR REPLACE VIEW public.secure_treatment_plans_view 
WITH (security_invoker = true)
AS
SELECT
    id,
    patient_id,
    dentist_id,
    business_id,
    title,
    -- Decrypt columns or return plain text if encrypted is null (fallback)
    CASE 
        WHEN diagnosis_encrypted IS NOT NULL THEN pgp_sym_decrypt(diagnosis_encrypted, private.get_app_key())
        ELSE diagnosis 
    END AS diagnosis,
    CASE 
        WHEN description_encrypted IS NOT NULL THEN pgp_sym_decrypt(description_encrypted, private.get_app_key())
        ELSE description 
    END AS description,
    treatment_goals,
    procedures,
    estimated_cost,
    estimated_duration,
    priority,
    status,
    notes,
    target_completion_date,
    start_date,
    created_at,
    updated_at
FROM public.treatment_plans;

-- 2. Grant access (re-applying to be safe, though likely exists)
GRANT SELECT ON public.secure_treatment_plans_view TO authenticated;
