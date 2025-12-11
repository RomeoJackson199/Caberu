-- Add subscription columns directly to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS promo_code_used TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_businesses_subscription_status ON public.businesses(subscription_status);

-- Comment for documentation
COMMENT ON COLUMN public.businesses.subscription_status IS 'active, inactive, cancelled, trial';
COMMENT ON COLUMN public.businesses.subscription_plan IS 'free, monthly, yearly, promo';
COMMENT ON COLUMN public.businesses.subscription_ends_at IS 'When the current subscription period ends';
