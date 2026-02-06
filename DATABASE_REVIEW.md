# Database & Backend Review - Caberu Dental Practice Management

**Date:** 2026-02-06
**Reviewer:** Automated Code Review
**Scope:** Database migrations, Edge Functions, Supabase client, query patterns, security

---

## CRITICAL SECURITY ISSUES

### 1. `database-api` Edge Function - Complete Auth Bypass (CRITICAL)
**File:** `supabase/functions/database-api/index.ts:49-112`

The `validateAuth()` function **accepts ALL requests regardless of authentication**:
- Line 65: Any request with an `x-internal-service` header is accepted (trivially spoofable)
- Line 76-78: Requests with no auth header are allowed ("allowing internal call")
- Line 100-101: Invalid JWT tokens are silently allowed
- Line 109-111: The final fallback allows everything

This means **anyone** can call the database API and:
- Read patient PII from `profiles`, `appointments`, `notes`, `communication_logs`
- Create/update/delete appointments
- Execute arbitrary read queries on 14+ tables using the service role key

**Impact:** Full data breach of patient medical records (HIPAA violation).

**Fix:** Remove all fallback "allow" paths. Require valid JWT or a properly validated service key.

---

### 2. `make-super-admin` Edge Function - No Auth Required (CRITICAL)
**File:** `supabase/functions/make-super-admin/index.ts`

- `verify_jwt = false` in config.toml (line 103)
- No authentication check whatsoever in the function
- No rate limiting
- Lists ALL users via `auth.admin.listUsers()` (line 32) - information disclosure
- Anyone can grant super_admin privileges to any email address

**Impact:** Complete privilege escalation. Any attacker can become super admin.

**Fix:** Add JWT validation, require existing super_admin role, add rate limiting, add audit logging.

---

### 3. `reset-password-with-code` - Lists All Users in Memory (HIGH)
**File:** `supabase/functions/reset-password-with-code/index.ts:79`

```typescript
const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
```

This loads ALL users into memory to find one by email. This is:
- A **denial-of-service risk** as user count grows (O(n) memory + CPU)
- An **information disclosure risk** (all user data loaded into function memory)
- Extremely inefficient - should use `getUserByEmail()` or filter server-side

---

### 4. `database-api` - SQL Execution Endpoint (HIGH)
**File:** `supabase/functions/database-api/index.ts:757-767`

The `execute_query` action allows executing arbitrary SQL:
```typescript
case 'execute_query': {
    const { query } = params;
    if (!query.trim().toUpperCase().startsWith('SELECT')) {
        throw new Error('Only SELECT queries are allowed');
    }
    const { data, error } = await supabase.rpc('exec_sql', { query });
```

The `startsWith('SELECT')` check is trivially bypassed with:
- `SELECT 1; DROP TABLE profiles; --`
- CTE queries: `WITH x AS (DELETE FROM profiles RETURNING *) SELECT * FROM x`

Combined with the auth bypass above, this is a direct path to data destruction.

---

## HIGH-PRIORITY BUGS

### 5. Slot Generation Creates Phantom Slots (HIGH)
**File:** `supabase/migrations/appointment_slots_functions.sql:98-102`

When no dentist availability is configured, the function falls back to generating 9-5 slots:
```sql
IF v_start_time IS NULL THEN
    v_start_time := '09:00:00'::TIME;
    v_end_time := '17:00:00'::TIME;
END IF;
```

This creates bookable slots for dentists who may not work that day, leading to phantom appointments. The function should return empty if no availability is configured.

---

### 6. Hardcoded Timezone in Slot Availability (HIGH)
**File:** `supabase/migrations/appointment_slots_functions.sql:152-153`

```sql
AND DATE(a.appointment_date AT TIME ZONE 'Europe/Brussels') = p_date
AND (a.appointment_date AT TIME ZONE 'Europe/Brussels')::TIME = s.slot_time
```

The timezone `Europe/Brussels` is hardcoded. Multi-tenant businesses in different timezones will get incorrect slot availability. The timezone should come from the business configuration.

---

### 7. Double-Booking Function Signature Conflicts (MEDIUM)
**Files:**
- `supabase/migrations/20251210_fix_double_booking.sql` - signature: `(UUID, DATE, TEXT, UUID)`
- `supabase/migrations/20251210_fix_doublebooking_race_condition.sql` - signature: `(UUID, DATE, TIME, UUID)`
- `supabase/migrations/appointment_slots_functions.sql` - signature: `(UUID, DATE, TIME, UUID)` (no locking)

Multiple migrations redefine `book_appointment_slot` with different parameter types and different logic. The last migration to run (`appointment_slots_functions.sql` has no timestamp prefix) **replaces the race-condition-safe version with a version that has NO locking**, undoing the double-booking fix entirely.

**Impact:** The double-booking race condition fix may not be active in production.

---

### 8. Account Deletion Incomplete (MEDIUM)
**File:** `supabase/functions/delete-user-account/index.ts:80-122`

The deletion function misses several tables:
- `patient_allergies` - medical allergy data remains
- `patient_documents` - uploaded documents remain
- `patient_tags` / `patient_tag_assignments` - patient categorizations remain
- `chat_messages` - encrypted messages remain
- `notification_preferences` - preferences remain
- `push_subscriptions` - push tokens remain
- `notifications` - notification history remains
- `audit_logs` - audit records remain (may be intentional for compliance)
- `communication_logs` - communication history remains
- `imaging_files` / `imaging_sets` - dental images remain
- `gdpr_requests` - GDPR request records remain
- `patient_consents` - consent records remain

**Impact:** Incomplete GDPR "right to erasure" compliance. Patient data persists after account deletion.

---

### 9. RLS Policy on `appointment_slots` is Overly Permissive (MEDIUM)
**File:** `supabase/migrations/appointment_slots_functions.sql:28-35`

```sql
CREATE POLICY "Users can view slots for their business" ON appointment_slots
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    ) OR business_id IN (
      SELECT id FROM businesses WHERE id = business_id
    )
  );
```

The second condition `SELECT id FROM businesses WHERE id = business_id` is always true (it's a self-referencing tautology). This means **any authenticated user can view all appointment slots across all businesses**.

---

## PERFORMANCE OPTIMIZATIONS

### 10. Missing Indexes on High-Traffic Queries
Several critical query patterns lack supporting indexes:

```sql
-- appointment_slots: queried by (dentist_id, slot_date, business_id) frequently
-- The UNIQUE(dentist_id, slot_date, slot_time) helps some queries but not those filtering by business_id
CREATE INDEX IF NOT EXISTS idx_appointment_slots_business_date
  ON appointment_slots(business_id, slot_date, dentist_id);

-- appointments: DATE() function on appointment_date prevents index use
-- The slot functions use: DATE(appointment_date) = p_date
-- This requires a functional index:
CREATE INDEX IF NOT EXISTS idx_appointments_date_dentist
  ON appointments(dentist_id, (appointment_date::date), status);

-- profiles: email lookups used in claim-profile, create-patient, etc.
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower
  ON profiles(lower(email));

-- verification_codes: queried by (email, code, type, used, expires_at)
CREATE INDEX IF NOT EXISTS idx_verification_codes_lookup
  ON verification_codes(email, type, used, expires_at);
```

### 11. `listUsers()` Called in Multiple Functions (HIGH PERF)
**Files:**
- `supabase/functions/make-super-admin/index.ts:32`
- `supabase/functions/reset-password-with-code/index.ts:79`

Both functions call `supabase.auth.admin.listUsers()` which loads ALL users into memory. As the user base grows, this becomes a bottleneck:
- 10,000 users = ~50MB+ memory per request
- No pagination used
- Should use email-based lookup instead

---

### 12. Over-fetching in `database-api` GET Handlers
**File:** `supabase/functions/database-api/index.ts:402-404`

```typescript
.select('*')  // Fetches ALL columns including encrypted data
.eq('dentist_id', dentist_id)
```

Multiple queries use `SELECT *` where only specific columns are needed. This transfers encrypted PGP data unnecessarily, increasing response sizes and latency.

---

### 13. Slot Generation Loop Creates Individual Inserts
**File:** `supabase/migrations/appointment_slots_functions.sql:106-121`

The `generate_daily_slots` function uses a WHILE loop with individual INSERT statements. For a 9-5 workday with 30-min slots, that's 16 individual inserts + 16 subqueries to check appointments. A single bulk INSERT with a `generate_series()` would be significantly faster.

---

## ADDITIONAL ISSUES

### 14. Deprecated CORS Wildcard Still Exported
**File:** `supabase/functions/_shared/cors.ts:96-100`

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  ...
};
```

While marked as deprecated, this wildcard CORS header is still exported and could be accidentally used by any edge function that imports `corsHeaders` instead of `getCorsHeaders()`.

### 15. Stripe Webhook - Missing Idempotency Check
**File:** `supabase/functions/stripe-subscription-webhook/index.ts:37-89`

The `checkout.session.completed` handler doesn't check if it has already processed this event. Stripe may retry webhooks, leading to duplicate notifications and potential data inconsistency with the `upsert`.

### 16. `claim-profile` Uses `ilike` for Email Matching
**File:** `supabase/functions/claim-profile/index.ts:79`

```typescript
.ilike('email', email)
```

Using `ilike` (case-insensitive LIKE) on email is both slower than `eq` and could match unintended rows if emails contain SQL wildcards (`%`, `_`). Since the email is already lowercased on line 61, use `.eq('email', email)` instead.

### 17. No Password Strength Validation in `claim-profile`
**File:** `supabase/functions/claim-profile/index.ts:62`

The password is accepted as-is with no minimum length or complexity requirements:
```typescript
const password = (body?.password || '').toString();
```

A user could set their password to a single character.

### 18. `create-patient-profile` - SendGrid API Key Named Misleadingly
**File:** `supabase/functions/create-patient-profile/index.ts:37`

```typescript
const sendGridApiKey = Deno.env.get('TWILIO_API_KEY');
```

The SendGrid API key is stored in a variable named after Twilio and read from an env var called `TWILIO_API_KEY`. This is confusing and could lead to configuration errors.

---

## SUMMARY

| Severity | Count | Category |
|----------|-------|----------|
| CRITICAL | 4 | Auth bypass, privilege escalation, SQL injection, data exposure |
| HIGH | 5 | Race conditions, incomplete deletion, phantom slots, perf |
| MEDIUM | 4 | RLS tautology, function conflicts, missing validation |
| LOW | 5 | Naming, deprecated code, idempotency, over-fetching |

### Top 3 Recommended Immediate Actions:
1. **Fix `database-api` auth** - Remove all "allow all" fallback paths
2. **Secure `make-super-admin`** - Add authentication and authorization checks
3. **Fix `appointment_slots_functions.sql` migration ordering** - Ensure the locked version of `book_appointment_slot` is the final active version
