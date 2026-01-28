-- Add composite index for efficient business + date range queries on appointments
-- This speeds up schedule lookups and analytics queries significantly
CREATE INDEX IF NOT EXISTS idx_appointments_business_date 
ON appointments (business_id, appointment_date DESC)
WHERE status != 'cancelled';

-- Add index for rate limit lookups (key + window combination)
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_key_window 
ON api_rate_limits (key, window_start DESC);