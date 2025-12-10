-- Add missing array columns and date column to treatment_plans
-- This fixes the PGRST204 error for 'procedures' and potential errors for 'treatment_goals' and 'target_completion_date'

DO $$
BEGIN
    -- Add procedures column
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'treatment_plans'
        AND column_name = 'procedures'
    ) THEN
        ALTER TABLE public.treatment_plans ADD COLUMN procedures TEXT[] DEFAULT '{}';
    END IF;

    -- Add treatment_goals column
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'treatment_plans'
        AND column_name = 'treatment_goals'
    ) THEN
        ALTER TABLE public.treatment_plans ADD COLUMN treatment_goals TEXT[] DEFAULT '{}';
    END IF;

    -- Add target_completion_date column
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'treatment_plans'
        AND column_name = 'target_completion_date'
    ) THEN
        ALTER TABLE public.treatment_plans ADD COLUMN target_completion_date TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;
