-- Add pending plan change columns to businesses table
-- This allows scheduling plan changes for the next billing period

ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS pending_plan_change text,
ADD COLUMN IF NOT EXISTS pending_plan_change_date timestamp with time zone;

-- Add comment for documentation
COMMENT ON COLUMN public.businesses.pending_plan_change IS 'The plan that will be activated at the next billing period';
COMMENT ON COLUMN public.businesses.pending_plan_change_date IS 'When the pending plan change will take effect';
