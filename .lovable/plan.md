

# Comprehensive Audit: Tables and Edge Functions Cleanup

## Summary

After tracing every table and edge function through the codebase, here's a definitive verdict on each. I've categorized everything into **DELETE**, **KEEP**, and **SECURE** (needs JWT or other hardening).

---

## PART 1: TABLES

### Tables Safe to DROP (truly dead -- 0 rows AND no code references)

| Table | Reason |
|-------|--------|
| `communication_metrics` | 0 rows, only in `types.ts` (auto-generated), no app code queries it |
| `usage_metrics` | 0 rows, only in `types.ts`, no app code queries it |
| `subscriptions` | 0 rows except a stale query in `SelectBusiness.tsx` -- subscription tracking moved to `businesses.subscription_*` fields. Remove the stale query too |

### Tables to KEEP (code actively references them, even if 0 rows now)

| Table | Why Keep |
|-------|----------|
| `slot_recommendations` | Used by `smartScheduling.ts` and `geminiAI.ts` -- AI slot tracking, just hasn't been populated yet |
| `treatment_templates` | Used by `TreatmentPlanEditor.tsx` and `TreatmentPlanEditorSheet.tsx` -- template system ready but no templates created yet |
| `medical_records` | Heavily used: `PatientDashboard.tsx`, `AIConversationDialog.tsx`, `HealthData.tsx`, GDPR exports, demo data. PHI table with encryption. **Essential** |
| `communication_logs` | Referenced in GDPR data export/deletion (`dataSubjectRights.ts`, `retentionPolicy.ts`). Keep for compliance |
| `platform_revenue` | Queried by `AdminRevenue.tsx` and `RevenueChart.tsx` -- admin revenue dashboard. Just needs populating |
| `patient_documents` | Used by `PatientRecordsTimeline.tsx`, `PatientAppointmentDetail.tsx`, GDPR deletion. Has `_decrypted` view |
| `patient_tags` + `patient_tag_assignments` | Full hook exists (`usePatientTags.ts`) with tests. Feature is built, just unused |
| `patient_consents` | Actively queried by `consent-utils.ts`, `useAdminData.ts`, `ComplianceTab.tsx`. HIPAA requirement |
| `notification_preferences` | Used by `ReminderPreferences.tsx` -- patient notification settings |
| `email_logs` | Queried by `useAdminData.ts` for admin email log view |
| `ai_knowledge_documents` | Full hook exists (`useAIKnowledgeDocuments.tsx`) with CRUD operations |
| `system_health_checks` | Queried by `SystemHealthTab.tsx` and `useAdminData.ts` |
| `scheduled_downtimes` | Used by `DowntimeManagement.tsx` (admin) and `StatusPage.tsx` (public) |
| `dentist_capacity_settings` | Referenced by `get_dentist_capacity_usage()` DB function. Only in types.ts for frontend but the DB function uses it |
| `appointment_types` | Used by `smartScheduling.ts` for duration/buffer calculations. Redundant with `business_services` but code references it |

### Redundancy Note

- **`appointment_types` vs `business_services`**: Both exist. `business_services` has data, `appointment_types` has 0. Code in `smartScheduling.ts` references `appointment_types`. **Plan**: Keep both for now; a future migration could consolidate them but it's risky to drop while smart scheduling references it.
- **`patient_consents` vs `practice_consents`**: Different scopes -- `patient_consents` is per-patient HIPAA consent; `practice_consents` is practice-level. Both needed.

---

## PART 2: EDGE FUNCTIONS

### Functions to DELETE (no code calls them, not in cron, truly dead)

| Function | Reason |
|----------|--------|
| `send-sms` | **0 frontend invocations**. All SMS goes through `send-sms-verification`. This is a generic SMS sender nobody calls |
| `test-email` | **0 frontend invocations**. Dev-only testing tool. `verify_jwt: false` -- security risk in production |

### Functions to KEEP (actively used)

| Function | Called By |
|----------|-----------|
| `dental-ai-chat` | `aiUtils.ts` -- core AI chat |
| `voice-call-ai` | Voice call system |
| `voice-to-text` | `useVoiceRecording.ts` |
| `claim-profile` | `Claim.tsx` |
| `create-patient-profile` | `AddPatientDialog.tsx` |
| `send-email-notification` | `notificationService.ts` -- central email sender |
| `send-appointment-reminders` | Cron job |
| `send-push-notifications` | `notificationService.ts` |
| `send-2fa-code` | `ForgotPasswordDialog.tsx` |
| `verify-2fa-code` | Auth flow |
| `send-sms-verification` | `PhoneVerificationDialog.tsx`, `PhoneVerificationGate.tsx`, `Onboarding.tsx` |
| `verify-sms-code` | SMS verification flow |
| `reset-password-with-code` | `ForgotPasswordDialog.tsx` |
| `check-login-rate-limit` | `Login.tsx` |
| `send-password-change-notification` | `PatientSecuritySettings.tsx`, `DentistAdminSecurity.tsx` |
| `send-dentist-invitation` | `InviteDentistDialog.tsx`, `AddUserDialog.tsx` |
| `send-import-invitations` | `DataImportManager.tsx` |
| `send-patient-invitation` | Patient invitation flow |
| `send-appointment-decision` | Appointment decision flow |
| `send-payment-reminder` | Payment reminder system |
| `process-csv-import` | CSV import |
| `create-payment-request` | Payment creation |
| `update-payment-status` | Payment status updates |
| `create-subscription-checkout` | `BusinessSubscriptionStep.tsx` |
| `stripe-subscription-webhook` | Stripe webhook |
| `create-business-payment` | `BusinessPaymentStep.tsx` |
| `complete-business-subscription` | Business creation flow |
| `complete-business-setup` | Business setup flow |
| `create-healthcare-business` | `useSuperAdmin.ts` |
| `business-creation-ai` | Business creation AI flow |
| `set-current-business` | `Signup.tsx` |
| `apply-promo-code` | Promo system |
| `validate-promo-code` | `BusinessPaymentStep.tsx` |
| `cancel-subscription` | `CancelSubscriptionSection.tsx` |
| `schedule-plan-change` | `Pricing.tsx` |
| `google-calendar-oauth` | Google Calendar integration |
| `google-calendar-sync` | Google Calendar sync |
| `google-calendar-create-event` | Calendar event creation |
| `elevenlabs-webhook` | Voice AI webhook |
| `health-check` | `DiagnosticsCard.tsx` |
| `generate-data-export` | `PatientSecuritySettings.tsx` |
| `delete-user-account` | `PatientSecuritySettings.tsx` |
| `caberu-support-chat` | Support chat |
| `ai-slot-recommendations` | AI scheduling |
| `appointment-ai-assistant` | Appointment AI |
| `generate-appointment-summary` | Appointment summaries |
| `cancel-vacation-appointments` | Vacation management |
| `get-imaging-url` | Imaging system |
| `upload-imaging` | Imaging uploads |
| `get-vapid-key` | Push notifications |
| `create-stripe-connect-account` | Stripe Connect |
| `check-stripe-connect-status` | `StripeConnectSettings.tsx` |
| `database-api` | MCP server / external integrations (not frontend) |
| `make-super-admin` | `QuickActionsCard.tsx` |
| `gdpr-retention-enforcement` | HIPAA/GDPR cron job |

### Functions Called but NOT in Filesystem (ghost references)

| Function | Called By | Status |
|----------|-----------|--------|
| `run-tests` | `TestStatusTab.tsx`, `DiagnosticsCard.tsx` | **Does not exist** in `supabase/functions/`. These UI components will fail silently. Either create it or remove the UI references |

### Duplicate Concern: `check-stripe-connect-account-status`

The user mentioned this -- it does **NOT exist** in the filesystem or codebase. Only `check-stripe-connect-status` exists. No duplicate.

---

## PART 3: SECURITY -- `verify_jwt: false` AUDIT

Every function with `verify_jwt: false` reviewed:

| Function | Verdict | Reasoning |
|----------|---------|-----------|
| `dental-ai-chat` | OK | Public-facing chatbot for clinic websites. Has its own business_id validation |
| `business-creation-ai` | OK | Part of public business creation flow |
| `voice-call-ai` | OK | Receives external voice calls (Twilio/ElevenLabs) |
| `claim-profile` | OK | Public claim flow, validates email internally |
| `send-email-notification` | OK | Called internally by other functions, not exposed to users directly |
| `send-appointment-reminders` | OK | Cron job triggered, no user-facing endpoint |
| `send-push-notifications` | OK | Internal service |
| `elevenlabs-webhook` | OK | External webhook with signature verification |
| `check-login-rate-limit` | OK | Must work pre-auth by design |
| `send-2fa-code` | OK | Must work pre-auth (recovery flow) |
| `verify-2fa-code` | OK | Must work pre-auth |
| `send-sms-verification` | OK | Must work pre-auth (phone verification) |
| `verify-sms-code` | OK | Must work pre-auth |
| `reset-password-with-code` | OK | Must work pre-auth |
| `stripe-subscription-webhook` | OK | Stripe webhook with signature verification |
| `create-business-payment` | OK | Public payment initiation |
| `health-check` | OK | Public health endpoint |
| `test-email` | **DELETE** | Dev tool, no JWT, security risk |
| **`make-super-admin`** | **SECURE** | Anyone can call this and grant super admin. Must add JWT + super_admin role check |
| **`database-api`** | **SECURE** | Full DB access with service role key, no auth. Must add auth or IP allowlisting |

---

## PART 4: Implementation Plan

### Step 1: Delete Dead Edge Functions
- Delete `send-sms/index.ts` and remove from `config.toml`
- Delete `test-email/index.ts` and remove from `config.toml`

### Step 2: Secure Dangerous Functions
- **`make-super-admin`**: Add JWT verification in code -- require `Authorization` header, verify the caller is already a `super_admin` using `getClaims()` + role check before granting
- **`database-api`**: Add an API key check (e.g., check for a secret `DATABASE_API_KEY` header) or add JWT verification. Since this is used by external MCP/voice systems, an API key approach is more practical

### Step 3: Drop Dead Tables (migration)
```sql
DROP TABLE IF EXISTS communication_metrics CASCADE;
DROP TABLE IF EXISTS usage_metrics CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
```

### Step 4: Fix Ghost Function References
- Remove `run-tests` invocation from `TestStatusTab.tsx` and `DiagnosticsCard.tsx` (or create the function if you want test-running capability)

### Step 5: Clean Up Stale Code
- Remove the `subscriptions` table query from `SelectBusiness.tsx`

### Technical Details

**`make-super-admin` secured version:**
```typescript
// Add at the top of the handler:
const authHeader = req.headers.get('Authorization');
if (!authHeader?.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}
const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: authHeader } }
});
const { data: claims, error: claimsError } = await supabaseAuth.auth.getClaims(
  authHeader.replace('Bearer ', '')
);
if (claimsError || !claims?.claims?.sub) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}
// Check caller is super_admin
const { data: callerRole } = await supabaseAdmin
  .from('user_roles')
  .select('role')
  .eq('user_id', claims.claims.sub)
  .eq('role', 'super_admin')
  .single();
if (!callerRole) {
  return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
}
```

**`database-api` secured with API key:**
```typescript
const apiKey = req.headers.get('x-api-key');
const expectedKey = Deno.env.get('DATABASE_API_KEY');
if (!expectedKey || apiKey !== expectedKey) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}
```

