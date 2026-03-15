
-- Set up hourly cron job for WhatsApp appointment reminders
SELECT cron.schedule(
  'whatsapp-appointment-reminders',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://gjvxcisbaxhhblhsytar.supabase.co/functions/v1/whatsapp-send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{"action": "send_reminders"}'::jsonb
  );
  $$
);
