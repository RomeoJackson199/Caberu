# Plan: Reorganize Dentist Messaging Tab + Remove Patient Messages

## Goal
1. **Dentist Messages tab** → unified communications hub with Chat + Reminders (including WhatsApp-sent reminders)
2. **Patient Dashboard** → remove the Messages section entirely

---

## What exists today

| Location | What it does |
|---|---|
| `DentistPortal.tsx` case `'messages'` | Renders `<Messages />` — only the direct chat |
| `Messages.tsx` | Chat-only page: ConversationList + ChatWindow |
| `AdminReminders.tsx` | Super-admin reminders view (all businesses, with business picker) |
| `useAdminReminders` hook | Fetches reminders, accepts `businessId` filter |
| `PatientDashboard.tsx` | Has `activeSection === 'messages'` block that renders `<Messages />` |
| `PatientAppShell.tsx` | Has `'messages'` in `PatientSection` type and nav items |

---

## Changes

### 1. Create `src/components/messaging/DentistReminders.tsx`
A reminders view scoped to the dentist's business (no business picker, accepts `businessId` prop).
Reuses logic from `AdminReminders.tsx` + `useAdminReminders` hook.
Shows: status summary stats, filter buttons (All / Pending / Sent / Failed), reminder rows with notification method column (WhatsApp highlighted).

### 2. Create `src/pages/DentistMessagesHub.tsx`
A tabbed wrapper with two tabs:
- **"Messages"** tab — renders existing `ConversationList` + `ChatWindow` (chat UI, same as current Messages.tsx but inline)
- **"Reminders"** tab — renders `<DentistReminders businessId={businessId} />`

Accepts `businessId` prop from DentistPortal.

### 3. Modify `src/pages/DentistPortal.tsx`
- Replace lazy `Messages` import → lazy `DentistMessagesHub`
- In `case 'messages'`: pass `businessId` (from `businessInfo?.id`) to `<DentistMessagesHub>`

### 4. Modify `src/components/PatientDashboard.tsx`
- Remove `const Messages = lazy(...)` import
- Remove `{activeSection === 'messages' && ...}` render block
- Fix localStorage init: if stored section is `'messages'`, fall back to `'home'`

### 5. Modify `src/components/patients/PatientAppShell.tsx`
- Remove `'messages'` from `PatientSection` type
- Remove the messages item from `getNavItems()`
- Remove `MessageSquare` from imports (no longer used in nav)

---

## File summary

| File | Action |
|---|---|
| `src/components/messaging/DentistReminders.tsx` | **Create** |
| `src/pages/DentistMessagesHub.tsx` | **Create** |
| `src/pages/DentistPortal.tsx` | **Modify** (swap import + pass businessId) |
| `src/components/PatientDashboard.tsx` | **Modify** (remove messages section) |
| `src/components/patients/PatientAppShell.tsx` | **Modify** (remove messages nav + type) |
