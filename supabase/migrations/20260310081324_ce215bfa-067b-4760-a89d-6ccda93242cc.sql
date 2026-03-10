
CREATE OR REPLACE FUNCTION public.validate_slot_availability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow setting is_available = false WITHOUT appointment_id for Google Calendar blocks
  -- The old rule prevented this entirely; now we only enforce it for appointment-based blocks
  -- Google Calendar blocks have appointment_id = NULL and is_available = false
  
  IF NEW.appointment_id IS NULL AND OLD.appointment_id IS NOT NULL THEN
    NEW.is_available := true;
  END IF;
  
  RETURN NEW;
END;
$$;
