-- Migration: Secure Public Businesses View
-- Mitigates risk of exposing full business table to public

-- 1. Revoke public access to main table policies
-- We previously allowed "true" for public select. We must drop that.
DROP POLICY IF EXISTS "businesses_public_read" ON public.businesses;
-- Recreate it ONLY for authenticated users
CREATE POLICY "businesses_authenticated_read"
ON public.businesses FOR SELECT
TO authenticated
USING (true);


-- 2. Create Secure View for Public
CREATE OR REPLACE VIEW public.public_businesses_view AS
SELECT 
  id,
  name,
  slug,
  branding_settings, -- Needed for logo/colors on login
  template_type,
  membership_required
FROM public.businesses
WHERE visibility = 'public'; -- Assuming we want to respect visibility flag if it exists, or just all

-- 3. Grant access to view
GRANT SELECT ON public.public_businesses_view TO anon, authenticated;

COMMENT ON VIEW public.public_businesses_view IS 'Secure view of businesses for public selection/login screens';
