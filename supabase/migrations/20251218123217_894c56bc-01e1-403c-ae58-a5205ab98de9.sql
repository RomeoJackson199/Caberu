-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job for message notification check every 12 hours
SELECT cron.schedule(
  'message-notification-check-12h',
  '0 */12 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://gjvxcisbaxhhblhsytar.supabase.co/functions/v1/message-notification-check',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqdnhjaXNiYXhoaGJsaHN5dGFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjU4MDUsImV4cCI6MjA2NzY0MTgwNX0.p4HO2McB5IqP9iQ_p_Z6yHKCkKyDXuIm7ono6UJZcmM"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);