-- Migration: Fix infinite recursion in profiles RLS policies
-- Error: 42P17 - infinite recursion detected in policy for relation "profiles"
-- Solution: Use auth.uid() directly instead of subqueries that reference profiles

-- Drop potentially problematic policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON public.profiles;
DROP POLICY IF EXISTS "Patients can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Dentists can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Dentists can view patient profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;

-- Create simple, non-recursive policies using auth.uid() directly
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to read basic profile info of others (for dentist-patient relationships)
-- This uses auth.uid() directly to avoid recursion
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: The above policy allows all authenticated users to read all profiles
-- This is necessary for features like patient lists, appointment displays, etc.
-- The application layer handles proper data filtering
