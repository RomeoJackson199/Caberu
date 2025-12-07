-- ============================================
-- STEP 1: Auto-Create Dentist Records
-- ============================================

-- Create function that auto-creates dentist record when added to business_members
CREATE OR REPLACE FUNCTION auto_create_dentist_record()
RETURNS TRIGGER AS $$
BEGIN
  -- If user has owner/admin/dentist role in business, create dentist record
  IF NEW.role IN ('owner', 'admin', 'dentist') THEN
    INSERT INTO dentists (profile_id, is_active)
    VALUES (NEW.profile_id, true)
    ON CONFLICT (profile_id) DO UPDATE SET is_active = true;
    
    RAISE NOTICE 'Auto-created dentist record for profile_id: %', NEW.profile_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS create_dentist_on_business_member ON business_members;
CREATE TRIGGER create_dentist_on_business_member
AFTER INSERT OR UPDATE OF role ON business_members
FOR EACH ROW
EXECUTE FUNCTION auto_create_dentist_record();

-- ============================================
-- STEP 2: Remove Template System
-- ============================================

-- Update all existing businesses to healthcare template
UPDATE businesses 
SET template_type = 'healthcare' 
WHERE template_type IS NULL OR template_type != 'healthcare';

-- Set default for new businesses
ALTER TABLE businesses 
ALTER COLUMN template_type SET DEFAULT 'healthcare';

-- ============================================
-- STEP 3: Backfill - Create dentist records for existing business members
-- ============================================

-- Create dentist records for all existing business owners/admins/dentists
INSERT INTO dentists (profile_id, is_active)
SELECT DISTINCT bm.profile_id, true
FROM business_members bm
WHERE bm.role IN ('owner', 'admin', 'dentist')
ON CONFLICT (profile_id) DO UPDATE SET is_active = true;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check results
SELECT 
  'Created dentist records' as result,
  COUNT(*) as count
FROM dentists;

SELECT 
  'Business members with dentist role' as result,
  COUNT(*) as count  
FROM business_members
WHERE role IN ('owner', 'admin', 'dentist');

SELECT
  'Businesses with healthcare template' as result,
  COUNT(*) as count
FROM businesses
WHERE template_type = 'healthcare';
