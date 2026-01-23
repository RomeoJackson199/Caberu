# Appointment Booking System - Code Review

**Reviewer:** Claude
**Date:** 2026-01-23
**Platform:** Belgian Healthcare Practice Management (Dental)

---

## Executive Summary

The appointment booking system is well-architected with a solid foundation including a state machine pattern, proper timezone handling for Europe/Brussels, and race condition prevention via database-level locking. However, several areas need attention for production readiness in a Belgian healthcare context.

**Overall Assessment:** Good foundation, requires targeted improvements

---

## Table of Contents

1. [Bugs & Edge Cases](#1-bugs--edge-cases)
2. [UI/UX Improvements](#2-uiux-improvements)
3. [Code Quality](#3-code-quality)
4. [Performance](#4-performance)
5. [Recommendations Priority Matrix](#5-recommendations-priority-matrix)

---

## 1. Bugs & Edge Cases

### 1.1 Race Conditions - WELL HANDLED

**Current Implementation:** The system uses `FOR UPDATE NOWAIT` in `book_appointment_slots_for_duration()` (line 34 in `20251223174709_*.sql`) which properly prevents double-booking through pessimistic locking.

```sql
SELECT * INTO v_slot
FROM public.appointment_slots
WHERE dentist_id = p_dentist_id
  AND slot_date = p_slot_date
  AND slot_time = v_current_time
FOR UPDATE NOWAIT;
```

**Strength:** This is the correct approach - any concurrent booking attempt will immediately fail rather than waiting, preventing race conditions.

**Minor Improvement Needed:** The `reschedule_appointment()` function uses `FOR UPDATE` without `NOWAIT`, which could cause the user to hang if another transaction holds the lock.

**Location:** `supabase/migrations/20251101142717_*.sql:39-45`

---

### 1.2 Timezone Handling - MOSTLY CORRECT, ONE CRITICAL ISSUE

**What's Working:**
- Uses `date-fns-tz` with explicit `Europe/Brussels` timezone constant
- `createAppointmentDateTimeFromStrings()` correctly interprets times in Brussels timezone
- Database queries use `AT TIME ZONE 'Europe/Brussels'` for comparisons

**CRITICAL BUG - DST Transition Edge Case:**

In `BookAppointmentAI.tsx:453-454`, the conflict detection creates JavaScript Date objects without timezone awareness:

```typescript
const requestedStart = new Date(`${dateStr}T${selectedTime}:00`);
const requestedEnd = new Date(requestedStart.getTime() + serviceDuration * 60000);
```

This will be interpreted in the browser's local timezone, which could differ from `Europe/Brussels` if:
1. A patient books from outside Belgium
2. The browser has incorrect timezone settings

**Impact:** Could allow double-bookings on DST transition days (last Sunday of March, last Sunday of October)

**Fix:** Use `createAppointmentDateTimeFromStrings()` consistently:
```typescript
const requestedStart = createAppointmentDateTimeFromStrings(dateStr, selectedTime);
```

---

### 1.3 Holidays & Practice Closures - NOT IMPLEMENTED

**Finding:** There is no Belgian public holiday handling in the system.

**Evidence:** Grep search for "holiday|public_holiday|clinic_closure" found only documentation references, no actual implementation.

**Belgian Public Holidays (that must be blocked):**
- New Year's Day (January 1)
- Easter Monday
- Labour Day (May 1)
- Ascension Day (40 days after Easter)
- Whit Monday (50 days after Easter)
- Belgian National Day (July 21)
- Assumption of Mary (August 15)
- All Saints' Day (November 1)
- Armistice Day (November 11)
- Christmas Day (December 25)

**Location Needed:** Should be added to `isDateDisabled()` in `BookAppointmentAI.tsx:560-567`

---

### 1.4 Lunch Breaks - PARTIALLY HANDLED

**What's Working:** The `WeeklyCalendarView.tsx` correctly displays lunch breaks visually (lines 226-234).

**Issue:** The slot generation function `generate_daily_slots()` does NOT exclude break times:

```sql
-- Lines 104-121 in appointment_slots_functions.sql
-- Generate slots
v_current_time := v_start_time;
WHILE v_current_time < v_end_time LOOP
  -- No check for break_start_time / break_end_time here!
  INSERT INTO appointment_slots ...
```

**Impact:** Patients can book during dentist's lunch break.

---

### 1.5 Mid-Booking Availability Changes - PARTIALLY HANDLED

**Scenario:** Patient selects a time slot, another patient books the same slot before first patient confirms.

**Current Handling:**
- `confirmBooking()` in `BookAppointmentAI.tsx:443-467` performs a secondary conflict check before creating the appointment
- If conflict detected, appointment creation is prevented and slots are refreshed

**Gap:** The check in `confirmBooking()` is a read-check-then-write pattern that still has a small race window. The atomic `book_appointment_slots_for_duration()` function is called AFTER the appointment is created (line 496-508), and rollback only happens if slot booking fails.

**Recommendation:** Use a database transaction that creates the appointment AND books slots atomically in one call.

---

### 1.6 Browser Refresh/Navigation - WELL HANDLED

**Strengths:**
- State is not lost on refresh during booking flow (sessionStorage used for AI booking data)
- `AppointmentErrorBoundary` catches and recovers from component crashes
- Success dialog allows returning to booking flow

**Minor Issue:** If user refreshes on the confirm step, they return to the dentist selection step (state reset). Consider persisting booking state in sessionStorage.

---

### 1.7 Month/Year Boundaries - NO ISSUES FOUND

The use of `date-fns` functions (`addDays`, `startOfWeek`, `format`) handles these correctly.

---

### 1.8 Leap Year Handling - NO ISSUES FOUND

No custom date arithmetic that would fail on leap years.

---

## 2. UI/UX Improvements

### 2.1 Booking Flow Clicks - GOOD

**Current Flow:** 5 steps (dentist -> symptoms -> service -> datetime -> confirm)

**Assessment:** This is appropriate for a healthcare context where symptom intake is important.

**Improvement:** Consider combining symptoms and service selection on one screen for power users.

---

### 2.2 Mobile Responsiveness - NEEDS WORK

**Issues Found:**

1. **Time slot grid not responsive** (`BookAppointmentAI.tsx:1064`):
   ```tsx
   <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
   ```
   On very small screens (320px), 3 columns may be too cramped.

2. **Week navigation on mobile** (`WeeklyCalendarView.tsx`): Mobile users see one day at a time (good), but swipe gestures aren't implemented - only button taps.

3. **RescheduleDialog** (`RescheduleDialog.tsx:267`): `sm:max-w-[700px]` may overflow on small screens.

---

### 2.3 Loading States - WELL IMPLEMENTED

**Strengths:**
- Skeleton loaders for dentist cards (`BookAppointmentAI.tsx:583-591`)
- Loading spinner during slot fetching (`BookAppointmentAI.tsx:1066`)
- Processing state on confirm button (`RescheduleDialog.tsx:401-407`)

**Missing:** No loading indicator when changing dates in the week picker - slots fetch silently.

---

### 2.4 Error Messages - EXCELLENT

The `userFriendlyErrors.ts` provides excellent user-facing messages:
- Contextual ("Time slot unavailable" vs generic "Error")
- Actionable suggestions
- Retry capability indicators

---

### 2.5 Accessibility - NEEDS SIGNIFICANT WORK

**Critical Issues:**

1. **Missing ARIA labels on time slot buttons** (`BookAppointmentAI.tsx:1073-1084`):
   ```tsx
   <button
     key={slot.time}
     onClick={() => handleTimeSelect(slot.time)}
     // No aria-label, role, or aria-pressed
   ```

2. **Keyboard navigation incomplete:**
   - Time slots can be clicked but not navigated with arrow keys
   - No focus trap in booking dialogs
   - No visible focus indicators on week day buttons

3. **Color contrast issues:**
   - Disabled dates have `opacity-40` which may not meet WCAG AA (4.5:1)
   - `text-muted-foreground` usage needs contrast verification

4. **Screen reader support:**
   - No `aria-live` regions for slot availability updates
   - Calendar doesn't announce selected date to screen readers
   - No announcements when booking succeeds/fails

**Required for Belgian accessibility compliance (Web Accessibility Directive):**
- Add `role="grid"` to calendar
- Add `aria-label` to all interactive elements
- Implement `aria-live="polite"` for dynamic updates

---

### 2.6 Visual Clarity of Slots - GOOD

**Available vs Unavailable:** Available slots shown with visible buttons, unavailable filtered out entirely (rather than shown as disabled).

**Recommendation:** Show unavailable slots as disabled for better context:
```tsx
// Instead of filtering, show all with disabled state
availableSlots.map((slot) => (
  <button disabled={!slot.available} ...>
```

---

## 3. Code Quality

### 3.1 Naming Conventions - INCONSISTENT

**Issues:**

1. **Mixed naming for dentist/practitioner:**
   - `dentistId`, `selectedDentist`, `dentists` table
   - For a generic healthcare platform, consider `practitioner` for extensibility

2. **Inconsistent slot time formats:**
   - `slot_time` (TIME type in DB)
   - `selectedTime` (string "HH:mm")
   - `slot.slot_time.substring(0, 5)` - repeated normalization

3. **File naming:**
   - `useAppointments.tsx` (hook)
   - `appointmentAvailability.ts` (utility)
   - `AppointmentCalendar.tsx` (component)
   - Inconsistent casing patterns

---

### 3.2 Separation of Concerns - NEEDS IMPROVEMENT

**Issue:** `BookAppointmentAI.tsx` is **1157 lines** and handles:
- Data fetching (dentists, services, slots)
- State management (multiple useState hooks)
- UI rendering (all 5 booking steps)
- Business logic (conflict detection, booking)

**Recommendation:** Extract into:
```
components/booking/
  BookingWizard.tsx
  DentistSelectionStep.tsx
  SymptomInputStep.tsx
  ServiceSelectionStep.tsx
  DateTimeSelectionStep.tsx
  ConfirmationStep.tsx
hooks/
  useBookingFlow.ts
  useAvailableSlots.ts
```

---

### 3.3 Unnecessary Re-renders - PRESENT

**Issue in `BookAppointmentAI.tsx`:**

```typescript
// Line 237: fetchAvailableSlots is called inside useEffect with selectedDate dependency
// But the function itself is recreated every render because it's not wrapped in useCallback
const fetchAvailableSlots = async (date: Date, dentistId: string) => { ... };
```

**Issue in `QuickAppointmentDialog.tsx`:**
- `filteredPatients` computed on every render, should be `useMemo` (actually is useMemo - good!)
- `availableTimeSlots` correctly uses `useMemo` (lines 192-223)

**Issue with Real-time Subscriptions:**
In `useAppointments.tsx:472-491`, the subscription triggers a full `fetchAppointments()` on ANY change, even if the change doesn't affect the current view.

---

### 3.4 Error Handling - MOSTLY COMPLETE

**Strengths:**
- `AppointmentErrorBoundary` catches React errors
- `getFriendlyErrorMessage()` for user-facing errors
- Rollback logic when slot booking fails (line 504-508)

**Gap:** No retry logic for transient failures:
```typescript
// In confirmBooking(), network errors cause immediate failure
// Consider using retryAppointmentOperation() which is imported but not used
import { retryAppointmentOperation } from "@/lib/retryStrategies"; // Imported but unused
```

---

### 3.5 Type Safety - GOOD BUT INCOMPLETE

**Strengths:**
- TypeScript used throughout
- Interface definitions for major types
- Zod validation mentioned in stack

**Issues:**

1. **`any` casts present:**
   - `RescheduleDialog.tsx:87`: `setAppointment(data as any);`
   - `WeeklyCalendarView.tsx:129`: `map((a: any) => ...)`
   - `QuickAppointmentDialog.tsx:158`: `data?.forEach((apt: any) => ...)`

2. **Missing null checks:**
   ```typescript
   // BookAppointmentAI.tsx:677
   const displayName = `${dentist.first_name || dentist.profiles?.first_name} ...`;
   // If both are undefined, displayName = "undefined undefined"
   ```

---

### 3.6 Hardcoded Values - PRESENT

**Found hardcoded values that should be configurable:**

| Location | Value | Recommended |
|----------|-------|-------------|
| `appointment_slots_functions.sql:72` | `v_slot_duration INT := 30` | Business setting |
| `appointment_slots_functions.sql:99-100` | `'09:00:00'::TIME` / `'17:00:00'::TIME` | Default working hours |
| `timezone.ts:6` | `'Europe/Brussels'` | Could be configurable per practice |
| `WeeklyCalendarView.tsx:61-63` | `HOUR_HEIGHT = 80`, `START_HOUR = 7`, `END_HOUR = 20` | User preference |
| `QuickAppointmentDialog.tsx:196` | `for (let h = 8; h <= 18; h++)` | Should use dentist availability |
| `RescheduleDialog.tsx:234` | Weekend disabled check | Should check dentist schedule |
| `appointmentAvailability.ts:37` | `CACHE_TTL = 5 * 60 * 1000` | Could be env variable |

---

## 4. Performance

### 4.1 Query Efficiency - NEEDS OPTIMIZATION

**N+1 Query Pattern in `WeeklyCalendarView.tsx:121-131`:**

```typescript
// First query: get appointments
const { data, error } = await query;
const appointments = data || [];

// N+1: separate query for patient profiles
const patientIds = Array.from(new Set(appointments.map((a: any) => a.patient_id)));
if (patientIds.length) {
  const { data: profiles } = await supabase
    .from("secure_profiles_view")
    .select(...)
    .in("id", patientIds);
```

**Impact:** 2 round trips to database per week view load.

**Fix:** Join in original query:
```typescript
const { data } = await supabase
  .from("appointments")
  .select(`*, profiles:patient_id(id, first_name, last_name, email)`)
```

---

**Similar pattern in `QuickAppointmentDialog.tsx:141-166`:**
Fetches all appointments for a dentist just to get unique patient IDs.

---

### 4.2 Slot Fetching - REDUNDANT CALLS

**Issue in `BookAppointmentAI.tsx:244-257`:**

```typescript
// Generate slots via RPC
await supabase.rpc('generate_daily_slots', {...});

// Then immediately query the same data
const { data, error } = await supabase
  .from('appointment_slots')
  .select('slot_time, is_available')
  ...
```

The `generate_daily_slots` function already inserts the slots, and `get_dentist_available_slots` (lines 128-162 in SQL) would return them directly. Using the combined RPC would save a round trip.

---

### 4.3 Caching - WELL IMPLEMENTED

**Strengths:**
- `appointmentAvailability.ts` has a 5-minute cache with LRU eviction (MAX_CACHE_SIZE = 100)
- Automatic cleanup interval prevents memory leaks
- `skipCache` parameter for forced refresh

**Opportunity:** The cache in `appointmentAvailability.ts` is separate from React Query's cache. Consider consolidating:

```typescript
// Use React Query's caching instead
const { data: slots } = useQuery({
  queryKey: ['availability', dentistId, dateStr],
  queryFn: () => fetchDentistAvailability(dentistId, date),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

---

### 4.4 Bundle Size - LAZY LOADING PRESENT

**Good:** `ClinicMap` is lazy loaded (`BookAppointmentAI.tsx:27`):
```typescript
const ClinicMap = lazy(() => import("@/components/Map"));
```

**Opportunity:** The large `completion-dialog.tsx` (52KB) could be lazy loaded.

---

### 4.5 Real-time Subscriptions - OVER-FETCHING

**Issue in `useAppointments.tsx:472-491`:**

Every database change triggers a full re-fetch:
```typescript
.on('postgres_changes', { event: '*', ... }, () => {
  fetchAppointments(); // Full fetch on any change
})
```

**Better approach:** Incremental updates:
```typescript
.on('postgres_changes', {...}, (payload) => {
  if (payload.eventType === 'INSERT') {
    setAppointments(prev => [...prev, payload.new]);
  } else if (payload.eventType === 'UPDATE') {
    setAppointments(prev => prev.map(a => a.id === payload.new.id ? payload.new : a));
  }
  // etc.
})
```

---

## 5. Recommendations Priority Matrix

### Critical (Fix Before Production)

| Issue | Location | Effort |
|-------|----------|--------|
| DST timezone bug in conflict detection | `BookAppointmentAI.tsx:453-454` | Low |
| Lunch break slots not excluded | `appointment_slots_functions.sql:104-121` | Medium |
| Missing Belgian public holidays | `BookAppointmentAI.tsx:560-567` | Medium |
| Accessibility ARIA labels | Multiple files | Medium |

### High Priority

| Issue | Location | Effort |
|-------|----------|--------|
| N+1 query pattern | `WeeklyCalendarView.tsx:121-131` | Low |
| Screen reader announcements | Booking flow components | Medium |
| Keyboard navigation | Time slot selection | Medium |
| Atomic transaction for booking | `BookAppointmentAI.tsx:473-508` | High |

### Medium Priority

| Issue | Location | Effort |
|-------|----------|--------|
| Component decomposition | `BookAppointmentAI.tsx` | High |
| Type safety (`any` casts) | Multiple files | Medium |
| Hardcoded values extraction | Multiple locations | Medium |
| Loading state for date changes | Week picker | Low |

### Low Priority (Nice to Have)

| Issue | Location | Effort |
|-------|----------|--------|
| Mobile swipe gestures | `WeeklyCalendarView.tsx` | Medium |
| Show disabled slots for context | Slot selection | Low |
| Retry logic for network errors | `BookAppointmentAI.tsx` | Low |
| Cache consolidation | `appointmentAvailability.ts` | Medium |

---

## Appendix: Files Reviewed

| File | Lines | Assessment |
|------|-------|------------|
| `src/pages/BookAppointmentAI.tsx` | 1157 | Primary booking flow - needs decomposition |
| `src/lib/appointmentAvailability.ts` | 156 | Well-structured caching |
| `src/lib/timezone.ts` | 130 | Correct timezone handling |
| `src/lib/appointmentStateMachine.ts` | 284 | Excellent state machine pattern |
| `src/hooks/useAppointments.tsx` | 502 | Good but over-fetches on realtime |
| `src/components/RescheduleDialog.tsx` | 418 | Solid implementation |
| `src/components/appointments/WeeklyCalendarView.tsx` | 560 | Good visualization, N+1 query |
| `src/components/appointments/QuickAppointmentDialog.tsx` | 527 | Good UX, redundant queries |
| `supabase/migrations/appointment_slots_functions.sql` | 193 | Core logic - missing break exclusion |
| `supabase/migrations/20251223174709_*.sql` | 110 | Good race condition handling |
| `supabase/migrations/20251101142717_*.sql` | 69 | Secure reschedule RPC |
| `src/lib/userFriendlyErrors.ts` | 224 | Excellent error handling |
| `src/components/stability/AppointmentErrorBoundary.tsx` | 176 | Good error boundary |

---

*Review completed. This document should be used as a guide for prioritizing improvements to the appointment booking system.*
