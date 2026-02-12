
-- Fix timezone mismatch in get_available_slots: convert appointment timestamps to Europe/Brussels before comparing
CREATE OR REPLACE FUNCTION public.get_available_slots(p_dentist_id uuid, p_date date, p_service_id uuid, p_business_id uuid, p_slot_interval_minutes integer DEFAULT NULL::integer)
 RETURNS TABLE(slot_start time without time zone, slot_end time without time zone, duration_minutes integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_duration integer;
  v_interval integer;
  v_day_of_week integer;
  v_avail_start time;
  v_avail_end time;
  v_break_start time;
  v_break_end time;
  v_is_available boolean;
  v_override record;
  v_candidate time;
  v_candidate_end time;
BEGIN
  -- 1. Get service duration (check dentist override first, then business default)
  SELECT COALESCE(ds.custom_duration_minutes, bs.duration_minutes)
  INTO v_duration
  FROM business_services bs
  LEFT JOIN dentist_services ds 
    ON ds.service_id = bs.id 
    AND ds.dentist_id = p_dentist_id 
    AND ds.is_active = true
  WHERE bs.id = p_service_id;
  
  IF v_duration IS NULL THEN
    RETURN;
  END IF;

  -- Default interval = service duration (no overlapping slots)
  v_interval := COALESCE(p_slot_interval_minutes, v_duration);

  -- 2. Check for date override first
  SELECT dto.start_time, dto.end_time, dto.break_start_time, dto.break_end_time, dto.is_available
  INTO v_override
  FROM dentist_date_overrides dto
  WHERE dto.dentist_id = p_dentist_id
    AND dto.business_id = p_business_id
    AND dto.override_date = p_date
  LIMIT 1;

  IF v_override IS NOT NULL THEN
    IF v_override.is_available = false THEN
      RETURN;
    END IF;
    v_avail_start := v_override.start_time;
    v_avail_end := v_override.end_time;
    v_break_start := v_override.break_start_time;
    v_break_end := v_override.break_end_time;
  ELSE
    -- 3. Check vacation days
    IF EXISTS (
      SELECT 1 FROM dentist_vacation_days dv
      WHERE dv.dentist_id = p_dentist_id
        AND dv.business_id = p_business_id
        AND p_date BETWEEN dv.start_date AND dv.end_date
        AND dv.is_approved = true
    ) THEN
      RETURN;
    END IF;

    -- 4. Get weekly availability
    v_day_of_week := EXTRACT(DOW FROM p_date)::integer;
    
    SELECT da.start_time, da.end_time, da.break_start_time, da.break_end_time, da.is_available
    INTO v_avail_start, v_avail_end, v_break_start, v_break_end, v_is_available
    FROM dentist_availability da
    WHERE da.dentist_id = p_dentist_id
      AND da.business_id = p_business_id
      AND da.day_of_week = v_day_of_week
    LIMIT 1;

    IF v_avail_start IS NULL OR v_is_available = false THEN
      RETURN;
    END IF;
  END IF;

  -- 5. Generate candidate slots and check for conflicts
  v_candidate := v_avail_start;
  
  WHILE v_candidate + make_interval(mins => v_duration) <= v_avail_end LOOP
    v_candidate_end := v_candidate + make_interval(mins => v_duration);
    
    -- Skip if slot overlaps with break
    IF v_break_start IS NOT NULL AND v_break_end IS NOT NULL THEN
      IF NOT (v_candidate_end <= v_break_start OR v_candidate >= v_break_end) THEN
        v_candidate := v_candidate + make_interval(mins => v_interval);
        CONTINUE;
      END IF;
    END IF;
    
    -- Check for existing appointment conflicts
    -- FIX: Convert appointment timestamps to Europe/Brussels timezone before comparing
    -- Availability times are in local Brussels time, so appointments must be compared in the same timezone
    IF NOT EXISTS (
      SELECT 1 FROM appointments apt
      WHERE apt.dentist_id = p_dentist_id
        AND apt.business_id = p_business_id
        AND apt.status NOT IN ('cancelled', 'no_show')
        AND (apt.appointment_date AT TIME ZONE 'Europe/Brussels')::date = p_date
        AND (apt.appointment_date AT TIME ZONE 'Europe/Brussels')::time < v_candidate_end
        AND ((apt.appointment_date AT TIME ZONE 'Europe/Brussels') + make_interval(mins => COALESCE(apt.duration_minutes, 30)))::time > v_candidate
    ) THEN
      slot_start := v_candidate;
      slot_end := v_candidate_end;
      duration_minutes := v_duration;
      RETURN NEXT;
    END IF;
    
    v_candidate := v_candidate + make_interval(mins => v_interval);
  END LOOP;
END;
$function$;

-- Also fix get_dentist_available_slots to check duration overlaps, not just exact time matches
CREATE OR REPLACE FUNCTION public.get_dentist_available_slots(p_dentist_id uuid, p_date date, p_business_id uuid)
 RETURNS TABLE(slot_time time without time zone, is_available boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if date is a vacation day first
  IF EXISTS (
    SELECT 1 FROM dentist_vacation_days
    WHERE dentist_id = p_dentist_id
    AND (business_id = p_business_id OR business_id IS NULL)
    AND p_date BETWEEN start_date AND end_date
    LIMIT 1
  ) THEN
    RETURN;
  END IF;

  -- First ensure slots are generated
  PERFORM generate_daily_slots(p_dentist_id, p_date, p_business_id);

  -- Return slots, cross-checking with appointments table using timezone-aware overlap detection
  RETURN QUERY
  SELECT
    s.slot_time,
    s.is_available AND NOT EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.dentist_id = p_dentist_id
      AND (a.appointment_date AT TIME ZONE 'Europe/Brussels')::date = p_date
      AND a.status NOT IN ('cancelled', 'no_show')
      -- Check if appointment overlaps with this 30-min slot window
      AND (a.appointment_date AT TIME ZONE 'Europe/Brussels')::time < s.slot_time + interval '30 minutes'
      AND ((a.appointment_date AT TIME ZONE 'Europe/Brussels') + make_interval(mins => COALESCE(a.duration_minutes, 30)))::time > s.slot_time
    ) AS is_available
  FROM appointment_slots s
  WHERE s.dentist_id = p_dentist_id
  AND s.slot_date = p_date
  AND s.business_id = p_business_id
  ORDER BY s.slot_time;
END;
$function$;
