
-- Drop the function with wrong return type first
DROP FUNCTION IF EXISTS private.rotate_expired_keys();

-- Recreate rotate_expired_keys
CREATE OR REPLACE FUNCTION private.rotate_expired_keys()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  rotated_count INTEGER := 0;
  expired_business RECORD;
BEGIN
  FOR expired_business IN
    SELECT DISTINCT business_id
    FROM public.business_encryption_keys
    WHERE is_active = true AND expires_at < now()
  LOOP
    IF private.rotate_business_encryption_key(expired_business.business_id) THEN
      rotated_count := rotated_count + 1;
    END IF;
  END LOOP;
  
  RETURN rotated_count;
END;
$$;
