
-- Update handle_new_user to set phone + phone_verified when signing up via phone auth
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
  v_role public.app_role := 'patient';
  existing_profile_id UUID;
  v_phone TEXT;
  v_phone_verified BOOLEAN := false;
BEGIN
  -- Check if a profile already exists for this user_id
  SELECT id INTO existing_profile_id
  FROM profiles
  WHERE user_id = NEW.id
  LIMIT 1;

  IF existing_profile_id IS NOT NULL THEN
    -- Profile already exists — update phone if user signed up with phone
    IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
      UPDATE profiles 
      SET phone = NEW.phone, 
          phone_verified = true, 
          phone_verified_at = now()
      WHERE id = existing_profile_id 
        AND (phone IS NULL OR phone = '');
    END IF;
    RETURN NEW;
  END IF;

  -- Also check by email to avoid duplicates
  SELECT id INTO existing_profile_id
  FROM profiles
  WHERE email = NEW.email
  LIMIT 1;

  IF existing_profile_id IS NOT NULL THEN
    UPDATE profiles SET user_id = NEW.id WHERE id = existing_profile_id AND (user_id IS NULL OR user_id != NEW.id);
    -- Also set phone if available
    IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
      UPDATE profiles 
      SET phone = NEW.phone, 
          phone_verified = true, 
          phone_verified_at = now()
      WHERE id = existing_profile_id 
        AND (phone IS NULL OR phone = '');
    END IF;
    RETURN NEW;
  END IF;

  -- Extract role_type from metadata
  v_role_type := COALESCE(NEW.raw_user_meta_data->>'role_type', 'patient');

  -- Determine phone: Supabase sets NEW.phone for phone-based signups
  v_phone := COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', NULL);
  IF v_phone IS NOT NULL AND v_phone != '' THEN
    v_phone_verified := true;
  END IF;

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
    phone_verified,
    phone_verified_at,
    role,
    profile_completion_status
  ) VALUES (
    new_profile_id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', COALESCE(split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1), '')),
    COALESCE(NEW.raw_user_meta_data->>'last_name', COALESCE(split_part(NEW.raw_user_meta_data->>'full_name', ' ', 2), '')),
    NEW.email,
    v_phone,
    v_phone_verified,
    CASE WHEN v_phone_verified THEN now() ELSE NULL END,
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
      COALESCE(NEW.raw_user_meta_data->>'first_name', COALESCE(split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1), '')),
      COALESCE(NEW.raw_user_meta_data->>'last_name', COALESCE(split_part(NEW.raw_user_meta_data->>'full_name', ' ', 2), '')),
      NEW.email,
      true
    );

    INSERT INTO business_members (
      profile_id, business_id, role
    ) VALUES (
      new_profile_id, new_business_id, 'owner'
    );
  END IF;

  -- Add user role
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;
