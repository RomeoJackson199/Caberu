-- Fix initialize_oauth_business_owner: dentists table has no business_id column
-- The relationship is through business_members, not a direct FK on dentists
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
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = v_user_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user';
  END IF;

  -- Check if user already has business owner setup via business_members
  SELECT bm.business_id INTO v_business_id
  FROM business_members bm
  WHERE bm.profile_id = v_profile_id
    AND bm.role = 'owner'
  LIMIT 1;

  IF v_business_id IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Already initialized',
      'business_id', v_business_id,
      'already_exists', true
    );
  END IF;

  -- Update profile role to dentist
  UPDATE profiles
  SET role = 'dentist', updated_at = now()
  WHERE id = v_profile_id;

  -- Create a placeholder business
  INSERT INTO businesses (name, slug, owner_profile_id, created_at, updated_at)
  VALUES (
    'New Business',
    'new-biz-' || substr(v_profile_id::text, 1, 8),
    v_profile_id,
    now(), now()
  )
  RETURNING id INTO v_business_id;

  -- Create dentist record (no business_id column on dentists)
  INSERT INTO dentists (profile_id, is_active, created_at, updated_at)
  VALUES (v_profile_id, true, now(), now())
  ON CONFLICT (profile_id) DO UPDATE SET is_active = true
  RETURNING id INTO v_dentist_id;

  -- Create business_members record
  INSERT INTO business_members (business_id, profile_id, role, created_at, updated_at)
  VALUES (v_business_id, v_profile_id, 'owner', now(), now());

  -- Add provider role
  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id, 'provider'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

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
    RAISE WARNING 'Error initializing OAuth business owner: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;