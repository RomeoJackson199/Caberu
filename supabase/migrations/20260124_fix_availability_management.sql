-- Migration: Fix Availability Management System
-- Date: 2026-01-24
-- Fixes: BUG-4 (timezone), BUG-6 (vacation check), BUG-2 (overnight shifts)
-- Features: Date overrides table, improved slot generation

-- ============================================
-- 1. Create dentist_date_overrides table for one-off exceptions
-- ============================================
CREATE TABLE IF NOT EXISTS dentist_date_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id UUID NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  override_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  break_start_time TIME,
  break_end_time TIME,
  is_available BOOLEAN DEFAULT true,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dentist_id, business_id, override_date)
);

-- Enable RLS
ALTER TABLE dentist_date_overrides ENABLE ROW LEVEL SECURITY;

-- RLS policies for date overrides
DROP POLICY IF EXISTS "Users can view date overrides for their business" ON dentist_date_overrides;
CREATE POLICY "Users can view date overrides for their business" ON dentist_date_overrides
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can manage date overrides" ON dentist_date_overrides;
CREATE POLICY "Staff can manage date overrides" ON dentist_date_overrides
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_members
      WHERE profile_id = auth.uid() AND role IN ('owner', 'admin', 'dentist')
    )
  );

-- ============================================
-- 2. Improved generate_daily_slots function
--    Fixes: timezone, vacation check, overnight shifts, date overrides
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
  v_is_overnight BOOLEAN;
  v_has_override BOOLEAN := false;
BEGIN
  -- Get day of week (0=Sunday, 1=Monday, etc.)
  v_day_of_week := EXTRACT(DOW FROM p_date);

  -- ============================================
  -- Check 1: Is this date a vacation day?
  -- ============================================
  IF EXISTS (
    SELECT 1 FROM dentist_vacation_days
    WHERE dentist_id = p_dentist_id
    AND (business_id = p_business_id OR business_id IS NULL)
    AND p_date BETWEEN start_date AND end_date
    LIMIT 1
  ) THEN
    -- Don't generate slots for vacation days
    -- Delete any existing slots for this vacation day (except already booked)
    DELETE FROM appointment_slots
    WHERE dentist_id = p_dentist_id
      AND slot_date = p_date
      AND business_id = p_business_id
      AND is_available = true
      AND appointment_id IS NULL;
    RETURN;
  END IF;

  -- ============================================
  -- Check 2: Check if slots already exist
  -- ============================================
  IF EXISTS (
    SELECT 1 FROM appointment_slots
    WHERE dentist_id = p_dentist_id
    AND slot_date = p_date
    AND business_id = p_business_id
    LIMIT 1
  ) THEN
    RETURN; -- Slots already generated
  END IF;

  -- ============================================
  -- Check 3: Check for date-specific override first
  -- ============================================
  SELECT start_time, end_time, break_start_time, break_end_time, is_available
  INTO v_start_time, v_end_time, v_break_start, v_break_end, v_has_override
  FROM dentist_date_overrides
  WHERE dentist_id = p_dentist_id
  AND business_id = p_business_id
  AND override_date = p_date
  LIMIT 1;

  -- If override exists and marks day as unavailable, don't generate slots
  IF FOUND THEN
    v_has_override := true;
    IF v_start_time IS NULL OR v_end_time IS NULL THEN
      -- Override marks day as unavailable
      RETURN;
    END IF;
  END IF;

  -- ============================================
  -- Check 4: Fall back to regular weekly availability if no override
  -- ============================================
  IF NOT v_has_override OR v_start_time IS NULL THEN
    SELECT start_time, end_time, break_start_time, break_end_time
    INTO v_start_time, v_end_time, v_break_start, v_break_end
    FROM dentist_availability
    WHERE dentist_id = p_dentist_id
    AND business_id = p_business_id
    AND day_of_week = v_day_of_week
    AND is_available = true
    LIMIT 1;
  END IF;

  -- If no availability found, use default 9-5 with 12-13 lunch break
  IF v_start_time IS NULL THEN
    v_start_time := '09:00:00'::TIME;
    v_end_time := '17:00:00'::TIME;
    v_break_start := '12:00:00'::TIME;
    v_break_end := '13:00:00'::TIME;
  END IF;

  -- Determine if this is an overnight shift (end_time < start_time, e.g., 22:00 - 06:00)
  v_is_overnight := v_end_time < v_start_time;

  -- ============================================
  -- Generate slots based on shift type
  -- ============================================
  IF v_is_overnight THEN
    -- Overnight shift: Generate from start_time to midnight, then midnight to end_time
    -- First part: start_time to 23:30
    v_current_time := v_start_time;
    WHILE v_current_time <= '23:30:00'::TIME LOOP
      -- Check if current time falls within break period
      v_is_in_break := false;
      IF v_break_start IS NOT NULL AND v_break_end IS NOT NULL THEN
        IF v_current_time >= v_break_start AND v_current_time < v_break_end THEN
          v_is_in_break := true;
        END IF;
      END IF;

      IF NOT v_is_in_break THEN
        INSERT INTO appointment_slots (dentist_id, business_id, slot_date, slot_time, is_available)
        VALUES (p_dentist_id, p_business_id, p_date, v_current_time,
          NOT EXISTS (
            SELECT 1 FROM appointments
            WHERE dentist_id = p_dentist_id
            AND DATE(appointment_date AT TIME ZONE 'Europe/Brussels') = p_date
            AND (appointment_date AT TIME ZONE 'Europe/Brussels')::TIME = v_current_time
            AND status NOT IN ('cancelled', 'no_show')
          )
        )
        ON CONFLICT (dentist_id, slot_date, slot_time) DO NOTHING;
      END IF;

      v_current_time := v_current_time + (v_slot_duration || ' minutes')::INTERVAL;
    END LOOP;

    -- Second part: 00:00 to end_time (these belong to the NEXT day technically,
    -- but for slot generation we add them to the same "workday")
    v_current_time := '00:00:00'::TIME;
    WHILE v_current_time < v_end_time LOOP
      v_is_in_break := false;
      IF v_break_start IS NOT NULL AND v_break_end IS NOT NULL THEN
        IF v_current_time >= v_break_start AND v_current_time < v_break_end THEN
          v_is_in_break := true;
        END IF;
      END IF;

      IF NOT v_is_in_break THEN
        -- Note: These early morning slots are added to the NEXT date
        INSERT INTO appointment_slots (dentist_id, business_id, slot_date, slot_time, is_available)
        VALUES (p_dentist_id, p_business_id, p_date + INTERVAL '1 day', v_current_time,
          NOT EXISTS (
            SELECT 1 FROM appointments
            WHERE dentist_id = p_dentist_id
            AND DATE(appointment_date AT TIME ZONE 'Europe/Brussels') = p_date + 1
            AND (appointment_date AT TIME ZONE 'Europe/Brussels')::TIME = v_current_time
            AND status NOT IN ('cancelled', 'no_show')
          )
        )
        ON CONFLICT (dentist_id, slot_date, slot_time) DO NOTHING;
      END IF;

      v_current_time := v_current_time + (v_slot_duration || ' minutes')::INTERVAL;
    END LOOP;

  ELSE
    -- Normal daytime shift
    v_current_time := v_start_time;
    WHILE v_current_time < v_end_time LOOP
      -- Check if current time falls within break period
      v_is_in_break := false;
      IF v_break_start IS NOT NULL AND v_break_end IS NOT NULL THEN
        IF v_current_time >= v_break_start AND v_current_time < v_break_end THEN
          v_is_in_break := true;
        END IF;
      END IF;

      -- Only insert slot if not in break time
      IF NOT v_is_in_break THEN
        -- Use timezone-aware comparison for existing appointments (BUG-4 fix)
        INSERT INTO appointment_slots (dentist_id, business_id, slot_date, slot_time, is_available)
        VALUES (p_dentist_id, p_business_id, p_date, v_current_time,
          NOT EXISTS (
            SELECT 1 FROM appointments
            WHERE dentist_id = p_dentist_id
            AND DATE(appointment_date AT TIME ZONE 'Europe/Brussels') = p_date
            AND (appointment_date AT TIME ZONE 'Europe/Brussels')::TIME = v_current_time
            AND status NOT IN ('cancelled', 'no_show')
          )
        )
        ON CONFLICT (dentist_id, slot_date, slot_time) DO NOTHING;
      END IF;

      v_current_time := v_current_time + (v_slot_duration || ' minutes')::INTERVAL;
    END LOOP;
  END IF;
END;
$$;

-- ============================================
-- 3. Improved get_dentist_available_slots with vacation check
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
  -- Check if date is a vacation day first
  IF EXISTS (
    SELECT 1 FROM dentist_vacation_days
    WHERE dentist_id = p_dentist_id
    AND (business_id = p_business_id OR business_id IS NULL)
    AND p_date BETWEEN start_date AND end_date
    LIMIT 1
  ) THEN
    -- Return empty set for vacation days
    RETURN;
  END IF;

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
-- 4. Function to regenerate slots with vacation awareness
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

  -- Regenerate slots (will handle vacations internally)
  PERFORM generate_daily_slots(p_dentist_id, p_date, p_business_id);
END;
$$;

-- ============================================
-- 5. Function to check for affected appointments when availability changes
-- ============================================
CREATE OR REPLACE FUNCTION check_affected_appointments_on_availability_change(
  p_dentist_id UUID,
  p_business_id UUID,
  p_new_availability JSONB
)
RETURNS TABLE (
  appointment_id UUID,
  appointment_date TIMESTAMPTZ,
  patient_name TEXT,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avail JSONB;
  v_day_of_week INT;
  v_start_time TIME;
  v_end_time TIME;
  v_is_available BOOLEAN;
BEGIN
  RETURN QUERY
  WITH future_appointments AS (
    SELECT
      a.id,
      a.appointment_date,
      COALESCE(p.first_name || ' ' || p.last_name, 'Unknown') as patient_name,
      a.reason,
      EXTRACT(DOW FROM a.appointment_date AT TIME ZONE 'Europe/Brussels')::INT as apt_day,
      (a.appointment_date AT TIME ZONE 'Europe/Brussels')::TIME as apt_time
    FROM appointments a
    LEFT JOIN profiles p ON a.patient_id = p.id
    WHERE a.dentist_id = p_dentist_id
    AND a.business_id = p_business_id
    AND a.appointment_date >= NOW()
    AND a.status IN ('pending', 'confirmed')
  ),
  new_avail AS (
    SELECT
      (elem->>'day_of_week')::INT as day_of_week,
      (elem->>'start_time')::TIME as start_time,
      (elem->>'end_time')::TIME as end_time,
      COALESCE((elem->>'is_available')::BOOLEAN, true) as is_available,
      (elem->>'break_start_time')::TIME as break_start,
      (elem->>'break_end_time')::TIME as break_end
    FROM jsonb_array_elements(p_new_availability) as elem
  )
  SELECT
    fa.id,
    fa.appointment_date,
    fa.patient_name,
    fa.reason
  FROM future_appointments fa
  LEFT JOIN new_avail na ON na.day_of_week = fa.apt_day
  WHERE
    -- Day is now unavailable
    na.is_available = false
    OR na.day_of_week IS NULL
    -- Or time is outside new working hours (for normal shifts)
    OR (
      na.start_time < na.end_time AND (
        fa.apt_time < na.start_time OR fa.apt_time >= na.end_time
      )
    )
    -- Or time is during break
    OR (
      na.break_start IS NOT NULL AND na.break_end IS NOT NULL
      AND fa.apt_time >= na.break_start AND fa.apt_time < na.break_end
    );
END;
$$;

-- ============================================
-- 6. Trigger to clear slots when vacation is added
-- ============================================
CREATE OR REPLACE FUNCTION trigger_clear_slots_on_vacation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_date DATE;
BEGIN
  -- Loop through vacation date range and clear unbooked slots
  v_current_date := NEW.start_date;
  WHILE v_current_date <= NEW.end_date LOOP
    DELETE FROM appointment_slots
    WHERE dentist_id = NEW.dentist_id
      AND slot_date = v_current_date
      AND (business_id = NEW.business_id OR NEW.business_id IS NULL)
      AND is_available = true
      AND appointment_id IS NULL;

    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS clear_slots_on_vacation_insert ON dentist_vacation_days;
CREATE TRIGGER clear_slots_on_vacation_insert
  AFTER INSERT ON dentist_vacation_days
  FOR EACH ROW
  EXECUTE FUNCTION trigger_clear_slots_on_vacation();

-- ============================================
-- 7. Grant permissions
-- ============================================
GRANT EXECUTE ON FUNCTION generate_daily_slots(UUID, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dentist_available_slots(UUID, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION regenerate_daily_slots(UUID, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_affected_appointments_on_availability_change(UUID, UUID, JSONB) TO authenticated;

-- ============================================
-- 8. Add index for faster vacation lookups
-- ============================================
CREATE INDEX IF NOT EXISTS idx_vacation_days_date_range
  ON dentist_vacation_days(dentist_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_date_overrides_lookup
  ON dentist_date_overrides(dentist_id, business_id, override_date);

-- ============================================
-- 9. Add comment documentation
-- ============================================
COMMENT ON TABLE dentist_date_overrides IS 'One-off date-specific availability overrides that take precedence over weekly recurring availability';
COMMENT ON FUNCTION generate_daily_slots IS 'Generates appointment slots for a specific date, respecting vacations, date overrides, breaks, and overnight shifts';
COMMENT ON FUNCTION get_dentist_available_slots IS 'Returns available time slots for a dentist on a specific date, with vacation awareness';
