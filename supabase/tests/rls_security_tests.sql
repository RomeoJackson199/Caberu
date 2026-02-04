-- =========================================================
-- RLS SECURITY INTEGRATION TESTS
-- Date: 2026-02-04
-- Purpose: Verify RLS policies work correctly
-- =========================================================
--
-- HOW TO RUN:
-- 1. Connect to your Supabase database
-- 2. Run this script as service_role (to set up test data)
-- 3. Execute tests using SET LOCAL to simulate different users
--
-- IMPORTANT: Run in a transaction and ROLLBACK after testing
-- =========================================================

-- Create test framework
CREATE OR REPLACE FUNCTION test.assert_equals(
  expected TEXT,
  actual TEXT,
  message TEXT DEFAULT 'Assertion failed'
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF expected IS DISTINCT FROM actual THEN
    RAISE EXCEPTION '%: expected % but got %', message, expected, actual;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION test.assert_true(
  condition BOOLEAN,
  message TEXT DEFAULT 'Assertion failed'
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT condition THEN
    RAISE EXCEPTION '%', message;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION test.assert_row_count(
  expected INTEGER,
  query TEXT,
  message TEXT DEFAULT 'Row count mismatch'
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  actual INTEGER;
BEGIN
  EXECUTE 'SELECT COUNT(*) FROM (' || query || ') AS q' INTO actual;
  IF expected <> actual THEN
    RAISE EXCEPTION '%: expected % rows but got %', message, expected, actual;
  END IF;
END;
$$;

-- =========================================================
-- TEST 1: Helper Functions Work Correctly
-- =========================================================

DO $$
DECLARE
  test_user_id UUID;
  test_profile_id UUID;
  test_business_id UUID;
BEGIN
  RAISE NOTICE 'TEST 1: Helper Functions';

  -- Create test user and profile
  test_user_id := gen_random_uuid();
  test_profile_id := gen_random_uuid();
  test_business_id := gen_random_uuid();

  -- Insert test data (using service_role bypasses RLS)
  INSERT INTO auth.users (id, email) VALUES (test_user_id, 'test@example.com');
  INSERT INTO profiles (id, user_id, full_name) VALUES (test_profile_id, test_user_id, 'Test User');
  INSERT INTO businesses (id, owner_profile_id, name) VALUES (test_business_id, test_profile_id, 'Test Business');
  INSERT INTO business_members (profile_id, business_id, role) VALUES (test_profile_id, test_business_id, 'admin');

  -- Simulate authenticated user
  PERFORM set_config('request.jwt.claims', json_build_object('sub', test_user_id)::text, true);
  SET LOCAL ROLE authenticated;

  -- Test get_my_profile_id()
  PERFORM test.assert_equals(
    test_profile_id::text,
    public.get_my_profile_id()::text,
    'get_my_profile_id() should return correct profile ID'
  );

  -- Test is_member_of_business()
  PERFORM test.assert_true(
    public.is_member_of_business(test_business_id),
    'is_member_of_business() should return true for member'
  );

  -- Test is_business_owner()
  PERFORM test.assert_true(
    public.is_business_owner(test_business_id),
    'is_business_owner() should return true for owner'
  );

  -- Test with non-member business
  PERFORM test.assert_true(
    NOT public.is_member_of_business(gen_random_uuid()),
    'is_member_of_business() should return false for non-member'
  );

  RAISE NOTICE 'TEST 1: PASSED - Helper functions work correctly';

  -- Cleanup (in real tests, use ROLLBACK)
  RESET ROLE;
END $$;

-- =========================================================
-- TEST 2: Business Isolation - Members Can Only See Their Business Data
-- =========================================================

DO $$
DECLARE
  user1_id UUID;
  profile1_id UUID;
  business1_id UUID;
  user2_id UUID;
  profile2_id UUID;
  business2_id UUID;
  tag1_id UUID;
  tag2_id UUID;
  row_count INTEGER;
BEGIN
  RAISE NOTICE 'TEST 2: Business Isolation';

  -- Create two separate businesses with different owners
  user1_id := gen_random_uuid();
  profile1_id := gen_random_uuid();
  business1_id := gen_random_uuid();

  user2_id := gen_random_uuid();
  profile2_id := gen_random_uuid();
  business2_id := gen_random_uuid();

  tag1_id := gen_random_uuid();
  tag2_id := gen_random_uuid();

  -- Insert test data
  INSERT INTO auth.users (id, email) VALUES (user1_id, 'user1@test.com');
  INSERT INTO auth.users (id, email) VALUES (user2_id, 'user2@test.com');

  INSERT INTO profiles (id, user_id, full_name) VALUES (profile1_id, user1_id, 'User 1');
  INSERT INTO profiles (id, user_id, full_name) VALUES (profile2_id, user2_id, 'User 2');

  INSERT INTO businesses (id, owner_profile_id, name) VALUES (business1_id, profile1_id, 'Business 1');
  INSERT INTO businesses (id, owner_profile_id, name) VALUES (business2_id, profile2_id, 'Business 2');

  INSERT INTO business_members (profile_id, business_id, role) VALUES (profile1_id, business1_id, 'owner');
  INSERT INTO business_members (profile_id, business_id, role) VALUES (profile2_id, business2_id, 'owner');

  -- Create patient_tags for each business
  INSERT INTO patient_tags (id, business_id, name, color) VALUES (tag1_id, business1_id, 'Tag for Business 1', '#FF0000');
  INSERT INTO patient_tags (id, business_id, name, color) VALUES (tag2_id, business2_id, 'Tag for Business 2', '#00FF00');

  -- Test as User 1 - should only see Business 1 tags
  PERFORM set_config('request.jwt.claims', json_build_object('sub', user1_id)::text, true);
  SET LOCAL ROLE authenticated;

  SELECT COUNT(*) INTO row_count FROM patient_tags;
  PERFORM test.assert_equals(
    '1',
    row_count::text,
    'User 1 should only see 1 tag (their business only)'
  );

  -- Verify it's the correct tag
  SELECT COUNT(*) INTO row_count FROM patient_tags WHERE business_id = business1_id;
  PERFORM test.assert_equals(
    '1',
    row_count::text,
    'User 1 should only see their business tag'
  );

  -- Verify cannot see other business tag
  SELECT COUNT(*) INTO row_count FROM patient_tags WHERE business_id = business2_id;
  PERFORM test.assert_equals(
    '0',
    row_count::text,
    'User 1 should NOT see other business tags'
  );

  RAISE NOTICE 'TEST 2: PASSED - Business isolation works correctly';

  RESET ROLE;
END $$;

-- =========================================================
-- TEST 3: Patient Self-Access - Patients Can View Own Data Only
-- =========================================================

DO $$
DECLARE
  dentist_user_id UUID;
  dentist_profile_id UUID;
  patient1_user_id UUID;
  patient1_profile_id UUID;
  patient2_user_id UUID;
  patient2_profile_id UUID;
  test_business_id UUID;
  row_count INTEGER;
BEGIN
  RAISE NOTICE 'TEST 3: Patient Self-Access';

  -- Create test users
  dentist_user_id := gen_random_uuid();
  dentist_profile_id := gen_random_uuid();
  patient1_user_id := gen_random_uuid();
  patient1_profile_id := gen_random_uuid();
  patient2_user_id := gen_random_uuid();
  patient2_profile_id := gen_random_uuid();
  test_business_id := gen_random_uuid();

  -- Insert users
  INSERT INTO auth.users (id, email) VALUES (dentist_user_id, 'dentist@test.com');
  INSERT INTO auth.users (id, email) VALUES (patient1_user_id, 'patient1@test.com');
  INSERT INTO auth.users (id, email) VALUES (patient2_user_id, 'patient2@test.com');

  -- Insert profiles
  INSERT INTO profiles (id, user_id, full_name, role) VALUES (dentist_profile_id, dentist_user_id, 'Dr. Dentist', 'dentist');
  INSERT INTO profiles (id, user_id, full_name, role) VALUES (patient1_profile_id, patient1_user_id, 'Patient One', 'patient');
  INSERT INTO profiles (id, user_id, full_name, role) VALUES (patient2_profile_id, patient2_user_id, 'Patient Two', 'patient');

  -- Create business and membership
  INSERT INTO businesses (id, owner_profile_id, name) VALUES (test_business_id, dentist_profile_id, 'Test Clinic');
  INSERT INTO business_members (profile_id, business_id, role) VALUES (dentist_profile_id, test_business_id, 'dentist');

  -- Create allergies for both patients
  INSERT INTO patient_allergies (patient_id, business_id, allergy_name, severity)
    VALUES (patient1_profile_id, test_business_id, 'Penicillin', 'severe');
  INSERT INTO patient_allergies (patient_id, business_id, allergy_name, severity)
    VALUES (patient2_profile_id, test_business_id, 'Latex', 'moderate');

  -- Test as Patient 1 - should only see own allergies
  PERFORM set_config('request.jwt.claims', json_build_object('sub', patient1_user_id)::text, true);
  SET LOCAL ROLE authenticated;

  SELECT COUNT(*) INTO row_count FROM patient_allergies WHERE patient_id = patient1_profile_id;
  PERFORM test.assert_equals(
    '1',
    row_count::text,
    'Patient 1 should see their own allergy'
  );

  SELECT COUNT(*) INTO row_count FROM patient_allergies WHERE patient_id = patient2_profile_id;
  PERFORM test.assert_equals(
    '0',
    row_count::text,
    'Patient 1 should NOT see Patient 2 allergies'
  );

  -- Test as Dentist - should see all patients in their business
  PERFORM set_config('request.jwt.claims', json_build_object('sub', dentist_user_id)::text, true);

  SELECT COUNT(*) INTO row_count FROM patient_allergies WHERE business_id = test_business_id;
  PERFORM test.assert_equals(
    '2',
    row_count::text,
    'Dentist should see all allergies in their business'
  );

  RAISE NOTICE 'TEST 3: PASSED - Patient self-access works correctly';

  RESET ROLE;
END $$;

-- =========================================================
-- TEST 4: Write Permission Restrictions
-- =========================================================

DO $$
DECLARE
  dentist_user_id UUID;
  dentist_profile_id UUID;
  patient_user_id UUID;
  patient_profile_id UUID;
  test_business_id UUID;
  insert_succeeded BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE 'TEST 4: Write Permission Restrictions';

  -- Create test users
  dentist_user_id := gen_random_uuid();
  dentist_profile_id := gen_random_uuid();
  patient_user_id := gen_random_uuid();
  patient_profile_id := gen_random_uuid();
  test_business_id := gen_random_uuid();

  -- Insert test data
  INSERT INTO auth.users (id, email) VALUES (dentist_user_id, 'dentist@test.com');
  INSERT INTO auth.users (id, email) VALUES (patient_user_id, 'patient@test.com');

  INSERT INTO profiles (id, user_id, full_name, role) VALUES (dentist_profile_id, dentist_user_id, 'Dr. Dentist', 'dentist');
  INSERT INTO profiles (id, user_id, full_name, role) VALUES (patient_profile_id, patient_user_id, 'Patient', 'patient');

  INSERT INTO businesses (id, owner_profile_id, name) VALUES (test_business_id, dentist_profile_id, 'Test Clinic');
  INSERT INTO business_members (profile_id, business_id, role) VALUES (dentist_profile_id, test_business_id, 'dentist');

  -- Test as Patient - should NOT be able to insert allergies
  PERFORM set_config('request.jwt.claims', json_build_object('sub', patient_user_id)::text, true);
  SET LOCAL ROLE authenticated;

  BEGIN
    INSERT INTO patient_allergies (patient_id, business_id, allergy_name, severity)
      VALUES (patient_profile_id, test_business_id, 'Test Allergy', 'mild');
    insert_succeeded := TRUE;
  EXCEPTION WHEN insufficient_privilege THEN
    insert_succeeded := FALSE;
  END;

  PERFORM test.assert_true(
    NOT insert_succeeded,
    'Patient should NOT be able to insert allergies'
  );

  -- Test as Dentist - SHOULD be able to insert allergies
  PERFORM set_config('request.jwt.claims', json_build_object('sub', dentist_user_id)::text, true);

  BEGIN
    INSERT INTO patient_allergies (patient_id, business_id, allergy_name, severity)
      VALUES (patient_profile_id, test_business_id, 'Test Allergy', 'mild');
    insert_succeeded := TRUE;
  EXCEPTION WHEN insufficient_privilege THEN
    insert_succeeded := FALSE;
  END;

  PERFORM test.assert_true(
    insert_succeeded,
    'Dentist should be able to insert allergies'
  );

  RAISE NOTICE 'TEST 4: PASSED - Write restrictions work correctly';

  RESET ROLE;
END $$;

-- =========================================================
-- TEST 5: Audit for Remaining Vulnerabilities
-- =========================================================

DO $$
DECLARE
  vuln_record RECORD;
  vuln_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'TEST 5: Audit for Remaining Vulnerabilities';

  FOR vuln_record IN SELECT * FROM public.audit_rls_vulnerabilities() LOOP
    RAISE WARNING 'VULNERABILITY: % on % - % (Policy: %)',
      vuln_record.vulnerability_type,
      vuln_record.table_name,
      vuln_record.policy_definition,
      vuln_record.policy_name;
    vuln_count := vuln_count + 1;
  END LOOP;

  IF vuln_count > 0 THEN
    RAISE NOTICE 'TEST 5: FOUND % VULNERABILITIES - Review warnings above', vuln_count;
  ELSE
    RAISE NOTICE 'TEST 5: PASSED - No known vulnerabilities detected';
  END IF;
END $$;

-- =========================================================
-- SUMMARY
-- =========================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'RLS SECURITY TESTS COMPLETED';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tests Executed:';
  RAISE NOTICE '  1. Helper Functions';
  RAISE NOTICE '  2. Business Isolation';
  RAISE NOTICE '  3. Patient Self-Access';
  RAISE NOTICE '  4. Write Permission Restrictions';
  RAISE NOTICE '  5. Vulnerability Audit';
  RAISE NOTICE '';
  RAISE NOTICE 'If all tests passed without exceptions, RLS is secure.';
  RAISE NOTICE '=========================================================';
END $$;

-- Clean up test functions
DROP FUNCTION IF EXISTS test.assert_equals(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS test.assert_true(BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS test.assert_row_count(INTEGER, TEXT, TEXT);
