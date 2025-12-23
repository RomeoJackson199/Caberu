-- Create a function to book multiple consecutive slots based on appointment duration
CREATE OR REPLACE FUNCTION public.book_appointment_slots_for_duration(
  p_dentist_id uuid,
  p_slot_date date,
  p_start_time time,
  p_duration_minutes integer,
  p_appointment_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_slot_duration_minutes integer := 30; -- Base slot duration
  v_slots_needed integer;
  v_current_time time;
  v_slots_booked integer := 0;
  v_slot RECORD;
BEGIN
  -- Calculate how many slots we need
  v_slots_needed := GREATEST(1, CEIL(p_duration_minutes::decimal / v_slot_duration_minutes));
  
  -- Lock all required slots first to prevent race conditions
  FOR i IN 0..(v_slots_needed - 1) LOOP
    v_current_time := p_start_time + (i * INTERVAL '30 minutes');
    
    -- Try to lock each slot
    SELECT * INTO v_slot
    FROM public.appointment_slots
    WHERE dentist_id = p_dentist_id
      AND slot_date = p_slot_date
      AND slot_time = v_current_time
    FOR UPDATE NOWAIT;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Slot not found for time %', v_current_time;
    END IF;
    
    IF NOT v_slot.is_available THEN
      RAISE EXCEPTION 'Slot at % is no longer available', v_current_time;
    END IF;
  END LOOP;
  
  -- All slots are available and locked, now book them all
  FOR i IN 0..(v_slots_needed - 1) LOOP
    v_current_time := p_start_time + (i * INTERVAL '30 minutes');
    
    UPDATE public.appointment_slots
    SET is_available = false,
        appointment_id = p_appointment_id,
        updated_at = now()
    WHERE dentist_id = p_dentist_id
      AND slot_date = p_slot_date
      AND slot_time = v_current_time;
    
    v_slots_booked := v_slots_booked + 1;
  END LOOP;
  
  -- Log the booking
  INSERT INTO public.audit_logs (action, table_name, record_id, changes)
  VALUES ('create', 'appointment_slots', p_appointment_id, jsonb_build_object(
    'appointment_id', p_appointment_id,
    'slot_date', p_slot_date,
    'start_time', p_start_time,
    'duration_minutes', p_duration_minutes,
    'slots_booked', v_slots_booked,
    'operation', 'book_duration_slots'
  ));
  
  RETURN true;
  
EXCEPTION
  WHEN lock_not_available THEN
    RAISE EXCEPTION 'One or more slots are being booked by another user. Please try again.';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Booking error: %', SQLERRM;
END;
$$;

-- Create a function to release all slots for an appointment
CREATE OR REPLACE FUNCTION public.release_appointment_slots(p_appointment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.appointment_slots
  SET is_available = true,
      appointment_id = NULL,
      updated_at = now()
  WHERE appointment_id = p_appointment_id;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  IF v_updated > 0 THEN
    INSERT INTO public.audit_logs (action, table_name, record_id, changes)
    VALUES ('update', 'appointment_slots', p_appointment_id, jsonb_build_object(
      'released_appointment_id', p_appointment_id,
      'slots_released', v_updated,
      'operation', 'release_slots'
    ));
  END IF;
  
  RETURN v_updated > 0;
END;
$$;