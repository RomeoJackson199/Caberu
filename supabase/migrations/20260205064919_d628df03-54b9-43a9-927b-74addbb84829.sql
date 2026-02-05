
-- Schedule weekly check for expired encryption keys (Sundays at 3 AM UTC)
SELECT cron.schedule(
  'rotate-expired-encryption-keys',
  '0 3 * * 0',
  $$SELECT private.rotate_expired_keys();$$
);
