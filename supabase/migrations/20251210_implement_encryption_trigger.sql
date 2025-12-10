-- Migration: Implement Transparent Encryption
-- Automates encryption on write and decryption on read via triggers and views.

-- 1. Helper function for Encryption Key
-- SECURITY WARNING: In production, use Supabase Vault or a separate secure schema.
-- For this implementation, we use a obfuscated function.
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.get_app_key() 
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
    RETURN 'base64:J9/8v7s2+1w4/L0k1+2s9+5y4/P23+0='; -- Example fixed key
END;
$$;

-- 2. Add description_encrypted if not exists (diagnosis_encrypted already added)
ALTER TABLE public.treatment_plans 
ADD COLUMN IF NOT EXISTS description_encrypted bytea;

-- 3. Trigger Function to Encrypt Data
CREATE OR REPLACE FUNCTION public.encrypt_treatment_plan_trigger()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    app_key TEXT;
BEGIN
    app_key := private.get_app_key();

    -- Encrypt Diagnosis
    IF NEW.diagnosis IS NOT NULL AND length(NEW.diagnosis) > 0 THEN
        NEW.diagnosis_encrypted := pgp_sym_encrypt(NEW.diagnosis, app_key);
        NEW.diagnosis := NULL; -- Clear plain text
    END IF;

    -- Encrypt Description
    IF NEW.description IS NOT NULL AND length(NEW.description) > 0 THEN
        NEW.description_encrypted := pgp_sym_encrypt(NEW.description, app_key);
        NEW.description := NULL; -- Clear plain text
    END IF;

    RETURN NEW;
END;
$$;

-- 4. Bind Trigger
DROP TRIGGER IF EXISTS trg_encrypt_treatment_plan ON public.treatment_plans;
CREATE TRIGGER trg_encrypt_treatment_plan
BEFORE INSERT OR UPDATE ON public.treatment_plans
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_treatment_plan_trigger();

-- 5. Create Decrypted View for Application Read Access
CREATE OR REPLACE VIEW public.secure_treatment_plans_view AS
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

-- Grant access to the view
GRANT SELECT ON public.secure_treatment_plans_view TO authenticated;
