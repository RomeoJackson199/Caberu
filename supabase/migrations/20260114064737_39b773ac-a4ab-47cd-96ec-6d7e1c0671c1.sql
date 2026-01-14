-- Add user_agent column to push_subscriptions
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS user_agent text;

-- Add unique constraint for upsert
ALTER TABLE public.push_subscriptions 
DROP CONSTRAINT IF EXISTS push_subscriptions_user_endpoint_unique;

ALTER TABLE public.push_subscriptions 
ADD CONSTRAINT push_subscriptions_user_endpoint_unique UNIQUE (user_id, endpoint);