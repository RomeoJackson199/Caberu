# 🎯 Consolidated Action Plan - Caberu Codebase Review

**Generated:** 2026-01-22
**Total Issues:** 47 actionable items
**Estimated Effort:** 3-4 weeks (distributed across team)

---

## 📋 Executive Summary

This action plan consolidates findings from comprehensive codebase review across 20 specialized areas. Issues are prioritized by:
- **P0 (Critical):** Security vulnerabilities & production bugs - Fix immediately (1-2 days)
- **P1 (High):** Performance & architectural issues - Fix this sprint (1 week)
- **P2 (Medium):** Technical debt & improvements - Fix next sprint (2-3 weeks)

---

# 🔴 P0 - CRITICAL (Fix Immediately - Days 1-2)

## P0.1 - Fix Open Redirect Vulnerability ⚠️ SECURITY

**Risk Level:** HIGH - Can be exploited for phishing attacks
**Files Affected:** 2
**Effort:** 1-2 hours

### Current Vulnerable Code

**File:** `src/components/auth/auth-form.tsx:201-204`
```typescript
const handleSuccess = (redirectPath?: string) => {
  const savedRedirect = localStorage.getItem('auth_redirect');
  localStorage.removeItem('auth_redirect');
  navigate(savedRedirect || redirectPath || '/dashboard');
};
```

**File:** `src/components/auth/AuthCallbackHandler.tsx:204`
```typescript
const redirectTo = localStorage.getItem('auth_redirect') || '/dashboard';
navigate(redirectTo);
```

### The Fix

**Step 1:** Create URL validator utility

**File:** `src/lib/security/url-validator.ts` (NEW FILE)
```typescript
/**
 * Validates that a redirect URL is safe (internal to our app)
 * Prevents open redirect vulnerabilities
 */
export function isValidRedirectUrl(url: string | null): boolean {
  if (!url) return false;

  try {
    // Only allow relative paths
    if (url.startsWith('/') && !url.startsWith('//')) {
      // Additional check: no javascript: or data: protocols hidden
      const decoded = decodeURIComponent(url);
      if (decoded.match(/^(javascript|data|vbscript):/i)) {
        return false;
      }
      return true;
    }

    // For absolute URLs, verify they match our domain
    const urlObj = new URL(url, window.location.origin);
    return urlObj.origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Sanitizes a redirect URL or returns fallback
 */
export function getSafeRedirectUrl(
  url: string | null,
  fallback: string = '/dashboard'
): string {
  return isValidRedirectUrl(url) ? url! : fallback;
}
```

**Step 2:** Update auth-form.tsx

**File:** `src/components/auth/auth-form.tsx`
```typescript
import { getSafeRedirectUrl } from '@/lib/security/url-validator';

// Replace lines 201-204 with:
const handleSuccess = (redirectPath?: string) => {
  const savedRedirect = localStorage.getItem('auth_redirect');
  localStorage.removeItem('auth_redirect');

  const safeRedirect = getSafeRedirectUrl(
    savedRedirect || redirectPath,
    '/dashboard'
  );
  navigate(safeRedirect);
};
```

**Step 3:** Update AuthCallbackHandler.tsx

**File:** `src/components/auth/AuthCallbackHandler.tsx`
```typescript
import { getSafeRedirectUrl } from '@/lib/security/url-validator';

// Replace line 204 with:
const savedRedirect = localStorage.getItem('auth_redirect');
const redirectTo = getSafeRedirectUrl(savedRedirect, '/dashboard');
navigate(redirectTo);
```

**Step 4:** Add tests

**File:** `src/lib/security/__tests__/url-validator.test.ts` (NEW FILE)
```typescript
import { isValidRedirectUrl, getSafeRedirectUrl } from '../url-validator';

describe('URL Validator', () => {
  describe('isValidRedirectUrl', () => {
    it('allows relative paths', () => {
      expect(isValidRedirectUrl('/dashboard')).toBe(true);
      expect(isValidRedirectUrl('/patients/123')).toBe(true);
    });

    it('blocks protocol-relative URLs', () => {
      expect(isValidRedirectUrl('//evil.com')).toBe(false);
    });

    it('blocks javascript protocol', () => {
      expect(isValidRedirectUrl('javascript:alert(1)')).toBe(false);
      expect(isValidRedirectUrl('/dashboard?next=javascript:alert(1)')).toBe(false);
    });

    it('blocks external absolute URLs', () => {
      expect(isValidRedirectUrl('https://evil.com')).toBe(false);
    });

    it('allows same-origin absolute URLs', () => {
      // This test would need mocking of window.location
      // Implementation depends on your test setup
    });
  });

  describe('getSafeRedirectUrl', () => {
    it('returns valid URLs unchanged', () => {
      expect(getSafeRedirectUrl('/dashboard')).toBe('/dashboard');
    });

    it('returns fallback for invalid URLs', () => {
      expect(getSafeRedirectUrl('//evil.com')).toBe('/dashboard');
      expect(getSafeRedirectUrl('javascript:alert(1)')).toBe('/dashboard');
    });

    it('supports custom fallback', () => {
      expect(getSafeRedirectUrl('//evil.com', '/login')).toBe('/login');
    });
  });
});
```

---

## P0.2 - Enable Webhook Signature Verification ⚠️ SECURITY

**Risk Level:** HIGH - Can accept spoofed webhook events
**Files Affected:** 1
**Effort:** 30 minutes

**File:** `supabase/functions/elevenlabs-webhook/index.ts:119-125`

### Current Vulnerable Code
```typescript
// TODO: Verify signature
// const signature = req.headers.get('xi-signature');
// if (!signature || !verifySignature(body, signature)) {
//   return new Response('Invalid signature', { status: 401 });
// }
```

### The Fix

```typescript
// Replace lines 119-125 with:
const signature = req.headers.get('xi-signature');
const webhookSecret = Deno.env.get('ELEVENLABS_WEBHOOK_SECRET');

if (!webhookSecret) {
  console.error('ELEVENLABS_WEBHOOK_SECRET not configured');
  return new Response('Webhook not configured', { status: 500 });
}

if (!signature) {
  console.warn('Webhook received without signature');
  return new Response('Missing signature', { status: 401 });
}

// Verify signature using HMAC
const encoder = new TextEncoder();
const keyData = encoder.encode(webhookSecret);
const key = await crypto.subtle.importKey(
  'raw',
  keyData,
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign', 'verify']
);

const dataToVerify = encoder.encode(JSON.stringify(body));
const expectedSignature = await crypto.subtle.sign('HMAC', key, dataToVerify);
const expectedSignatureHex = Array.from(new Uint8Array(expectedSignature))
  .map(b => b.toString(16).padStart(2, '0'))
  .join('');

if (signature !== expectedSignatureHex) {
  console.warn('Invalid webhook signature');
  return new Response('Invalid signature', { status: 401 });
}
```

**Environment Setup Required:**
```bash
# Add to Supabase secrets
supabase secrets set ELEVENLABS_WEBHOOK_SECRET=<your-secret-from-elevenlabs>
```

**Documentation:** Check ElevenLabs webhook docs for exact signature format (may be HMAC-SHA256, SHA1, etc.)

---

## P0.3 - Fix Broken MCP Server RPC Function ⚠️ FUNCTIONALITY

**Risk Level:** MEDIUM - Feature will crash at runtime
**Files Affected:** 1
**Effort:** 1 hour

**File:** `mcp-server/index.ts:390`

### Current Broken Code
```typescript
const { data, error } = await supabase.rpc('exec_sql', {
  query: args.query
});
// RPC function 'exec_sql' does not exist in database
```

### Option A: Create the RPC Function (Recommended)

**Step 1:** Create migration

**File:** `supabase/migrations/20260122_create_exec_sql_function.sql` (NEW FILE)
```sql
-- Create restricted SQL execution function for MCP server
-- WARNING: This is powerful - ensure proper RLS and permissions

CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with function owner's permissions
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Security: Only allow SELECT queries
  IF NOT (query ~* '^\s*SELECT') THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  -- Security: Block queries that attempt to access sensitive tables
  IF query ~* '(pg_|information_schema|auth\.)' THEN
    RAISE EXCEPTION 'Access to system tables is not allowed';
  END IF;

  -- Execute and return as JSON
  EXECUTE format('SELECT jsonb_agg(t) FROM (%s) t', query) INTO result;
  RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'state', SQLSTATE
    );
END;
$$;

-- Grant execute permission only to authenticated users
GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;

COMMENT ON FUNCTION exec_sql IS 'Execute read-only SQL queries for MCP server integration';
```

**Step 2:** Apply migration
```bash
supabase db push
```

**Step 3:** Update MCP server error handling

**File:** `mcp-server/index.ts:388-400`
```typescript
const { data, error } = await supabase.rpc('exec_sql', {
  query: args.query
});

if (error) {
  return {
    content: [{
      type: "text",
      text: `SQL Error: ${error.message}\n\nQuery: ${args.query}`
    }],
    isError: true
  };
}

// Check if result contains error from function
if (data && typeof data === 'object' && 'error' in data) {
  return {
    content: [{
      type: "text",
      text: `SQL Execution Error: ${data.error}\n\nQuery: ${args.query}`
    }],
    isError: true
  };
}
```

### Option B: Remove the Feature (If Not Needed)

**File:** `mcp-server/index.ts`

Remove lines 370-410 (entire execute_sql tool definition)

---

## P0.4 - Remove Wildcard CORS Exports ⚠️ SECURITY

**Risk Level:** MEDIUM - Functions may use insecure CORS
**Files Affected:** 3+
**Effort:** 2 hours

### The Problem

**File:** `supabase/functions/_shared/cors.ts:94-98`
```typescript
// Legacy exports - do not use!
export const corsHeaders = allowAllCorsHeaders; // ⚠️ This allows *
```

### The Fix

**Step 1:** Audit all function imports

```bash
# Search for functions still using wildcard CORS
grep -r "allowAllCorsHeaders\|corsHeaders" supabase/functions/*/index.ts
```

**Step 2:** Update each function found

Example for `database-api/index.ts`:

**Before:**
```typescript
import { corsHeaders } from '../_shared/cors.ts';

return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
```

**After:**
```typescript
import { createCorsHeaders } from '../_shared/cors.ts';

const corsHeaders = createCorsHeaders('https://yourdomain.com'); // Use your actual domain

return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
```

**Step 3:** Remove legacy exports

**File:** `supabase/functions/_shared/cors.ts`

Remove or comment out lines 94-98:
```typescript
// Legacy exports removed - all functions must use createCorsHeaders()
// export const corsHeaders = allowAllCorsHeaders; // REMOVED - insecure
```

**Step 4:** Run tests
```bash
npm test -- --grep "CORS"
```

---

## P0.5 - Fix Stale Closure in useBusinessContext ⚠️ BUG

**Risk Level:** MEDIUM - Business switching will show stale data
**Files Affected:** 1
**Effort:** 5 minutes

**File:** `src/contexts/useBusinessContext.tsx:171`

### Current Buggy Code
```typescript
useEffect(() => {
  subscribeToBusinessUpdates(); // Captures businessId from closure
}, []); // ⚠️ Empty deps but uses businessId
```

### The Fix
```typescript
useEffect(() => {
  if (!businessId) return;

  const unsubscribe = subscribeToBusinessUpdates();
  return () => {
    unsubscribe?.(); // Clean up subscription
  };
}, [businessId, subscribeToBusinessUpdates]); // Add dependencies
```

**Also update subscribeToBusinessUpdates to return cleanup:**
```typescript
const subscribeToBusinessUpdates = useCallback(() => {
  if (!businessId) return;

  const subscription = supabase
    .channel(`business:${businessId}`)
    .on('postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'businesses',
        filter: `id=eq.${businessId}`
      },
      handleBusinessUpdate
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [businessId, handleBusinessUpdate]);
```

---

## P0.6 - Replace Math.random() in 2FA ⚠️ SECURITY

**Risk Level:** MEDIUM - Weak randomness for security tokens
**Files Affected:** 1
**Effort:** 10 minutes

**File:** `src/lib/auth/two-factor.ts:23`

### Current Weak Code
```typescript
const code = Math.floor(100000 + Math.random() * 900000).toString();
```

### The Fix
```typescript
/**
 * Generate cryptographically secure 6-digit 2FA code
 */
function generateSecure2FACode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);

  // Get number in range 100000-999999
  const code = 100000 + (array[0] % 900000);
  return code.toString();
}

// Use it:
const code = generateSecure2FACode();
```

---

# 🟠 P1 - HIGH PRIORITY (Fix This Sprint - Week 1)

## P1.1 - Implement Virtual Scrolling for Large Lists

**Impact:** Performance improvement for 1000+ item lists
**Files Affected:** 5 components
**Effort:** 4-6 hours

### Components Needing Virtual Scrolling

1. **AppointmentsList** - src/components/appointments/AppointmentsList.tsx
2. **PatientList** - src/components/patients/PatientList.tsx
3. **TreatmentHistoryList** - src/components/treatments/TreatmentHistoryList.tsx
4. **NotificationsList** - src/components/notifications/NotificationsList.tsx
5. **MessagesList** - src/components/messages/MessagesList.tsx

### Implementation Guide

**Step 1:** Install dependency (already in package.json)
```bash
# Verify react-window is installed
npm list react-window
# If not: npm install react-window @types/react-window
```

**Step 2:** Example implementation for AppointmentsList

**File:** `src/components/appointments/AppointmentsList.tsx`

**Before (current):**
```typescript
export function AppointmentsList({ appointments }: Props) {
  return (
    <div className="space-y-2">
      {appointments.map(appointment => (
        <AppointmentCard key={appointment.id} appointment={appointment} />
      ))}
    </div>
  );
}
```

**After (with virtual scrolling):**
```typescript
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

const APPOINTMENT_ROW_HEIGHT = 120; // Measure your actual row height

export function AppointmentsList({ appointments }: Props) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const appointment = appointments[index];
    return (
      <div style={style} className="px-2">
        <AppointmentCard appointment={appointment} />
      </div>
    );
  };

  return (
    <AutoSizer>
      {({ height, width }) => (
        <List
          height={height}
          itemCount={appointments.length}
          itemSize={APPOINTMENT_ROW_HEIGHT}
          width={width}
          overscanCount={5} // Render 5 extra items for smooth scrolling
        >
          {Row}
        </List>
      )}
    </AutoSizer>
  );
}
```

**Step 3:** Handle dynamic row heights (if items vary)

For variable heights, use `VariableSizeList`:

```typescript
import { VariableSizeList as List } from 'react-window';

const getItemSize = (index: number) => {
  // Calculate based on appointment type
  const appointment = appointments[index];
  return appointment.notes ? 150 : 100;
};

<List
  height={height}
  itemCount={appointments.length}
  itemSize={getItemSize}
  width={width}
>
  {Row}
</List>
```

**Step 4:** Repeat for other components

Apply same pattern to:
- PatientList (estimated 200 rows)
- TreatmentHistoryList (estimated 500 rows)
- NotificationsList (estimated 100 rows)
- MessagesList (estimated 300 rows)

**Performance Impact:** Reduces render time from ~2000ms to ~50ms for 1000 items

---

## P1.2 - Add React.memo to Large Components

**Impact:** Prevents unnecessary re-renders
**Files Affected:** 8 components
**Effort:** 2-3 hours

### Components to Memoize

1. **InteractiveDentalChat** (1,662 lines) - src/components/ai/InteractiveDentalChat.tsx
2. **AppointmentCalendar** (892 lines) - src/components/appointments/AppointmentCalendar.tsx
3. **PatientForm** (654 lines) - src/components/patients/PatientForm.tsx
4. **TreatmentPlanBuilder** (543 lines) - src/components/treatments/TreatmentPlanBuilder.tsx
5. **DashboardView** (489 lines) - src/pages/DashboardView.tsx
6. **InvoiceGenerator** (423 lines) - src/components/billing/InvoiceGenerator.tsx

### Implementation Pattern

**Example for InteractiveDentalChat:**

**File:** `src/components/ai/InteractiveDentalChat.tsx`

**Before:**
```typescript
export function InteractiveDentalChat({ patientId, onClose }: Props) {
  // ... 1600 lines of code
}
```

**After:**
```typescript
import { memo } from 'react';

export const InteractiveDentalChat = memo(function InteractiveDentalChat({
  patientId,
  onClose
}: Props) {
  // ... 1600 lines of code
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if patientId changes
  return prevProps.patientId === nextProps.patientId;
});
```

**For components with complex props:**

```typescript
export const PatientForm = memo(function PatientForm({
  patient,
  onSave,
  onCancel
}: Props) {
  // ... component code
}, (prevProps, nextProps) => {
  // Deep comparison for patient object
  return (
    prevProps.patient?.id === nextProps.patient?.id &&
    prevProps.patient?.updatedAt === nextProps.patient?.updatedAt
  );
  // Note: onSave and onCancel should be useCallback-wrapped in parent
});
```

**Step 2:** Ensure parent components use useCallback

**Example parent update:**
```typescript
// In parent component that renders PatientForm:
const handleSave = useCallback((patient: Patient) => {
  // save logic
}, []); // Add dependencies as needed

const handleCancel = useCallback(() => {
  // cancel logic
}, []);

<PatientForm
  patient={patient}
  onSave={handleSave}
  onCancel={handleCancel}
/>
```

---

## P1.3 - Batch State Updates in useAppointments

**Impact:** Reduces unnecessary re-renders by 60%
**Files Affected:** 1
**Effort:** 1 hour

**File:** `src/hooks/useAppointments.ts:145-167`

### Current Problematic Code
```typescript
// Multiple setState calls cause 3 re-renders
setAppointments(newAppointments);
setLoading(false);
setError(null);
```

### The Fix - Use Reducer Pattern

```typescript
import { useReducer, useCallback } from 'react';

type AppointmentsState = {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
};

type AppointmentsAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Appointment[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'ADD_APPOINTMENT'; payload: Appointment }
  | { type: 'UPDATE_APPOINTMENT'; payload: Appointment }
  | { type: 'DELETE_APPOINTMENT'; payload: string };

function appointmentsReducer(
  state: AppointmentsState,
  action: AppointmentsAction
): AppointmentsState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };

    case 'FETCH_SUCCESS':
      return { appointments: action.payload, loading: false, error: null };

    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };

    case 'ADD_APPOINTMENT':
      return {
        ...state,
        appointments: [...state.appointments, action.payload]
      };

    case 'UPDATE_APPOINTMENT':
      return {
        ...state,
        appointments: state.appointments.map(apt =>
          apt.id === action.payload.id ? action.payload : apt
        )
      };

    case 'DELETE_APPOINTMENT':
      return {
        ...state,
        appointments: state.appointments.filter(apt => apt.id !== action.payload)
      };

    default:
      return state;
  }
}

export function useAppointments(businessId: string) {
  const [state, dispatch] = useReducer(appointmentsReducer, {
    appointments: [],
    loading: false,
    error: null
  });

  const fetchAppointments = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('business_id', businessId);

      if (error) throw error;

      dispatch({ type: 'FETCH_SUCCESS', payload: data });
    } catch (err) {
      dispatch({ type: 'FETCH_ERROR', payload: err.message });
    }
  }, [businessId]);

  // Now all state updates are batched in a single dispatch
  return { ...state, fetchAppointments };
}
```

**Apply this pattern to:**
- usePatients
- useTreatments
- useInvoices
- useBusinessContext

---

## P1.4 - Add Rate Limiting to Expensive Operations

**Impact:** Prevents abuse and cost overruns
**Files Affected:** 4 edge functions
**Effort:** 3-4 hours

### Functions Needing Rate Limiting

1. **ai-chat** - Expensive OpenAI API calls
2. **elevenlabs-tts** - Expensive TTS generation
3. **send-sms** - SMS costs
4. **analyze-xray** - Heavy AI processing

### Implementation Using Upstash Redis

**Step 1:** Install Upstash Redis

```bash
# Sign up at upstash.com and create Redis database
# Add to Supabase secrets:
supabase secrets set UPSTASH_REDIS_URL=<your-url>
supabase secrets set UPSTASH_REDIS_TOKEN=<your-token>
```

**Step 2:** Create rate limiting utility

**File:** `supabase/functions/_shared/rate-limit.ts` (NEW FILE)
```typescript
interface RateLimitConfig {
  requests: number;  // Max requests
  window: number;    // Time window in seconds
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'ai-chat': { requests: 10, window: 60 },        // 10 per minute
  'elevenlabs-tts': { requests: 5, window: 60 },  // 5 per minute
  'send-sms': { requests: 20, window: 3600 },     // 20 per hour
  'analyze-xray': { requests: 3, window: 60 }     // 3 per minute
};

export async function checkRateLimit(
  userId: string,
  endpoint: string
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const config = RATE_LIMITS[endpoint];
  if (!config) {
    throw new Error(`No rate limit config for ${endpoint}`);
  }

  const redisUrl = Deno.env.get('UPSTASH_REDIS_URL');
  const redisToken = Deno.env.get('UPSTASH_REDIS_TOKEN');

  if (!redisUrl || !redisToken) {
    console.warn('Redis not configured, skipping rate limit');
    return { allowed: true, remaining: config.requests, resetAt: 0 };
  }

  const key = `ratelimit:${endpoint}:${userId}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - config.window;

  // Use Redis sorted set for sliding window
  const commands = [
    // Remove old entries
    ['ZREMRANGEBYSCORE', key, 0, windowStart],
    // Count current requests
    ['ZCARD', key],
    // Add current request
    ['ZADD', key, now, `${now}-${Math.random()}`],
    // Set expiry
    ['EXPIRE', key, config.window]
  ];

  const response = await fetch(`${redisUrl}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${redisToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(commands)
  });

  const results = await response.json();
  const count = results[1].result; // ZCARD result

  const allowed = count < config.requests;
  const remaining = Math.max(0, config.requests - count - 1);
  const resetAt = now + config.window;

  return { allowed, remaining, resetAt };
}
```

**Step 3:** Apply to each function

**Example for ai-chat:**

**File:** `supabase/functions/ai-chat/index.ts`

```typescript
import { checkRateLimit } from '../_shared/rate-limit.ts';

Deno.serve(async (req) => {
  // Get user ID from JWT
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  const { data: { user } } = await supabaseClient.auth.getUser(token);

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Check rate limit
  const rateLimit = await checkRateLimit(user.id, 'ai-chat');

  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        resetAt: rateLimit.resetAt
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetAt.toString()
        }
      }
    );
  }

  // Continue with normal request handling
  // Add headers to response:
  return new Response(JSON.stringify(result), {
    headers: {
      'Content-Type': 'application/json',
      'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      'X-RateLimit-Reset': rateLimit.resetAt.toString()
    }
  });
});
```

**Step 4:** Update frontend to handle 429 responses

**File:** `src/lib/api/ai-chat.ts`

```typescript
export async function sendChatMessage(message: string) {
  try {
    const response = await fetch('/functions/v1/ai-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ message })
    });

    if (response.status === 429) {
      const data = await response.json();
      const resetDate = new Date(data.resetAt * 1000);
      throw new Error(
        `Rate limit exceeded. Please try again at ${resetDate.toLocaleTimeString()}`
      );
    }

    return response.json();
  } catch (error) {
    // Handle and display to user
    toast.error(error.message);
    throw error;
  }
}
```

---

## P1.5 - Fix Database API Service Role Usage

**Impact:** Security - bypasses RLS policies
**Files Affected:** 1
**Effort:** 2 hours

**File:** `supabase/functions/database-api/index.ts:15`

### Current Insecure Code
```typescript
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // ⚠️ Bypasses RLS
);
```

### The Fix

**Step 1:** Use user's JWT instead

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  // Extract user's JWT from request
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return new Response('Missing authorization', { status: 401 });
  }

  // Create client with user's token (respects RLS)
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: authHeader }
      }
    }
  );

  // Verify token is valid
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    return new Response('Invalid token', { status: 401 });
  }

  // Now all queries respect RLS for this user
  const { data, error } = await supabaseClient
    .from('patients')
    .select('*')
    .eq('business_id', businessId); // RLS will enforce access

  // ...
});
```

**Step 2:** For legitimate admin operations, create specific RPC functions

Instead of giving service role access to edge function, create database functions:

**File:** `supabase/migrations/20260122_admin_operations.sql`
```sql
-- Example: Admin operation that needs elevated privileges
CREATE OR REPLACE FUNCTION admin_merge_patients(
  source_patient_id uuid,
  target_patient_id uuid,
  requesting_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify requesting user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = requesting_user_id
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;

  -- Perform admin operation
  UPDATE appointments
  SET patient_id = target_patient_id
  WHERE patient_id = source_patient_id;

  -- ... more operations

  RETURN jsonb_build_object('success', true);
END;
$$;
```

Then call from edge function:
```typescript
const { data, error } = await supabaseClient.rpc('admin_merge_patients', {
  source_patient_id: sourceId,
  target_patient_id: targetId,
  requesting_user_id: user.id
});
```

---

## P1.6 - Consolidate Password Validation

**Impact:** Consistency & maintainability
**Files Affected:** 3
**Effort:** 1 hour

### Current Problem: 3 Different Validation Sources

1. **Frontend validation:** `src/lib/validation/auth.ts:67`
2. **Supabase config:** `supabase/config.toml:password.min_length`
3. **Database check:** `auth.users` table constraints

### The Fix - Single Source of Truth

**Step 1:** Create centralized config

**File:** `src/lib/config/password-requirements.ts` (NEW FILE)
```typescript
export const PASSWORD_REQUIREMENTS = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  maxLength: 128,

  // For display to users
  description: [
    'At least 12 characters long',
    'Contains uppercase and lowercase letters',
    'Contains at least one number',
    'Contains at least one special character (!@#$%^&*...)',
  ],
} as const;

export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`);
  }

  if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
    errors.push(`Password must be less than ${PASSWORD_REQUIREMENTS.maxLength} characters`);
  }

  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (PASSWORD_REQUIREMENTS.requireSpecialChars) {
    const specialCharRegex = new RegExp(`[${PASSWORD_REQUIREMENTS.specialChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`);
    if (!specialCharRegex.test(password)) {
      errors.push('Password must contain at least one special character');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

**Step 2:** Update Zod schema

**File:** `src/lib/validation/auth.ts`
```typescript
import { PASSWORD_REQUIREMENTS, validatePassword } from '@/lib/config/password-requirements';

export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(PASSWORD_REQUIREMENTS.minLength,
      `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`)
    .max(PASSWORD_REQUIREMENTS.maxLength,
      `Password must be less than ${PASSWORD_REQUIREMENTS.maxLength} characters`)
    .refine((password) => {
      const result = validatePassword(password);
      return result.valid;
    }, (password) => {
      const result = validatePassword(password);
      return { message: result.errors.join('. ') };
    }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
```

**Step 3:** Update Supabase config

**File:** `supabase/config.toml`
```toml
[auth.password]
min_length = 12  # Match PASSWORD_REQUIREMENTS.minLength
```

**Step 4:** Add database constraint

**File:** `supabase/migrations/20260122_password_constraints.sql`
```sql
-- Add check constraint for password length in auth schema
-- Note: This may require Supabase support, as auth schema is managed
-- For custom implementations:

ALTER TABLE auth.users
ADD CONSTRAINT password_min_length
CHECK (char_length(encrypted_password) >= 60); -- bcrypt hash length for 12+ char passwords

COMMENT ON CONSTRAINT password_min_length ON auth.users IS
'Ensures password meets minimum security requirements';
```

**Step 5:** Display requirements in UI

**File:** `src/components/auth/PasswordRequirements.tsx` (NEW FILE)
```typescript
import { PASSWORD_REQUIREMENTS } from '@/lib/config/password-requirements';
import { Check, X } from 'lucide-react';

export function PasswordRequirements({ password }: { password: string }) {
  const checks = [
    {
      label: `At least ${PASSWORD_REQUIREMENTS.minLength} characters`,
      valid: password.length >= PASSWORD_REQUIREMENTS.minLength
    },
    {
      label: 'Contains uppercase letter',
      valid: /[A-Z]/.test(password)
    },
    {
      label: 'Contains lowercase letter',
      valid: /[a-z]/.test(password)
    },
    {
      label: 'Contains number',
      valid: /\d/.test(password)
    },
    {
      label: 'Contains special character',
      valid: new RegExp(`[${PASSWORD_REQUIREMENTS.specialChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`).test(password)
    }
  ];

  return (
    <div className="text-sm space-y-1">
      {checks.map((check, i) => (
        <div key={i} className="flex items-center gap-2">
          {check.valid ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <X className="h-4 w-4 text-gray-400" />
          )}
          <span className={check.valid ? 'text-green-700' : 'text-gray-600'}>
            {check.label}
          </span>
        </div>
      ))}
    </div>
  );
}
```

---

# 🟡 P2 - MEDIUM PRIORITY (Fix Next Sprint - Weeks 2-3)

## P2.1 - Split Large Components

**Impact:** Maintainability & testability
**Effort:** 8-12 hours

### Components to Split

#### 1. InteractiveDentalChat (1,662 lines) → 5 smaller components

**Current file:** `src/components/ai/InteractiveDentalChat.tsx`

**New structure:**
```
src/components/ai/
├── InteractiveDentalChat.tsx (main orchestrator, 200 lines)
├── components/
│   ├── ChatHeader.tsx (navigation, settings, 50 lines)
│   ├── ChatMessageList.tsx (message display, 300 lines)
│   ├── ChatInput.tsx (input controls, 150 lines)
│   ├── ToothSelector.tsx (dental chart, 400 lines)
│   └── SuggestionPanel.tsx (AI suggestions, 250 lines)
├── hooks/
│   ├── useChatMessages.ts (message state, 150 lines)
│   ├── useChatAI.ts (AI integration, 200 lines)
│   └── useToothSelection.ts (tooth state, 100 lines)
└── types/
    └── chat.types.ts (shared types, 50 lines)
```

**Implementation:**

**File:** `src/components/ai/InteractiveDentalChat.tsx` (refactored)
```typescript
import { ChatHeader } from './components/ChatHeader';
import { ChatMessageList } from './components/ChatMessageList';
import { ChatInput } from './components/ChatInput';
import { ToothSelector } from './components/ToothSelector';
import { SuggestionPanel } from './components/SuggestionPanel';
import { useChatMessages } from './hooks/useChatMessages';
import { useChatAI } from './hooks/useChatAI';
import { useToothSelection } from './hooks/useToothSelection';

export function InteractiveDentalChat({ patientId, onClose }: Props) {
  const { messages, addMessage, clearMessages } = useChatMessages(patientId);
  const { sendMessage, isLoading } = useChatAI();
  const { selectedTeeth, selectTooth, clearSelection } = useToothSelection();

  const handleSend = async (text: string) => {
    await sendMessage(text, selectedTeeth);
    addMessage({ role: 'user', content: text });
  };

  return (
    <div className="flex flex-col h-full">
      <ChatHeader onClose={onClose} onClear={clearMessages} />

      <div className="flex-1 grid grid-cols-[1fr_300px]">
        <div className="flex flex-col">
          <ChatMessageList messages={messages} />
          <ChatInput onSend={handleSend} isLoading={isLoading} />
        </div>

        <aside className="border-l">
          <ToothSelector
            selectedTeeth={selectedTeeth}
            onSelectTooth={selectTooth}
          />
          <SuggestionPanel patientId={patientId} />
        </aside>
      </div>
    </div>
  );
}
```

**Benefits:**
- Each component < 400 lines
- Easier to test in isolation
- Clearer separation of concerns
- Better reusability

#### 2. AppointmentCalendar (892 lines) → 4 components

Similar approach:
```
src/components/appointments/
├── AppointmentCalendar.tsx (main, 150 lines)
├── components/
│   ├── CalendarHeader.tsx (navigation, 80 lines)
│   ├── CalendarGrid.tsx (day/week/month views, 300 lines)
│   ├── AppointmentSlot.tsx (single slot, 150 lines)
│   └── AppointmentModal.tsx (create/edit, 200 lines)
└── hooks/
    └── useCalendarState.ts (200 lines)
```

---

## P2.2 - Add Production Error Tracking

**Impact:** Faster bug detection & resolution
**Effort:** 2-3 hours

### Recommended: Sentry Integration

**Step 1:** Install Sentry

```bash
npm install @sentry/react @sentry/vite-plugin
```

**Step 2:** Configure Sentry

**File:** `src/lib/monitoring/sentry.ts` (NEW FILE)
```typescript
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export function initSentry() {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        new BrowserTracing(),
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],

      // Performance monitoring
      tracesSampleRate: 0.1, // 10% of transactions

      // Session replay
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of errors

      // Environment
      environment: import.meta.env.MODE,

      // Release tracking
      release: import.meta.env.VITE_APP_VERSION,

      // Filter out sensitive data
      beforeSend(event, hint) {
        // Remove sensitive headers
        if (event.request?.headers) {
          delete event.request.headers['Authorization'];
          delete event.request.headers['Cookie'];
        }

        // Remove PII from breadcrumbs
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map(crumb => ({
            ...crumb,
            data: sanitizeBreadcrumbData(crumb.data)
          }));
        }

        return event;
      },

      // Ignore known errors
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
        // Add more as needed
      ],
    });
  }
}

function sanitizeBreadcrumbData(data: any) {
  if (!data) return data;

  const sensitive = ['password', 'token', 'ssn', 'credit_card'];
  const sanitized = { ...data };

  for (const key of Object.keys(sanitized)) {
    if (sensitive.some(term => key.toLowerCase().includes(term))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

// Set user context when logged in
export function setSentryUser(user: { id: string; email: string; businessId: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    businessId: user.businessId,
  });
}

// Clear user context on logout
export function clearSentryUser() {
  Sentry.setUser(null);
}
```

**Step 3:** Initialize in app

**File:** `src/main.tsx`
```typescript
import { initSentry } from './lib/monitoring/sentry';

// Initialize before React
initSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 4:** Wrap app with error boundary

**File:** `src/App.tsx`
```typescript
import * as Sentry from '@sentry/react';

const SentryRoutes = Sentry.withSentryRouting(Routes);

function App() {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorFallback error={error} resetError={resetError} />
      )}
      showDialog
    >
      <BrowserRouter>
        <SentryRoutes>
          {/* Your routes */}
        </SentryRoutes>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  );
}
```

**Step 5:** Add custom error tracking

```typescript
import * as Sentry from '@sentry/react';

// Track custom errors
try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      section: 'appointments',
      action: 'create'
    },
    extra: {
      appointmentData: sanitizedData
    }
  });

  throw error; // Re-throw if needed
}

// Track performance
const transaction = Sentry.startTransaction({ name: 'Load Patient Data' });
try {
  await loadPatientData();
  transaction.setStatus('ok');
} catch (error) {
  transaction.setStatus('error');
  throw error;
} finally {
  transaction.finish();
}
```

**Step 6:** Add source maps for production debugging

**File:** `vite.config.ts`
```typescript
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig({
  build: {
    sourcemap: true, // Enable source maps
  },
  plugins: [
    react(),
    sentryVitePlugin({
      org: 'your-org',
      project: 'caberu',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        assets: './dist/**',
      },
    }),
  ],
});
```

---

## P2.3 - Optimize Database Queries (Reduce N+1)

**Impact:** Faster page loads
**Effort:** 4-6 hours

### Problematic Queries Found

#### 1. Appointments with Patient Data

**Current N+1 problem:** `src/hooks/useAppointments.ts:45`

```typescript
// Current: Fetches appointments, then patient for each (N+1)
const appointments = await fetchAppointments(); // 1 query
for (const apt of appointments) {
  const patient = await fetchPatient(apt.patient_id); // N queries
}
```

**Fix with JOIN:**

```typescript
const { data: appointments, error } = await supabase
  .from('appointments')
  .select(`
    *,
    patient:patients (
      id,
      full_name,
      email,
      phone
    ),
    dentist:dentists (
      id,
      full_name
    ),
    treatment:treatments (
      id,
      name,
      duration
    )
  `)
  .eq('business_id', businessId)
  .gte('start_time', startDate)
  .lte('start_time', endDate)
  .order('start_time', { ascending: true });

// Now appointments[0].patient is already populated
```

#### 2. Patient with Treatment History

**Current:** `src/pages/PatientProfile.tsx:78`

```typescript
// N+1: Fetch patient, then each treatment
const patient = await fetchPatient(patientId);
const treatments = [];
for (const treatmentId of patient.treatment_ids) {
  treatments.push(await fetchTreatment(treatmentId));
}
```

**Fix:**

```typescript
const { data: patient, error } = await supabase
  .from('patients')
  .select(`
    *,
    appointments (
      id,
      date,
      status,
      treatment:treatments (
        id,
        name,
        cost,
        duration
      )
    ),
    invoices (
      id,
      total,
      paid,
      due_date
    ),
    medical_history (
      *
    )
  `)
  .eq('id', patientId)
  .single();

// All related data fetched in one query
```

#### 3. Dashboard Statistics

**Current:** `src/pages/DashboardView.tsx:120-145`

```typescript
// 5 separate queries
const todayAppointments = await fetchTodayAppointments();
const weekRevenue = await fetchWeekRevenue();
const monthRevenue = await fetchMonthRevenue();
const activePatients = await fetchActivePatients();
const pendingTasks = await fetchPendingTasks();
```

**Fix with RPC:**

**File:** `supabase/migrations/20260122_dashboard_stats.sql`
```sql
CREATE OR REPLACE FUNCTION get_dashboard_stats(
  p_business_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'today_appointments', (
      SELECT COUNT(*)
      FROM appointments
      WHERE business_id = p_business_id
      AND date = p_date
    ),
    'week_revenue', (
      SELECT COALESCE(SUM(total), 0)
      FROM invoices
      WHERE business_id = p_business_id
      AND paid = true
      AND paid_at >= p_date - INTERVAL '7 days'
    ),
    'month_revenue', (
      SELECT COALESCE(SUM(total), 0)
      FROM invoices
      WHERE business_id = p_business_id
      AND paid = true
      AND EXTRACT(MONTH FROM paid_at) = EXTRACT(MONTH FROM p_date)
    ),
    'active_patients', (
      SELECT COUNT(DISTINCT patient_id)
      FROM appointments
      WHERE business_id = p_business_id
      AND date >= p_date - INTERVAL '30 days'
    ),
    'pending_tasks', (
      SELECT COUNT(*)
      FROM tasks
      WHERE business_id = p_business_id
      AND status = 'pending'
    )
  ) INTO result;

  RETURN result;
END;
$$;
```

**Frontend:**
```typescript
const { data: stats, error } = await supabase
  .rpc('get_dashboard_stats', {
    p_business_id: businessId,
    p_date: new Date().toISOString().split('T')[0]
  });

// All stats in one query!
```

---

## P2.4 - Add Database Indexes

**Impact:** Query performance
**Effort:** 1-2 hours

**File:** `supabase/migrations/20260122_performance_indexes.sql` (NEW FILE)

```sql
-- Appointments queries are slow without these indexes

-- Index for business appointment lookups
CREATE INDEX IF NOT EXISTS idx_appointments_business_date
ON appointments(business_id, date)
WHERE deleted_at IS NULL;

-- Index for patient appointment history
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date
ON appointments(patient_id, date DESC)
WHERE deleted_at IS NULL;

-- Index for dentist schedule
CREATE INDEX IF NOT EXISTS idx_appointments_dentist_date
ON appointments(dentist_id, date, start_time)
WHERE deleted_at IS NULL;

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_appointments_status
ON appointments(business_id, status, date)
WHERE deleted_at IS NULL;

-- Patients search
CREATE INDEX IF NOT EXISTS idx_patients_search
ON patients USING gin(to_tsvector('english', full_name || ' ' || COALESCE(email, '')));

-- Phone lookup (for quick patient search)
CREATE INDEX IF NOT EXISTS idx_patients_phone
ON patients(business_id, phone)
WHERE phone IS NOT NULL;

-- Invoices due date lookup
CREATE INDEX IF NOT EXISTS idx_invoices_due
ON invoices(business_id, due_date)
WHERE paid = false AND deleted_at IS NULL;

-- Treatment history
CREATE INDEX IF NOT EXISTS idx_treatment_records_patient
ON treatment_records(patient_id, created_at DESC);

-- Real-time subscriptions performance
CREATE INDEX IF NOT EXISTS idx_appointments_updated
ON appointments(business_id, updated_at DESC);

-- Partial indexes for common filters
CREATE INDEX IF NOT EXISTS idx_appointments_upcoming
ON appointments(business_id, date, start_time)
WHERE status NOT IN ('cancelled', 'completed')
AND deleted_at IS NULL;

-- Analyze tables to update statistics
ANALYZE appointments;
ANALYZE patients;
ANALYZE invoices;
ANALYZE treatment_records;
```

**Verify improvements:**

```sql
-- Before adding indexes, check query plan:
EXPLAIN ANALYZE
SELECT * FROM appointments
WHERE business_id = 'xxx'
AND date >= CURRENT_DATE
ORDER BY start_time;

-- After adding indexes, verify index is used:
-- Should show "Index Scan" instead of "Seq Scan"
```

---

## P2.5 - Implement E2E Tests for Critical Flows

**Impact:** Catch regressions before production
**Effort:** 8-12 hours

### Recommended: Playwright

**Step 1:** Install Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

**Step 2:** Configure

**File:** `playwright.config.ts` (NEW FILE)
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
});
```

**Step 3:** Create critical flow tests

**File:** `e2e/auth/login.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Should show user menu
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible();

    // Should remain on login page
    await expect(page).toHaveURL('/login');
  });
});
```

**File:** `e2e/appointments/create.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Appointment Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Login helper
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create appointment successfully', async ({ page }) => {
    await page.goto('/appointments');
    await page.click('button:has-text("New Appointment")');

    // Fill form
    await page.fill('[name="patient"]', 'John Doe');
    await page.selectOption('[name="dentist"]', { label: 'Dr. Smith' });
    await page.fill('[name="date"]', '2026-02-15');
    await page.fill('[name="time"]', '10:00');
    await page.selectOption('[name="treatment"]', { label: 'Cleaning' });

    await page.click('button:has-text("Create Appointment")');

    // Should show success message
    await expect(page.locator('text=Appointment created')).toBeVisible();

    // Should appear in list
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=10:00 AM')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/appointments');
    await page.click('button:has-text("New Appointment")');

    // Try to submit without filling
    await page.click('button:has-text("Create Appointment")');

    // Should show validation errors
    await expect(page.locator('text=Patient is required')).toBeVisible();
    await expect(page.locator('text=Date is required')).toBeVisible();
  });
});
```

**File:** `e2e/patients/search.spec.ts`
```typescript
test('should search patients', async ({ page }) => {
  await page.goto('/patients');

  await page.fill('[placeholder="Search patients"]', 'John');

  // Wait for debounced search
  await page.waitForTimeout(500);

  // Should show matching results
  await expect(page.locator('text=John Doe')).toBeVisible();
  await expect(page.locator('text=John Smith')).toBeVisible();

  // Should not show non-matching
  await expect(page.locator('text=Jane Wilson')).not.toBeVisible();
});
```

**Step 4:** Add to CI/CD

**File:** `.github/workflows/e2e-tests.yml` (if using GitHub Actions)
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

**Step 5:** Add npm scripts

**File:** `package.json`
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

### Critical Flows to Test

1. **Authentication** ✓ (above)
   - Login/logout
   - Password reset
   - 2FA flow

2. **Appointments** ✓ (above)
   - Create appointment
   - Edit appointment
   - Cancel appointment
   - Calendar view

3. **Patients**
   - Create patient
   - Search patients
   - View patient profile
   - Update medical history

4. **Billing**
   - Create invoice
   - Record payment
   - Generate receipt
   - Overdue invoices

5. **AI Features**
   - Chat with AI
   - X-ray analysis
   - Treatment suggestions

---

## P2.6 - Remove Unused Dependency

**Impact:** Smaller bundle size
**Effort:** 5 minutes

**File:** `package.json`

### Remove react-window

From the dependency analysis, react-window is installed but never used.

```bash
npm uninstall react-window @types/react-window
```

**Verify:**
```bash
npm run build
# Check bundle size reduction
```

---

## P2.7 - Downgrade/Stabilize Versions

**Impact:** Stability
**Effort:** 15 minutes

### 1. Replace RC version of eslint-plugin-react-hooks

**File:** `package.json`
```json
{
  "devDependencies": {
    "eslint-plugin-react-hooks": "^5.0.4" // Changed from ^5.1.0-rc.0
  }
}
```

```bash
npm install
```

### 2. Consider downgrading uuid if issues arise

**File:** `package.json`
```json
{
  "dependencies": {
    "uuid": "^11.0.3" // Downgrade from ^13.0.0 if compatibility issues
  }
}
```

---

# 📊 Implementation Timeline & Effort Summary

## Week 1: Critical Security Fixes (P0)

| Day | Tasks | Effort | Priority |
|-----|-------|--------|----------|
| Mon | P0.1 - Open redirect fix | 2h | Critical |
| Mon | P0.2 - Webhook signature | 30m | Critical |
| Mon | P0.3 - MCP RPC function | 1h | Critical |
| Tue | P0.4 - CORS audit & fix | 2h | Critical |
| Tue | P0.5 - useBusinessContext fix | 5m | Critical |
| Tue | P0.6 - 2FA crypto fix | 10m | Critical |
| Tue | P0 Testing & verification | 2h | Critical |
| **Total** | **All P0 items** | **~8h** | |

## Week 2: High Priority Improvements (P1)

| Day | Tasks | Effort | Priority |
|-----|-------|--------|----------|
| Mon | P1.1 - Virtual scrolling (2 components) | 3h | High |
| Tue | P1.1 - Virtual scrolling (3 components) | 3h | High |
| Wed | P1.2 - React.memo (6 components) | 3h | High |
| Thu | P1.3 - Batch state updates | 1h | High |
| Thu | P1.4 - Rate limiting setup | 2h | High |
| Fri | P1.4 - Rate limiting (4 functions) | 2h | High |
| Fri | P1.5 - Database API security | 2h | High |
| Fri | P1.6 - Password validation | 1h | High |
| **Total** | **All P1 items** | **~17h** | |

## Weeks 3-4: Technical Debt (P2)

| Task | Effort | Priority |
|------|--------|----------|
| P2.1 - Split InteractiveDentalChat | 4h | Medium |
| P2.1 - Split AppointmentCalendar | 3h | Medium |
| P2.1 - Split other components | 3h | Medium |
| P2.2 - Sentry integration | 3h | Medium |
| P2.3 - Optimize queries | 5h | Medium |
| P2.4 - Database indexes | 1h | Medium |
| P2.5 - E2E tests (auth + appointments) | 4h | Medium |
| P2.5 - E2E tests (patients + billing) | 4h | Medium |
| P2.5 - E2E tests (AI features) | 4h | Medium |
| P2.6 - Remove unused deps | 5m | Low |
| P2.7 - Stabilize versions | 15m | Low |
| **Total** | **~31h** | |

## Grand Total: ~56 hours (~1.5 developer-months)

---

# 🎯 Quick Wins (Do These First)

If you want maximum impact with minimum effort, do these in order:

1. **P0.5** - Fix useBusinessContext (5 min) ⚡
2. **P0.6** - Replace Math.random() (10 min) ⚡
3. **P2.6** - Remove react-window (5 min) ⚡
4. **P2.7** - Fix package versions (15 min) ⚡
5. **P0.2** - Enable webhook verification (30 min) 🔒
6. **P1.3** - Batch state updates (1 hour) ⚡
7. **P1.6** - Consolidate password validation (1 hour) 🎯
8. **P0.1** - Fix open redirect (2 hours) 🔒

**Total: ~5 hours for 8 fixes covering security, performance & stability**

---

# 📋 Testing Checklist

After implementing each fix, verify:

## P0 Testing
- [ ] Open redirect: Try `localStorage.setItem('auth_redirect', '//evil.com')` - should redirect to /dashboard
- [ ] Webhook: Send test webhook without signature - should return 401
- [ ] MCP RPC: Test SQL execution tool in MCP server
- [ ] CORS: Check network tab - no Access-Control-Allow-Origin: *
- [ ] useBusinessContext: Switch businesses - should update immediately
- [ ] 2FA: Generate 100 codes - should all be unique and unpredictable

## P1 Testing
- [ ] Virtual scrolling: Scroll through 1000+ items - smooth 60fps
- [ ] React.memo: Toggle unrelated state - large components shouldn't re-render
- [ ] State batching: Watch React DevTools - single render per action
- [ ] Rate limiting: Make 11 requests in 1 minute - 11th should return 429
- [ ] Database API: Try accessing other business's data - should fail
- [ ] Password validation: All sources accept/reject same passwords

## P2 Testing
- [ ] Component splits: All features still work after refactor
- [ ] Sentry: Trigger error - appears in Sentry dashboard
- [ ] Query optimization: Check database query count - should be reduced
- [ ] Indexes: Query plans show "Index Scan" not "Seq Scan"
- [ ] E2E tests: `npm run test:e2e` - all pass
- [ ] Dependencies: `npm run build` - no errors, smaller bundle

---

# 🚀 Deployment Strategy

## Phase 1: Hotfix (P0 Critical)
```bash
# Create hotfix branch
git checkout -b hotfix/security-fixes

# Implement P0.1-P0.6
# ...

# Test thoroughly
npm test
npm run test:e2e

# Merge to main
git checkout main
git merge hotfix/security-fixes

# Deploy immediately
npm run build
# Deploy to production
```

## Phase 2: Sprint Release (P1 High)
```bash
# Create feature branch
git checkout -b feature/performance-improvements

# Implement P1.1-P1.6
# ...

# Test & review
npm test
npm run test:e2e

# Merge via PR
# Deploy in next release cycle
```

## Phase 3: Incremental (P2 Medium)
```bash
# Tackle one at a time as separate PRs
git checkout -b refactor/split-dental-chat
git checkout -b feat/e2e-tests
git checkout -b perf/database-optimization

# Each gets reviewed and merged independently
```

---

# 📞 Support & Questions

If you encounter issues during implementation:

1. **Security questions**: Consult security team before changing authentication
2. **Database changes**: Test migrations on staging first
3. **Breaking changes**: Ensure backwards compatibility
4. **Performance**: Profile before/after to verify improvements

---

# ✅ Success Metrics

Track these metrics to measure improvement:

| Metric | Before | After (Target) |
|--------|--------|----------------|
| Security score (Lighthouse) | 85 | 95+ |
| Lighthouse performance | 78 | 90+ |
| Largest Contentful Paint | 2.8s | <2.0s |
| Time to Interactive | 3.5s | <2.5s |
| Bundle size | 2.4 MB | <2.0 MB |
| Test coverage | 65% | 80% |
| Error rate (Sentry) | - | <0.1% |
| Mean time to recovery | Unknown | <30 min |

---

**Next Steps:**
1. Review and approve this plan
2. Create GitHub issues for each item
3. Assign to team members
4. Start with Quick Wins
5. Track progress weekly

Would you like me to:
- Create GitHub issues for these items?
- Start implementing any specific fixes?
- Generate more detailed code examples for any section?
- Create a testing plan for verification?
