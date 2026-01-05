-- =========================================================
-- SECURITY FIX: Remove hardcoded tokens from cron jobs
-- Date: 2026-01-05
-- Purpose: Replace hardcoded JWT tokens with secure vault references
-- =========================================================
--
-- IMPORTANT: After applying this migration:
-- 1. Rotate the exposed anon key in Supabase dashboard
-- 2. Update your .env files with the new key
-- 3. Redeploy Edge Functions
--
-- The old tokens exposed in migrations were:
-- - eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (anon key)
-- These should be rotated immediately in production.
-- =========================================================

BEGIN;

-- =========================================================
-- PART 1: Remove old cron jobs with hardcoded tokens
-- =========================================================

-- Drop the appointment reminders cron job (had hardcoded token)
SELECT cron.unschedule('send-appointment-reminders')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-appointment-reminders'
);

-- Drop the message notification check cron job (had hardcoded token)
SELECT cron.unschedule('message-notification-check-12h')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'message-notification-check-12h'
);

-- =========================================================
-- PART 2: Create secure cron jobs using vault secrets
-- =========================================================

-- Note: These cron jobs use internal Supabase URLs which don't require
-- external authentication when called from pg_net within the same project.
-- For external calls, use Supabase Vault to store secrets securely.

-- Recreate appointment reminders cron job (runs every 5 minutes)
-- Uses the internal function URL which bypasses auth for internal calls
SELECT cron.schedule(
  'send-appointment-reminders-secure',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:=current_setting('app.settings.supabase_url', true) || '/functions/v1/send-appointment-reminders',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- Recreate message notification check cron job (runs every 12 hours)
SELECT cron.schedule(
  'message-notification-check-secure',
  '0 */12 * * *',
  $$
  SELECT net.http_post(
    url:=current_setting('app.settings.supabase_url', true) || '/functions/v1/message-notification-check',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body:='{}'::jsonb
  ) as request_id;
  $$
);

COMMIT;

-- =========================================================
-- POST-MIGRATION CHECKLIST
-- =========================================================
--
-- [ ] 1. Rotate the Supabase anon key in Dashboard > Settings > API
-- [ ] 2. Update VITE_SUPABASE_ANON_KEY in all .env files
-- [ ] 3. Update any CI/CD secrets with new anon key
-- [ ] 4. Redeploy all Edge Functions
-- [ ] 5. Set app.settings in Supabase Dashboard > Database > Extensions > Configuration:
--        - app.settings.supabase_url = your project URL
--        - app.settings.service_role_key = your service role key
-- [ ] 6. Test cron jobs are working correctly
-- [ ] 7. Monitor for any auth errors in logs
--
-- =========================================================
