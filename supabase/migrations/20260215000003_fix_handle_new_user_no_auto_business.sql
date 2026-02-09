-- Fix: Stop handle_new_user from auto-creating business/dentist/members for owners
-- The /create-business wizard should handle business creation, not the signup trigger.
-- Previously, signing up as a business owner would immediately create a placeholder business
-- (e.g. "John's Practice") before the user reached the create-business form.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_profile_id UUID;
  v_role_type TEXT;
  v_role public.app_role := 'patient';
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
  -- Default to 'patient' for safety - business owners must explicitly set role_type='owner'
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

  -- NOTE: Business, dentist, and business_members records are NOT created here.
  -- For business owners, these are created through the /create-business wizard flow
  -- (via complete-business-setup edge function or the free promo code path).
  -- For OAuth business owners, initialize_oauth_business_owner() handles this.
  -- This prevents the bug where a random placeholder business was auto-created
  -- before the user could fill in their actual business details.

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
