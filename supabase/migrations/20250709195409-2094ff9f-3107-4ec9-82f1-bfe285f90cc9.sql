-- Add additional patient information to appointments table
ALTER TABLE appointments 
ADD COLUMN patient_name TEXT,
ADD COLUMN patient_age INTEGER,
ADD COLUMN patient_relationship TEXT,
ADD COLUMN is_for_user BOOLEAN DEFAULT true;

-- Add appointment duration tracking
ALTER TABLE appointments 
ALTER COLUMN duration_minutes SET DEFAULT 60;

-- Create function to cancel appointments
CREATE OR REPLACE FUNCTION cancel_appointment(appointment_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE appointments 
  SET status = 'cancelled', updated_at = now()
  WHERE id = appointment_id 
  AND patient_id IN (
    SELECT id FROM profiles WHERE profiles.user_id = cancel_appointment.user_id
  );
  
  RETURN FOUND;
END;
$$;