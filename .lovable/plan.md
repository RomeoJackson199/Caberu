
# Popup Fix & Performance Optimization Plan

## Part 1: Fix Popup/Dropdown Not Showing

### Issue Identified
The `PractitionerPicker` dropdown has a z-index conflict. The component manually sets `z-50` on line 148, but this overrides the base DropdownMenu component's `z-[100]`, causing the dropdown to appear behind dialogs, modals, and other overlays.

### Solution
Remove the custom `z-50` class from `PractitionerPicker.tsx` since the base component already handles z-index correctly.

**File: `src/components/admin/PractitionerPicker.tsx`**
- Line 148: Change `className="w-[240px] bg-background z-50"` to `className="w-[240px] bg-background"`

---

## Part 2: Database Query Optimization (N+1 Pattern Fixes)

### Issue 1: Analytics Dashboard Sequential Queries
**Current Problem**: `DentistAnalyticsDashboard` makes one database query per dentist, causing waterfall requests.

**Solution**: Refactor to batch query all appointments at once, then aggregate in-memory.

**File: `src/components/DentistAnalyticsDashboard.tsx`**
```text
Before (N+1 pattern):
- Query 1: Get all dentists
- Query 2: Get appointments for dentist 1
- Query 3: Get appointments for dentist 2
- ... (N queries total)

After (2 queries total):
- Query 1: Get all dentists
- Query 2: Get ALL appointments for ALL dentists in one query
- Aggregate counts in JavaScript
```

### Issue 2: Practitioner Comparison Card
**Same N+1 pattern** in `PractitionerComparisonCard.tsx`.

**Solution**: Apply the same batch query approach.

---

## Part 3: Rate Limiting Enhancements

### Current State
Login rate limiting is properly implemented with database-backed tracking.

### Recommended Additions
Add rate limiting to these sensitive endpoints:

| Endpoint | Limit | Window | Priority |
|----------|-------|--------|----------|
| `send-2fa-code` | 5 requests | 15 min | High |
| `reset-password-with-code` | 5 requests | 15 min | High |
| `send-email-notification` | 50 requests | 1 hour | Medium |
| `create-patient-profile` | 10 requests | 5 min | Medium |
| `claim-profile` | 3 requests | 30 min | Medium |

### Implementation
Use the existing `checkRateLimitDB` utility in each edge function.

---

## Part 4: Frontend Performance Optimizations

### 4.1 Query Deduplication
Add query keys with proper dependencies to prevent duplicate requests.

### 4.2 Skeleton Loading States
Ensure all admin pages use consistent skeleton loaders (already good in most places).

### 4.3 Real-time Subscription Cleanup
Verify all Supabase realtime channels are properly unsubscribed on unmount (already correct in `useAppointments.tsx`).

### 4.4 Lazy Loading Heavy Components
Already implemented for most pages via `React.lazy()` in `App.tsx`.

---

## Part 5: Database Index Verification

### Existing Indexes (Good Coverage)
- `appointments`: Indexed on `business_id`, `dentist_id`, `patient_id`, `appointment_date`, and composite `(dentist_id, appointment_date)`
- `business_members`: Indexed on `profile_id`, `business_id`
- `api_rate_limits`: Indexed on `key` and `window_start`

### Recommended Addition
Add a composite index for the common schedule query pattern:
```sql
CREATE INDEX idx_appointments_business_date 
ON appointments (business_id, appointment_date)
WHERE status != 'cancelled';
```

---

## Technical Implementation Summary

| Task | File(s) | Effort |
|------|---------|--------|
| Fix z-index on PractitionerPicker | `PractitionerPicker.tsx` | 2 min |
| Batch query in Analytics Dashboard | `DentistAnalyticsDashboard.tsx` | 20 min |
| Batch query in Comparison Card | `PractitionerComparisonCard.tsx` | 15 min |
| Add rate limiting to 2FA endpoint | `send-2fa-code/index.ts` | 10 min |
| Add rate limiting to password reset | `reset-password-with-code/index.ts` | 10 min |
| Add composite database index | SQL migration | 5 min |

---

## Expected Improvements

**Performance Gains:**
- Analytics Dashboard: ~70% faster load time (N queries → 2 queries)
- Practitioner Comparison: ~60% faster load time
- Reduced database connection pool pressure

**Security Improvements:**
- Protected against brute-force on 2FA codes
- Protected against password reset enumeration attacks

**User Experience:**
- Dropdown menus will now appear correctly above all content
- Faster dashboard responsiveness with larger team sizes
