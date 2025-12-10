-- Migration: Allow public read access to businesses for workspace selection
-- Purpose: Users need to see all businesses on login page to select their workspace

-- Enable RLS if not already enabled
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to basic business info
-- This allows anyone (including unauthenticated users) to see business names for selection
DROP POLICY IF EXISTS "Allow public read of businesses" ON public.businesses;
CREATE POLICY "Allow public read of businesses"
  ON public.businesses
  FOR SELECT
  TO public
  USING (true);

-- Note: This policy allows SELECT (read-only) for all users
-- Insert/Update/Delete still require proper authentication and authorization
