

# Fix: Timezone Mismatch in Slot Availability (Root Cause Found)

## The Problem

The `get_available_slots` database function has a **timezone bug** that causes it to hide wrong time slots or show already-booked ones.

**How it works now (broken):**
- Appointments are stored as UTC timestamps (e.g., a 09:00 Brussels appointment is stored as `08:00:00+00`)
- The RPC compares `appointment_date::time` which gives the UTC time (`08:00`)
- But dentist availability hours (09:00-17:00) are in Brussels local time
- Result: the conflict check compares Brussels times against UTC times, causing slots to appear available when they're not, or hidden when they should be shown

**Example:** A 09:00 Brussels appointment (stored as 08:00 UTC) won't block the 09:00 slot because `08:00 < 09:00+duration` doesn't match correctly.

## The Fix

**1. Update the `get_available_slots` RPC** to convert appointment timestamps to Brussels time before comparing:

Replace:
```sql
AND apt.appointment_date::date = p_date
AND apt.appointment_date::time < v_candidate_end
AND (apt.appointment_date + make_interval(...))::time > v_candidate
```

With:
```sql
AND (apt.appointment_date AT TIME ZONE 'Europe/Brussels')::date = p_date
AND (apt.appointment_date AT TIME ZONE 'Europe/Brussels')::time < v_candidate_end
AND ((apt.appointment_date AT TIME ZONE 'Europe/Brussels') + make_interval(...))::time > v_candidate
```

**2. Update the `get_dentist_available_slots` RPC** with the same timezone fix (used by the admin calendar).

**3. No frontend changes needed** -- the bug is entirely in the database function.

**4. No data needs to be deleted** -- existing appointments and availability data are fine. The timestamps are stored correctly; they're just being read in the wrong timezone.

## Why This Fixes Everything

- Services of any duration (4, 20, 24, 60 min) will work correctly because the RPC already handles arbitrary durations
- Booked slots will correctly disappear from the available list
- Available slots won't be incorrectly hidden

## Files Changed

| Location | Change |
|----------|--------|
| New SQL migration | Fix timezone conversion in `get_available_slots` and `get_dentist_available_slots` |

