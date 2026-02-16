

# Safe Deletion Logic for Dentists, Patients, and Businesses

## Problem

The current system uses **hard deletes** throughout -- the `delete-user-account` edge function permanently removes appointments, prescriptions, medical records, and profiles. The `handleRemoveDentist` function deletes `business_members` rows directly. There is no business archival system. In a healthcare application handling PHI, this violates data retention requirements (Belgian law: 7 years, HIPAA: 6 years) and breaks audit traceability.

## Solution Overview

Replace all destructive deletion paths with soft-delete/anonymization patterns that preserve historical data integrity.

---

## 1. Database Migrations

### 1a. Add status columns

- `businesses`: Add `status TEXT NOT NULL DEFAULT 'active'` (values: `active`, `archived`)
- `profiles`: Already has `patient_status` column -- will use it consistently (values: `active`, `anonymized`)
- `dentists`: Already has `is_active BOOLEAN` -- add `status TEXT NOT NULL DEFAULT 'active'` (values: `active`, `inactive`, `archived`) for richer semantics while keeping `is_active` synced

### 1b. Create `safe_deactivate_dentist` function (SECURITY DEFINER)

- Sets `dentists.status = 'inactive'`, `dentists.is_active = false`
- Removes from `business_members` for that business only
- Revokes `provider` role if no other business memberships remain
- Cancels future pending/confirmed appointments for this dentist
- Logs action to `audit_logs`
- Does NOT touch any historical appointment/treatment `dentist_id` references

### 1c. Create `safe_anonymize_patient` function (SECURITY DEFINER)

- Updates `profiles`: `first_name = 'Deleted'`, `last_name = 'Patient'`, `email = anonymized placeholder`, `phone = NULL`, `address = NULL`, `date_of_birth = NULL`, `medical_history = NULL`, `emergency_contact = NULL`, `avatar_url = NULL`, `profile_picture_url = NULL`, `patient_status = 'anonymized'`
- Redacts appointment free-text fields (`reason`, `notes`, `consultation_notes`, `ai_summary`) but keeps dates, status, `patient_id`, `dentist_id`
- Keeps invoices, treatment plans (redacts free-text notes)
- Deletes prescriptions, patient_notes, patient_documents, communication_logs, patient_allergies (clinical detail that could re-identify)
- Withdraws all active consents
- Disables auth login via `auth.admin.updateUserById` (set `banned_until` far future) -- handled in the edge function
- Logs everything to `gdpr_audit_log`

### 1d. Create `safe_archive_business` function (SECURITY DEFINER)

- Sets `businesses.status = 'archived'`, `subscription_status = 'cancelled'`
- Removes all `session_business` entries for this business
- Cancels all future appointments (`status = 'cancelled'`)
- Deactivates all dentists in this business
- Removes all `business_members` entries (revoking access)
- Does NOT delete any historical data
- Logs to `audit_logs`

### 1e. Update queries to filter by status

- Business selection queries: filter `WHERE status = 'active'`
- Dentist scheduling/listing queries: already filter by `is_active`, will also respect `status != 'archived'`
- Patient listings: filter `WHERE patient_status != 'anonymized'` (or show as "Deleted Patient")

---

## 2. Edge Function Changes

### 2a. Rewrite `delete-user-account` edge function

Replace all hard deletes with:
- Determine if user is a patient or provider
- **Patient path**: Call `safe_anonymize_patient` DB function, then ban the auth user (not delete)
- **Provider path**: Call `safe_deactivate_dentist` for each business, then ban the auth user
- Keep rate limiting and auth checks intact

---

## 3. Frontend Changes

### 3a. `DentistManagement.tsx`

- Replace the "Remove Dentist" trash icon/dialog with a "Deactivate Dentist" button
- Update `handleRemoveDentist` to call `safe_deactivate_dentist` RPC instead of hard-deleting `business_members`
- Show inactive dentists with an "(inactive)" badge in historical views
- Update confirmation dialog text: "This will deactivate the dentist and cancel their future appointments. Past records will be preserved."

### 3b. Patient account deletion (PatientPrivacyDashboard + SettingsPage)

- Update the deletion warning text to clearly state: "Your personal data will be anonymized. Medical records and appointment history will be retained for legal compliance but your identity will be removed."
- The `useAnonymizePatient` hook's underlying `anonymizePatientData` function in `dataSubjectRights.ts` already does most of this -- will align it with the new `safe_anonymize_patient` DB function for consistency

### 3c. Business archival (DentistSettings or Admin)

- Add "Archive Business" button (owner-only, with AlertDialog confirmation)
- Calls `safe_archive_business` RPC
- Warning: "This will archive the business, cancel all future appointments, and revoke team access. Historical data is preserved for compliance."

### 3d. Business selection page (`SelectBusiness.tsx`, `BusinessPicker.tsx`)

- Filter out businesses where `status = 'archived'` from selection lists
- Archived businesses will simply not appear

### 3e. Display patterns

- Dentist names in appointment history: show "(inactive)" suffix when `dentists.status != 'active'`
- Patient names: show "Deleted Patient" when `profiles.patient_status = 'anonymized'`

---

## 4. Existing GDPR Infrastructure Alignment

The existing `process_gdpr_deletion` DB function and `anonymizePatientData` in `dataSubjectRights.ts` will be updated to call the new `safe_anonymize_patient` function, ensuring a single code path for patient anonymization regardless of entry point (patient self-service, admin action, or GDPR request).

---

## Technical Details

### Database functions summary

```text
safe_deactivate_dentist(p_dentist_id UUID, p_business_id UUID)
  -> Sets inactive, removes membership, cancels future appointments, logs audit

safe_anonymize_patient(p_profile_id UUID, p_actor_id UUID, p_reason TEXT)
  -> Anonymizes PII, redacts records, preserves structure, logs audit

safe_archive_business(p_business_id UUID, p_actor_id UUID)
  -> Archives business, cancels appointments, deactivates team, logs audit
```

### Files to create/modify

| File | Change |
|------|--------|
| `supabase/migrations/[new].sql` | Add status columns, create 3 safe deletion functions |
| `supabase/functions/delete-user-account/index.ts` | Replace hard deletes with anonymization + auth ban |
| `src/components/DentistManagement.tsx` | Deactivate instead of remove, UI label changes |
| `src/lib/gdpr/dataSubjectRights.ts` | Call `safe_anonymize_patient` RPC |
| `src/pages/DentistSettings.tsx` | Add "Archive Business" button for owners |
| `src/pages/SelectBusiness.tsx` | Filter archived businesses |
| `src/components/shared/BusinessPicker.tsx` | Filter archived businesses |
| `src/lib/translations.ts` | Add translation keys for new labels |

