-- =====================================================
-- ISSUE #1 FIX: DOUBLE-BOOKING RACE CONDITION
-- Adds row-level locking to prevent concurrent bookings
-- =====================================================

-- Drop ALL existing overloaded versions of the function
DROP FUNCTION IF EXISTS public.book_appointment_slot(uuid, date, text, uuid);
DROP FUNCTION IF EXISTS public.book_appointment_slot(uuid, date, text, uuid, timestamptz);
DROP FUNCTION IF EXISTS public.book_appointment_slot(uuid, date, time, uuid);
DROP FUNCTION IF EXISTS public.book_appointment_slot;

-- Create new function with SELECT FOR UPDATE locking
CREATE OR REPLACE FUNCTION public.book_appointment_slot(
  p_dentist_id uuid,
  p_slot_date date,
  p_slot_time text,
  p_appointment_id uuid
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
  -- CRITICAL: Use SELECT FOR UPDATE to lock the row
  -- NOWAIT means fail immediately if row is locked by another transaction
  SELECT * INTO v_locked_slot
  FROM public.appointment_slots
  WHERE dentist_id = p_dentist_id
    AND slot_date = p_slot_date
    AND slot_time = p_slot_time::time
  FOR UPDATE NOWAIT;
  
  -- Check if slot was found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slot not found for the specified time';
  END IF;
  
  -- Check if still available after acquiring lock
  IF NOT v_locked_slot.is_available THEN
    RAISE EXCEPTION 'This time slot has already been booked by another user. Please select a different time.';
  END IF;
  
  -- Now safe to update (we have exclusive lock)
  UPDATE public.appointment_slots
  SET is_available = false,
      appointment_id = p_appointment_id,
      updated_at = now()
  WHERE id = v_locked_slot.id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  IF v_updated = 1 THEN
    -- Log successful booking for audit
    INSERT INTO public.audit_logs (action, table_name, record_id, changes)
    VALUES ('create', 'appointment_slots', v_locked_slot.id, jsonb_build_object(
      'appointment_id', p_appointment_id,
      'slot_date', p_slot_date,
      'slot_time', p_slot_time,
      'operation', 'book_slot'
    ));
    
    RETURN true;
  ELSE
    RAISE EXCEPTION 'Slot booking failed unexpectedly';
  END IF;
  
EXCEPTION
  WHEN lock_not_available THEN
    -- Another transaction has the lock - slot is being booked
    RAISE EXCEPTION 'This slot is currently being booked by another user. Please try again or select a different time.';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Booking error: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.book_appointment_slot(uuid, date, text, uuid) TO authenticated;

COMMENT ON FUNCTION public.book_appointment_slot IS 'Books an appointment slot with row-level locking to prevent double-booking race conditions';

-- =====================================================
-- Also add advisory lock to slot generation
-- Prevents concurrent generation causing race conditions
-- =====================================================

-- Add overload function that handles generation locking
CREATE OR REPLACE FUNCTION public.generate_appointment_slots_safe(
  p_dentist_id uuid,
  p_date date,
  p_business_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Get exclusive advisory lock for this dentist+date combination
  -- hashtext creates a unique integer hash for the lock key
  IF NOT pg_try_advisory_xact_lock(
    hashtext(p_dentist_id::text || p_date::text)
  ) THEN
    -- Another process is generating slots for this dentist+date
    -- Skip to avoid duplicate generation
    RAISE NOTICE 'Slot generation already in progress for dentist % on %', p_dentist_id, p_date;
    RETURN;
  END IF;
  
  -- Check if slots already generated for this date
  IF EXISTS (
    SELECT 1 FROM public.appointment_slots 
    WHERE dentist_id = p_dentist_id 
    AND slot_date = p_date 
    LIMIT 1
  ) THEN
    RAISE NOTICE 'Slots already exist for dentist % on %', p_dentist_id, p_date;
    RETURN;
  END IF;
  
  -- Call the existing slot generation function
  -- This will run within our advisory lock protection
  PERFORM public.generate_daily_slots(p_dentist_id, p_date, p_business_id);
  
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_appointment_slots_safe(uuid, date, uuid) TO authenticated;

COMMENT ON FUNCTION public.generate_appointment_slots_safe IS 'Safe slot generation with advisory locking to prevent race conditions';

-- =====================================================
-- Add function to release a booked slot (for cancellations)
-- Also uses locking for safety
-- =====================================================
DROP FUNCTION IF EXISTS public.release_appointment_slot(uuid);

CREATE OR REPLACE FUNCTION public.release_appointment_slot(
  p_appointment_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INT;
  v_slot RECORD;
BEGIN
  -- Lock the slot row
  SELECT * INTO v_slot
  FROM public.appointment_slots
  WHERE appointment_id = p_appointment_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    -- No slot found - might be already released
    RETURN false;
  END IF;
  
  -- Release the slot
  UPDATE public.appointment_slots
  SET is_available = true,
      appointment_id = NULL,
      updated_at = now()
  WHERE id = v_slot.id;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  IF v_updated = 1 THEN
    -- Log for audit
    INSERT INTO public.audit_logs (action, table_name, record_id, changes)
    VALUES ('update', 'appointment_slots', v_slot.id, jsonb_build_object(
      'released_appointment_id', p_appointment_id,
      'operation', 'release_slot'
    ));
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_appointment_slot(uuid) TO authenticated;

COMMENT ON FUNCTION public.release_appointment_slot IS 'Releases a booked appointment slot with proper locking';
