-- CRITICAL FIX: Remove ALL policies on businesses and create simple ones
-- Error: 42P17 infinite recursion on businesses table

-- First, list and drop ALL existing policies on businesses
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'businesses'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.businesses', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Create simple, non-recursive policies for businesses
-- 1. PUBLIC can read all businesses (for login page selector)
CREATE POLICY "businesses_public_read"
  ON public.businesses
  FOR SELECT
  TO public
  USING (true);

-- 2. Owners can update their own business
CREATE POLICY "businesses_owner_update"
  ON public.businesses
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 3. Authenticated users can insert new businesses  
CREATE POLICY "businesses_auth_insert"
  ON public.businesses
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- 4. Owners can delete their business
CREATE POLICY "businesses_owner_delete"
  ON public.businesses
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());
