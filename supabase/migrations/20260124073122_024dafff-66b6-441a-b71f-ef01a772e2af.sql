-- Add primary_color and secondary_color columns to businesses table
-- These were missing and causing query errors across the application

ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#0F3D91';

ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#66D2D6';

-- Add comment for documentation
COMMENT ON COLUMN public.businesses.primary_color IS 'Primary brand color for the business theme (hex format)';
COMMENT ON COLUMN public.businesses.secondary_color IS 'Secondary brand color for the business theme (hex format)';

-- Migrate existing values from custom_config if they exist
UPDATE public.businesses
SET 
  primary_color = COALESCE(custom_config->>'primaryColor', '#0F3D91'),
  secondary_color = COALESCE(custom_config->>'secondaryColor', '#66D2D6')
WHERE custom_config IS NOT NULL 
  AND (custom_config->>'primaryColor' IS NOT NULL OR custom_config->>'secondaryColor' IS NOT NULL);

-- Fix the audit_logs record_id column type issue by changing to TEXT to accept both UUID and string identifiers
-- This is necessary because different audit sources pass different identifier types
ALTER TABLE public.audit_logs 
ALTER COLUMN record_id TYPE TEXT USING record_id::TEXT;