-- Add phone verification tracking to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

-- Create index for efficient queries on phone verification status
CREATE INDEX IF NOT EXISTS idx_profiles_phone_verified ON profiles(phone_verified) WHERE phone_verified = false;

-- Comment on columns
COMMENT ON COLUMN profiles.phone_verified IS 'Whether the user has verified their phone number via SMS';
COMMENT ON COLUMN profiles.phone_verified_at IS 'Timestamp when the phone number was verified';
