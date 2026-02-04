# Patient Data Privacy & Security Documentation

## 🚨 CRITICAL: Patient Data Access Control

This document outlines security measures implemented and **required additional protections** for patient data privacy in the Caberu dental application.

---

## ✅ Implemented Security Measures

### 0. **Field-Level Encryption Scope** ✅ IMPLEMENTED
The following patient data is encrypted at the column level (PGP symmetric encryption with Vault-managed key) and accessed through secure views:

- **Appointment reason / chief complaint** → `appointments.reason`
- **Diagnosis & treatment plan details** → `treatment_plans.diagnosis`, `treatment_plans.description`, `treatment_plans.title`, `treatment_plans.notes`, `treatment_plans.procedures`, `treatment_plans.treatment_goals`
- **Procedure notes (what was done)** → `treatment_procedures.procedure_name`, `treatment_procedures.description`, `treatment_procedures.notes`, `medical_records.treatment_provided`
- **Prescriptions / medication info** → `prescriptions.medication_name`, `prescriptions.dosage`, `prescriptions.frequency`, `prescriptions.duration_days`, `prescriptions.instructions`
- **Allergies, conditions, risks** → `patient_allergies.allergy_name`, `patient_allergies.notes`
- **Clinician observations (free text)** → `notes.content`, `notes.title`
- **Referrals, lab/imaging results** → `medical_records.title`, `medical_records.description`, `medical_records.findings`
- **Media & documents metadata** → `imaging_sets.notes`, `imaging_files.metadata`, `patient_documents.title`, `patient_documents.file_name`

Storage objects (X-rays, intraoral photos, scans, PDFs, and uploaded documents) are stored in private buckets with signed URL access and provider-managed encryption at rest.

Patient identifiers (names, phone numbers, addresses, dates of birth) are intentionally left unencrypted for operational needs; only the appointment reason is encrypted on appointments.

### 1. **AI Response Sanitization** (Edge Functions)
- ✅ Filters patient IDs and user IDs from AI responses
- ✅ Blocks disclosure of system prompts and technical details
- ✅ Prevents edge function name leaks

### 2. **Patient Context Validation** (dental-ai-chat)
- ✅ Validates patient_context contains patient ID
- ✅ Filters out medical records from wrong patients
- ✅ Enforces single-patient scope per conversation

### 3. **AI Privacy Instructions**
- ✅ HIPAA compliance rules in system prompts
- ✅ Explicit instructions to not share other patients' data
- ✅ Conversation isolation enforcement

### 4. **Row Level Security (RLS) Policies** ✅ IMPLEMENTED
- ✅ Medical records: Patients see own, business staff see their patients
- ✅ Treatment plans: Patients see own, business staff see their patients
- ✅ Clinical notes: Patients see non-private notes, dentists see all for their patients
- ✅ Patient allergies: Patients see own, business staff can manage
- ✅ Patient documents: Patients see own, business staff can manage
- ✅ Profiles: Users see own, dentists see their patients
- ✅ Chat messages: Users see own, dentists see appointment-linked messages
- ✅ Imaging sets: Patients see own, business staff can manage

### 5. **Security Definer Functions** ✅ IMPLEMENTED
- ✅ `get_user_profile_id()` - Safe profile lookup
- ✅ `is_business_owner()` - Owner verification
- ✅ `is_business_member()` - Membership check
- ✅ `is_business_staff()` - Staff role check
- ✅ `is_dentist()` - Dentist verification
- ✅ `dentist_has_patient_access()` - Patient access control
- ✅ All functions have `SET search_path = public` for security

---

## ⚠️ REMAINING SECURITY ITEMS

### **Configuration Changes (Supabase Dashboard)**
These must be configured in the Supabase Dashboard:

1. **Auth OTP Expiry** - Reduce OTP expiry time
   - Dashboard → Authentication → Settings → OTP expiry
   - Recommended: 5-10 minutes

2. **Leaked Password Protection** - Enable in Dashboard
   - Dashboard → Authentication → Settings → Enable "Leaked password protection"

3. **Postgres Upgrade** - Apply security patches
   - Dashboard → Database → Settings → Upgrade Postgres

### **Edge Function Authorization** (Phase 2 - Recommended)
For maximum security, edge functions should validate user authorization:

```typescript
// Example: Use user's JWT instead of service role for patient data
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  throw new Error('Unauthorized');
}

// Create user-scoped client (RLS enforced)
const userSupabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_ANON_KEY'),
  { global: { headers: { Authorization: authHeader } } }
);

// Now RLS policies will be enforced
const { data } = await userSupabase
  .from('medical_records')
  .select('*')
  .eq('patient_id', patientId);
```

---

## 🔒 Authorization Validation Checklist

### **Frontend Validation:**
- ✅ Verify current user is authenticated
- ✅ Only pass current user's profile as `user_profile`
- ✅ For dentist mode: Verify dentist is assigned to patient
- ✅ Never pass patient_context from URL parameters or user input
- ✅ Use session-based user identification only

### **Backend Validation (RLS):**
- ✅ RLS policies enforce data access at database level
- ✅ Security definer functions prevent recursion issues
- ✅ All functions have immutable search_path

---

## 📋 Security Functions Reference

### `public.get_user_profile_id(user_id uuid)`
Returns the profile ID for a given auth user ID.

### `public.is_business_owner(user_id uuid, business_id uuid)`
Returns true if the user owns the specified business.

### `public.is_business_member(profile_id uuid, business_id uuid)`
Returns true if the profile is a member of the business.

### `public.is_business_staff(user_id uuid, business_id uuid)`
Returns true if the user is staff (owner, admin, or dentist) at the business.

### `public.is_dentist(user_id uuid)`
Returns true if the user is an active dentist.

### `public.dentist_has_patient_access(user_id uuid, patient_id uuid)`
Returns true if the dentist has had an appointment with the patient.

---

## 🔍 Testing Recommendations

### **Test Cases:**
1. **User A tries to access User B's data** - Should fail (RLS blocks)
2. **Dentist tries to access unassigned patient** - Should fail
3. **Expired session tries to access data** - Should fail
4. **AI prompt injection to get other patient data** - Should be blocked
5. **Direct edge function call without auth** - Should fail

### **Verification Queries:**
```sql
-- Check RLS is enabled on sensitive tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('medical_records', 'treatment_plans', 'notes', 'profiles', 'patient_allergies', 'patient_documents', 'imaging_sets', 'chat_messages');

-- Verify all should show rowsecurity = true
```

---

## 📞 Compliance Requirements

### **HIPAA Compliance:**
- ✅ Data encryption in transit (HTTPS)
- ✅ AI response sanitization
- ✅ Access controls (RLS implemented)
- ⚠️ Audit logging (basic implementation)
- ✅ Data minimization in AI prompts

### **GDPR Compliance:**
- ✅ Data subject access rights (GDPR export function)
- ✅ Right to be forgotten (GDPR deletion function)
- ⚠️ Data portability (partial)
- ⚠️ Consent management (partial)

---

## 📝 Change Log

### 2025-01-05 - Security Hardening
- ✅ Implemented SECURITY DEFINER functions with proper search_path
- ✅ Strengthened RLS policies for all patient data tables
- ✅ Added `is_business_staff` and `dentist_has_patient_access` helpers
- ✅ Fixed overly permissive `true` policies on businesses table
- ✅ Removed public profile visibility - now scoped to authenticated access
