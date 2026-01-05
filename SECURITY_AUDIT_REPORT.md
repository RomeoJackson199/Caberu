# Security Vulnerability Audit Report

**Date**: 2026-01-05
**Auditor**: Automated Security Scan
**Repository**: Caberu

---

## Executive Summary

This security audit identified **3 critical**, **3 medium**, and several low-severity vulnerabilities. Immediate action is recommended for critical issues.

---

## Critical Vulnerabilities

### 1. Hardcoded Supabase API Key in Source Code

**Severity**: CRITICAL
**File**: `src/integrations/supabase/client.ts:6`
**CWE**: CWE-798 (Use of Hard-coded Credentials)

**Issue**:
```typescript
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

**Impact**:
- API key is exposed in the production bundle
- Key is visible in Git history
- Attackers can use this key to interact with the database directly

**Recommendation**:
1. Remove the hardcoded fallback key immediately
2. Rotate the exposed API key
3. Use environment variables exclusively:
```typescript
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('VITE_SUPABASE_ANON_KEY is required');
}
```

---

### 2. Hardcoded JWT Tokens in SQL Migrations

**Severity**: CRITICAL
**Files**:
- `supabase/migrations/20251218081248_6a88300f-e114-4a8c-8933-e9a015f66e35.sql`
- `supabase/migrations/20251218123217_894c56bc-01e1-403c-ae58-a5205ab98de9.sql`

**Issue**:
```sql
headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'::jsonb
```

**Impact**:
- Hardcoded tokens in migration files are committed to Git
- These tokens may grant elevated access

**Recommendation**:
1. Remove hardcoded tokens from migrations
2. Use environment variables or runtime configuration
3. Rotate exposed tokens

---

### 3. XSS Vulnerability in Email Template Editor

**Severity**: HIGH
**File**: `src/components/settings/EmailTemplateEditor.tsx:398`
**CWE**: CWE-79 (Cross-site Scripting)

**Issue**:
```tsx
<div dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} />
```

The `getPreviewHtml()` function does NOT sanitize the `bodyHtml` content, which is user-editable HTML.

**Impact**:
- Admin users can inject malicious JavaScript
- Stored XSS if templates are saved and viewed by other users
- Potential session hijacking or data theft

**Recommendation**:
```tsx
import DOMPurify from 'dompurify';

const getPreviewHtml = () => {
    let preview = bodyHtml;
    // ... variable replacement ...
    return DOMPurify.sanitize(preview, {
        ALLOWED_TAGS: ['div', 'h2', 'p', 'strong', 'a', 'br', 'table', 'tr', 'td', 'th'],
        ALLOWED_ATTR: ['href', 'style', 'class']
    });
};
```

---

## Medium Vulnerabilities

### 4. Overly Permissive CORS Configuration

**Severity**: MEDIUM
**Files**: All Supabase Edge Functions
**CWE**: CWE-942 (Overly Permissive Cross-domain Whitelist)

**Issue**:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  // ...
};
```

**Impact**:
- Any website can call your API endpoints
- Enables CSRF attacks
- Sensitive operations can be triggered from malicious sites

**Recommendation**:
```typescript
const ALLOWED_ORIGINS = [
  'https://caberu.be',
  'https://www.caberu.be',
  process.env.NODE_ENV === 'development' && 'http://localhost:5173'
].filter(Boolean);

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  // ...
});
```

---

### 5. Overly Permissive RLS Policies (USING true)

**Severity**: MEDIUM
**Files**: Multiple migration files
**CWE**: CWE-862 (Missing Authorization)

**Issue**:
Found 27+ instances of `USING (true)` in RLS policies, which allows any authenticated user to read data.

**Example Files**:
- `20250907151417_*.sql`
- `20251022204036_*.sql`
- `20251105064008_*.sql`

**Impact**:
- Data from one business may be accessible to users of another business
- Violates multi-tenant data isolation

**Recommendation**:
Review each `USING (true)` policy and replace with proper authorization:
```sql
-- Instead of: USING (true)
-- Use proper business/user scoping:
USING (
  public.is_member_of_business(business_id)
  OR owner_id = auth.uid()
)
```

---

### 6. Overly Permissive INSERT Policies (WITH CHECK true)

**Severity**: MEDIUM
**Files**: Multiple migration files
**CWE**: CWE-862 (Missing Authorization)

**Issue**:
Found 25+ instances of `WITH CHECK (true)` allowing any authenticated user to INSERT data.

**Impact**:
- Users can potentially insert records into tables belonging to other businesses
- Data integrity issues

**Recommendation**:
Replace with proper authorization checks:
```sql
-- Instead of: WITH CHECK (true)
WITH CHECK (
  public.is_member_of_business(business_id)
)
```

---

## Low Severity / Informational

### 7. Sensitive Data in localStorage

**Severity**: LOW
**Files**: Multiple components using `localStorage.setItem`

**Issue**: Various application state is stored in localStorage without encryption.

**Recommendation**:
- Avoid storing sensitive data in localStorage
- Use the existing `secureStorage` utility for sensitive data
- Consider using HttpOnly cookies for session data

---

## Positive Security Findings

The following security practices were observed and commended:

1. **Strong Password Policy**: 12+ characters, complexity requirements, and HIBP breach checking (`src/utils/passwordValidation.ts`)

2. **HTML Sanitization Library**: DOMPurify is properly used in `src/utils/sanitize.ts`

3. **CSS Injection Prevention**: Chart component properly sanitizes CSS values (`src/components/ui/chart.tsx`)

4. **Session Timeout**: 15-minute GDPR-compliant session timeout implemented

5. **PKCE Authentication Flow**: Using secure PKCE flow for OAuth

6. **Development Endpoint Protection**: `dev-claim-bypass` function has production guard

7. **Recent RLS Fixes**: The `profile_id = auth.uid()` bug has been properly fixed in recent migrations

---

## Remediation Priority

| Priority | Vulnerability | Effort | Impact |
|----------|--------------|--------|--------|
| P0 | Hardcoded API Keys | Low | Critical |
| P0 | XSS in Email Editor | Low | High |
| P1 | CORS Configuration | Medium | Medium |
| P2 | RLS Policy Review | High | Medium |

---

## Next Steps

1. **Immediate** (within 24 hours):
   - Remove hardcoded API keys
   - Rotate all exposed credentials
   - Add XSS sanitization to Email Template Editor

2. **Short-term** (within 1 week):
   - Implement proper CORS origin validation
   - Audit all `USING (true)` policies

3. **Medium-term** (within 1 month):
   - Complete RLS policy audit
   - Implement security testing in CI/CD pipeline
   - Add automated secret scanning (e.g., GitGuardian, gitleaks)

---

*This report was generated as part of an automated security audit. Manual verification is recommended for all findings.*

---

## Fixes Applied (2026-01-05)

The following security fixes have been implemented in this commit:

### Critical Fixes
1. **Removed hardcoded Supabase API key** (`src/integrations/supabase/client.ts`)
   - Now requires environment variables - fails fast if not configured

2. **Fixed XSS vulnerability** (`src/components/settings/EmailTemplateEditor.tsx`)
   - Added DOMPurify sanitization to email template preview

3. **Cron job token security** (`supabase/migrations/20260105_security_fix_cron_tokens.sql`)
   - Removed hardcoded tokens from cron job definitions
   - Now uses secure vault references

### Medium Fixes
4. **CORS security** (`supabase/functions/_shared/cors.ts`)
   - Created shared CORS utility with proper origin validation
   - Updated critical Edge Functions to use secure CORS

5. **RLS policy fixes** (`supabase/migrations/20260105_security_fix_rls_policies.sql`)
   - Fixed `patient_preferences` - now requires business membership
   - Fixed `security_audit_logs` - now restricted to own user_id
   - Fixed `phone_usage_tracking` - now requires business membership
   - Fixed `invitations` - now requires proper roles
   - Fixed `reviews` - now requires completed appointment
   - Fixed `slot_recommendations` - now requires business staff role

### Post-Fix Checklist
- [ ] Rotate the exposed Supabase anon key
- [ ] Update environment variables in all deployments
- [ ] Test all affected features
- [ ] Monitor logs for authorization errors
