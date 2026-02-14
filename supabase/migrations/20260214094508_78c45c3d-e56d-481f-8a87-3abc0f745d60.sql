
-- SMS logs table to track all outgoing SMS messages
CREATE TABLE public.sms_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id),
  recipient_phone TEXT NOT NULL,
  message_body TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'notification',
  twilio_sid TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins and service role can access
CREATE POLICY "Service role full access on sms_logs"
  ON public.sms_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_sms_logs_created_at ON public.sms_logs (created_at DESC);
CREATE INDEX idx_sms_logs_status ON public.sms_logs (status);
CREATE INDEX idx_sms_logs_message_type ON public.sms_logs (message_type);

-- SMS message templates for default notification messages
CREATE TABLE public.sms_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  template_name TEXT NOT NULL,
  template_body TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on sms_templates"
  ON public.sms_templates
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert default templates
INSERT INTO public.sms_templates (template_key, template_name, template_body, description) VALUES
  ('appointment_confirmed', 'Appointment Confirmed', '✅ Your appointment on {{date}} at {{time}} has been confirmed! Please arrive 10 minutes early.', 'Sent when a dentist approves a pending appointment'),
  ('appointment_declined', 'Appointment Declined', 'Your appointment request for {{date}} at {{time}} could not be confirmed. Please book a new appointment.', 'Sent when a dentist declines a pending appointment'),
  ('appointment_reminder_24h', 'Reminder (24h)', '🔔 Reminder: You have an appointment tomorrow, {{date}} at {{time}}. Reply CONFIRM to confirm or call us to reschedule.', 'Sent 24 hours before appointment'),
  ('appointment_reminder_2h', 'Reminder (2h)', '⏰ Your appointment is in 2 hours at {{time}}. See you soon!', 'Sent 2 hours before appointment'),
  ('appointment_rescheduled', 'Appointment Rescheduled', '📅 Your appointment has been rescheduled to {{date}} at {{time}}. Contact us if this doesn''t work for you.', 'Sent when an appointment is rescheduled'),
  ('appointment_cancelled', 'Appointment Cancelled', 'Your appointment on {{date}} at {{time}} has been cancelled. Please book a new appointment if needed.', 'Sent when an appointment is cancelled'),
  ('welcome', 'Welcome', 'Welcome to {{clinic_name}}! We''re glad to have you. Book your first appointment online or call us.', 'Sent to new patients'),
  ('general_notification', 'General Notification', '{{message}}', 'Generic template for system notifications');

-- Trigger for updated_at
CREATE TRIGGER update_sms_templates_updated_at
  BEFORE UPDATE ON public.sms_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
