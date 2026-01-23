-- Migration: Fix slot generation to exclude lunch breaks and improve reschedule locking
-- Date: 2026-01-23

-- ============================================
-- 1. Fix generate_daily_slots to exclude lunch breaks
-- ============================================
CREATE OR REPLACE FUNCTION generate_daily_slots(
  p_dentist_id UUID,
  p_date DATE,
  p_business_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_day_of_week INT;
  v_start_time TIME;
  v_end_time TIME;
  v_break_start TIME;
  v_break_end TIME;
  v_slot_duration INT := 30; -- 30 minute slots
  v_current_time TIME;
  v_is_in_break BOOLEAN;
BEGIN
  -- Get day of week (0=Sunday, 1=Monday, etc.)
  v_day_of_week := EXTRACT(DOW FROM p_date);

  -- Check if slots already exist for this date
  IF EXISTS (
    SELECT 1 FROM appointment_slots
    WHERE dentist_id = p_dentist_id
    AND slot_date = p_date
    AND business_id = p_business_id
    LIMIT 1
  ) THEN
    RETURN; -- Slots already generated
  END IF;

  -- Get dentist availability for this day (including break times)
  SELECT start_time, end_time, break_start_time, break_end_time
  INTO v_start_time, v_end_time, v_break_start, v_break_end
  FROM dentist_availability
  WHERE dentist_id = p_dentist_id
  AND business_id = p_business_id
  AND day_of_week = v_day_of_week
  AND is_available = true
  LIMIT 1;

  -- If no availability found, use default 9-5 with 12-13 lunch break
  IF v_start_time IS NULL THEN
    v_start_time := '09:00:00'::TIME;
    v_end_time := '17:00:00'::TIME;
    v_break_start := '12:00:00'::TIME;
    v_break_end := '13:00:00'::TIME;
  END IF;

  -- Generate slots, excluding break times
  v_current_time := v_start_time;
  WHILE v_current_time < v_end_time LOOP
    -- Check if current time falls within break period
    v_is_in_break := false;
    IF v_break_start IS NOT NULL AND v_break_end IS NOT NULL THEN
      -- A slot is in break if it starts during break time
      IF v_current_time >= v_break_start AND v_current_time < v_break_end THEN
        v_is_in_break := true;
      END IF;
    END IF;

    -- Only insert slot if not in break time
    IF NOT v_is_in_break THEN
      -- Check if slot is already booked via appointments table
      INSERT INTO appointment_slots (dentist_id, business_id, slot_date, slot_time, is_available)
      VALUES (p_dentist_id, p_business_id, p_date, v_current_time,
        NOT EXISTS (
          SELECT 1 FROM appointments
          WHERE dentist_id = p_dentist_id
          AND DATE(appointment_date) = p_date
          AND appointment_date::TIME = v_current_time
          AND status NOT IN ('cancelled', 'no_show')
        )
      )
      ON CONFLICT (dentist_id, slot_date, slot_time) DO NOTHING;
    END IF;

    v_current_time := v_current_time + (v_slot_duration || ' minutes')::INTERVAL;
  END LOOP;
END;
$$;

-- ============================================
-- 2. Fix reschedule_appointment to use NOWAIT for better concurrency
-- ============================================
CREATE OR REPLACE FUNCTION public.reschedule_appointment(
  p_appointment_id uuid,
  p_user_id uuid,
  p_slot_date date,
  p_slot_time text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_patient_id uuid;
  v_dentist_id uuid;
  v_business_id uuid;
BEGIN
  -- Authorize: ensure the caller owns this appointment via profiles.user_id
  -- Use NOWAIT to fail immediately if row is locked (prevents user hanging)
  SELECT a.patient_id, a.dentist_id, a.business_id
    INTO v_patient_id, v_dentist_id, v_business_id
  FROM public.appointments a
  JOIN public.profiles p ON p.id = a.patient_id
  WHERE a.id = p_appointment_id
    AND p.user_id = p_user_id
  FOR UPDATE NOWAIT;  -- Changed from FOR UPDATE to FOR UPDATE NOWAIT

  IF v_patient_id IS NULL THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Release any previously held slot for this appointment
  UPDATE public.appointment_slots
     SET is_available = true,
         appointment_id = NULL,
         updated_at = now()
   WHERE appointment_id = p_appointment_id;

  -- Ensure target slot exists and is available, lock it to avoid race
  -- Use NOWAIT to fail immediately if slot is being booked by another user
  PERFORM 1
    FROM public.appointment_slots
   WHERE dentist_id = v_dentist_id
     AND slot_date = p_slot_date
     AND slot_time = p_slot_time::TIME
     AND is_available = true
   FOR UPDATE NOWAIT;  -- Changed from FOR UPDATE to FOR UPDATE NOWAIT

  IF NOT FOUND THEN
    RAISE EXCEPTION 'slot_unavailable';
  END IF;

  -- Reserve the new slot for this appointment
  UPDATE public.appointment_slots
     SET is_available = false,
         appointment_id = p_appointment_id,
         updated_at = now()
   WHERE dentist_id = v_dentist_id
     AND slot_date = p_slot_date
     AND slot_time = p_slot_time::TIME;

  -- Update appointment datetime and status
  -- Use proper timezone conversion for Europe/Brussels
  UPDATE public.appointments
     SET appointment_date = (p_slot_date::timestamp + p_slot_time::TIME) AT TIME ZONE 'Europe/Brussels' AT TIME ZONE 'UTC',
         status = 'confirmed',
         updated_at = now()
   WHERE id = p_appointment_id;

  RETURN true;
EXCEPTION
  WHEN lock_not_available THEN
    -- Another transaction has this row locked
    RAISE EXCEPTION 'slot_being_booked';
END;
$$;

-- ============================================
-- 3. Add function to regenerate slots for a specific date (useful when availability changes)
-- ============================================
CREATE OR REPLACE FUNCTION regenerate_daily_slots(
  p_dentist_id UUID,
  p_date DATE,
  p_business_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete existing unbooked slots for this date
  DELETE FROM appointment_slots
  WHERE dentist_id = p_dentist_id
    AND slot_date = p_date
    AND business_id = p_business_id
    AND is_available = true
    AND appointment_id IS NULL;

  -- Regenerate slots (will skip if any slots exist due to ON CONFLICT)
  -- We need to force regeneration, so temporarily mark as non-existent
  -- Actually, let's just delete all unbooked and regenerate

  -- Now call generate to create new slots
  PERFORM generate_daily_slots(p_dentist_id, p_date, p_business_id);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION regenerate_daily_slots(UUID, DATE, UUID) TO authenticated;
