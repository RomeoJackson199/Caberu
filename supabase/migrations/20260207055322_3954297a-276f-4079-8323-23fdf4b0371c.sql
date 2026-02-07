
-- Drop dependent view first
DROP VIEW IF EXISTS public.v_profiles_decrypted CASCADE;

-- Remove ALL encryption triggers from profiles
DROP TRIGGER IF EXISTS encrypt_profiles_phi ON public.profiles;
DROP TRIGGER IF EXISTS encrypt_profiles_phi_trigger ON public.profiles;
DROP TRIGGER IF EXISTS trg_encrypt_profiles_phi ON public.profiles;

-- Drop encrypted columns from profiles
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS first_name_encrypted CASCADE,
  DROP COLUMN IF EXISTS last_name_encrypted CASCADE,
  DROP COLUMN IF EXISTS phone_encrypted CASCADE,
  DROP COLUMN IF EXISTS date_of_birth_encrypted CASCADE,
  DROP COLUMN IF EXISTS medical_history_encrypted CASCADE,
  DROP COLUMN IF EXISTS address_encrypted CASCADE,
  DROP COLUMN IF EXISTS emergency_contact_encrypted CASCADE;

-- Recreate secure_profiles_view (same shape, no encryption)
CREATE OR REPLACE VIEW public.secure_profiles_view AS
SELECT
  id,
  user_id,
  email,
  first_name,
  last_name,
  phone,
  date_of_birth,
  avatar_url,
  avatar_url AS profile_picture_url,
  address,
  emergency_contact,
  medical_history,
  role,
  ai_opt_out,
  created_at,
  updated_at
FROM public.profiles;

-- Auto-create encryption key when a business is created
CREATE OR REPLACE FUNCTION public.auto_create_business_encryption_key()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_master_key TEXT;
  v_new_key TEXT;
  v_encrypted_key TEXT;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_master_key
    FROM vault.decrypted_secrets
    WHERE name = 'app_encryption_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_master_key := NULL;
  END;

  IF v_master_key IS NULL OR v_master_key = '' THEN
    RETURN NEW;
  END IF;

  v_new_key := encode(gen_random_bytes(32), 'hex');
  v_encrypted_key := encode(pgp_sym_encrypt(v_new_key, v_master_key), 'base64');

  INSERT INTO public.business_encryption_keys (
    business_id, encrypted_key, key_version, is_active, expires_at
  ) VALUES (
    NEW.id, v_encrypted_key, 1, true, NOW() + INTERVAL '1 year'
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create encryption key for business %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_business_encryption_key ON public.businesses;
CREATE TRIGGER trg_auto_create_business_encryption_key
  AFTER INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_business_encryption_key();

-- Backfill: Create encryption key for Caberu business
DO $$
DECLARE
  v_master_key TEXT;
  v_new_key TEXT;
  v_encrypted_key TEXT;
  v_biz_id UUID := 'fd7b4498-6de2-46a9-b9f8-7f136ad06ab6';
BEGIN
  IF EXISTS (SELECT 1 FROM public.business_encryption_keys WHERE business_id = v_biz_id) THEN
    RETURN;
  END IF;

  BEGIN
    SELECT decrypted_secret INTO v_master_key
    FROM vault.decrypted_secrets
    WHERE name = 'app_encryption_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not get master key for backfill';
    RETURN;
  END;

  IF v_master_key IS NULL OR v_master_key = '' THEN
    RETURN;
  END IF;

  v_new_key := encode(gen_random_bytes(32), 'hex');
  v_encrypted_key := encode(pgp_sym_encrypt(v_new_key, v_master_key), 'base64');

  INSERT INTO public.business_encryption_keys (
    business_id, encrypted_key, key_version, is_active, expires_at
  ) VALUES (
    v_biz_id, v_encrypted_key, 1, true, NOW() + INTERVAL '1 year'
  );
END;
$$;
