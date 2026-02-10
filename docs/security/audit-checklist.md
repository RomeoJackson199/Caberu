# Pre-DPO Security Audit Checklist

**Last reviewed:** 2026-02-10
**Next review due:** 2026-08-10
**Owner:** Security Lead
**Purpose:** Verify all technical and organizational security measures before DPO engagement and GDPR compliance certification.

---

## How to use this checklist

Complete each item before the DPO review. Mark items as checked when verified, and note the date and responsible person. Items marked with **(CRITICAL)** are blocking for DPO engagement. Items marked with **(HEALTH DATA)** are specifically required for GDPR Article 9 special category data processing.

---

## 1. Data Encryption

### At rest

- [ ] **(CRITICAL)(HEALTH DATA)** PostgreSQL database encryption at rest is enabled (Supabase managed, AES-256)
- [ ] **(CRITICAL)** Supabase Storage buckets use server-side encryption for all uploaded files
- [ ] **(HEALTH DATA)** Patient imaging data is encrypted at rest in storage
- [ ] Backup files are encrypted at rest (see Section 9)
- [ ] No unencrypted patient data exists in local storage, session storage, or IndexedDB on the client
- [ ] Encryption keys are managed by the cloud provider (Supabase/AWS KMS) and not accessible to application code

### In transit

- [ ] **(CRITICAL)** TLS 1.2 or higher enforced on all connections to Supabase
- [ ] **(CRITICAL)** HTTPS enforced on the frontend application (HSTS header present)
- [ ] **(CRITICAL)** All API calls from Edge Functions to third-party vendors (ElevenLabs, Twilio, Stripe) use TLS
- [ ] WebSocket connections (Supabase Realtime) use WSS (encrypted WebSocket)
- [ ] Certificate pinning evaluated for mobile clients (if applicable)
- [ ] No mixed content (HTTP resources loaded on HTTPS pages)

---

## 2. Access controls

### Row Level Security (RLS)

- [ ] **(CRITICAL)(HEALTH DATA)** RLS is enabled on ALL tables containing patient data
- [ ] **(CRITICAL)** RLS policies enforce practice-level data isolation (multi-tenant separation)
- [ ] RLS policies verified for every table in the `public` schema
- [ ] No tables have RLS disabled or use permissive `true` policies
- [ ] RLS policies tested with cross-tenant access attempts (tenant A cannot read tenant B data)
- [ ] RLS policies cover SELECT, INSERT, UPDATE, and DELETE operations

### Authentication

- [ ] **(CRITICAL)** Supabase Auth configured with secure password policy (minimum length, complexity)
- [ ] **(CRITICAL)** Two-factor authentication (2FA) available and enforced for staff accounts
- [ ] 2FA implementation verified (`send-2fa-code`, `verify-2fa-code` Edge Functions)
- [ ] Password reset flow does not leak user existence information
- [ ] Account lockout implemented after repeated failed login attempts
- [ ] Email verification required for new accounts

### Authorization (RBAC)

- [ ] **(CRITICAL)(HEALTH DATA)** Role-Based Access Control enforced at the database level
- [ ] Roles defined and documented (e.g., dentist, hygienist, receptionist, admin, practice owner)
- [ ] Each role has minimum necessary permissions (principle of least privilege)
- [ ] Role assignments auditable (who assigned what role, when)
- [ ] Privilege escalation paths reviewed and secured
- [ ] API endpoints verify user roles before processing requests

---

## 3. Credential management

### No hardcoded credentials

- [ ] **(CRITICAL)** No API keys, passwords, or secrets in source code (verified by grep/scan)
- [ ] **(CRITICAL)** No secrets in client-side JavaScript bundles
- [ ] No credentials in Git history (run `git log` search for common secret patterns)
- [ ] `.env` file is in `.gitignore` and never committed
- [ ] No secrets in Dockerfile, docker-compose, or CI/CD configuration files

### Environment variable management

- [ ] **(CRITICAL)** All secrets stored as environment variables or in a secrets manager
- [ ] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are the only client-exposed variables
- [ ] Supabase service role key is NEVER exposed to the client
- [ ] Edge Functions access secrets through Supabase secrets management (not hardcoded)
- [ ] Third-party API keys (Twilio, ElevenLabs, Stripe) stored server-side only
- [ ] `.env.example` does not contain real values
- [ ] Production environment variables are separate from development/staging

---

## 4. Session security

- [ ] **(CRITICAL)** Session tokens are httpOnly, Secure, and SameSite cookies (or equivalent Supabase Auth tokens)
- [ ] Session expiry configured (maximum session duration and idle timeout)
- [ ] Session invalidation works on logout (token revoked server-side)
- [ ] Concurrent session handling defined (allow or restrict multiple sessions)
- [ ] Session tokens are not logged or exposed in URLs
- [ ] Refresh token rotation implemented to limit token reuse

---

## 5. Cross-Site Request Forgery (CSRF) protection

- [ ] CSRF tokens implemented for state-changing operations (or SameSite cookies used)
- [ ] API endpoints validate the Origin/Referer header
- [ ] No state-changing operations via GET requests

---

## 6. Cross-Site Scripting (XSS) protection

- [ ] **(CRITICAL)** DOMPurify used to sanitize all user-generated HTML content
- [ ] Content-Security-Policy (CSP) header configured and enforced
- [ ] React's built-in XSS protections not bypassed (no `dangerouslySetInnerHTML` without sanitization)
- [ ] User input in URL parameters is sanitized before rendering
- [ ] Stored XSS vectors reviewed (patient notes, messages, form fields)
- [ ] SVG uploads sanitized or served with `Content-Type: image/svg+xml` only

---

## 7. SQL injection protection

- [ ] **(CRITICAL)** All database queries use parameterized queries (Supabase client library enforces this)
- [ ] No raw SQL string concatenation in Edge Functions
- [ ] Database function inputs validated and typed
- [ ] PostgreSQL functions use `SECURITY DEFINER` only when necessary, with `search_path` set

---

## 8. CORS configuration

- [ ] **(CRITICAL)** CORS policy restricts allowed origins to the production domain(s)
- [ ] CORS does not use wildcard (`*`) for authenticated endpoints
- [ ] Preflight (OPTIONS) requests handled correctly
- [ ] Credentials mode configured appropriately
- [ ] Edge Functions CORS headers reviewed per function

---

## 9. Rate limiting

- [ ] **(CRITICAL)** Rate limiting on authentication endpoints (login, password reset, 2FA verification)
- [ ] Rate limiting on SMS sending endpoints (prevent abuse and cost overruns)
- [ ] Rate limiting on AI endpoints (dental-ai-chat, voice-call-ai)
- [ ] Rate limiting on data export endpoints
- [ ] Rate limit responses use HTTP 429 with Retry-After header
- [ ] Rate limiting cannot be bypassed by header manipulation (X-Forwarded-For spoofing)

---

## 10. Audit logging

- [ ] **(CRITICAL)(HEALTH DATA)** All access to patient health data is logged (who accessed what, when)
- [ ] **(CRITICAL)** Audit logs are immutable (append-only, no UPDATE or DELETE permissions)
- [ ] **(HEALTH DATA)** Data modifications logged with before/after values for patient records
- [ ] Authentication events logged (login, logout, failed attempts, 2FA events)
- [ ] Administrative actions logged (role changes, user creation/deletion, settings changes)
- [ ] Audit logs include: timestamp, user ID, action, resource, IP address, user agent
- [ ] Audit log retention period defined and enforced (minimum 12 months for GDPR, longer for healthcare)
- [ ] Audit logs are not accessible to non-admin users
- [ ] Log integrity verification mechanism in place (checksums or similar)

---

## 11. Backup security

- [ ] **(CRITICAL)** Database backups encrypted at rest
- [ ] Backup access restricted to authorized personnel only
- [ ] Backup restoration tested (verified within the last 6 months)
- [ ] Backup retention period aligned with data retention policy
- [ ] Backup deletion verified (old backups are actually removed)
- [ ] Backups stored in the EU region (same GDPR jurisdiction as primary data)
- [ ] Point-in-time recovery (PITR) enabled and tested

---

## 12. Dependency security

- [ ] **(CRITICAL)** `npm audit` shows no critical or high vulnerabilities
- [ ] Dependabot or similar automated dependency scanning enabled
- [ ] No dependencies with known security advisories in production
- [ ] Lock file (`package-lock.json`) committed and integrity verified
- [ ] Third-party scripts (CDN-loaded) use Subresource Integrity (SRI) hashes
- [ ] Dependency licenses reviewed for compatibility

---

## 13. Network security

- [ ] **(CRITICAL)** Supabase database not publicly accessible (access via API only)
- [ ] Edge Functions have no unnecessary outbound network access
- [ ] DNS configuration uses DNSSEC where possible
- [ ] DDoS protection in place (CDN or hosting provider level)
- [ ] No unnecessary ports or services exposed

---

## 14. API security

- [ ] **(CRITICAL)** All Edge Functions validate authentication before processing
- [ ] **(CRITICAL)** All Edge Functions validate and sanitize input parameters
- [ ] API responses do not leak internal implementation details (stack traces, database errors)
- [ ] Error messages are generic for clients, detailed in server logs only
- [ ] File upload endpoints validate file type, size, and content
- [ ] Pagination implemented on list endpoints to prevent data dump attacks
- [ ] API versioning strategy defined

---

## 15. Data minimization and privacy by design

- [ ] **(HEALTH DATA)** Only necessary patient data fields are collected (no over-collection)
- [ ] **(HEALTH DATA)** Patient data is not logged in production (`console.log` stripped in build)
- [ ] SMS content minimized (no full medical details in appointment reminders)
- [ ] Analytics events do not contain patient-identifiable information
- [ ] Error reporting (if any) does not capture patient data in crash reports
- [ ] Development and staging environments do not use production patient data

---

## Audit sign-off

| Section | Reviewed by | Date | Status |
|---|---|---|---|
| 1. Data Encryption | | | Pending |
| 2. Access Controls | | | Pending |
| 3. Credential Management | | | Pending |
| 4. Session Security | | | Pending |
| 5. CSRF Protection | | | Pending |
| 6. XSS Protection | | | Pending |
| 7. SQL Injection Protection | | | Pending |
| 8. CORS Configuration | | | Pending |
| 9. Rate Limiting | | | Pending |
| 10. Audit Logging | | | Pending |
| 11. Backup Security | | | Pending |
| 12. Dependency Security | | | Pending |
| 13. Network Security | | | Pending |
| 14. API Security | | | Pending |
| 15. Data Minimization | | | Pending |

**Overall audit status:** Not started
**DPO review readiness:** Blocked until all CRITICAL items are verified

---

## Document history

| Date | Author | Change |
|---|---|---|
| 2026-02-10 | Security Lead | Initial pre-DPO security audit checklist |
