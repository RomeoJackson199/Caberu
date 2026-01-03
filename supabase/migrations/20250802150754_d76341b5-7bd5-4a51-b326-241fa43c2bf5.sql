-- Create some sample appointments and medical records for testing
-- First, let's get some patient and dentist IDs to work with

-- Insert some sample appointments (these will only work if you have existing profiles)
INSERT INTO appointments (
  patient_id, 
  dentist_id, 
  appointment_date, 
  status, 
  urgency, 
  reason, 
  notes,
  patient_name
) 
SELECT 
  p.id as patient_id,
  d.id as dentist_id,
  NOW() + INTERVAL '1 day' as appointment_date,
  'confirmed'::appointment_status,
  'medium'::urgency_level,
  'Contrôle de routine',
  'Rendez-vous de contrôle annuel',
  CONCAT(p.first_name, ' ', p.last_name) as patient_name
FROM profiles p
CROSS JOIN dentists d
JOIN profiles dp ON dp.id = d.profile_id
WHERE p.role = 'patient' 
  AND dp.role = 'dentist'
  AND NOT EXISTS (
    SELECT 1 FROM appointments a 
    WHERE a.patient_id = p.id AND a.dentist_id = d.id
  )
LIMIT 3;

-- Insert sample medical records for existing patients
INSERT INTO medical_records (
  patient_id,
  dentist_id,
  title,
  description,
  findings,
  recommendations,
  record_type,
  visit_date
)
SELECT 
  p.id as patient_id,
  d.id as dentist_id,
  'Consultation initiale',
  'Première consultation pour évaluation de l''état bucco-dentaire général',
  'Présence de tartre, gingivite légère, carie sur molaire supérieure droite',
  'Détartrage recommandé, soins de la carie, amélioration de l''hygiène dentaire',
  'consultation',
  CURRENT_DATE - INTERVAL '30 days'
FROM profiles p
CROSS JOIN dentists d
WHERE p.role = 'patient' 
  AND NOT EXISTS (
    SELECT 1 FROM medical_records mr 
    WHERE mr.patient_id = p.id AND mr.dentist_id = d.id
  )
LIMIT 5;

-- Update any existing appointments without patient_name
UPDATE appointments 
SET patient_name = p.first_name || ' ' || p.last_name
FROM profiles p
WHERE appointments.patient_id = p.id 
  AND (appointments.patient_name IS NULL OR appointments.patient_name = '');

-- Create a simple appointment booking function
CREATE OR REPLACE FUNCTION create_simple_appointment(
  p_patient_id UUID,
  p_dentist_id UUID,
  p_appointment_date TIMESTAMP WITH TIME ZONE,
  p_reason TEXT DEFAULT 'Consultation',
  p_urgency urgency_level DEFAULT 'medium'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_appointment_id UUID;
  patient_name TEXT;
BEGIN
  -- Get patient name
  SELECT first_name || ' ' || last_name INTO patient_name
  FROM profiles WHERE id = p_patient_id;

  -- Insert appointment
  INSERT INTO appointments (
    patient_id,
    dentist_id,
    appointment_date,
    reason,
    urgency,
    status,
    patient_name,
    duration_minutes
  ) VALUES (
    p_patient_id,
    p_dentist_id,
    p_appointment_date,
    p_reason,
    p_urgency,
    'confirmed'::appointment_status,
    patient_name,
    60
  ) RETURNING id INTO new_appointment_id;

  RETURN new_appointment_id;
END;
$$;