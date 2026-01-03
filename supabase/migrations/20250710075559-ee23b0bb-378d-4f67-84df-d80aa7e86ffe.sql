-- Add emergency support to appointment slots
ALTER TABLE appointment_slots 
ADD COLUMN emergency_only BOOLEAN DEFAULT false;

-- Update existing slots: mark 11:30 and later as emergency only
UPDATE appointment_slots 
SET emergency_only = true 
WHERE slot_time >= '11:30:00';

-- Update the generate_daily_slots function to include emergency slots
CREATE OR REPLACE FUNCTION public.generate_daily_slots(p_dentist_id uuid, p_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  current_slot_time TIME;
  start_time TIME := '09:00';
  end_time TIME := '17:00';
  interval_minutes INTEGER := 30;
BEGIN
  -- Generate slots from 9:00 AM to 5:00 PM (every 30 minutes)
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