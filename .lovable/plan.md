

## Plan: Google Calendar Slot Blocking + Settings Warning + Faster Appointment Fetching

### Problem Summary
1. **Google Calendar events don't block booking slots** -- The `get_available_slots` RPC (used by the booking flow) only checks the `appointments` table. The Google Calendar sync writes blocks to `appointment_slots`, but `get_available_slots` never reads that table.
2. **Dentists need guidance** about keeping their synced calendar appointment-only (no personal events blocking patient slots).
3. **Appointment fetching can be faster** on the dentist side.

---

### Changes

#### 1. SQL Migration: Update `get_available_slots` to check Google Calendar blocks

Add an additional conflict check in the slot generation loop. After the existing appointment conflict check, also exclude slots blocked in `appointment_slots` (where `is_available = false` and `appointment_id IS NULL` -- meaning blocked by Google Calendar, not by a booked appointment):

```sql
-- Inside the WHILE loop, wrap the existing IF NOT EXISTS with an additional condition:
AND NOT EXISTS (
  SELECT 1 FROM appointment_slots asl
  WHERE asl.dentist_id = p_dentist_id
    AND asl.slot_date = p_date
    AND asl.is_available = false
    AND asl.appointment_id IS NULL
    AND asl.slot_time < v_candidate_end
    AND (asl.slot_time + interval '30 minutes') > v_candidate
)
```

#### 2. Edge Function: Generate slots before blocking in `google-calendar-sync`

The sync function currently does `UPDATE` on `appointment_slots`, but if no rows exist, nothing gets blocked. Before the blocking loop, call `generate_daily_slots` for each affected date via RPC so rows exist to update.

**File**: `supabase/functions/google-calendar-sync/index.ts`
- Before the reset/block loop, collect unique dates from events
- For each date, call `supabase.rpc('ensure_daily_slots', { p_dentist_id, p_date })` to generate slot rows if they don't exist
- This ensures the subsequent `UPDATE` statements actually find rows to block

#### 3. Settings UI: Add recommendation note

**File**: `src/components/settings/GoogleCalendarSettings.tsx`
- Add an info/warning card when connected, recommending dentists use a **dedicated work calendar** (not their personal one) for the sync, or use the "Practice -> Google only" direction if they have personal events
- Text: "For best results, use a dedicated work calendar. Personal events (e.g., gym, dinner) will block patient booking slots. If your calendar has personal events, consider using 'Practice → Google only' sync direction."

#### 4. Faster appointment fetching on dentist side

**Files**: `src/components/appointments/DayCalendarView.tsx`, `src/components/appointments/WeeklyCalendarView.tsx`
- Both views currently make 2 sequential queries: appointments, then patient profiles. The profile fetch is already parallelized.
- Add `staleTime: 30_000` (30 seconds) to the `useQuery` options so React Query serves cached data instantly on re-renders and tab switches
- Add `refetchOnWindowFocus: false` to prevent unnecessary refetches when switching browser tabs
- Select only the columns needed instead of `select("*")` to reduce payload size

