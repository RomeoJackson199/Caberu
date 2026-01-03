-- Migration: Fix double-booking race condition with row locking
-- Priority 1 Critical Security Fix #1
-- Date: 2025-12-10

-- ============================================
-- 1. Update book_appointment_slot with row locking
-- ============================================
DROP FUNCTION IF EXISTS book_appointment_slot(UUID, DATE, TIME, UUID);

CREATE OR REPLACE FUNCTION book_appointment_slot(
  p_dentist_id UUID,
  p_slot_date DATE,
  p_slot_time TIME,
  p_appointment_id UUID
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INT;
  v_locked_slot RECORD;
BEGIN
  -- CRITICAL: Use SELECT FOR UPDATE NOWAIT to lock the row
  -- This prevents double-booking race conditions
  SELECT * INTO v_locked_slot
  FROM public.appointment_slots
  WHERE dentist_id = p_dentist_id
    AND slot_date = p_slot_date
    AND slot_time = p_slot_time
  FOR UPDATE NOWAIT;
  
  -- Check if slot exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment slot not found';
  END IF;
  
  -- Check if still available after acquiring lock
  IF NOT v_locked_slot.is_available THEN
    RAISE EXCEPTION 'Slot already booked by another user';
  END IF;
  
  -- Now safe to update (we have exclusive lock)
  UPDATE public.appointment_slots
  SET is_available = false,
      appointment_id = p_appointment_id,
      updated_at = NOW()
  WHERE dentist_id = p_dentist_id
    AND slot_date = p_slot_date
    AND slot_time = p_slot_time;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  IF v_updated = 1 THEN
    RETURN true;
  ELSE
    RAISE EXCEPTION 'Slot booking failed unexpectedly';
  END IF;
  
EXCEPTION
  WHEN lock_not_available THEN
    RAISE EXCEPTION 'Slot is being booked by another user. Please try another time.';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Booking error: %', SQLERRM;
END;
$$;

-- ============================================
-- 2. Update generate_daily_slots with advisory lock
-- ============================================
DROP FUNCTION IF EXISTS generate_daily_slots(UUID, DATE, UUID);

CREATE OR REPLACE FUNCTION generate_daily_slots(
  p_dentist_id UUID,
  p_date DATE,
  p_business_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_of_week INT;
  v_start_time TIME;
  v_end_time TIME;
  v_slot_duration INT := 30;
  v_current_time TIME;
BEGIN
  -- Get exclusive advisory lock for this dentist+date combination
  -- Prevents concurrent generation causing race conditions
  IF NOT pg_try_advisory_xact_lock(
    hashtext(p_dentist_id::text || p_date::text)
  ) THEN
    -- Another process is generating, skip to avoid conflicts
    RETURN;
  END IF;

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
  
  -- Get dentist availability for this day
  SELECT start_time, end_time INTO v_start_time, v_end_time
  FROM dentist_availability
  WHERE dentist_id = p_dentist_id
  AND business_id = p_business_id
  AND day_of_week = v_day_of_week
  AND is_available = true
  LIMIT 1;
  
  -- If no availability found, use default 9-5
  IF v_start_time IS NULL THEN
    v_start_time := '09:00:00'::TIME;
    v_end_time := '17:00:00'::TIME;
  END IF;
  
  -- Generate slots
  v_current_time := v_start_time;
  WHILE v_current_time < v_end_time LOOP
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
    
    v_current_time := v_current_time + (v_slot_duration || ' minutes')::INTERVAL;
  END LOOP;
END;
$$;

-- ============================================
-- 3. Grant execute permissions
-- ============================================
GRANT EXECUTE ON FUNCTION book_appointment_slot(UUID, DATE, TIME, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_daily_slots(UUID, DATE, UUID) TO authenticated;
