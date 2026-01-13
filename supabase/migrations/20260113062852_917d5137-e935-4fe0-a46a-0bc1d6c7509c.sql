-- Fix profiles INSERT policy - profiles.id IS the user_id from auth.uid()
DROP POLICY IF EXISTS profiles_insert_policy ON public.profiles;

CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());