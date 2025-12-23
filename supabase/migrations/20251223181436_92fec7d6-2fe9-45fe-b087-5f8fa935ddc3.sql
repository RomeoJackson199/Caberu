-- Enable REPLICA IDENTITY FULL for complete row data in realtime updates
ALTER TABLE public.appointment_slots REPLICA IDENTITY FULL;

-- Add appointment_slots to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_slots;