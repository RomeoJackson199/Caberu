-- Add sync direction preference to dentists table
-- Values: 'both' (bidirectional), 'google_to_practice' (import only), 'practice_to_google' (export only)
ALTER TABLE public.dentists
ADD COLUMN IF NOT EXISTS google_calendar_sync_direction text NOT NULL DEFAULT 'both';

COMMENT ON COLUMN public.dentists.google_calendar_sync_direction IS 'Sync direction: both, google_to_practice, or practice_to_google';