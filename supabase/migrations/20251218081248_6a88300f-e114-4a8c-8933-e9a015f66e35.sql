-- Schedule cron job to send appointment reminders every 5 minutes
SELECT cron.schedule(
  'send-appointment-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://gjvxcisbaxhhblhsytar.supabase.co/functions/v1/send-appointment-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqdnhjaXNiYXhoaGJsaHN5dGFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjU4MDUsImV4cCI6MjA2NzY0MTgwNX0.p4HO2McB5IqP9iQ_p_Z6yHKCkKyDXuIm7ono6UJZcmM"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);