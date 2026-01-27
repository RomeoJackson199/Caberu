-- Fix case-insensitive email comparison for dentist invitations
-- This ensures invitations show up regardless of email casing

-- Drop the old policy
DROP POLICY IF EXISTS "Invitees can view their invitations" ON public.dentist_invitations;

-- Recreate with case-insensitive email comparison
CREATE POLICY "Invitees can view their invitations"
ON public.dentist_invitations
FOR SELECT
USING (
  LOWER(invitee_email) IN (
    SELECT LOWER(email) FROM public.profiles
    WHERE user_id = auth.uid()
  )
);

-- Also update the policy for responding to invitations
DROP POLICY IF EXISTS "Invitees can respond to invitations" ON public.dentist_invitations;

CREATE POLICY "Invitees can respond to invitations"
ON public.dentist_invitations
FOR UPDATE
USING (
  LOWER(invitee_email) IN (
    SELECT LOWER(email) FROM public.profiles
    WHERE user_id = auth.uid()
  )
  AND status = 'pending'
)
WITH CHECK (
  status IN ('accepted', 'rejected')
);
