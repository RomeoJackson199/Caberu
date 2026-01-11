# Fix: Dentist Portal Showing Encrypted Data

## Problem
The dentist portal shows encrypted data (names, phone numbers, etc.) while the patient portal displays data correctly.

## Root Cause
The database view `secure_profiles_view` that handles automatic decryption hasn't been created/updated in your production database yet. The frontend code is correctly using this view, but the database migration hasn't been applied.

## Solution

### Option 1: Apply via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/gjvxcisbaxhhblhsytar
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `fix_dentist_portal_encryption.sql` and paste it into the SQL editor
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned" - this is expected
7. Clear your browser cache or do a hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
8. The dentist portal should now show decrypted patient data

### Option 2: Apply via Supabase CLI

If you have Supabase CLI installed:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link to your project
supabase link --project-ref gjvxcisbaxhhblhsytar

# Apply the migration
supabase db push

# Or run the specific SQL file
psql "$DATABASE_URL" < fix_dentist_portal_encryption.sql
```

### Verification

After applying the fix, you can verify it's working by running this query in the SQL Editor:

```sql
SELECT id, first_name, last_name, email, phone
FROM public.secure_profiles_view
WHERE role = 'patient'
LIMIT 5;
```

You should see decrypted patient data (readable names, not encrypted gibberish).

## What Changed

The fix updates the `secure_profiles_view` to use the correct decryption function:

**Before (broken):**
```sql
current_setting('app.encryption_key', true)  -- Returns NULL
```

**After (fixed):**
```sql
private.get_app_key()  -- Correctly retrieves encryption key from Supabase Vault
```

## Files Modified

- **Frontend code**: Already updated to use `secure_profiles_view` ✓
  - `src/components/dentist-patients/hooks/usePatientData.ts`
  - `src/components/layout/DentistAppShell.tsx`
  - `src/components/analytics/DentistAnalytics.tsx`
  - And 20+ other components

- **Database**: Needs migration applied ⚠️
  - `supabase/migrations/20260111000001_fix_base64_decoding.sql`

## Why Patient Portal Works But Dentist Portal Doesn't

Both portals use the same `secure_profiles_view`, but:
- The patient portal likely has cached decrypted data or is using a different code path
- The dentist portal freshly queries the view each time
- Once the migration is applied, both portals will work correctly

## Need Help?

If you encounter any errors when running the SQL script, please share:
1. The exact error message
2. Screenshot of the error in the SQL Editor
