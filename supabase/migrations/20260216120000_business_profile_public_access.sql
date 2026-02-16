-- Add public read access for business profile pages (caberu.be/:slug)
-- This allows unauthenticated visitors to view business profile pages

-- Allow anon users to read business basic info by slug
CREATE POLICY "businesses_public_profile_read"
  ON public.businesses
  FOR SELECT
  TO anon
  USING (true);

-- Allow anon users to read active services for public business pages
CREATE POLICY "business_services_public_read"
  ON public.business_services
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Allow anon users to read basic profile info (name, avatar) for team display
CREATE POLICY "profiles_public_basic_read"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (true);

-- Allow anon users to read business members for team display
CREATE POLICY "business_members_public_read"
  ON public.business_members
  FOR SELECT
  TO anon
  USING (true);
