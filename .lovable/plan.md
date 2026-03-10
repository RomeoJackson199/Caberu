

## Fix: Google Calendar Slot Blocking - Time Matching Bug

### Root Cause
The edge function generates times from the event's actual start (e.g., `08:15, 08:45, 09:15...`) but the database stores slots at fixed 30-minute boundaries (`09:00, 09:30, 10:00...`). The `.in('slot_time', slotsToBlock)` query matches **zero rows** because the times never align.

Confirmed by testing: I triggered the sync just now. It returned 2 events for Thursday March 12:
- "Untitled Event": 07:00-08:00 Brussels
- "app": 08:15-15:45 Brussels

But all 16 slots for that date remain `is_available: true`.

### Fix

**File**: `supabase/functions/google-calendar-sync/index.ts`

Replace the timed-event blocking logic. Instead of generating times from the event start and using `.in()`, use **range-based filtering** with `.gte()` and `.lt()` on `slot_time`:

```typescript
// For a timed event 08:15-15:45 Brussels:
// Block all slots where slot_time >= 08:00 (rounded down) AND slot_time < 15:45
// This correctly catches 09:00, 09:30, 10:00, ..., 15:30

// 1. Convert event start/end to Brussels time strings
// 2. Round start DOWN to nearest 30-min boundary  
// 3. Use .gte('slot_time', roundedStart).lt('slot_time', endTime)
```

This approach:
- Correctly blocks all slots that overlap with the event regardless of event start alignment
- Handles events that start/end at non-30-minute boundaries (e.g., 08:15, 15:45)
- Uses simple range comparison instead of exact time matching

### No other changes needed
- The `get_available_slots` RPC already correctly checks `appointment_slots` for blocks
- The `validate_slot_availability` trigger already permits Google Calendar blocks
- The `ensure_daily_slots` logic is working fine

