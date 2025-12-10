-- Migration: Add rate limiting columns to verification_codes table
-- Required for 2FA security - max 5 attempts, 10 minute lockout

-- Add failed_attempts column
ALTER TABLE public.verification_codes 
  ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0;

-- Add lockout_until column
ALTER TABLE public.verification_codes 
  ADD COLUMN IF NOT EXISTS lockout_until TIMESTAMPTZ DEFAULT NULL;

-- Add index for performance on lockout checks
CREATE INDEX IF NOT EXISTS idx_verification_codes_lockout 
  ON public.verification_codes (email, lockout_until);

COMMENT ON COLUMN public.verification_codes.failed_attempts IS 'Count of failed verification attempts';
COMMENT ON COLUMN public.verification_codes.lockout_until IS 'Account is locked until this timestamp (10 min after 5 failed attempts)';
