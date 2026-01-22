-- Fix api_rate_limits RLS policy - make it service role only (not public)
-- This table should ONLY be accessed by edge functions using service role key

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.api_rate_limits;

-- Create a restrictive policy - deny all direct user access
-- Edge functions use service role which bypasses RLS
CREATE POLICY "Deny direct user access to rate limits"
  ON public.api_rate_limits
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Add comment explaining the design
COMMENT ON POLICY "Deny direct user access to rate limits" ON public.api_rate_limits IS 
  'Rate limits are managed exclusively by edge functions using service role key. Direct user access is denied for security.';