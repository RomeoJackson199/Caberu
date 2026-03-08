

# Fix `bookAppointment` to Use `book_appointment_slots_for_duration` RPC

## Problem

The `bookAppointment` function in `voice-call-ai/index.ts` (lines 1121-1178) has two issues:

1. **Dentist fallback uses raw `appointment_slots` table** (line 1123) instead of proper availability logic
2. **Only books a single slot** (line 1176-1178) — breaks for services longer than 30 minutes (e.g., 60-min root canal needs 2 consecutive slots)

The `book_appointment_slots_for_duration` RPC already exists and handles multi-slot booking with row locking to prevent race conditions.

## Changes

**File:** `supabase/functions/voice-call-ai/index.ts` (lines 1121-1178)

Replace the slot-booking logic after the appointment is created:

1. **Look up service duration** — if `service_id` is provided, query `business_services` for `duration_minutes`. Default to 30 if not found.

2. **Replace dentist fallback** (lines 1121-1133) — instead of querying `appointment_slots` directly, use `get_available_slots` RPC to find an available dentist when none is specified.

3. **Replace single-slot update** (lines 1176-1178) — after creating the appointment, call `book_appointment_slots_for_duration` RPC with:
   - `p_dentist_id`: the resolved dentist
   - `p_slot_date`: parsed date
   - `p_start_time`: parsed time (formatted as `HH:MM:SS`)
   - `p_duration_minutes`: from service lookup
   - `p_appointment_id`: the newly created appointment ID

4. **Handle RPC failure** — if the RPC returns an error (slots taken by another caller), delete the appointment and return an error message asking the patient to pick another time.

## Key Detail

The RPC requires time in `HH:MM:SS` format (per project memory). The current `parsedTime` is `HH:MM`, so we append `:00` before calling the RPC.

