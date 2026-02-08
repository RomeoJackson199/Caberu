

# Comprehensive Audit: Timezone Handling and Encryption Review

## Summary of Findings

After auditing 70+ files across the frontend and 57 edge functions, I found **14 distinct issues** across timezone handling, encryption correctness, and related concerns.

---

## TIMEZONE ISSUES

### Issue 1: `send-appointment-reminders` uses browser-locale formatting instead of Brussels timezone
**File:** `supabase/functions/send-appointment-reminders/index.ts` (lines 88-98)
**Problem:** Uses `toLocaleDateString()` and `toLocaleTimeString()` which use the Deno server's locale (likely UTC), not `Europe/Brussels`. Patient reminder emails will show the wrong time.
**Fix:** Import `date-fns-tz` and use `toZonedTime` + `format` with `Europe/Brussels`, matching the pattern already used in `send-appointment-decision` and `cancel-vacation-appointments`.

### Issue 2: `useAppointments.tsx` email formatting uses browser-locale time
**File:** `src/hooks/useAppointments.tsx` (lines 174-184)
**Problem:** Confirmation emails built in the frontend hook use `toLocaleDateString()` / `toLocaleTimeString()` on the raw UTC date. If the user's browser is not in Brussels timezone, the email will show incorrect times.
**Fix:** Replace with `formatClinicTime()` from `@/lib/timezone` for both date and time.

### Issue 3: `exportUtils.ts` exports appointment times in browser-local timezone
**File:** `src/lib/exportUtils.ts` (lines 136-138)
**Problem:** CSV/data exports use `toLocaleDateString()` and `toLocaleTimeString()` which vary by browser. Exported data will have inconsistent timestamps.
**Fix:** Use `formatClinicTime()` to ensure all exported times are in Brussels timezone.

### Issue 4: `AIConversationDialog.tsx` displays timestamps with `toLocaleTimeString()`
**File:** `src/components/AIConversationDialog.tsx` (line 272)
**Problem:** Chat message timestamps use `toLocaleTimeString()` without timezone specification. Minor, since these are ephemeral UI elements, but inconsistent with the rest of the app.
**Fix:** Use `formatClinicTime()` or at minimum specify `Europe/Brussels` as the timezone option.

### Issue 5: `createAppointmentDateTime()` does NOT use Brussels timezone
**File:** `src/lib/timezone.ts` (lines 50-62), used in `InteractiveDentalChat.tsx`
**Problem:** This function creates a Date using raw `new Date(year, month, day, hours, minutes)` which interprets time in the **browser's local timezone**, not Brussels. Unlike its sibling `createAppointmentDateTimeFromStrings()` which correctly uses `fromZonedTime()`, this function is timezone-unsafe. If a user books from a different timezone, the appointment time will be wrong.
**Fix:** Rewrite to use `fromZonedTime()` with `Europe/Brussels`, matching `createAppointmentDateTimeFromStrings()`.

### Issue 6: Multiple frontend components use `format(new Date(...), ...)` without timezone conversion
**Files:** `availability-settings.tsx` (line 645), `TreatmentPlanDetailView.tsx` (lines 358, 498-503, 528, 557), `DentistAnalyticsDashboard.tsx`, `DemoClinicalTodayEnhanced.tsx`
**Problem:** `format(new Date(appointment.appointment_date), 'h:mm a')` displays in the browser's local timezone rather than Brussels. For users outside Belgium (or for consistency), these should all use `formatClinicTime()`.
**Fix:** Replace `format(new Date(...), ...)` with `formatClinicTime(...)` for all appointment-related date displays.

---

## ENCRYPTION ISSUES

### Issue 7: 12 of 14 encryption triggers still use `encrypt_to_base64()` (master key) instead of `encrypt_with_business_key()`
**File:** `supabase/migrations/20260207060609_...` created triggers for appointments, medical_records, treatment_plans, notes, messages, chat_messages, patient_allergies, communication_logs, email_logs, imaging_sets, patient_documents, and the phone-related tables -- ALL using `encrypt_to_base64()`.
**File:** `supabase/migrations/20260208072729_...` only fixed 2 triggers (appointment_reminders and imaging_files).
**Problem:** The plan called for updating all 14 triggers to use `encrypt_with_business_key()`, but only 2 were actually updated. The remaining 12 still encrypt with the shared master key, defeating per-business key isolation.
**Fix:** Create a new migration that replaces all 12 remaining trigger functions to use `encrypt_with_business_key(NEW.field, NEW.business_id)`.

### Issue 8: `send-appointment-reminders` reads encrypted `reason` from base `appointments` table via join
**File:** `supabase/functions/send-appointment-reminders/index.ts` (lines 20-50)
**Problem:** The function queries `appointment_reminders` with a join to `appointments`, which returns the **encrypted** PHI fields (reason, notes). Line 140 then puts `appointment.reason` directly into the email HTML -- this means patients receive emails with base64-encoded encrypted gibberish instead of the actual reason.
**Fix:** Either query from `appointments_decrypted` view separately, or restructure the join through the decrypted view.

### Issue 9: `google-calendar-create-event` reads from base `appointments` table
**File:** `supabase/functions/google-calendar-create-event/index.ts`
**Problem:** Selects from `appointments` directly (not `appointments_decrypted`), so the `notes` field it reads and pushes to Google Calendar will be encrypted ciphertext.
**Fix:** Change the SELECT to use `appointments_decrypted`.

### Issue 10: `database-api` returns encrypted data on `create_appointment` and `update_appointment`
**File:** `supabase/functions/database-api/index.ts` (lines 630-663)
**Problem:** After inserting/updating into the base `appointments` table, the `.select()` returns encrypted fields. The API response will contain ciphertext for `reason`, `notes`, etc. The `list_appointments` correctly uses `appointments_decrypted` (line 682), but the write operations do not.
**Fix:** After insert/update, re-fetch from `appointments_decrypted` to return decrypted data.

---

## DATA INTEGRITY / OTHER ISSUES

### Issue 11: Re-encryption of historical data was only done for 2 tables
**Problem:** The migration in `20260208072729` re-encrypted data in `appointment_reminders` and `imaging_files` only. The previous migration `20260207060609` created the triggers but the plan said data would be re-encrypted from master key to business keys across all 14 tables. The main 12 tables (appointments, medical_records, treatment_plans, notes, messages, chat_messages, patient_allergies, communication_logs, email_logs, imaging_sets, patient_documents) still have data encrypted with the master app key.
**Fix:** Run a re-encryption migration for the remaining 12 tables, decrypting with the master key and re-encrypting with each row's business key.

### Issue 12: `secure_profiles_view` still referenced by edge functions but is a passthrough
**Status:** This is not a bug -- `secure_profiles_view` is deliberately kept as a passthrough to `profiles` (which is unencrypted). No action needed but noting for completeness.

### Issue 13: `TreatmentPlanManager.tsx` uses raw `toLocaleDateString()` for dates
**File:** `src/components/TreatmentPlanManager.tsx` (line 104)
**Problem:** `new Date(dateStr).toLocaleDateString()` with no timezone or locale specification.
**Fix:** Use `formatClinicTime()` for consistency.

### Issue 14: Decrypted views for the 12 main tables may still use `decrypt_from_base64()` instead of `decrypt_with_business_key()`
**Problem:** The `*_decrypted` views for the main 12 tables need to be verified. If they still use `decrypt_from_base64()` (which only knows the master key), they won't be able to decrypt data encrypted with business keys once the triggers are fixed.
**Fix:** Verify and update all 12 `*_decrypted` views to use `decrypt_with_business_key(field, business_id)`.

---

## Implementation Plan

### Phase 1: Fix Encryption Triggers (Critical -- data correctness)
1. Create a database migration that:
   - Replaces all 12 remaining `trg_encrypt_*` functions to use `encrypt_with_business_key()`
   - Updates all 12 `*_decrypted` views to use `decrypt_with_business_key(field, business_id)`
   - Re-encrypts historical data from master key to business keys across all tables

### Phase 2: Fix Edge Function Encryption Reads (Critical -- emails show ciphertext)
2. Update `send-appointment-reminders/index.ts` to read from `appointments_decrypted`
3. Update `google-calendar-create-event/index.ts` to read from `appointments_decrypted`
4. Update `database-api/index.ts` write responses to re-fetch from decrypted views

### Phase 3: Fix Timezone Handling (High -- incorrect times in emails)
5. Update `send-appointment-reminders/index.ts` to use `toZonedTime` + `format` with `Europe/Brussels`
6. Update `src/hooks/useAppointments.tsx` email formatting to use `formatClinicTime()`
7. Update `src/lib/exportUtils.ts` to use `formatClinicTime()`
8. Fix `createAppointmentDateTime()` in `timezone.ts` to use `fromZonedTime()`

### Phase 4: Frontend Timezone Consistency (Medium)
9. Update `TreatmentPlanDetailView.tsx` appointment time displays to use `formatClinicTime()`
10. Update `availability-settings.tsx` appointment display to use `formatClinicTime()`
11. Update `TreatmentPlanManager.tsx`, `AIConversationDialog.tsx`, and other locale-dependent displays

### Files Modified
- **Database**: 1 migration (triggers, views, re-encryption)
- **Edge Functions**: 3 files (`send-appointment-reminders`, `google-calendar-create-event`, `database-api`)
- **Frontend**: ~10 files (timezone fixes across components and hooks)
- **Shared**: `src/lib/timezone.ts` (fix `createAppointmentDateTime`)

