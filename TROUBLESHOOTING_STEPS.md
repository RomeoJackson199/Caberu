# Troubleshooting: Dentist Portal Still Shows Encrypted Data

## Run These Diagnostic Queries First

Open your Supabase SQL Editor and run these queries **one at a time** to identify the issue:

### Step 1: Check if the view exists
```sql
SELECT viewname, definition
FROM pg_views
WHERE viewname = 'secure_profiles_view';
```
**Expected:** Should return 1 row
**If empty:** The view wasn't created. Run `fix_dentist_portal_encryption_COMPLETE.sql`

---

### Step 2: Check if encrypted columns exist
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name LIKE '%encrypted%';
```
**Expected:** Should return columns like `first_name_encrypted`, `last_name_encrypted`, etc.
**If empty:** Run the migration below to add encrypted columns

---

### Step 3: Check if the encryption key function exists
```sql
SELECT private.get_app_key();
```
**Expected:** Should return a key value or "SUCCESS"
**If error:** The encryption setup is incomplete. See "Missing Encryption Setup" below

---

### Step 4: Test the view directly
```sql
SELECT id, first_name, last_name, email
FROM public.secure_profiles_view
WHERE role = 'patient'
LIMIT 3;
```
**Expected:** Should return decrypted patient names
**If still encrypted or NULL:** See "Data Issues" below

---

## Common Issues & Fixes

### Issue 1: Encrypted Columns Don't Exist

If Step 2 shows no encrypted columns, run this:

```sql
-- Add encrypted columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name_encrypted TEXT,
ADD COLUMN IF NOT EXISTS last_name_encrypted TEXT,
ADD COLUMN IF NOT EXISTS phone_encrypted TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth_encrypted TEXT,
ADD COLUMN IF NOT EXISTS medical_history_encrypted TEXT,
ADD COLUMN IF NOT EXISTS address_encrypted TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_encrypted TEXT;
```

Then run `fix_dentist_portal_encryption_COMPLETE.sql` again.

---

### Issue 2: Encryption Key Function Missing

If Step 3 fails, you need to create the encryption infrastructure. Run these in order:

```sql
-- 1. Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create private schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS private;

-- 3. Create the get_app_key function
CREATE OR REPLACE FUNCTION private.get_app_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, vault
AS $$
DECLARE
    encryption_key TEXT;
BEGIN
    -- Get the encryption key from Supabase Vault
    SELECT decrypted_secret INTO encryption_key
    FROM vault.decrypted_secrets
    WHERE name = 'app_encryption_key'
    LIMIT 1;

    IF encryption_key IS NULL THEN
        RAISE EXCEPTION 'Encryption key not found in vault. Please set it using: SELECT vault.create_secret(''[YOUR_KEY]'', ''app_encryption_key'');';
    END IF;

    RETURN encryption_key;
END;
$$;
```

---

### Issue 3: Encryption Key Not Set in Vault

If the function exists but returns an error about missing key:

```sql
-- Set the encryption key (replace YOUR_32_CHAR_KEY with your actual key)
SELECT vault.create_secret('YOUR_32_CHAR_KEY_HERE_CHANGE_THIS', 'app_encryption_key');
```

⚠️ **IMPORTANT:** Use a strong 32-character key. If you don't have one, generate it:
```bash
openssl rand -base64 32
```

---

### Issue 4: Data Has Never Been Encrypted

If the encrypted columns exist but are all NULL/empty, it means your data was never encrypted. In this case:

```sql
-- The view should just return the plaintext fields
-- Verify this query returns readable data:
SELECT id, first_name, last_name
FROM public.profiles
WHERE role = 'patient'
LIMIT 3;
```

If this returns readable names, but the dentist portal doesn't, then it's a **frontend caching issue**:
1. Hard refresh the browser (Cmd+Shift+R / Ctrl+Shift+R)
2. Clear browser cache
3. Log out and log back in
4. Check browser console for errors (F12 → Console tab)

---

### Issue 5: View Has Wrong Column Names

Run this to see what columns the view actually has:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'secure_profiles_view'
ORDER BY ordinal_position;
```

Compare this with what your frontend code expects. If columns are missing, run `fix_dentist_portal_encryption_COMPLETE.sql`.

---

## Still Not Working?

Share the results of all 4 diagnostic queries above, and I'll help pinpoint the exact issue. Also check:

1. **Browser Console Errors**: Press F12, go to Console tab, refresh page, share any red errors
2. **Network Tab**: Press F12, go to Network tab, find the query to `secure_profiles_view`, share the response
3. **Which migration files have been applied**: Run this query:
```sql
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 10;
```
