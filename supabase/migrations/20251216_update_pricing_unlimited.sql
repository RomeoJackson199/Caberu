-- Migration: Update pricing tiers to unlimited appointments/emails with phone minutes per day
-- Created: 2025-12-16

-- Update Starter tier
UPDATE subscription_plans 
SET 
    features = ARRAY[
        'Unlimited appointments',
        'Unlimited emails', 
        '5 min AI phone/day + pay-as-you-go',
        'Patient management',
        'Basic appointment scheduling',
        'Email notifications',
        'Basic reports'
    ]::text[],
    customer_limit = -1,
    email_limit_monthly = -1
WHERE slug = 'starter';

-- Update Professional tier
UPDATE subscription_plans 
SET 
    features = ARRAY[
        'Unlimited appointments',
        'Unlimited emails',
        '10 min AI phone/day + pay-as-you-go',
        'Everything in Starter',
        'Advanced analytics',
        'SMS notifications',
        'Custom branding',
        'Priority support'
    ]::text[],
    customer_limit = -1,
    email_limit_monthly = -1
WHERE slug = 'professional';

-- Update Enterprise tier
UPDATE subscription_plans 
SET 
    features = ARRAY[
        'Unlimited appointments',
        'Unlimited emails',
        '20 min AI phone/day + pay-as-you-go',
        'Everything in Professional',
        'Unlimited staff accounts',
        'API access',
        'Dedicated support',
        'Custom integrations'
    ]::text[],
    customer_limit = -1,
    email_limit_monthly = -1
WHERE slug = 'enterprise';

-- Add phone_minutes_daily column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscription_plans' 
        AND column_name = 'phone_minutes_daily'
    ) THEN
        ALTER TABLE subscription_plans ADD COLUMN phone_minutes_daily integer DEFAULT 5;
    END IF;
END $$;

-- Set phone minutes per tier
UPDATE subscription_plans SET phone_minutes_daily = 5 WHERE slug = 'starter';
UPDATE subscription_plans SET phone_minutes_daily = 10 WHERE slug = 'professional';
UPDATE subscription_plans SET phone_minutes_daily = 20 WHERE slug = 'enterprise';
