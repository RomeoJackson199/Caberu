-- Fix: Allow public read access to business_members for booking functionality
-- Patients need to see which dentists belong to a clinic to book appointments

-- Add policy for public/anon users to view business members (for booking)
CREATE POLICY "Public can view business members for booking"
ON public.business_members
FOR SELECT
TO anon, authenticated
USING (true);

-- Note: This is safe because business_members only contains:
-- - business_id (public)
-- - profile_id (links to dentist)
-- - role (staff role)
-- No sensitive PII is exposed. Actual dentist details come from the dentists table
-- which already has "Anyone can view active dentists" policy.