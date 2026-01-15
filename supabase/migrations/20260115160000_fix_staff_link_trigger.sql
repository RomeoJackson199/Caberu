-- Fix link_restaurant_staff_on_login trigger to prevent 500 errors during signup
-- Add exception handling so it doesn't block user creation if it fails

CREATE OR REPLACE FUNCTION public.link_restaurant_staff_on_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile_id uuid;
  user_email text;
BEGIN
  -- Get the user's email and profile
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;
  SELECT id INTO user_profile_id FROM profiles WHERE user_id = NEW.id;

  -- Only proceed if we have both email and profile
  IF user_email IS NOT NULL AND user_profile_id IS NOT NULL THEN
    -- Link any pending staff invitations
    UPDATE restaurant_staff_roles
    SET
      profile_id = user_profile_id,
      invitation_status = 'accepted',
      updated_at = now()
    WHERE
      invitation_email = user_email
      AND invitation_status = 'pending'
      AND expires_at > now();
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE WARNING 'link_restaurant_staff_on_login error for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;
