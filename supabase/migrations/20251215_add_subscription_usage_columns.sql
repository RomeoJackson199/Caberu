-- Add missing subscription and usage columns to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS pending_plan_change TEXT,
ADD COLUMN IF NOT EXISTS pending_plan_change_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS emails_sent_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS customer_count INTEGER DEFAULT 0;

-- Comment for documentation
COMMENT ON COLUMN public.businesses.pending_plan_change IS 'Name of the plan to switch to at period end';
COMMENT ON COLUMN public.businesses.emails_sent_count IS 'Count of marketing emails sent this billing period';
