-- Add default_language column to businesses table
-- This sets the default language for the business's public page (e.g. caberu.be/:slug)
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'en'
CHECK (default_language IN ('en', 'fr', 'nl'));
