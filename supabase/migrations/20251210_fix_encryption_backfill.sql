-- Migration: Backfill Encryption for Existing Data
-- This ensures ALL existing records are encrypted, not just new ones.

-- 1. Force Encryption on Existing Rows
-- We update the rows, which triggers the 'encrypt_treatment_plan_trigger'.
-- The trigger will take the existing 'diagnosis'/'description', encrypt it, and set the plain text column to NULL.

DO $$
DECLARE
    count_diagnosis INTEGER;
    count_description INTEGER;
BEGIN
    -- Check how many rows need encryption
    SELECT COUNT(*) INTO count_diagnosis FROM public.treatment_plans WHERE diagnosis IS NOT NULL AND diagnosis <> '';
    SELECT COUNT(*) INTO count_description FROM public.treatment_plans WHERE description IS NOT NULL AND description <> '';

    RAISE NOTICE 'Encrypting % diagnosis records and % description records...', count_diagnosis, count_description;

    -- Perform the update to trigger encryption
    -- We simply 'touch' the rows by setting updated_at to itself (or now())
    -- The BEFORE UPDATE trigger we created previously will intercept this, 
    -- detect the non-null plain text, encrypt it, and nullify the plain text.
    UPDATE public.treatment_plans
    SET updated_at = now()
    WHERE (diagnosis IS NOT NULL AND diagnosis <> '') 
       OR (description IS NOT NULL AND description <> '');
       
END $$;
