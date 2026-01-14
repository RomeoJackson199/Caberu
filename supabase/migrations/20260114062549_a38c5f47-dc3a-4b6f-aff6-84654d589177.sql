-- Drop the overly permissive service role policy
DROP POLICY IF EXISTS "Service role can access all push subscriptions" ON public.push_subscriptions;

-- Note: Edge functions using service_role key bypass RLS by default, 
-- so we don't need an explicit policy for them.