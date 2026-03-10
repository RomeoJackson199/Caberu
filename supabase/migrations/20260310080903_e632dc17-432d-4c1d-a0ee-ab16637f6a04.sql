
-- First check if the get_available_slots function already has the appointment_slots check
SELECT prosrc FROM pg_proc WHERE proname = 'get_available_slots' LIMIT 1;
