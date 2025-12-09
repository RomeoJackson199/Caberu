-- Add Stripe Connect account fields to businesses table
-- This enables dentists to receive payments directly to their Stripe accounts

-- Add stripe_account_id to store connected account ID
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

-- Add stripe_account_status to track onboarding status
-- Values: null (not started), 'pending' (onboarding in progress), 'active' (can receive payments), 'restricted' (needs action)
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS stripe_account_status TEXT;

-- Add stripe_onboarding_completed to track if full onboarding is done
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS stripe_onboarding_completed BOOLEAN DEFAULT false;

-- Add stripe_charges_enabled to track if the account can accept charges
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT false;

-- Add stripe_payouts_enabled to track if the account can receive payouts
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT false;

-- Add platform_fee_percentage for optional platform fee on patient payments
-- Default 2.5% fee to Caberu on patient payments
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS platform_fee_percentage NUMERIC(5,2) DEFAULT 2.50;

-- Create index for faster lookups by stripe_account_id
CREATE INDEX IF NOT EXISTS idx_businesses_stripe_account_id ON public.businesses(stripe_account_id);

COMMENT ON COLUMN public.businesses.stripe_account_id IS 'Stripe Connect account ID for receiving patient payments';
COMMENT ON COLUMN public.businesses.stripe_account_status IS 'Status of Stripe Connect onboarding: pending, active, restricted';
COMMENT ON COLUMN public.businesses.stripe_onboarding_completed IS 'Whether the Stripe Connect onboarding flow has been completed';
COMMENT ON COLUMN public.businesses.stripe_charges_enabled IS 'Whether the connected account can accept charges';
COMMENT ON COLUMN public.businesses.stripe_payouts_enabled IS 'Whether the connected account can receive payouts';
COMMENT ON COLUMN public.businesses.platform_fee_percentage IS 'Percentage fee taken by Caberu on patient payments (default 2.5%)';
