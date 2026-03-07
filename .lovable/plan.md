

# Voice AI Settings Enhancements

## Three Changes

### 1. Phone Number Setup Card
Add a card to `VoiceAICard.tsx` that shows which Twilio number is forwarding calls to the AI. This reads from the `business_phone_numbers` table (already used by the edge function's `lookup_business` action). Includes step-by-step call forwarding instructions for the dentist's clinic phone.

**Data source:** `business_phone_numbers` table filtered by `business_id` and `is_active = true`.

### 2. Expandable Call Transcript Viewer
Make each call log row clickable/expandable using a Collapsible component. When expanded, it renders the transcript stored in `call_logs.transcript` (JSON array of `{role, content, timestamp}` objects). Each message shown as a chat bubble (assistant vs user aligned differently).

**Changes to `VoiceAICard.tsx`:**
- Add `transcript` to the `CallLog` interface
- Include `transcript` in the Supabase select query
- Track `expandedCallId` state
- Wrap each call row in a `Collapsible` -- clicking toggles transcript view
- Render transcript entries as simple chat-style messages with role labels and timestamps

### 3. Update `checkAvailability` in Edge Function to Use `get_available_slots` RPC

The current `checkAvailability` function (line 849-894 in `voice-call-ai/index.ts`) queries the `appointment_slots` table directly. This is unreliable because:
- Many slots don't have a `service_id` set
- It doesn't account for service duration (multi-slot bookings)
- It bypasses vacation days and working hours logic

The `get_available_slots` RPC function already handles all of this correctly (working hours, vacations, existing appointments, service duration). The web booking flow already uses it.

**Changes to `supabase/functions/voice-call-ai/index.ts`:**
- Replace the `checkAvailability` function body to call `supabase.rpc('get_available_slots', ...)` for each date in the range, per dentist
- If no `dentist_id` provided, query active dentists for the business and check each
- Apply `time_preference` filtering on the returned slots
- Return the same response shape (`available_slots` array with `dentist_id`, `date`, `time`, `dentist` name)

## Files Modified

| File | Change |
|------|--------|
| `src/components/settings/VoiceAICard.tsx` | Add Phone Setup card, add expandable transcript viewer, add Collapsible imports |
| `supabase/functions/voice-call-ai/index.ts` | Rewrite `checkAvailability` to use `get_available_slots` RPC |

