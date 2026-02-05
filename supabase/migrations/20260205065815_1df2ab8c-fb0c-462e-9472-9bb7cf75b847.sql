
-- First disable the notes trigger temporarily
DROP TRIGGER IF EXISTS encrypt_notes_phi ON public.notes;

-- Check notes table structure
SELECT column_name FROM information_schema.columns WHERE table_name = 'notes' AND table_schema = 'public';
