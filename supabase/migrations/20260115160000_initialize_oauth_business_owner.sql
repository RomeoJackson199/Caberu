-- Function to initialize business owner data for OAuth signups
-- This handles the case where OAuth providers don't allow custom metadata
-- The trigger creates a 'patient' profile, and this function converts to business owner

CREATE OR REPLACE FUNCTION initialize_oauth_business_owner()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_profile_id uuid;
  v_business_id uuid;
  v_dentist_id uuid;
  v_result json;
BEGIN
  -- Get the current authenticated user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the profile ID
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = v_user_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user';
  END IF;

  -- Check if user already has business owner setup
  SELECT b.id INTO v_business_id
  FROM businesses b
  INNER JOIN dentists d ON d.business_id = b.id
  WHERE d.profile_id = v_profile_id
  LIMIT 1;

  IF v_business_id IS NOT NULL THEN
    -- Already initialized, return existing data
    RETURN json_build_object(
      'success', true,
      'message', 'Already initialized',
      'business_id', v_business_id,
      'already_exists', true
    );
  END IF;

  -- Update profile role to dentist
  UPDATE profiles
  SET role = 'dentist',
      updated_at = now()
  WHERE id = v_profile_id;

  -- Create a placeholder business (will be updated in create-business flow)
  INSERT INTO businesses (name, created_at, updated_at)
  VALUES ('New Business', now(), now())
  RETURNING id INTO v_business_id;

  -- Create dentist record
  INSERT INTO dentists (profile_id, business_id, specialization, created_at, updated_at)
  VALUES (v_profile_id, v_business_id, 'General Dentistry', now(), now())
  RETURNING id INTO v_dentist_id;

  -- Create business_members record
  INSERT INTO business_members (business_id, profile_id, role, created_at, updated_at)
  VALUES (v_business_id, v_profile_id, 'owner', now(), now());

  -- Return success with IDs
  RETURN json_build_object(
    'success', true,
    'message', 'Business owner initialized successfully',
    'business_id', v_business_id,
    'dentist_id', v_dentist_id,
    'profile_id', v_profile_id,
    'already_exists', false
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and return failure
    RAISE WARNING 'Error initializing OAuth business owner: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION initialize_oauth_business_owner() TO authenticated;

COMMENT ON FUNCTION initialize_oauth_business_owner() IS
'Initializes business owner data for users who signed up via OAuth.
OAuth providers do not support custom metadata, so users initially get a patient profile.
This function converts the profile to a business owner with all necessary records.';
