-- Add unique constraint for appointment slots and fix function security
ALTER TABLE public.appointment_slots 
ADD CONSTRAINT unique_dentist_slot 
UNIQUE (dentist_id, slot_date, slot_time);

-- Update the function with proper security definer
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
    INSERT INTO public.appointment_slots (dentist_id, slot_date, slot_time)
    VALUES (p_dentist_id, p_date, current_slot_time)
    ON CONFLICT (dentist_id, slot_date, slot_time) DO NOTHING;
    
    -- Add 30 minutes to the current slot time
    current_slot_time := current_slot_time + (interval_minutes || ' minutes')::INTERVAL;
  END LOOP;
END;
$function$;