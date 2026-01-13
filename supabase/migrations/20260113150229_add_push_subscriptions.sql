-- Create push_subscriptions table for web push notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Prevent duplicate subscriptions
  UNIQUE(user_id, endpoint)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own push subscriptions
CREATE POLICY "Users can view their own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- System can manage all push subscriptions (for sending notifications)
CREATE POLICY "System can manage all push subscriptions"
  ON push_subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscriptions_updated_at();

-- Function to get active push subscriptions for a user
CREATE OR REPLACE FUNCTION get_user_push_subscriptions(p_user_id UUID)
RETURNS TABLE (
  endpoint TEXT,
  p256dh_key TEXT,
  auth_key TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.endpoint,
    ps.p256dh_key,
    ps.auth_key
  FROM push_subscriptions ps
  WHERE ps.user_id = p_user_id
    AND ps.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old inactive subscriptions (run periodically)
CREATE OR REPLACE FUNCTION cleanup_inactive_push_subscriptions()
RETURNS void AS $$
BEGIN
  DELETE FROM push_subscriptions
  WHERE is_active = false
    AND updated_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE push_subscriptions IS 'Stores web push notification subscriptions for users';
COMMENT ON FUNCTION get_user_push_subscriptions IS 'Retrieves active push subscriptions for a user';
COMMENT ON FUNCTION cleanup_inactive_push_subscriptions IS 'Removes inactive subscriptions older than 30 days';
