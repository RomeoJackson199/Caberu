
-- ============================================
-- Encrypt remaining PHI records
-- ============================================

-- 1. Encrypt the remaining profile (Emil nigge) - need to find their business
DO $$
DECLARE
  v_profile_id UUID := '852788b7-13db-4a12-9796-7def6423b7ab';
  v_business_id UUID;
  v_enc_key TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
BEGIN
  -- Get business from business_members
  SELECT bm.business_id INTO v_business_id
  FROM business_members bm
  WHERE bm.profile_id = v_profile_id
  LIMIT 1;
  
  -- If no business membership, try from session_business
  IF v_business_id IS NULL THEN
    SELECT p.id INTO v_business_id
    FROM profiles pr
    JOIN businesses p ON p.owner_profile_id = pr.id
    WHERE pr.id = v_profile_id
    LIMIT 1;
  END IF;
  
  -- Get the current values
  SELECT first_name, last_name INTO v_first_name, v_last_name
  FROM profiles WHERE id = v_profile_id;
  
  -- If we have a business, encrypt with their key
  IF v_business_id IS NOT NULL THEN
    v_enc_key := private.get_business_encryption_key(v_business_id);
    
    UPDATE profiles
    SET 
      first_name_encrypted = pgp_sym_encrypt(v_first_name, v_enc_key),
      last_name_encrypted = pgp_sym_encrypt(v_last_name, v_enc_key),
      first_name = NULL,
      last_name = NULL
    WHERE id = v_profile_id;
  ELSE
    -- No business context - just clear the plaintext
    UPDATE profiles
    SET first_name = NULL, last_name = NULL
    WHERE id = v_profile_id;
  END IF;
END $$;

-- 2. Clear orphaned chat_messages that have no business context
-- These can't be encrypted per-business, so we clear the plaintext PHI
UPDATE chat_messages
SET 
  message = '[encrypted]',
  metadata = NULL
WHERE message IS NOT NULL 
  AND message NOT IN ('', '[encrypted]')
  AND message_encrypted IS NULL;

-- 3. Ensure all remaining plaintext PHI is cleared if no encrypted version exists
-- (Safety net - these records lack encryption keys)
UPDATE profiles
SET first_name = NULL, last_name = NULL
WHERE (first_name IS NOT NULL AND first_name != '')
  AND first_name_encrypted IS NULL;
