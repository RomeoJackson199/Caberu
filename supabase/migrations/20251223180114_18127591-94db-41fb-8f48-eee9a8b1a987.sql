-- Clean up orphaned slots: slots marked unavailable but with no appointment
UPDATE public.appointment_slots
SET is_available = true
WHERE is_available = false 
  AND appointment_id IS NULL;

-- Add a check constraint to prevent this inconsistency in the future
-- If a slot is unavailable, it should have an appointment_id
CREATE OR REPLACE FUNCTION public.validate_slot_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- If marking as unavailable, require an appointment_id
  IF NEW.is_available = false AND NEW.appointment_id IS NULL THEN
    RAISE EXCEPTION 'Cannot mark slot as unavailable without an appointment_id';
  END IF;
  
  -- If clearing appointment_id, mark as available
  IF NEW.appointment_id IS NULL AND OLD.appointment_id IS NOT NULL THEN
    NEW.is_available := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce this
DROP TRIGGER IF EXISTS validate_slot_availability_trigger ON public.appointment_slots;
CREATE TRIGGER validate_slot_availability_trigger
  BEFORE INSERT OR UPDATE ON public.appointment_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_slot_availability();