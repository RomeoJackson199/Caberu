
# Encryption Cleanup and Per-Business Key Migration

## Overview
This plan consolidates the encryption system by removing broken/unused views, wiring up per-business encryption keys (so each business's data is cryptographically isolated), and cleaning up dead code.

## What Changes

### 1. Drop 13 broken `secure_*_view` views
These views are not used anywhere in the frontend or edge functions and return NULL for encrypted fields. Only `secure_profiles_view` is kept (used by 63+ files as a passthrough).

Views to drop:
- `secure_appointments_view`
- `secure_notes_view`
- `secure_medical_records_view`
- `secure_treatment_plans_view`
- `secure_messages_view`
- `secure_chat_messages_view`
- `secure_patient_allergies_view`
- `secure_communication_logs_view`
- `secure_email_logs_view`
- `secure_imaging_sets_view`
- `secure_imaging_files_view`
- `secure_patient_documents_view`
- `secure_appointment_reminders_view`

### 2. Switch encryption from master key to per-business keys
Currently all data is encrypted with a single shared master key (`private.get_encryption_key()`). This defeats the purpose of having per-business encryption keys.

Changes:
- Create `private.encrypt_with_business_key(plaintext, business_id)` -- encrypts using the business-specific key, falls back to master key if unavailable
- Create `private.decrypt_with_business_key(ciphertext_b64, business_id)` -- decrypts using the business-specific key, falls back to master key
- Update all 14 encryption trigger functions to pass `NEW.business_id` to the new encrypt function
- For tables without a direct `business_id` (like `imaging_files`, `patient_documents`), look up business_id from the parent record (e.g., via `imaging_sets` or `appointments`)
- Update all `*_decrypted` views to use the new `decrypt_with_business_key()` with the row's `business_id`

### 3. Re-encrypt existing data with business keys
A one-time migration script will:
- For each business, retrieve its key
- Decrypt all existing data (currently encrypted with master key)
- Re-encrypt with the business-specific key

### 4. Delete unused `src/lib/secureQueries.ts`
No component imports this file. All 62+ frontend files already reference the `*_decrypted` views directly.

### 5. Update edge function reads (already correct)
The 7 edge functions already use `*_decrypted` views for SELECTs and write to base tables. No changes needed -- the updated views will transparently handle business-key decryption.

## Technical Details

### Database Migration (single SQL migration)

**Part A -- Drop broken views:**
```sql
DROP VIEW IF EXISTS public.secure_appointments_view;
DROP VIEW IF EXISTS public.secure_notes_view;
-- ... (13 total)
```

**Part B -- Business-aware encrypt/decrypt functions:**
```sql
CREATE OR REPLACE FUNCTION private.encrypt_with_business_key(
  plaintext TEXT, p_business_id UUID
) RETURNS TEXT ...
-- Tries business key first, falls back to master key

CREATE OR REPLACE FUNCTION private.decrypt_with_business_key(
  ciphertext_b64 TEXT, p_business_id UUID
) RETURNS TEXT ...
-- Tries business key first, falls back to master key
```

**Part C -- Updated trigger functions:**
Each of the 14 table triggers will be updated. Example for appointments:
```sql
CREATE OR REPLACE FUNCTION private.trg_encrypt_appointments()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.reason IS DISTINCT FROM OLD.reason THEN
    NEW.reason := private.encrypt_with_business_key(NEW.reason, NEW.business_id);
  END IF;
  -- ... other PHI fields
  RETURN NEW;
END; $$;
```

For tables without `business_id` (like `imaging_files`), the trigger will look it up:
```sql
-- imaging_files gets business_id from imaging_sets
SELECT business_id INTO v_biz_id FROM imaging_sets WHERE id = NEW.imaging_set_id;
NEW.metadata := private.encrypt_with_business_key(NEW.metadata::text, v_biz_id);
```

**Part D -- Updated decrypted views:**
```sql
CREATE OR REPLACE VIEW public.appointments_decrypted AS
SELECT
  id, patient_id, dentist_id, business_id, appointment_date, status, ...
  private.decrypt_with_business_key(reason, business_id) AS reason,
  private.decrypt_with_business_key(notes, business_id) AS notes,
  -- ... other PHI fields
FROM public.appointments;
```

**Part E -- Re-encrypt existing data:**
A DO block loops through each business and re-encrypts all data from master key to business key.

### Frontend Changes
- Delete `src/lib/secureQueries.ts` (unused file)
- No other frontend changes needed

### Tables and their business_id resolution

| Table | Has `business_id`? | Resolution |
|---|---|---|
| appointments | Yes | Direct |
| medical_records | Yes | Direct |
| treatment_plans | Yes | Direct |
| notes | Yes | Direct |
| messages | Yes | Direct |
| chat_messages | No | Via `appointments.business_id` using `appointment_id` |
| patient_allergies | No | Via `appointments.business_id` using `patient_id` (latest) |
| communication_logs | Yes | Direct |
| email_logs | Yes | Direct |
| imaging_sets | Yes | Direct |
| imaging_files | No | Via `imaging_sets.business_id` using `imaging_set_id` |
| patient_documents | No | Via `appointments.business_id` using `patient_id` (latest) |
| appointment_reminders | No | Via `appointments.business_id` using `appointment_id` |

## Risk Mitigation
- The decrypt function tries the business key first, then falls back to the master key, so existing data encrypted with the master key will still be readable during and after migration
- If a business key is missing, encryption gracefully falls back to the master key
- The re-encryption step is idempotent and can be re-run safely

## Summary of Changes
- 1 database migration (drop views + new functions + update triggers + update views + re-encrypt data)
- 1 file deleted (`src/lib/secureQueries.ts`)
- 0 frontend component changes
- 0 edge function changes
