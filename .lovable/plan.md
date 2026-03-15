

# Switch All Notifications to WhatsApp + Build WhatsApp Inbox

## Overview

Replace **all** email and SMS notifications with WhatsApp messages via Twilio. Build a WhatsApp inbox for dentists. Remove patient Messages tab. This is a major migration touching ~15 files.

## Configuration

- **WhatsApp number**: `whatsapp:+13609670625` (existing Twilio number)
- **Template SIDs**: `appointment_confirmation` (HXb42396a8...), `appointment_reminder_24h` (HX9f28be56...), `payment_reminder` (HXb41dcf07...), `patient_welcome` (HX6200ec02...)
- **New secret needed**: `TWILIO_WHATSAPP_NUMBER` = `whatsapp:+13609670625`

## Database Changes

### New tables

**`whatsapp_messages`** — stores all inbound/outbound WhatsApp messages
- `id`, `business_id` (FK businesses), `patient_id` (FK profiles, nullable), `phone`, `direction` (inbound/outbound), `body`, `template_sid`, `template_name`, `twilio_sid`, `status`, `is_read`, `created_at`, `updated_at`
- Indexes on business_id, patient_id, phone, created_at
- RLS: authenticated users read/write scoped to their business

**`whatsapp_sessions`** — tracks 24h free-form window per phone per business
- `id`, `business_id` (FK businesses), `phone`, `last_inbound_at`, unique(business_id, phone)
- RLS: authenticated users read scoped to their business

### No changes to existing tables
- `appointment_reminders`, `payment_requests`, etc. stay as-is

## Backend — Edge Functions

### 1. New: `_shared/whatsapp.ts`
Shared utility (replaces `_shared/sms.ts` usage everywhere):
- `sendWhatsAppTemplate(phone, contentSid, contentVariables, businessId)` — sends template message via Twilio Messages API with `ContentSid` + `ContentVariables`, From=`whatsapp:+13609670625`, To=`whatsapp:{phone}`. Logs to `whatsapp_messages`.
- `sendWhatsAppFreeform(phone, body, businessId)` — checks `whatsapp_sessions` for 24h window, sends plain Body if open, rejects if closed. Logs to DB.
- Uses existing `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` secrets directly (no connector available).

### 2. New: `whatsapp-send` edge function
Actions:
- `send_template` — calls shared `sendWhatsAppTemplate`
- `send_freeform` — calls shared `sendWhatsAppFreeform` (enforces 24h window)
- `mark_read` — marks messages as read for a patient
- `get_conversations` — returns distinct patient conversations with last message, unread count, 24h window status
- `get_messages` — returns message history for a phone/patient
- `send_reminders` — hourly cron action: finds appointments in next 24h without a WhatsApp reminder sent, sends `appointment_reminder_24h` template

### 3. New: `whatsapp-webhook` edge function (`verify_jwt: false`)
- Receives Twilio POST (form-encoded) when patient replies
- Stores inbound message in `whatsapp_messages`
- Updates `whatsapp_sessions.last_inbound_at`
- Auto-action: if body contains "Confirm" → update appointment status to `confirmed`; "Cancel" → update to `cancelled`
- Webhook URL: `https://gjvxcisbaxhhblhsytar.supabase.co/functions/v1/whatsapp-webhook`

### 4. Modify: Replace email/SMS with WhatsApp in existing functions

| File | Current | Change to |
|------|---------|-----------|
| `useAppointments.tsx` (line ~230) | `send-email-notification` | `whatsapp-send` with `appointment_confirmation` template |
| `send-appointment-reminders/index.ts` | Email + SMS | WhatsApp `appointment_reminder_24h` template only |
| `send-payment-reminder/index.ts` | Email + SMS | WhatsApp `payment_reminder` template only |
| `create-payment-request/index.ts` (line ~245) | Email + SMS | WhatsApp `payment_reminder` template only |
| `voice-call-ai/index.ts` register_patient (line ~154) | SMS profile link | WhatsApp `patient_welcome` template |
| `send-appointment-decision/index.ts` | Email + SMS | WhatsApp `appointment_confirmation` template |
| `cancel-vacation-appointments/index.ts` | Email | WhatsApp freeform (within session) or template |
| `FinalizationSection.tsx` (line ~106) | Email | WhatsApp freeform via `whatsapp-send` |

### 5. Functions to keep as-is (email still appropriate)
- `send-dentist-invitation` — internal staff invitation, not patient-facing
- `send-2fa-code` — auth codes, stay as email
- `send-password-change-notification` — security notification
- `process-csv-import` / `send-import-invitations` — staff onboarding emails

### 6. Cron job
Hourly `pg_cron` job calling `whatsapp-send` with `action: 'send_reminders'` to send 24h appointment reminders via WhatsApp template.

## Frontend Changes

### 1. Remove Messages tab from Patient Dashboard
- **`PatientAppShell.tsx`**: Remove the `messages` nav item (lines 67-72)
- **`PatientDashboard.tsx`**: Remove `messages` case (lines 619-623), remove lazy import of Messages (line 38)
- **`PatientSection` type**: Remove `'messages'` from the union

### 2. Replace Messages in Dentist Portal with WhatsApp Inbox
- **New component: `src/components/whatsapp/WhatsAppInbox.tsx`**
  - **Left panel**: Patient conversation list from `whatsapp-send?action=get_conversations`
    - Patient name, last message preview, timestamp, unread dot
    - Search by name
  - **Right panel**:
    - Chat bubbles (inbound=left/gray, outbound=right/green)
    - 24h window indicator (green "Free text available" / amber "Template only")
    - Text input (disabled when window closed)
    - Template picker dropdown (4 templates by friendly name)
    - Collapsible "Upcoming Reminders" section showing scheduled appointments
  - **Real-time**: Supabase Realtime subscription on `whatsapp_messages` table

- **`DentistAppShell.tsx`** (line 65-68): Change icon from `MessageSquare` to a WhatsApp-style icon, label to "WhatsApp"
- **`DentistPortal.tsx`** (line 257-262): Replace `<Messages />` with `<WhatsAppInbox />`

### 3. Keep `useAppointments.tsx` appointment creation flow
Replace the email-sending block with a call to `whatsapp-send` edge function using `appointment_confirmation` template.

## Secrets Needed
- Add `TWILIO_WHATSAPP_NUMBER` secret with value `whatsapp:+13609670625`

## Implementation Order
1. Add secret `TWILIO_WHATSAPP_NUMBER`
2. Create DB tables (`whatsapp_messages`, `whatsapp_sessions`) + RLS
3. Create `_shared/whatsapp.ts`
4. Create `whatsapp-send` edge function
5. Create `whatsapp-webhook` edge function
6. Update all notification callers to use WhatsApp instead of email/SMS
7. Remove patient Messages tab
8. Build WhatsApp Inbox component for dentist portal
9. Set up hourly cron job
10. Update `config.toml` for new functions

