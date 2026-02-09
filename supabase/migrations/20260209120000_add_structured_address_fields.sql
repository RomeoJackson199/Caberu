-- Add structured address fields to profiles and dentists tables
-- This replaces the single free-text address fields with structured components

-- Profiles table: patient address fields
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS street_address text,
  ADD COLUMN IF NOT EXISTS house_number text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'Belgium';

-- Dentists table: clinic address fields
ALTER TABLE dentists
  ADD COLUMN IF NOT EXISTS clinic_street_address text,
  ADD COLUMN IF NOT EXISTS clinic_house_number text,
  ADD COLUMN IF NOT EXISTS clinic_city text,
  ADD COLUMN IF NOT EXISTS clinic_postal_code text,
  ADD COLUMN IF NOT EXISTS clinic_country text DEFAULT 'Belgium';

-- Migrate existing data from the concatenated address fields into the new structured fields
-- Format was "Street, PostalCode City"

-- Migrate profiles.address -> structured fields
UPDATE profiles
SET
  street_address = CASE
    WHEN address IS NOT NULL AND address LIKE '%,%' THEN split_part(address, ', ', 1)
    WHEN address IS NOT NULL THEN address
    ELSE NULL
  END,
  postal_code = CASE
    WHEN address IS NOT NULL AND address LIKE '%,%' THEN split_part(split_part(address, ', ', 2), ' ', 1)
    ELSE NULL
  END,
  city = CASE
    WHEN address IS NOT NULL AND address LIKE '%,%' AND split_part(address, ', ', 2) LIKE '% %'
      THEN substring(split_part(address, ', ', 2) FROM position(' ' IN split_part(address, ', ', 2)) + 1)
    ELSE NULL
  END
WHERE address IS NOT NULL AND street_address IS NULL;

-- Migrate dentists.clinic_address -> structured fields
UPDATE dentists
SET
  clinic_street_address = CASE
    WHEN clinic_address IS NOT NULL AND clinic_address LIKE '%,%' THEN split_part(clinic_address, ', ', 1)
    WHEN clinic_address IS NOT NULL THEN clinic_address
    ELSE NULL
  END,
  clinic_postal_code = CASE
    WHEN clinic_address IS NOT NULL AND clinic_address LIKE '%,%' THEN split_part(split_part(clinic_address, ', ', 2), ' ', 1)
    ELSE NULL
  END,
  clinic_city = CASE
    WHEN clinic_address IS NOT NULL AND clinic_address LIKE '%,%' AND split_part(clinic_address, ', ', 2) LIKE '% %'
      THEN substring(split_part(clinic_address, ', ', 2) FROM position(' ' IN split_part(clinic_address, ', ', 2)) + 1)
    ELSE NULL
  END
WHERE clinic_address IS NOT NULL AND clinic_street_address IS NULL;
