-- Fix phone auth user profile creation
--
-- Root cause: profiles.email has NOT NULL constraint, but phone-OTP auth users
-- have NEW.email = NULL. The trigger INSERT fails, the EXCEPTION guard catches it
-- silently, and no profile row is ever created.
--
-- Also fixes: the trigger stored NULL in profiles.phone for phone-auth users
-- because it only checked raw_user_meta_data->>'phone' (signup metadata),
-- ignoring NEW.phone (the actual verified phone number from Supabase auth).

-- 1. Allow null emails so phone-only accounts can have a profile row
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;

-- 2. Replace the trigger with a version that handles phone-auth users correctly
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_profile_id UUID;
  business_slug TEXT;
  new_business_id UUID;
  v_role_type TEXT;
  v_role public.app_role := 'patient';
  existing_profile_id UUID;
BEGIN
  -- Dedup: already have a profile for this auth user?
  SELECT id INTO existing_profile_id
  FROM profiles
  WHERE user_id = NEW.id
  LIMIT 1;

  IF existing_profile_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Dedup by email only when email is present (phone-auth users have no email)
  IF NEW.email IS NOT NULL THEN
    SELECT id INTO existing_profile_id
    FROM profiles
    WHERE email = NEW.email
    LIMIT 1;

    IF existing_profile_id IS NOT NULL THEN
      UPDATE profiles
      SET user_id = NEW.id
      WHERE id = existing_profile_id
        AND (user_id IS NULL OR user_id != NEW.id);
      RETURN NEW;
    END IF;
  END IF;

  v_role_type := COALESCE(NEW.raw_user_meta_data->>'role_type', 'patient');

  new_profile_id := gen_random_uuid();

  IF v_role_type IN ('owner', 'provider', 'dentist') THEN
    v_role := 'provider';
  ELSE
    v_role := 'patient';
  END IF;

  -- Create the profile.
  -- For phone-auth users: email is NULL, phone comes from NEW.phone.
  -- For email-auth users: email is set, phone comes from metadata (if provided).
  INSERT INTO profiles (
    id, user_id, first_name, last_name, email, phone, role, profile_completion_status
  ) VALUES (
    new_profile_id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 1), ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 2), ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
    CASE WHEN v_role_type = 'patient' THEN 'patient' ELSE 'dentist' END,
    'incomplete'
  );

  -- For 'owner' role_type: do NOT auto-create a business here.
  -- The /create-business flow handles that after payment.
  -- For 'provider'/'dentist': still auto-create business + dentist record.
  IF v_role_type IN ('provider', 'dentist') THEN
    business_slug := lower(replace(
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'user') || '-' ||
      COALESCE(NEW.raw_user_meta_data->>'last_name', substr(NEW.id::text, 1, 8)),
      ' ', '-'
    ));

    IF EXISTS (SELECT 1 FROM businesses WHERE slug = business_slug) THEN
      business_slug := business_slug || '-' || substr(NEW.id::text, 1, 8);
    END IF;

    new_business_id := gen_random_uuid();

    INSERT INTO businesses (
      id, name, slug, owner_profile_id, template_type, specialty_type
    ) VALUES (
      new_business_id,
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'My') || '''s Practice',
      business_slug,
      new_profile_id,
      'healthcare',
      'general'
    );

    INSERT INTO dentists (
      profile_id, first_name, last_name, email, is_active
    ) VALUES (
      new_profile_id,
      COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 1), ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 2), ''),
      NEW.email,
      true
    );

    INSERT INTO business_members (
      profile_id, business_id, role
    ) VALUES (
      new_profile_id,
      new_business_id,
      'owner'
    );
  END IF;

  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
