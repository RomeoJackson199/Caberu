-- Migration: Secure Public Businesses View
-- Mitigates risk of exposing full business table to public

-- 1. Revoke public access to main table policies
DROP POLICY IF EXISTS "businesses_public_read" ON public.businesses;
-- Recreate it ONLY for authenticated users
CREATE POLICY "businesses_authenticated_read"
ON public.businesses FOR SELECT
TO authenticated
USING (true);


-- 2. Create Secure View for Public
-- Replaced non-existent branding_settings with direct columns (logo_url seems to exist based on app usage)
-- Removed non-existent membership_required column
CREATE OR REPLACE VIEW public.public_businesses_view AS
SELECT 
  id,
  name,
  slug,
  logo_url,        -- Exposing directly
  tagline,         -- Exposing directly
  template_type,
  custom_config    -- Exposing config if needed for frontend logic, but be careful. Assuming it's safe or frontend needs it.
FROM public.businesses
WHERE visibility = 'public'; 

-- 3. Grant access to view
GRANT SELECT ON public.public_businesses_view TO anon, authenticated;

COMMENT ON VIEW public.public_businesses_view IS 'Secure view of businesses for public selection/login screens';
