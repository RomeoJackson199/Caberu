-- Migration: Update RPC functions to read from decrypted views instead of raw encrypted tables
-- This ensures that RPC functions return decrypted PHI data

-- Update get_appointments_paginated to read from appointments_decrypted
CREATE OR REPLACE FUNCTION get_appointments_paginated(
  p_dentist_id UUID,
  p_business_id UUID DEFAULT NULL,
  p_cursor TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_status_filter TEXT DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  appointment_date TIMESTAMPTZ,
  duration_minutes INTEGER,
  status TEXT,
  urgency TEXT,
  reason TEXT,
  consultation_notes TEXT,
  patient_id UUID,
  patient_first_name TEXT,
  patient_last_name TEXT,
  patient_email TEXT,
  patient_phone TEXT,
  patient_avatar_url TEXT,
  created_at TIMESTAMPTZ,
  has_more BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_more BOOLEAN := FALSE;
  v_count INTEGER;
BEGIN
  -- Count total matching records
  SELECT COUNT(*) INTO v_count
  FROM appointments_decrypted a
  JOIN profiles p ON p.id = a.patient_id
  WHERE a.dentist_id = p_dentist_id
    AND (p_business_id IS NULL OR a.business_id = p_business_id)
    AND (p_cursor IS NULL OR a.appointment_date < p_cursor)
    AND (p_status_filter IS NULL OR a.status = p_status_filter)
    AND (p_date_from IS NULL OR a.appointment_date >= p_date_from)
    AND (p_date_to IS NULL OR a.appointment_date <= p_date_to);

  v_has_more := v_count > p_limit;

  RETURN QUERY
  SELECT
    a.id,
    a.appointment_date,
    a.duration_minutes,
    a.status,
    a.urgency,
    a.reason,
    a.consultation_notes,
    p.id AS patient_id,
    p.first_name AS patient_first_name,
    p.last_name AS patient_last_name,
    p.email AS patient_email,
    p.phone AS patient_phone,
    p.avatar_url AS patient_avatar_url,
    a.created_at,
    v_has_more
  FROM appointments_decrypted a
  JOIN profiles p ON p.id = a.patient_id
  WHERE a.dentist_id = p_dentist_id
    AND (p_business_id IS NULL OR a.business_id = p_business_id)
    AND (p_cursor IS NULL OR a.appointment_date < p_cursor)
    AND (p_status_filter IS NULL OR a.status = p_status_filter)
    AND (p_date_from IS NULL OR a.appointment_date >= p_date_from)
    AND (p_date_to IS NULL OR a.appointment_date <= p_date_to)
  ORDER BY a.appointment_date DESC
  LIMIT p_limit;
END;
$$;
