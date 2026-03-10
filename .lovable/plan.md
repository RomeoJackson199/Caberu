

# Google Calendar Integration — Settings Tab

## Current State

The backend is **fully built** already:
- `google-calendar-oauth` edge function: handles OAuth flow (get-auth-url, exchange-code, disconnect)
- `google-calendar-sync` edge function: fetches events from Google Calendar, blocks appointment slots
- `google-calendar-create-event` edge function: pushes appointments to Google Calendar (create/update/delete)
- `GoogleCalendarCallback.tsx` page + route already exists
- `DentistAppointmentsManagement.tsx` already queries and displays Google Calendar events
- `useAppointments.tsx` already syncs new/updated appointments to Google Calendar

**What's missing:** A settings UI to connect/disconnect Google Calendar. There's no component for this yet.

## Plan

### 1. Create `GoogleCalendarSettings` component
New file: `src/components/settings/GoogleCalendarSettings.tsx`

- Fetches current dentist's `google_calendar_connected` and `google_calendar_last_sync` from the `dentists` table
- **Connect button**: Calls `google-calendar-oauth` with `action: 'get-auth-url'`, opens popup, listens for `google-calendar-auth` message, exchanges code via `action: 'exchange-code'`
- **Disconnect button**: Calls `google-calendar-oauth` with `action: 'disconnect'`
- Shows connection status using the existing `CalendarSyncStatus` component
- Manual "Sync Now" button that invokes `google-calendar-sync`
- Explains bidirectional sync: appointments push to Google, Google events block slots

### 2. Add "Calendar" tab to `DentistSettings.tsx`
- Add a new tab between "Appts" and "Team" with a Calendar icon
- Renders the `GoogleCalendarSettings` component
- Include it in the tab param validation list

No backend changes needed — everything is already wired up.

