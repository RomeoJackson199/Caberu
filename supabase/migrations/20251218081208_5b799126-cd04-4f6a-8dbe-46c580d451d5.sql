-- Create appointment_reminders table for scheduling reminder notifications
CREATE TABLE public.appointment_reminders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL DEFAULT '24h' CHECK (reminder_type IN ('24h', '2h', '1h')),
    notification_method TEXT NOT NULL DEFAULT 'email' CHECK (notification_method IN ('email', 'sms', 'both')),
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying of pending reminders
CREATE INDEX idx_appointment_reminders_pending ON public.appointment_reminders(status, scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_appointment_reminders_appointment ON public.appointment_reminders(appointment_id);

-- Enable RLS
ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies: Only business members can view/manage reminders for their appointments
CREATE POLICY "Business members can view appointment reminders"
ON public.appointment_reminders
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.appointments a
        JOIN public.business_members bm ON bm.business_id = a.business_id
        JOIN public.profiles p ON p.id = bm.profile_id
        WHERE a.id = appointment_reminders.appointment_id
        AND p.user_id = auth.uid()
    )
);

CREATE POLICY "Business members can insert appointment reminders"
ON public.appointment_reminders
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.appointments a
        JOIN public.business_members bm ON bm.business_id = a.business_id
        JOIN public.profiles p ON p.id = bm.profile_id
        WHERE a.id = appointment_id
        AND p.user_id = auth.uid()
    )
);

CREATE POLICY "Business members can update appointment reminders"
ON public.appointment_reminders
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.appointments a
        JOIN public.business_members bm ON bm.business_id = a.business_id
        JOIN public.profiles p ON p.id = bm.profile_id
        WHERE a.id = appointment_reminders.appointment_id
        AND p.user_id = auth.uid()
    )
);

-- Service role can manage all reminders (for edge functions)
CREATE POLICY "Service role can manage all reminders"
ON public.appointment_reminders
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- Trigger to update updated_at
CREATE TRIGGER update_appointment_reminders_updated_at
    BEFORE UPDATE ON public.appointment_reminders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically schedule reminders when appointment is created
CREATE OR REPLACE FUNCTION public.schedule_appointment_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reminder_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Only schedule for confirmed or pending appointments
    IF NEW.status IN ('confirmed', 'pending') THEN
        -- Calculate 24 hours before appointment
        v_reminder_time := NEW.appointment_date - INTERVAL '24 hours';
        
        -- Only schedule if reminder time is in the future
        IF v_reminder_time > now() THEN
            INSERT INTO public.appointment_reminders (
                appointment_id,
                reminder_type,
                notification_method,
                scheduled_for,
                status
            ) VALUES (
                NEW.id,
                '24h',
                'email',
                v_reminder_time,
                'pending'
            )
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger to schedule reminders on appointment insert
CREATE TRIGGER trigger_schedule_appointment_reminders
    AFTER INSERT ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.schedule_appointment_reminders();

-- Function to cancel reminders when appointment is cancelled
CREATE OR REPLACE FUNCTION public.cancel_appointment_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        UPDATE public.appointment_reminders
        SET status = 'cancelled', updated_at = now()
        WHERE appointment_id = NEW.id AND status = 'pending';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger to cancel reminders when appointment is cancelled
CREATE TRIGGER trigger_cancel_appointment_reminders
    AFTER UPDATE ON public.appointments
    FOR EACH ROW
    WHEN (NEW.status = 'cancelled' AND OLD.status != 'cancelled')
    EXECUTE FUNCTION public.cancel_appointment_reminders();