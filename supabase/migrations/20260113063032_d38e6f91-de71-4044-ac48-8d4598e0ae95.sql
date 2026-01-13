-- Fix profiles INSERT policy to check user_id (which is set during insert), not id
DROP POLICY IF EXISTS profiles_insert_policy ON public.profiles;

CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
  
-- Also fix the DELETE policy
DROP POLICY IF EXISTS profiles_delete_policy ON public.profiles;

CREATE POLICY "profiles_delete_policy" ON public.profiles
  FOR DELETE
  USING (user_id = auth.uid());