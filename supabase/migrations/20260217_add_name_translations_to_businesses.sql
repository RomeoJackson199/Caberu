-- Add name_translations JSONB column to businesses table.
-- Stores the business name in each supported language so the slug
-- can be derived from the name in the business's default language.
-- Example: { "en": "Bright Smiles Dental", "fr": "Sourire Éclatant", "nl": "Stralende Glimlach" }
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS name_translations JSONB DEFAULT '{}'::jsonb;

-- Back-fill existing rows: store the current name under the current default_language key.
UPDATE public.businesses
SET name_translations = jsonb_build_object(COALESCE(default_language, 'en'), name)
WHERE name IS NOT NULL
  AND (name_translations IS NULL OR name_translations = '{}'::jsonb);
