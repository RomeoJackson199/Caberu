-- Add missing estimated_duration column to treatment_plans
-- This fixes the PGRST204 error where frontend expects this column for free-text duration

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'treatment_plans'
        AND column_name = 'estimated_duration'
    ) THEN
        ALTER TABLE public.treatment_plans ADD COLUMN estimated_duration TEXT;
    END IF;
END $$;
