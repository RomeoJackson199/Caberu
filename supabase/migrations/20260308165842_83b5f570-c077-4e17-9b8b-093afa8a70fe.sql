CREATE OR REPLACE FUNCTION public.cancel_appointment(appointment_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update appointment status to cancelled
  UPDATE appointments SET status = 'cancelled', updated_at = now()
  WHERE id = appointment_id 
  AND patient_id IN (
    SELECT id FROM profiles WHERE profiles.user_id = cancel_appointment.user_id
  );

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Release all slots held by this appointment
  UPDATE public.appointment_slots
  SET is_available = true,
      appointment_id = NULL,
      updated_at = now()
  WHERE appointment_slots.appointment_id = cancel_appointment.appointment_id;

  -- Audit log
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, changes)
  VALUES (
    cancel_appointment.user_id,
    'cancel',
    'appointments',
    cancel_appointment.appointment_id::text,
    jsonb_build_object('operation', 'cancel_appointment', 'slots_released', true)
  );

  RETURN true;
END;
$$;