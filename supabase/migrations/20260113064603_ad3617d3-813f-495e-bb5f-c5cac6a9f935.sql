-- CRITICAL FIX: Allow handle_new_user() trigger to create profiles during signup
-- The previous policy required user_id = auth.uid() which fails during the trigger context

-- Drop the problematic policy
DROP POLICY IF EXISTS profiles_insert_policy ON public.profiles;

-- Create a new policy that:
-- 1. Allows authenticated users to insert their own profile (user_id = auth.uid())
-- 2. Allows the trigger context (when auth.uid() IS NULL during signup) to work
-- 3. Allows service_role for unclaimed patient profiles created by dentists
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT
  WITH CHECK (
    -- Allow authenticated users inserting their own profile
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    -- Allow trigger/service_role to insert profiles (unclaimed patients or during signup)
    -- This covers:
    --   1. handle_new_user() trigger during signup (auth.uid() is NULL in trigger context)
    --   2. Service role creating unclaimed patient profiles (user_id IS NULL)
    (auth.uid() IS NULL)
  );

-- Ensure the handle_new_user trigger has proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_profile_id UUID;
  business_slug TEXT;
  new_business_id UUID;
  v_role_type TEXT;
  v_role public.app_role := 'user';
  existing_profile_id UUID;
BEGIN
  -- Check if a profile already exists for this user_id (shouldn't happen, but be safe)
  SELECT id INTO existing_profile_id
  FROM profiles
  WHERE user_id = NEW.id
  LIMIT 1;

  IF existing_profile_id IS NOT NULL THEN
    -- Profile already exists, just return
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
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
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
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
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
$$;