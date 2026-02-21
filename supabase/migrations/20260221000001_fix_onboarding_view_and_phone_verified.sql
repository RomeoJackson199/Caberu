-- Fix onboarding view and phone_verified sync for phone-OTP auth users
--
-- Problems fixed:
-- 1. secure_profiles_view was recreated in migration 20260217 with a stripped-down
--    column list that omits phone_verified and onboarding_completed.
--    Onboarding.tsx queries the view for those columns → fails → profile = null
--    → form can't pre-fill data and can't detect that phone is already verified.
--
-- 2. Phone OTP users verify their phone via Supabase auth (sets auth.users.phone_confirmed_at)
--    but profiles.phone_verified is never updated. After onboarding completes,
--    PhoneVerificationGate pops up asking them to verify their phone a second time.


-- ────────────────────────────────────────────────────────────────────────────
-- Fix 1: Add missing columns back to secure_profiles_view
-- ────────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS public.secure_profiles_view CASCADE;

CREATE VIEW public.secure_profiles_view
WITH (security_invoker = on) AS
SELECT
  id,
  user_id,
  email,
  first_name,
  last_name,
  phone,
  date_of_birth,
  avatar_url,
  avatar_url AS profile_picture_url,
  address,
  emergency_contact,
  medical_history,
  role,
  ai_opt_out,
  patient_status,
  profile_completion_status,
  import_session_id,
  created_at,
  updated_at,
  -- Previously missing columns (added after the view was originally created)
  phone_verified,
  phone_verified_at,
  onboarding_completed
FROM profiles;

GRANT SELECT ON public.secure_profiles_view TO authenticated;

COMMENT ON VIEW public.secure_profiles_view IS
  'Unified profiles view. Uses security_invoker=true so RLS on the underlying table is enforced.';


-- ────────────────────────────────────────────────────────────────────────────
-- Fix 2: Sync profiles.phone_verified when Supabase confirms a phone OTP
--
-- When a user verifies their phone via signInWithOtp / verifyOtp, Supabase
-- sets auth.users.phone_confirmed_at. This trigger mirrors that into our
-- profiles table so phone-OTP users don't have to re-verify in onboarding.
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sync_phone_verified_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when phone_confirmed_at transitions from null → a timestamp
  IF NEW.phone_confirmed_at IS NOT NULL
     AND (OLD.phone_confirmed_at IS NULL OR OLD.phone_confirmed_at IS DISTINCT FROM NEW.phone_confirmed_at)
  THEN
    UPDATE public.profiles
    SET
      phone_verified    = true,
      phone_verified_at = NEW.phone_confirmed_at
    WHERE user_id = NEW.id
      AND phone_verified = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS sync_phone_verified_on_auth_confirm ON auth.users;

CREATE TRIGGER sync_phone_verified_on_auth_confirm
AFTER UPDATE OF phone_confirmed_at ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_phone_verified_from_auth();
