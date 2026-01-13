-- Fix the secure_profiles_view to have proper column names and avoid ambiguity
-- Drop and recreate the view with profile_picture_url alias
DROP VIEW IF EXISTS public.secure_profiles_view;

CREATE VIEW public.secure_profiles_view AS
SELECT 
    id,
    user_id,
    email,
    first_name,
    last_name,
    phone,
    date_of_birth,
    avatar_url,
    avatar_url as profile_picture_url,
    address,
    emergency_contact,
    medical_history,
    role,
    ai_opt_out,
    created_at,
    updated_at
FROM profiles;

-- Grant access to authenticated users
GRANT SELECT ON public.secure_profiles_view TO authenticated;
GRANT SELECT ON public.secure_profiles_view TO anon;

-- Update handle_new_user to better handle existing profiles
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
  v_role public.app_role := 'user';
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

  -- Extract role_type from metadata (defaults to 'owner' for backward compatibility)
  v_role_type := COALESCE(NEW.raw_user_meta_data->>'role_type', 'owner');

  -- Generate new profile ID
  new_profile_id := gen_random_uuid();

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

  -- Add default user role in user_roles table
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