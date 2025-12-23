-- Enable REPLICA IDENTITY FULL for appointment_slots to make realtime work properly
ALTER TABLE public.appointment_slots REPLICA IDENTITY FULL;