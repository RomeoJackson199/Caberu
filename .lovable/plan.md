

# Bug Audit Report

## BUG 1: Appointment Slots Not Reserved After Booking (CRITICAL - Double Booking Risk)

**Location:** `src/components/booking/useBookingFlow.ts` -- `confirmBooking` function (lines 347-514)

**Problem:** When a patient books an appointment through the main booking flow, the code inserts the appointment into the `appointments` table but **never calls `book_appointment_slots_for_duration`** to mark the corresponding time slots as unavailable. This means:
- The slots remain marked as `is_available = true` in the `appointment_slots` table
- Other patients can book the exact same time with the same dentist
- Double bookings will occur

**Evidence:** Other booking flows (ChatBookingFlow.tsx, InteractiveDentalChat.tsx, AppointmentCalendar.tsx) all call `book_appointment_slots_for_duration` after inserting the appointment. The main booking flow does not.

**Fix:** After the successful appointment insert (around line 464), call `supabase.rpc('book_appointment_slots_for_duration', { p_dentist_id, p_slot_date, p_start_time, p_duration_minutes, p_appointment_id })`.

---

## BUG 2: Hardcoded Fake Star Ratings on Dentist Cards (UX/Trust Issue)

**Location:** `src/components/booking/DentistSelectionStep.tsx` (lines 107-112)

**Problem:** Every dentist card shows a hardcoded "4.87" star rating with 4.5 stars filled in. There is no rating system in the database. This is misleading to patients and could cause trust issues, especially in a healthcare context.

**Fix:** Remove the fake star rating or replace it with real data if a review system exists. For a healthcare app, showing fabricated ratings is particularly problematic.

---

## BUG 3: Cron Job for Appointment Reminders Fails Every 5 Minutes (Recurring DB Error)

**Location:** `pg_cron` job calling `send-appointment-reminders`

**Problem:** The database logs show a recurring NOT NULL constraint violation on `http_request_queue.url` every 5 minutes. The cron job uses `current_setting('app.settings.supabase_url')` which returns NULL because these settings have never been configured.

**Impact:** No appointment reminders are being sent to patients. Error logs are cluttered.

**Fix:** Update the cron job SQL to use the hardcoded project URL instead of the unconfigured `app.settings` variables.

---

## BUG 4: Confirmation Step Doesn't Show Service Name or Price

**Location:** `src/components/booking/ConfirmationStep.tsx` (lines 38-55)

**Problem:** The confirmation screen before booking shows dentist, date, and time -- but does **not** show which service was selected, its price, or its duration. Patients can't verify what they're actually booking.

**Fix:** Pass the `selectedService` to the ConfirmationStep component and display the service name, price, and duration in the review section.

---

## BUG 5: Back Button Text Says "Back to services" Instead of "Back to dentists"

**Location:** `src/components/booking/DateTimeSelectionStep.tsx` (line 41)

**Problem:** The back button on the date/time selection step says "Back to services" but the previous step in the flow is dentist selection, not service selection. The step order is: symptoms -> service -> dentist -> datetime -> confirm.

**Fix:** Change the text to "Back to dentists" or make it dynamic based on the flow.

---

## BUG 6: `require_appointment_approval` Missing from RPC-Sourced Dentists

**Location:** `src/components/booking/useBookingFlow.ts` (lines 205-221)

**Problem:** When dentists are loaded via the `get_dentists_for_service` RPC (which returns filtered dentists), the mapped Dentist objects never set `require_appointment_approval`. This means the field is `undefined`, and the check on line 440 (`selectedDentist.require_appointment_approval === true`) always evaluates to `false`. All appointments booked through the service-filtered flow will be auto-confirmed, even for dentists who require approval.

**Fix:** Either include `require_appointment_approval` in the RPC return value, or fetch it separately after the RPC returns the dentist IDs.

---

## BUG 7: Optimistic UI Race Condition in Service Toggle

**Location:** `src/components/services/ServiceManager.tsx` (lines 120-166, 179, 195)

**Problem:** When toggling a dentist's service assignment, the UI updates optimistically, then a `setTimeout(() => loadServices(), 5500)` reloads after 5.5 seconds. If the user makes multiple rapid toggles, the `loadServices()` call will overwrite their latest changes with stale data. Additionally, the 5.5-second delay means the UI state can be wrong for several seconds.

**Fix:** Remove the arbitrary timeout. Instead, reload only after the async operation completes, or use a debounced approach.

---

## Technical Summary of Required Changes

| File | Bug | Severity |
|------|-----|----------|
| `src/components/booking/useBookingFlow.ts` | Missing `book_appointment_slots_for_duration` call | Critical |
| `src/components/booking/useBookingFlow.ts` | `require_appointment_approval` lost for RPC dentists | High |
| `src/components/booking/DentistSelectionStep.tsx` | Fake star ratings | Medium |
| `src/components/booking/ConfirmationStep.tsx` | Missing service details | Medium |
| `src/components/booking/DateTimeSelectionStep.tsx` | Wrong back button label | Low |
| `src/components/services/ServiceManager.tsx` | Optimistic UI race condition | Medium |
| Database cron job | Null URL in http_request_queue | High |

