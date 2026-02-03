-- Fix encryption trigger permissions issue
-- The profile encryption trigger is causing "failed to save" errors
--
-- Root cause: The encryption triggers were re-enabled in migration 20260203055911
-- before proper validation was complete. Per the encryption plan, triggers should
-- only be enabled after:
--   1. Backfill migrations are run
--   2. Validation period is complete
--   3. Frontend is updated to use secure views
--
-- Solution: Disable the profiles encryption trigger until proper validation.
-- This is safe because plaintext data is preserved (non-destructive encryption).

-- Disable the profiles encryption trigger
DROP TRIGGER IF EXISTS trg_encrypt_profiles_phi ON public.profiles;

-- Grant permissions for when encryption is re-enabled later
GRANT EXECUTE ON FUNCTION private.get_encryption_key() TO authenticator;
GRANT EXECUTE ON FUNCTION private.get_encryption_key() TO authenticated;

-- Ensure function ownership is correct for SECURITY DEFINER
ALTER FUNCTION private.get_encryption_key() OWNER TO postgres;

-- Keep the trigger function for future use, but don't enable the trigger
-- The trigger can be re-enabled after validation:
-- CREATE TRIGGER trg_encrypt_profiles_phi
--   BEFORE INSERT OR UPDATE ON public.profiles
--   FOR EACH ROW
--   EXECUTE FUNCTION public.encrypt_profiles_phi();
