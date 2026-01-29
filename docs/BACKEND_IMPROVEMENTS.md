# Backend Improvements List

> **Generated:** 2026-01-29
> **Analyzed:** 61 Edge Functions, 406 Migrations, MCP Server

This document outlines identified improvements for the Caberu backend, organized by priority and category.

---

## Executive Summary

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Code Quality | 2 | 5 | 3 | 1 |
| Security | 3 | 2 | 3 | 2 |
| Database & Performance | 1 | 3 | 2 | 1 |
| Testing & Documentation | 4 | 3 | 2 | 0 |
| **Total** | **10** | **13** | **10** | **4** |

---

## 1. Code Quality Issues

### 1.1 CRITICAL: Excessive Console.log in Production

**Files Affected:**
- `supabase/functions/database-api/index.ts` (lines 469-470)
- `supabase/functions/send-email-notification/index.ts` (30+ lines)
- `supabase/functions/claim-profile/index.ts` (extensive logging)

**Issues:**
- Raw request bodies logged (security risk)
- Emoji prefixes in production logs
- No structured logging format
- No request ID for tracing
- No log levels (debug/info/warn/error)

**Recommendation:**
Create a shared logging utility with structured JSON output and proper log levels.

```typescript
// Proposed: supabase/functions/_shared/logger.ts
export const logger = {
  info: (message: string, context?: object) => { /* structured output */ },
  error: (message: string, error?: Error, context?: object) => { /* sanitized */ },
  debug: (message: string, context?: object) => { /* development only */ },
};
```

---

### 1.2 CRITICAL: Inconsistent Error Handling

**Files Affected:**
- `supabase/functions/database-api/index.ts` (line 437)
- `supabase/functions/create-subscription-checkout/index.ts` (line 122)
- `supabase/functions/send-2fa-code/index.ts` (line 149)

**Issues:**
- Raw error messages exposed to clients
- Database/system errors leak table names and SQL patterns
- External API error responses passed through
- Inconsistent HTTP status codes (400 vs 500 for validation)

**Current (Bad):**
```typescript
return new Response(JSON.stringify({ error: error.message }), { status: 500 });
```

**Recommended:**
```typescript
// Create error response factory
const errorResponse = (code: string, message: string, status: number) =>
  new Response(JSON.stringify({ error: { code, message } }), { status });

// Usage
return errorResponse('VALIDATION_ERROR', 'Invalid email format', 400);
```

---

### 1.3 HIGH: Code Duplication Across Functions

**Pattern 1: CORS Handling** (repeated in 59 functions)
```typescript
// Lines ~20-24 in every function
const corsHeaders = getCorsHeaders(origin);
if (req.method === 'OPTIONS') return handleCorsPreflightSafe(req);
```

**Pattern 2: Supabase Client Creation** (duplicated even within single files)
- `create-subscription-checkout/index.ts` (lines 27-31 AND 69-72)
- `update-payment-status/index.ts` (lines 30-39 AND 69-72)

**Pattern 3: Rate Limit Checking** (copy-pasted)
- `send-sms-verification/index.ts` (lines 50-58)
- `send-2fa-code/index.ts` (lines 41-48)
- `claim-profile/index.ts` (lines 52-58)

**Recommendation:**
Create higher-order function wrappers:
```typescript
// supabase/functions/_shared/handler.ts
export const createHandler = (config: HandlerConfig) => async (req: Request) => {
  // Automatic CORS, rate limiting, auth, error handling
};
```

---

### 1.4 HIGH: Hardcoded Configuration Values

**Email Configuration:**
- `send-2fa-code/index.ts` (line 220): `'Romeo@caberu.be'`
- `send-email-notification/index.ts` (line 220): `'Romeo@caberu.be'`

**Timing/Thresholds (Magic Numbers):**
| File | Line | Hardcoded Value | Should Be |
|------|------|-----------------|-----------|
| health-check/index.ts | 120 | `dbLatency > 500` | Config: `DB_LATENCY_THRESHOLD` |
| health-check/index.ts | 206 | `authLatency > 1500` | Config: `AUTH_LATENCY_THRESHOLD` |
| health-check/index.ts | 303 | `memory_heap_mb > 100` | Config: `MEMORY_WARNING_MB` |
| verify-2fa-code/index.ts | 11 | `MAX_FAILED_ATTEMPTS = 5` | Environment variable |
| verify-2fa-code/index.ts | 12 | `LOCKOUT_MINUTES = 10` | Environment variable |
| send-2fa-code/index.ts | 54 | `10` minutes expiration | Environment variable |

**Recommendation:**
Create centralized configuration:
```typescript
// supabase/functions/_shared/config.ts
export const CONFIG = {
  email: { from: Deno.env.get('EMAIL_FROM') || 'noreply@caberu.be' },
  thresholds: { dbLatency: Number(Deno.env.get('DB_LATENCY_THRESHOLD')) || 500 },
  security: { maxFailedAttempts: Number(Deno.env.get('MAX_FAILED_2FA')) || 5 },
};
```

---

### 1.5 HIGH: Missing TypeScript Types

**Excessive `any` Usage:**
| File | Line | Variable |
|------|------|----------|
| database-api/index.ts | 46 | `supabase: any` |
| database-api/index.ts | 127 | `params: any = {}` |
| database-api/index.ts | 439 | `(patient as any).last_dentist` |
| send-email-notification/index.ts | 239 | `profile = dentistData.profiles as any` |
| verify-2fa-code/index.ts | 82 | `updateData: any` |
| create-subscription-checkout/index.ts | 119 | `catch (error: any)` |

**Recommendation:**
1. Generate types from database schema using Supabase CLI
2. Create shared interfaces for common objects
3. Replace all `any` with proper types or `unknown`

---

### 1.6 HIGH: Complex Functions Need Refactoring

**Large Files:**
| File | Lines | Recommendation |
|------|-------|----------------|
| database-api/index.ts | 1,157 | Split into action handlers |
| send-email-notification/index.ts | 432 | Extract email builder, validation |
| health-check/index.ts | 913 | Extract individual health checks |

**database-api/index.ts Structure:**
- Lines 105-444: GET handler (should be split by table)
- Lines 447-1156: POST handler with 30+ action types
- Lines 559-1137: Massive switch statement

**Recommendation:**
```typescript
// Split into modules
// database-api/handlers/patients.ts
// database-api/handlers/appointments.ts
// database-api/handlers/dentists.ts
// database-api/index.ts - only routes to handlers
```

---

### 1.7 HIGH: Missing Input Validation

**Files Affected:**
- `create-subscription-checkout/index.ts` (line 14): No validation of `businessData`
- `claim-profile/index.ts` (line 62): No password strength validation
- `send-email-notification/index.ts` (line 42): No email format validation

**Recommendation:**
Implement validation with Zod or similar:
```typescript
import { z } from 'zod';

const subscriptionSchema = z.object({
  planId: z.enum(['basic', 'pro', 'enterprise']),
  billingCycle: z.enum(['monthly', 'yearly']),
  businessData: z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
  }),
});
```

---

### 1.8 MEDIUM: Environment Variable Naming Issue

**File:** `send-email-notification/index.ts` (line 340)

```typescript
const sendGridApiKey = Deno.env.get('TWILIO_API_KEY');  // WRONG!
```

Uses `TWILIO_API_KEY` for SendGrid. Should be `SENDGRID_API_KEY`.

---

### 1.9 MEDIUM: Unsafe Optional Chaining

**File:** `send-email-notification/index.ts` (lines 238-241)

```typescript
if (dentistData?.profiles) {
  const profile = dentistData.profiles as any;
  dentistFullName = `Dr. ${profile.first_name} ${profile.last_name}`;
}
```

No null check on `first_name` or `last_name` properties.

---

### 1.10 MEDIUM: Cascading Promise Errors

**File:** `send-email-notification/index.ts` (line 400)

```typescript
.eq('profile_id', (await supabase.from('dentists')
  .select('profile_id')
  .eq('id', dentistId)
  .single()).data?.profile_id)
```

Nested promise call - inner call error not properly handled.

---

## 2. Security Issues

### 2.1 CRITICAL: Sensitive Data Exposure in Logs

**File:** `supabase/functions/database-api/index.ts` (lines 469-470)

```typescript
console.log('RAW:', text);
console.log('PARSED:', JSON.stringify(incoming));
```

Logs entire raw request body which could contain:
- API keys
- Passwords
- Personal health information (PHI)
- Authentication tokens

**Immediate Action Required:** Remove these lines.

---

### 2.2 CRITICAL: Missing Type Filter in 2FA Query

**File:** `supabase/functions/verify-2fa-code/index.ts` (lines 37-41)

```typescript
const { data: storedCode } = await supabase
  .from('verification_codes')
  .select('*')
  .eq('email', email)
  .single();  // Assumes only one record per email
```

The query doesn't filter by `type` field. If both 2FA and recovery codes exist for same email, query fails.

**Fix:**
```typescript
.eq('email', email)
.eq('type', '2fa')
.eq('used', false)
.gt('expires_at', new Date().toISOString())
.single();
```

---

### 2.3 CRITICAL: Missing Database Constraint

**Issue:** No unique constraint on `verification_codes (email, type)` for active codes.

**Suggested Migration:**
```sql
CREATE UNIQUE INDEX unique_active_verification_code
ON public.verification_codes (email, type)
WHERE used = false AND expires_at > NOW();
```

---

### 2.4 HIGH: Insecure CORS in Webhook

**File:** `supabase/functions/elevenlabs-webhook/index.ts` (lines 4-7)

```typescript
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',  // INSECURE
    ...
};
```

Uses wildcard CORS instead of `getCorsHeaders(origin)`.

---

### 2.5 HIGH: Undefined RPC Function

**File:** `supabase/functions/database-api/index.ts` (lines 725-735)

```typescript
case 'execute_query': {
  const { data, error } = await supabase.rpc('exec_sql', { query });
}
```

No `exec_sql` function found in migrations. Endpoint non-functional and potential security risk.

**Action:** Remove `execute_query` action or properly implement with strict authorization.

---

### 2.6 MEDIUM: API Key Timing Attack Vulnerability

**File:** `supabase/functions/database-api/index.ts` (lines 56-57)

```typescript
if (providedKey === apiKey) {
```

String comparison vulnerable to timing attacks. Use constant-time comparison:
```typescript
import { timingSafeEqual } from 'crypto';
```

---

### 2.7 MEDIUM: Rate Limiting Gaps

**Functions WITHOUT rate limiting:**
| Function | Risk |
|----------|------|
| upload-imaging/index.ts | Disk exhaustion |
| google-calendar-sync/index.ts | API quota exhaustion |
| send-push-notifications/index.ts | Notification spam |

---

### 2.8 MEDIUM: TOCTOU Race Condition

**File:** `send-email-notification/index.ts`

Rate limit checked at line 51, but actual send happens much later (line 380+). Between check and send, rate limit could be exceeded by parallel requests.

**Recommendation:** Use atomic rate limit with reservation pattern.

---

### 2.9 LOW: Unvalidated Filter Parameters

**File:** `database-api/index.ts` (lines 153-157)

```typescript
Object.entries(params).forEach(([key, value]) => {
  if (!['table', 'columns', 'limit', 'order_by', 'ascending'].includes(key)) {
    query = query.eq(key, value);  // Any filter key accepted
  }
});
```

Mitigated by table whitelist, but filter keys should also be validated.

---

### 2.10 LOW: Complex RLS Policies

**File:** Migration `20250807000000_add_missing_patient_policies.sql`

Nested EXISTS subqueries impact performance on large datasets. Consider optimizing with materialized views or simpler policies.

---

## 3. Database & Performance Issues

### 3.1 CRITICAL: N+1 Query Patterns

**File:** `database-api/index.ts`

**lookup_patient_by_phone (lines 266-310):**
```typescript
// Query 1: Fetch patient
const { data: patient } = await supabase.from('profiles')...

// Query 2 (N+1): Fetch last appointment separately
if (patient) {
  const { data: lastAppt } = await supabase.from('appointments')...
}
```

**Also affects:**
- `search_patients` (lines 189-263)
- `search_dentists` (lines 313-355)

**Recommendation:** Use joins or batch queries with `.in()`.

---

### 3.2 HIGH: Missing Database Indexes

**Queries without supporting indexes:**

| Table | Columns | Used In |
|-------|---------|---------|
| verification_codes | (email, type, expires_at) | send-2fa-code, verify-2fa-code |
| appointments | (patient_id, appointment_date DESC) | Patient history |
| dentist_availability | (dentist_id, business_id, is_available) | Slot generation |
| medical_records | (patient_id, record_date DESC) | get_patient |

**Suggested Migration:**
```sql
CREATE INDEX idx_verification_codes_lookup
ON verification_codes (email, type, expires_at)
WHERE used = false;

CREATE INDEX idx_appointments_patient_date
ON appointments (patient_id, appointment_date DESC);

CREATE INDEX idx_availability_lookup
ON dentist_availability (dentist_id, business_id)
WHERE is_available = true;
```

---

### 3.3 HIGH: Large Function File Sizes

| File | Size | Recommendation |
|------|------|----------------|
| database-api/index.ts | 1,157 lines | Split by domain |
| health-check/index.ts | 913 lines | Extract checks |
| send-email-notification/index.ts | 432 lines | Extract templates |

Cold start times increase with function size in serverless.

---

### 3.4 HIGH: Duplicate Supabase Client Creation

**File:** `create-subscription-checkout/index.ts`

Client created twice in same function (lines 27-31 and 69-72). Wastes connection pool resources.

---

### 3.5 MEDIUM: No Query Timeout Configuration

Database queries lack explicit timeout configuration. Long-running queries could block function execution.

---

### 3.6 MEDIUM: Health Check Runs 15 Parallel Checks

**File:** `health-check/index.ts` (lines 99-827)

Single `Promise.all` with 15 health checks. If any external service is slow, entire health check times out.

**Recommendation:** Use `Promise.allSettled` with individual timeouts.

---

### 3.7 LOW: No Connection Pooling Configuration

Supabase client recreation on each request. Consider connection pooling for high-traffic functions.

---

## 4. Testing & Documentation Gaps

### 4.1 CRITICAL: Zero Backend Test Coverage

**Status:** 0% test coverage on 61 edge functions (~14,100 lines)

**Missing:**
- Deno test framework setup
- Supabase client mocks
- Authentication token mocking
- Test data factories
- Integration tests

**Recommendation:** Priority test files to create:
1. `verify-2fa-code.test.ts` (security-critical)
2. `stripe-subscription-webhook.test.ts` (payment-critical)
3. `delete-user-account.test.ts` (GDPR compliance)
4. `database-api.test.ts` (core functionality)

---

### 4.2 CRITICAL: Missing JSDoc Documentation

**Coverage:** Only 7 of 61 functions (11.5%) have JSDoc

**Undocumented Security Functions:**
- `send-2fa-code/index.ts`
- `verify-2fa-code/index.ts`
- `stripe-subscription-webhook/index.ts`
- `delete-user-account/index.ts`
- `claim-profile/index.ts`

---

### 4.3 CRITICAL: No API Specification

**Missing:**
- OpenAPI/Swagger specification
- Request/response schemas
- Rate limit documentation per endpoint
- Error response specifications
- Authentication documentation

---

### 4.4 CRITICAL: Incomplete Environment Variable Documentation

**Documented in `.env.example`:** 3 variables
**Used in code:** 20+ variables

**Undocumented:**
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_WEBHOOK_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `TWILIO_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`
- `VAPID_PRIVATE_KEY`
- `RESEND_API_KEY`
- `DATABASE_API_SECRET`

---

### 4.5 HIGH: No Error Codes Registry

No centralized error codes. Each function defines errors inline with inconsistent:
- Error codes
- HTTP status codes
- Error message formats
- Localization support

---

### 4.6 HIGH: Missing Documentation Files

**Needed:**
- `docs/EDGE_FUNCTIONS_API.md`
- `docs/ENVIRONMENT_VARIABLES.md`
- `docs/ERROR_CODES.md`
- `docs/TESTING_GUIDE.md`
- `docs/WEBHOOK_DOCUMENTATION.md`
- `docs/RATE_LIMITS.md`

---

### 4.7 HIGH: No Performance Guidelines

Missing documentation on:
- Query optimization patterns
- Caching strategies
- Cold start mitigation
- Memory limits
- Timeout configuration

---

### 4.8 MEDIUM: Outdated Documentation

Some existing docs may reference outdated patterns or missing functions. Needs review:
- `docs/multi-tenancy.md`
- `docs/NOTIFICATION_SYSTEM.md`

---

### 4.9 MEDIUM: No Code Examples

API documentation lacks:
- cURL examples
- JavaScript/TypeScript examples
- Error handling examples
- Authentication flow examples

---

## Improvement Priority Matrix

### Immediate (Week 1)
1. [ ] Remove raw request logging from database-api
2. [ ] Fix 2FA query to filter by type
3. [ ] Fix wildcard CORS in elevenlabs-webhook
4. [ ] Add rate limiting to upload-imaging
5. [ ] Fix TWILIO_API_KEY -> SENDGRID_API_KEY

### Short-term (Week 2-3)
6. [ ] Create shared logging utility
7. [ ] Create error response factory
8. [ ] Document all environment variables
9. [ ] Add missing database indexes
10. [ ] Set up Deno test framework

### Medium-term (Month 1)
11. [ ] Refactor database-api into modules
12. [ ] Add JSDoc to all functions
13. [ ] Create OpenAPI specification
14. [ ] Write unit tests for critical functions
15. [ ] Extract hardcoded config to environment

### Long-term (Quarter 1)
16. [ ] Full TypeScript type coverage
17. [ ] Integration test suite
18. [ ] Performance optimization
19. [ ] Complete documentation
20. [ ] Error codes registry

---

## Positive Findings

The following areas are well-implemented:

- **CORS handling:** Secure origin whitelist (not wildcard) in most functions
- **Rate limiting:** Well-designed with 7 tiers, proper Retry-After headers
- **Row-Level Security:** Comprehensive RLS policies for multi-tenancy
- **2FA lockout:** Proper failed attempt tracking (5 attempts, 10-min lockout)
- **AI sanitization:** Prevents prompt injection and system prompt leaks
- **Audit logging:** Comprehensive audit_logs table
- **SQL injection protection:** Supabase client parameterizes queries
- **Shared utilities:** Well-documented _shared/ directory
