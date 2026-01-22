-- Archive and clean up old system_errors for better database performance
-- This helps maintain database hygiene and query performance

-- Create archive table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_errors_archive (
    LIKE system_errors INCLUDING ALL
);

-- Archive errors older than 30 days
INSERT INTO system_errors_archive 
SELECT * FROM system_errors 
WHERE created_at < NOW() - INTERVAL '30 days'
ON CONFLICT DO NOTHING;

-- Delete archived/old errors from main table
DELETE FROM system_errors 
WHERE created_at < NOW() - INTERVAL '30 days';

-- Delete resolved errors older than 7 days
DELETE FROM system_errors 
WHERE resolved = true 
AND created_at < NOW() - INTERVAL '7 days';

-- Delete console warnings older than 3 days (low priority)
DELETE FROM system_errors 
WHERE error_type = 'ConsoleWarning' 
AND created_at < NOW() - INTERVAL '3 days';

-- Add index for faster cleanup queries in the future
CREATE INDEX IF NOT EXISTS idx_system_errors_created_at ON system_errors(created_at);
CREATE INDEX IF NOT EXISTS idx_system_errors_resolved ON system_errors(resolved) WHERE resolved = true;

-- Add comment for documentation
COMMENT ON TABLE system_errors_archive IS 'Archive of old system errors for audit purposes. Can be purged periodically.';