-- Add missing columns to push_subscriptions table and add is_active column
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Add aliases via computed columns (p256dh_key and auth_key)
-- These will allow queries using either column name
-- Actually, let's just rename to be consistent with what the code expects

-- First check if these columns exist with old names
DO $$
BEGIN
  -- If p256dh exists, create p256dh_key as alias
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'push_subscriptions' AND column_name = 'p256dh' AND table_schema = 'public') THEN
    -- Rename p256dh to p256dh_key if p256dh_key doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'push_subscriptions' AND column_name = 'p256dh_key' AND table_schema = 'public') THEN
      ALTER TABLE public.push_subscriptions RENAME COLUMN p256dh TO p256dh_key;
    END IF;
  END IF;
  
  -- If auth exists, create auth_key as alias  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'push_subscriptions' AND column_name = 'auth' AND table_schema = 'public') THEN
    -- Rename auth to auth_key if auth_key doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'push_subscriptions' AND column_name = 'auth_key' AND table_schema = 'public') THEN
      ALTER TABLE public.push_subscriptions RENAME COLUMN auth TO auth_key;
    END IF;
  END IF;
END $$;

-- Create index on is_active for faster queries
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON public.push_subscriptions(user_id, is_active) WHERE is_active = true;