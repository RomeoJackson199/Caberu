-- Fix the generate_daily_slots function to include earlier hours
CREATE OR REPLACE FUNCTION public.generate_daily_slots(p_dentist_id uuid, p_date date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  current_slot_time TIME;
  start_time TIME := '07:00';  -- Start earlier
  end_time TIME := '17:00';
  interval_minutes INTEGER := 30;
BEGIN
  -- Generate slots from 7:00 AM to 5:00 PM (every 30 minutes)
  current_slot_time := start_time;
  
  WHILE current_slot_time < end_time LOOP
    INSERT INTO public.appointment_slots (dentist_id, slot_date, slot_time, emergency_only)
    VALUES (
      p_dentist_id, 
      p_date, 
      current_slot_time,
      CASE WHEN current_slot_time >= '11:30:00' THEN true ELSE false END
    )
    ON CONFLICT (dentist_id, slot_date, slot_time) DO NOTHING;
    
    -- Add 30 minutes to the current slot time
    current_slot_time := current_slot_time + (interval_minutes || ' minutes')::INTERVAL;
  END LOOP;
END;
$function$;

-- Clean up existing problematic data
DELETE FROM appointment_slots WHERE slot_date = '2025-07-11';

-- Regenerate slots for the problematic date
SELECT generate_daily_slots('46067bae-18f6-4769-b8e4-be48cc18d273', '2025-07-11');

-- Now properly book the existing pending appointments by updating slots
UPDATE appointment_slots 
SET 
  is_available = false,
  appointment_id = (
    SELECT id FROM appointments 
    WHERE dentist_id = '46067bae-18f6-4769-b8e4-be48cc18d273' 
    AND appointment_date::date = '2025-07-11'
    AND appointment_date::time = '07:00:00'
    AND status = 'pending'
    LIMIT 1
  ),
  updated_at = now()
WHERE 
  dentist_id = '46067bae-18f6-4769-b8e4-be48cc18d273' 
  AND slot_date = '2025-07-11' 
  AND slot_time = '07:00:00'
  AND is_available = true;

-- Create calendar events for the existing pending appointments
INSERT INTO calendar_events (
  dentist_id,
  appointment_id, 
  title,
  description,
  start_datetime,
  end_datetime,
  event_type
)
SELECT 
  a.dentist_id,
  a.id,
  'Rendez-vous - ' || COALESCE(a.reason, 'Consultation générale'),
  'Patient ID: ' || a.patient_id || CASE WHEN a.reason IS NOT NULL THEN E'\nMotif: ' || a.reason ELSE '' END,
  a.appointment_date,
  a.appointment_date + INTERVAL '1 hour',
  'appointment'
FROM appointments a
WHERE a.status = 'pending'
  AND NOT EXISTS (
    SELECT 1 FROM calendar_events ce 
    WHERE ce.appointment_id = a.id
  );