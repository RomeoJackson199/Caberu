-- Fix signup bug: Change invalid 'user' enum value to 'patient'
-- The app_role enum doesn't have 'user' value, causing all signups to fail

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_profile_id UUID;
  business_slug TEXT;
  new_business_id UUID;
  v_role_type TEXT;
  v_role public.app_role := 'patient';  -- FIX: Changed from 'user' to valid 'patient' enum value
  existing_profile_id UUID;
BEGIN
  -- Check if a profile already exists for this user_id
  SELECT id INTO existing_profile_id
  FROM profiles
  WHERE user_id = NEW.id
  LIMIT 1;

  IF existing_profile_id IS NOT NULL THEN
    -- Profile already exists, just return without error
    RETURN NEW;
  END IF;

  -- Also check by email to avoid duplicates
  SELECT id INTO existing_profile_id
  FROM profiles
  WHERE email = NEW.email
  LIMIT 1;

  IF existing_profile_id IS NOT NULL THEN
    -- Profile with this email already exists, update user_id if needed
    UPDATE profiles SET user_id = NEW.id WHERE id = existing_profile_id AND (user_id IS NULL OR user_id != NEW.id);
    RETURN NEW;
  END IF;

  -- Extract role_type from metadata
  -- IMPORTANT: Default to 'patient' for safety - business owners must explicitly set role_type='owner'
  -- This prevents accidentally creating business records for OAuth signups
  v_role_type := COALESCE(NEW.raw_user_meta_data->>'role_type', 'patient');

  -- Generate new profile ID
  new_profile_id := gen_random_uuid();

  -- Determine the appropriate role based on role_type
  IF v_role_type = 'owner' OR v_role_type = 'provider' OR v_role_type = 'dentist' THEN
    v_role := 'provider';
  ELSE
    v_role := 'patient';
  END IF;

  -- Create the user's profile
  INSERT INTO profiles (
    id,
    user_id,
    first_name,
    last_name,
    email,
    phone,
    role,
    profile_completion_status
  ) VALUES (
    new_profile_id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', COALESCE(split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1), '')),
    COALESCE(NEW.raw_user_meta_data->>'last_name', COALESCE(split_part(NEW.raw_user_meta_data->>'full_name', ' ', 2), '')),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    CASE
      WHEN v_role_type = 'patient' THEN 'patient'
      ELSE 'dentist'
    END,
    'incomplete'
  );

  -- Only create business for non-patients (dentists/owners)
  IF v_role_type != 'patient' THEN
    business_slug := lower(replace(
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'user') || '-' ||
      COALESCE(NEW.raw_user_meta_data->>'last_name', substr(NEW.id::text, 1, 8)),
      ' ', '-'
    ));

    -- Ensure unique slug
    IF EXISTS (SELECT 1 FROM businesses WHERE slug = business_slug) THEN
      business_slug := business_slug || '-' || substr(NEW.id::text, 1, 8);
    END IF;

    new_business_id := gen_random_uuid();

    -- Create the business
    INSERT INTO businesses (
      id,
      name,
      slug,
      owner_profile_id,
      template_type,
      specialty_type
    ) VALUES (
      new_business_id,
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'My') || '''s Practice',
      business_slug,
      new_profile_id,
      'healthcare',
      'general'
    );

    -- Create dentist record
    INSERT INTO dentists (
      profile_id,
      first_name,
      last_name,
      email,
      is_active
    ) VALUES (
      new_profile_id,
      COALESCE(NEW.raw_user_meta_data->>'first_name', COALESCE(split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1), '')),
      COALESCE(NEW.raw_user_meta_data->>'last_name', COALESCE(split_part(NEW.raw_user_meta_data->>'full_name', ' ', 2), '')),
      NEW.email,
      true
    );

    -- Add as owner member of the business
    INSERT INTO business_members (
      profile_id,
      business_id,
      role
    ) VALUES (
      new_profile_id,
      new_business_id,
      'owner'
    );
  END IF;

  -- Add user role in user_roles table
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE WARNING 'handle_new_user error for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;