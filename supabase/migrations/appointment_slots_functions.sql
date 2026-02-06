-- Migration: Create appointment slot management functions
-- These functions are required for the booking system to work

-- ============================================
-- 1. Create appointment_slots table if not exists
-- ============================================
CREATE TABLE IF NOT EXISTS appointment_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id UUID NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dentist_id, slot_date, slot_time)
);

-- Enable RLS
ALTER TABLE appointment_slots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Users can view slots for their business" ON appointment_slots;
DROP POLICY IF EXISTS "Staff can manage slots" ON appointment_slots;

-- RLS policies
-- Users can only view slots for businesses they are a member of
CREATE POLICY "Users can view slots for their business" ON appointment_slots
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage slots" ON appointment_slots
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_members 
      WHERE profile_id = auth.uid() AND role IN ('owner', 'admin', 'dentist')
    )
  );

-- ============================================
-- 2. Drop existing functions to allow signature changes
-- ============================================
DROP FUNCTION IF EXISTS generate_daily_slots(UUID, DATE, UUID);
DROP FUNCTION IF EXISTS get_dentist_available_slots(UUID, DATE, UUID);
-- Drop all possible overloads of book_appointment_slot
DROP FUNCTION IF EXISTS book_appointment_slot(UUID, DATE, TIME, UUID);
DROP FUNCTION IF EXISTS book_appointment_slot(UUID, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS book_appointment_slot(UUID, DATE, TEXT, UUID);
DROP FUNCTION IF EXISTS book_appointment_slot(p_dentist_id UUID, p_slot_date DATE, p_slot_time TIME, p_appointment_id UUID);

-- ============================================
-- 3. Generate daily slots function
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
  v_slot_duration INT := 30; -- 30 minute slots
  v_current_time TIME;
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
    
    v_current_time := v_current_time + (v_slot_duration || ' minutes')::INTERVAL;
  END LOOP;
END;
$$;

-- ============================================
-- 4. Get available slots function
-- ============================================
CREATE OR REPLACE FUNCTION get_dentist_available_slots(
  p_dentist_id UUID,
  p_date DATE,
  p_business_id UUID
)
RETURNS TABLE (
  slot_time TIME,
  is_available BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First ensure slots are generated
  PERFORM generate_daily_slots(p_dentist_id, p_date, p_business_id);
  
  -- Return slots, cross-checking with appointments table
  -- Use timezone-aware comparison (Europe/Brussels for Belgian timezone)
  RETURN QUERY
  SELECT 
    s.slot_time,
    s.is_available AND NOT EXISTS (
      SELECT 1 FROM appointments a 
      WHERE a.dentist_id = p_dentist_id 
      AND DATE(a.appointment_date AT TIME ZONE 'Europe/Brussels') = p_date 
      AND (a.appointment_date AT TIME ZONE 'Europe/Brussels')::TIME = s.slot_time
      AND a.status NOT IN ('cancelled', 'no_show')
    ) AS is_available
  FROM appointment_slots s
  WHERE s.dentist_id = p_dentist_id
  AND s.slot_date = p_date
  AND s.business_id = p_business_id
  ORDER BY s.slot_time;
END;
$$;

-- ============================================
-- 4. Book slot function
-- ============================================
CREATE OR REPLACE FUNCTION book_appointment_slot(
  p_dentist_id UUID,
  p_slot_date DATE,
  p_slot_time TIME,
  p_appointment_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE appointment_slots
  SET is_available = false, 
      appointment_id = p_appointment_id,
      updated_at = NOW()
  WHERE dentist_id = p_dentist_id
  AND slot_date = p_slot_date
  AND slot_time = p_slot_time;
END;
$$;

-- Grant execute permissions (with full signatures)
GRANT EXECUTE ON FUNCTION generate_daily_slots(UUID, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dentist_available_slots(UUID, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION book_appointment_slot(UUID, DATE, TIME, UUID) TO authenticated;

