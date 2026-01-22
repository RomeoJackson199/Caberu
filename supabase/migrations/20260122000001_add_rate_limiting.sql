-- Migration: Add rate limiting infrastructure
-- Description: Creates table and policies for tracking rate limit attempts

-- Create rate_limit_attempts table
CREATE TABLE IF NOT EXISTS rate_limit_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- Email, phone, or IP address (lowercase)
  action TEXT NOT NULL, -- Action type: 'login', 'password_reset', '2fa_send', etc.
  success BOOLEAN NOT NULL DEFAULT FALSE,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Indexes for efficient querying
  CONSTRAINT rate_limit_attempts_pkey PRIMARY KEY (id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier_action
  ON rate_limit_attempts(identifier, action, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_attempted_at
  ON rate_limit_attempts(attempted_at DESC);

-- Enable RLS
ALTER TABLE rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Service role can do anything (for Edge Functions)
CREATE POLICY "Service role has full access to rate_limit_attempts"
  ON rate_limit_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can only view their own attempts (by email)
CREATE POLICY "Users can view their own rate limit attempts"
  ON rate_limit_attempts
  FOR SELECT
  TO authenticated
  USING (
    identifier = lower(auth.jwt()->>'email')
  );

-- Anonymous/public cannot access this table
CREATE POLICY "Anonymous users cannot access rate_limit_attempts"
  ON rate_limit_attempts
  FOR ALL
  TO anon
  USING (false);

-- Function to automatically cleanup old rate limit attempts (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limit_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM rate_limit_attempts
  WHERE attempted_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Comment the table and columns
COMMENT ON TABLE rate_limit_attempts IS 'Tracks rate limit attempts for various actions to prevent abuse';
COMMENT ON COLUMN rate_limit_attempts.identifier IS 'Email, phone number, or IP address (stored in lowercase)';
COMMENT ON COLUMN rate_limit_attempts.action IS 'Type of action being rate limited (login, password_reset, 2fa_send, etc.)';
COMMENT ON COLUMN rate_limit_attempts.success IS 'Whether the attempt was successful';
COMMENT ON COLUMN rate_limit_attempts.metadata IS 'Additional metadata about the attempt (user agent, location, etc.)';
