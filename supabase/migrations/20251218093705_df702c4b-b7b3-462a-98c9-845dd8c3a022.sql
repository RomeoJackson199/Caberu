
-- Fix the sync_user_profile_map trigger to handle null user_id
CREATE OR REPLACE FUNCTION public.sync_user_profile_map()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Only sync if user_id is not null (claimed profiles)
    IF NEW.user_id IS NOT NULL THEN
      INSERT INTO public.user_profile_map (user_id, profile_id)
      VALUES (NEW.user_id, NEW.id)
      ON CONFLICT (user_id) DO UPDATE SET profile_id = EXCLUDED.profile_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.user_id IS NOT NULL THEN
      DELETE FROM public.user_profile_map WHERE user_id = OLD.user_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;
