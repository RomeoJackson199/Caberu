-- Fix generate_daily_slots to not overwrite booked slots
CREATE OR REPLACE FUNCTION public.generate_daily_slots(p_dentist_id uuid, p_date date, p_business_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_day_of_week INT;
  v_start_time TIME;
  v_end_time TIME;
  v_break_start TIME;
  v_break_end TIME;
  v_is_available BOOLEAN;
  v_slot_duration INT := 30;
  v_current_time TIME;
  v_availability_updated TIMESTAMPTZ;
  v_slots_created TIMESTAMPTZ;
  v_resolved_business_id uuid;
BEGIN
  -- Get exclusive advisory lock for this dentist+date combination
  IF NOT pg_try_advisory_xact_lock(
    hashtext(p_dentist_id::text || p_date::text)
  ) THEN
    RETURN;
  END IF;

  -- Resolve business_id if not provided
  v_resolved_business_id := COALESCE(p_business_id, (
    SELECT bm.business_id FROM business_members bm
    JOIN dentists d ON d.profile_id = bm.profile_id
    WHERE d.id = p_dentist_id
    LIMIT 1
  ));

  -- Get day of week (0=Sunday, 1=Monday, etc.)
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Get dentist availability for this day (including is_available status)
  SELECT start_time, end_time, break_start_time, break_end_time, is_available, updated_at
  INTO v_start_time, v_end_time, v_break_start, v_break_end, v_is_available, v_availability_updated
  FROM dentist_availability
  WHERE dentist_id = p_dentist_id
  AND day_of_week = v_day_of_week
  AND (p_business_id IS NULL OR business_id = p_business_id)
  ORDER BY updated_at DESC
  LIMIT 1;
  
  -- If day is explicitly marked as not available, delete any existing slots and return
  IF v_is_available = false THEN
    DELETE FROM appointment_slots 
    WHERE dentist_id = p_dentist_id 
    AND slot_date = p_date
    AND (p_business_id IS NULL OR business_id = p_business_id)
    AND appointment_id IS NULL; -- Only delete unbooked slots
    RETURN;
  END IF;
  
  -- If no availability record found at all, check if it's a vacation day
  IF v_start_time IS NULL THEN
    -- Check for vacation
    IF EXISTS (
      SELECT 1 FROM dentist_vacation_days
      WHERE dentist_id = p_dentist_id
      AND p_date BETWEEN start_date AND end_date
      AND is_approved = true
    ) THEN
      DELETE FROM appointment_slots 
      WHERE dentist_id = p_dentist_id 
      AND slot_date = p_date
      AND appointment_id IS NULL;
      RETURN;
    END IF;
    
    -- Default: weekdays only, 9-5
    IF v_day_of_week IN (0, 6) THEN
      -- Weekend - no slots by default
      RETURN;
    END IF;
    v_start_time := '09:00:00'::TIME;
    v_end_time := '17:00:00'::TIME;
    v_is_available := true;
  END IF;
  
  -- Check if slots exist and if availability was updated after slots were created
  SELECT MIN(created_at) INTO v_slots_created
  FROM appointment_slots 
  WHERE dentist_id = p_dentist_id 
  AND slot_date = p_date 
  AND (p_business_id IS NULL OR business_id = p_business_id);
  
  -- If slots exist and availability was updated after, regenerate
  IF v_slots_created IS NOT NULL THEN
    IF v_availability_updated IS NOT NULL AND v_availability_updated > v_slots_created THEN
      -- Delete unbooked slots to regenerate
      DELETE FROM appointment_slots 
      WHERE dentist_id = p_dentist_id 
      AND slot_date = p_date 
      AND (p_business_id IS NULL OR business_id = p_business_id)
      AND appointment_id IS NULL;
    ELSE
      -- Slots exist and haven't changed, skip
      RETURN;
    END IF;
  END IF;
  
  -- Generate slots
  v_current_time := v_start_time;
  WHILE v_current_time < v_end_time LOOP
    -- Skip break time
    IF v_break_start IS NOT NULL AND v_break_end IS NOT NULL THEN
      IF v_current_time >= v_break_start AND v_current_time < v_break_end THEN
        v_current_time := v_current_time + (v_slot_duration || ' minutes')::INTERVAL;
        CONTINUE;
      END IF;
    END IF;
    
    -- Insert new slot only if it doesn't exist
    -- If slot exists with appointment_id, don't touch it
    INSERT INTO appointment_slots (dentist_id, business_id, slot_date, slot_time, is_available)
    VALUES (
      p_dentist_id, 
      v_resolved_business_id,
      p_date, 
      v_current_time, 
      true
    )
    ON CONFLICT (dentist_id, slot_date, slot_time) DO UPDATE
    SET 
      -- Only update is_available if slot has no appointment
      is_available = CASE 
        WHEN appointment_slots.appointment_id IS NOT NULL THEN false
        ELSE true
      END,
      updated_at = now()
    WHERE appointment_slots.appointment_id IS NULL;  -- Only update unbooked slots
    
    v_current_time := v_current_time + (v_slot_duration || ' minutes')::INTERVAL;
  END LOOP;
END;
$function$;