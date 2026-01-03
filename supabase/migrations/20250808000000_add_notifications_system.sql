-- Add comprehensive notifications system
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('appointment', 'prescription', 'reminder', 'emergency', 'system', 'treatment_plan', 'follow_up')),
  category text NOT NULL CHECK (category IN ('info', 'warning', 'success', 'error', 'urgent')),
  is_read boolean DEFAULT false,
  action_url text,
  metadata jsonb,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT true,
  push_enabled boolean DEFAULT true,
  in_app_enabled boolean DEFAULT true,
  appointment_reminders boolean DEFAULT true,
  prescription_updates boolean DEFAULT true,
  treatment_plan_updates boolean DEFAULT true,
  emergency_alerts boolean DEFAULT true,
  system_notifications boolean DEFAULT true,
  quiet_hours_start time DEFAULT '22:00',
  quiet_hours_end time DEFAULT '08:00',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Add notification templates table
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key text NOT NULL UNIQUE,
  title_template text NOT NULL,
  message_template text NOT NULL,
  type text NOT NULL,
  category text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can manage notifications"
ON public.notifications
FOR ALL
USING (true);

-- RLS Policies for notification_preferences
CREATE POLICY "Users can manage their own notification preferences"
ON public.notification_preferences
FOR ALL
USING (auth.uid() = user_id);

-- RLS Policies for notification_templates (read-only for authenticated users)
CREATE POLICY "Authenticated users can view notification templates"
ON public.notification_templates
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text DEFAULT 'system',
  p_category text DEFAULT 'info',
  p_action_url text DEFAULT null,
  p_metadata jsonb DEFAULT null,
  p_expires_at timestamp with time zone DEFAULT null
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    category,
    action_url,
    metadata,
    expires_at
  ) VALUES (
    p_user_id,
    p_title,
    p_message,
    p_type,
    p_category,
    p_action_url,
    p_metadata,
    p_expires_at
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = true, updated_at = now()
  WHERE id = p_notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_count integer;
BEGIN
  UPDATE public.notifications
  SET is_read = true, updated_at = now()
  WHERE user_id = auth.uid() AND is_read = false;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  count_result integer;
BEGIN
  SELECT COUNT(*)
  INTO count_result
  FROM public.notifications
  WHERE user_id = auth.uid() AND is_read = false;
  
  RETURN COALESCE(count_result, 0);
END;
$$;

-- Function to create appointment reminder notification
CREATE OR REPLACE FUNCTION public.create_appointment_reminder(
  p_appointment_id uuid,
  p_reminder_type text DEFAULT '24h'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  appointment_record record;
  notification_id uuid;
  reminder_hours integer;
  title_text text;
  message_text text;
BEGIN
  -- Get appointment details
  SELECT a.*, p.user_id as patient_user_id, d.profile_id as dentist_profile_id
  INTO appointment_record
  FROM public.appointments a
  JOIN public.profiles p ON p.id = a.patient_id
  JOIN public.dentists d ON d.id = a.dentist_id
  WHERE a.id = p_appointment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;
  
  -- Set reminder timing
  CASE p_reminder_type
    WHEN '24h' THEN reminder_hours := 24;
    WHEN '2h' THEN reminder_hours := 2;
    WHEN '1h' THEN reminder_hours := 1;
    ELSE reminder_hours := 24;
  END CASE;
  
  -- Set notification content
  title_text := 'Appointment Reminder';
  message_text := format('You have a dental appointment in %s hours on %s', 
    reminder_hours, 
    to_char(appointment_record.appointment_date, 'Mon DD, YYYY at HH:MI AM')
  );
  
  -- Create notification
  SELECT public.create_notification(
    appointment_record.patient_user_id,
    title_text,
    message_text,
    'reminder',
    'info',
    format('/appointments/%s', p_appointment_id),
    jsonb_build_object(
      'appointment_id', p_appointment_id,
      'reminder_type', p_reminder_type,
      'appointment_date', appointment_record.appointment_date
    ),
    appointment_record.appointment_date - interval '1 hour'
  ) INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Function to create prescription notification
CREATE OR REPLACE FUNCTION public.create_prescription_notification(
  p_prescription_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prescription_record record;
  notification_id uuid;
BEGIN
  -- Get prescription details
  SELECT pr.*, p.user_id as patient_user_id
  INTO prescription_record
  FROM public.prescriptions pr
  JOIN public.profiles p ON p.id = pr.patient_id
  WHERE pr.id = p_prescription_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prescription not found';
  END IF;
  
  -- Create notification
  SELECT public.create_notification(
    prescription_record.patient_user_id,
    'New Prescription',
    format('You have a new prescription for %s. Please check your treatment plan.', prescription_record.medication_name),
    'prescription',
    'info',
    format('/prescriptions/%s', p_prescription_id),
    jsonb_build_object(
      'prescription_id', p_prescription_id,
      'medication_name', prescription_record.medication_name,
      'prescribed_date', prescription_record.prescribed_date
    )
  ) INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Function to create treatment plan notification
CREATE OR REPLACE FUNCTION public.create_treatment_plan_notification(
  p_treatment_plan_id uuid,
  p_notification_type text DEFAULT 'created'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  treatment_plan_record record;
  notification_id uuid;
  title_text text;
  message_text text;
BEGIN
  -- Get treatment plan details
  SELECT tp.*, p.user_id as patient_user_id
  INTO treatment_plan_record
  FROM public.treatment_plans tp
  JOIN public.profiles p ON p.id = tp.patient_id
  WHERE tp.id = p_treatment_plan_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Treatment plan not found';
  END IF;
  
  -- Set notification content based on type
  CASE p_notification_type
    WHEN 'created' THEN
      title_text := 'New Treatment Plan';
      message_text := format('A new treatment plan "%s" has been created for you.', treatment_plan_record.plan_name);
    WHEN 'updated' THEN
      title_text := 'Treatment Plan Updated';
      message_text := format('Your treatment plan "%s" has been updated.', treatment_plan_record.plan_name);
    WHEN 'completed' THEN
      title_text := 'Treatment Plan Completed';
      message_text := format('Your treatment plan "%s" has been completed.', treatment_plan_record.plan_name);
    ELSE
      title_text := 'Treatment Plan Update';
      message_text := format('Your treatment plan "%s" has been updated.', treatment_plan_record.plan_name);
  END CASE;
  
  -- Create notification
  SELECT public.create_notification(
    treatment_plan_record.patient_user_id,
    title_text,
    message_text,
    'treatment_plan',
    'info',
    format('/treatment-plans/%s', p_treatment_plan_id),
    jsonb_build_object(
      'treatment_plan_id', p_treatment_plan_id,
      'plan_name', treatment_plan_record.plan_name,
      'notification_type', p_notification_type
    )
  ) INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Insert default notification templates
INSERT INTO public.notification_templates (template_key, title_template, message_template, type, category) VALUES
('appointment_reminder_24h', 'Appointment Reminder', 'You have a dental appointment in 24 hours on {appointment_date}', 'reminder', 'info'),
('appointment_reminder_2h', 'Appointment Reminder', 'You have a dental appointment in 2 hours on {appointment_date}', 'reminder', 'warning'),
('appointment_reminder_1h', 'Appointment Reminder', 'You have a dental appointment in 1 hour on {appointment_date}', 'reminder', 'urgent'),
('prescription_new', 'New Prescription', 'You have a new prescription for {medication_name}. Please check your treatment plan.', 'prescription', 'info'),
('prescription_expiring', 'Prescription Expiring', 'Your prescription for {medication_name} will expire on {expiry_date}.', 'prescription', 'warning'),
('treatment_plan_created', 'New Treatment Plan', 'A new treatment plan "{plan_name}" has been created for you.', 'treatment_plan', 'info'),
('treatment_plan_updated', 'Treatment Plan Updated', 'Your treatment plan "{plan_name}" has been updated.', 'treatment_plan', 'info'),
('treatment_plan_completed', 'Treatment Plan Completed', 'Your treatment plan "{plan_name}" has been completed.', 'treatment_plan', 'success'),
('emergency_alert', 'Emergency Alert', 'There is an emergency situation. Please contact your dentist immediately.', 'emergency', 'urgent'),
('system_maintenance', 'System Maintenance', 'The system will be under maintenance on {maintenance_date}.', 'system', 'info');

-- Create default notification preferences for existing users
INSERT INTO public.notification_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;