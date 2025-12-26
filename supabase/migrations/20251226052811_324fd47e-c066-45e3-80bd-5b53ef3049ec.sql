-- Database cleanup migration

-- 1. Migrate data from patient_notes to notes table
INSERT INTO public.notes (patient_id, dentist_id, title, content, note_type, is_private, created_at, updated_at)
SELECT patient_id, dentist_id, title, content, note_type, is_private, created_at, updated_at
FROM public.patient_notes
ON CONFLICT DO NOTHING;

-- 2. Drop the redundant patient_notes table
DROP TABLE IF EXISTS public.patient_notes;

-- 3. Delete old unresolved system errors (older than 14 days)
DELETE FROM public.system_errors 
WHERE created_at < NOW() - INTERVAL '14 days' 
AND (resolved_at IS NULL);

-- 4. Drop unused database function
DROP FUNCTION IF EXISTS public.check_clinic_registration(text);