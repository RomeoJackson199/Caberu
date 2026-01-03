-- Enhance the existing database for better patient management

-- Add indexes for better performance on common queries
CREATE INDEX IF NOT EXISTS idx_appointments_patient_dentist_date 
ON appointments(patient_id, dentist_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_medical_records_patient_dentist 
ON medical_records(patient_id, dentist_id);

CREATE INDEX IF NOT EXISTS idx_notes_patient_created 
ON notes(patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient_status 
ON treatment_plans(patient_id, status);

-- Add a function to get patient statistics for dentists
CREATE OR REPLACE FUNCTION get_patient_stats_for_dentist(p_dentist_id uuid, p_patient_id uuid)
RETURNS TABLE (
  total_appointments bigint,
  upcoming_appointments bigint,
  completed_appointments bigint,
  last_appointment_date timestamp with time zone,
  total_notes bigint,
  active_treatment_plans bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM appointments 
     WHERE patient_id = p_patient_id AND dentist_id = p_dentist_id) as total_appointments,
    
    (SELECT COUNT(*) FROM appointments 
     WHERE patient_id = p_patient_id AND dentist_id = p_dentist_id 
     AND appointment_date > now() AND status != 'cancelled') as upcoming_appointments,
    
    (SELECT COUNT(*) FROM appointments 
     WHERE patient_id = p_patient_id AND dentist_id = p_dentist_id 
     AND status = 'completed') as completed_appointments,
    
    (SELECT MAX(appointment_date) FROM appointments 
     WHERE patient_id = p_patient_id AND dentist_id = p_dentist_id 
     AND status = 'completed') as last_appointment_date,
    
    (SELECT COUNT(*) FROM notes 
     WHERE patient_id = p_patient_id) as total_notes,
    
    (SELECT COUNT(*) FROM treatment_plans 
     WHERE patient_id = p_patient_id AND dentist_id = p_dentist_id 
     AND status = 'active') as active_treatment_plans;
END;
$$;

-- Add a function to get upcoming appointments with urgency info
CREATE OR REPLACE FUNCTION get_upcoming_appointments_with_urgency(p_dentist_id uuid)
RETURNS TABLE (
  appointment_id uuid,
  patient_id uuid,
  patient_name text,
  appointment_date timestamp with time zone,
  urgency urgency_level,
  reason text,
  pain_level integer,
  has_bleeding boolean,
  has_swelling boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as appointment_id,
    a.patient_id,
    CONCAT(p.first_name, ' ', p.last_name) as patient_name,
    a.appointment_date,
    a.urgency,
    a.reason,
    ua.pain_level,
    ua.has_bleeding,
    ua.has_swelling
  FROM appointments a
  JOIN profiles p ON p.id = a.patient_id
  LEFT JOIN urgency_assessments ua ON ua.appointment_id = a.id
  WHERE a.dentist_id = p_dentist_id 
    AND a.appointment_date > now()
    AND a.status != 'cancelled'
  ORDER BY a.appointment_date ASC;
END;
$$;

-- Add a trigger to automatically update treatment plan status based on appointments
CREATE OR REPLACE FUNCTION update_treatment_plan_on_appointment_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- When an appointment is completed, check if we should update treatment plan progress
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update active treatment plans to show progress
    UPDATE treatment_plans 
    SET updated_at = now()
    WHERE patient_id = NEW.patient_id 
      AND dentist_id = NEW.dentist_id 
      AND status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for appointment completion
DROP TRIGGER IF EXISTS trigger_update_treatment_plan_on_completion ON appointments;
CREATE TRIGGER trigger_update_treatment_plan_on_completion
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_treatment_plan_on_appointment_completion();

-- Add constraint to ensure notes have content
ALTER TABLE notes ADD CONSTRAINT notes_content_not_empty 
CHECK (content IS NOT NULL AND length(trim(content)) > 0);

-- Add constraint to ensure treatment plans have titles
ALTER TABLE treatment_plans ADD CONSTRAINT treatment_plans_title_not_empty 
CHECK (title IS NOT NULL AND length(trim(title)) > 0);