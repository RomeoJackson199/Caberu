

# Show Profile Pictures in All Avatar Components

## Summary

Multiple components across the app show avatar badges with only initials (fallback) even though `profile_picture_url` exists on the `profiles` table. The fix involves two layers: (1) include `profile_picture_url` in all queries that fetch patient/user data, and (2) add `<AvatarImage>` to every `<Avatar>` that currently only has `<AvatarFallback>`.

## Components Already Working
- **PatientProfileView** and **PatientListView** (dentist-patients) -- already fetch and display `profile_picture_url`
- **DentistAppShell** -- already shows logged-in user's profile picture
- **DentistInfoHeader** (booking) -- already shows dentist profile picture

## Changes Needed

### 1. Data Layer -- Add `profile_picture_url` to Queries

| File | Query Location | Current Select | Add |
|------|---------------|----------------|-----|
| `src/components/appointments/WeeklyCalendarView.tsx` (line 107) | Profiles fetch for calendar | `id, first_name, last_name, email` | `, profile_picture_url` |
| `src/components/appointments/DayCalendarView.tsx` (line 85) | Profiles fetch for day view | `id, first_name, last_name, email` | `, profile_picture_url` |
| `src/components/appointments/QuickAppointmentDialog.tsx` (line 163) | Patient profiles fetch | `id, first_name, last_name, email, phone` | `, profile_picture_url` |
| `src/hooks/useAppointments.tsx` (line 361) | Patient profiles fetch | `id, first_name, last_name, email, phone` | `, profile_picture_url` |

### 2. UI Layer -- Add `<AvatarImage>` Before `<AvatarFallback>`

**a) WeeklyCalendarView.tsx** (line 558-562) -- Tooltip avatar for appointments
- Import `AvatarImage` alongside existing `Avatar, AvatarFallback`
- Add `<AvatarImage src={event.patient?.profile_picture_url || undefined} />` before the fallback

**b) DayCalendarView.tsx** (line 308-312) -- Tooltip avatar for day view
- Same pattern: import `AvatarImage`, add `<AvatarImage>` before fallback

**c) QuickAppointmentDialog.tsx** (lines 439-443, 479-483, 504-508) -- Three avatar locations for patient selection
- Import `AvatarImage`, add it in all three spots
- Update the `Patient` interface (line 21-27) to include `profile_picture_url?: string | null`

**d) AppointmentHeader.tsx** (line 114-118) -- Patient avatar in appointment detail
- Import `AvatarImage`
- Add `profile_picture_url?: string | null` to the `patient` type (line 26-30)
- Add `<AvatarImage src={appointment.patient?.profile_picture_url || undefined} />`

**e) ChatWindow.tsx** (lines 244-248, 310-314) -- Messaging avatars
- Import `AvatarImage`, add profile picture support (will use initials fallback when picture unavailable since messaging uses a different data shape)

**f) ConversationList.tsx** (lines 429-433, 472-477) -- Conversation list avatars
- Same pattern for conversation avatars

### 3. Types Update

**`src/types/appointment.ts`** -- Add `profile_picture_url` to `AppointmentProfile` interface (line 23-29):
```typescript
export interface AppointmentProfile {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  profile_picture_url?: string | null;
}
```

## Result

Every avatar badge throughout the app (calendar views, appointment details, patient selectors, messaging) will display the actual profile picture when available, falling back to initials when not.

