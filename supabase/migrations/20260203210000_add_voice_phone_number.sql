-- Add voice phone number column to businesses table for multi-tenant voice AI
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS voice_phone_number TEXT UNIQUE;

COMMENT ON COLUMN public.businesses.voice_phone_number IS 'Twilio phone number for voice AI assistant (e.g., +15551234567)';

-- Create index for fast lookup by phone number
CREATE INDEX IF NOT EXISTS idx_businesses_voice_phone 
ON public.businesses(voice_phone_number) 
WHERE voice_phone_number IS NOT NULL;
