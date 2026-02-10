# Caberu -- GDPR Data Flow Map

**Document Owner:** Data Protection Officer (DPO)
**Last Updated:** 2026-02-10
**Classification:** Internal -- Confidential
**Review Cycle:** Quarterly or upon significant system change

---

## 1. Patient Journey Data Flows

### 1.1 Inbound Phone Call (Twilio + ElevenLabs AI)

This is the primary patient intake channel. An AI voice agent conducts the conversation, extracts structured data, and writes it to the database.

```
Patient (phone call)
  |
  v
Twilio (PSTN gateway, Belgium number)
  |  Caller ID, call metadata, audio stream
  v
Supabase Edge Function: voice-call-ai
  |  Forwards audio stream, receives transcript
  v
ElevenLabs Conversational AI Agent
  |  Processes speech-to-text, generates responses
  |  Extracts: name, phone, symptoms, urgency, preferred date/time
  v
Supabase Edge Function: voice-call-ai (callback / webhook)
  |  Receives structured extraction + transcript
  |  Performs emergency-level detection
  v
Supabase PostgreSQL (within business tenant)
  |  Writes to:
  |    - patients (first_name, last_name, phone, date_of_birth)
  |    - appointments (reason, urgency, ai_summary, appointment_date)
  |    - communication_logs (direction, channel, content summary)
  |    - phone_usage (call_duration, business_id)
  |    - consent_records (verbal consent captured during call)
  v
Supabase Edge Function: send-sms (confirmation)
  |
  v
Twilio SMS API --> Patient receives appointment confirmation
```

**Data elements transmitted externally:**

| Hop | Data Shared | Recipient | Legal Basis | DPA in Place |
|-----|-------------|-----------|-------------|--------------|
| Patient to Twilio | Voice audio, caller ID, phone number | Twilio Ireland Ltd | Art. 6(1)(b) contract performance | Yes |
| Twilio to ElevenLabs | Audio stream, caller metadata | ElevenLabs Inc (US, SCCs) | Art. 6(1)(b) + Art. 9(2)(h) healthcare | Yes |
| ElevenLabs to Supabase | Transcript, structured extraction | Supabase (AWS eu-central-1) | Art. 6(1)(b) contract performance | Yes |
| Supabase to Twilio | SMS content, patient phone number | Twilio Ireland Ltd | Art. 6(1)(b) contract performance | Yes |

**Retention at each hop:**

- **Twilio:** Call recordings retained for 30 days (configurable), then auto-deleted. Call metadata retained per Twilio DPA.
- **ElevenLabs:** Audio processed in real-time, not persisted beyond session. Transcript returned via webhook and not stored by ElevenLabs post-session (per DPA terms).
- **Supabase:** Persisted per Caberu retention policy (see Section 3).

### 1.2 WhatsApp Booking

```
Patient (WhatsApp message)
  |
  v
Twilio WhatsApp Business API
  |  Message content, sender phone number, media attachments
  v
Supabase Edge Function: dental-ai-chat
  |  NLP processing of message content
  |  Extracts: intent, patient details, symptoms, urgency
  v
Supabase PostgreSQL
  |  Writes to:
  |    - patients (upsert by phone number)
  |    - appointments (new booking or modification)
  |    - communication_logs (channel: whatsapp)
  |    - messages (conversation thread)
  v
Twilio WhatsApp API --> Patient receives confirmation message
```

**Key difference from phone:** No voice audio is processed. Only text messages and optional image attachments (e.g., photos of dental issues) are transmitted through Twilio.

### 1.3 Web Booking (Patient Portal)

```
Patient (browser)
  |  HTTPS / TLS 1.3
  v
Caberu React Frontend (Vercel/Netlify CDN)
  |  Patient enters: name, email, phone, date of birth,
  |  reason for visit, preferred date/time
  v
Supabase Auth (email/password or magic link)
  |  Issues JWT with user_id claim
  v
Supabase PostgreSQL (via PostgREST API)
  |  RLS enforces: patient can only access own records
  |  Writes to:
  |    - patients (profile data)
  |    - appointments (booking details)
  |    - consent_records (explicit checkbox consent)
  v
Supabase Edge Function: send-email-notification
  |
  v
Email provider --> Patient receives booking confirmation
```

**No third-party AI processing** occurs in the web booking flow. Data travels exclusively between the patient's browser and Supabase infrastructure.

### 1.4 AI Chat (In-App Dental Assistant)

```
Authenticated User (patient or staff)
  |
  v
Caberu Frontend Chat Component
  |  User message (text)
  v
Supabase Edge Function: dental-ai-chat
  |  Augments prompt with relevant patient context
  |  (only if user has RLS-authorized access)
  v
AI Model API (via ElevenLabs or direct LLM call)
  |  Receives: anonymized/scoped patient context + user query
  |  Returns: AI response
  v
Supabase PostgreSQL
  |  Writes to:
  |    - messages (ai_generated flag, content)
  |    - gdpr_audit_log (action: ai_chat_query)
  v
Frontend displays response to user
```

### 1.5 Appointment Reminders (Automated Outbound)

```
Supabase Cron / Edge Function: send-appointment-reminders
  |  Queries appointments due within configured window
  |  Fetches patient contact preferences
  v
Supabase Edge Function: send-sms (if SMS preferred)
  |  --> Twilio --> Patient SMS
  |
  OR
  |
Supabase Edge Function: send-email-notification (if email preferred)
  |  --> Email provider --> Patient email
  v
Supabase PostgreSQL
  |  Writes to:
  |    - sms_notifications (status, sent_at)
  |    - email_event_logs (status, sent_at)
  |    - communication_logs (reminder record)
```

---

## 2. Practice Staff Data Flows

### 2.1 Staff Authentication

```
Staff member (browser)
  |  HTTPS / TLS 1.3
  v
Caberu Frontend Login Page
  |  Email + password
  v
Supabase Auth
  |  Validates credentials
  |  Issues JWT with: user_id, business_id, role
  |  Optional: 2FA via send-2fa-code / verify-2fa-code Edge Functions
  v
Frontend stores JWT in httpOnly cookie / secure storage
  |
  v
All subsequent API calls include JWT
  |  Supabase PostgREST validates JWT on every request
  |  RLS policies enforce business_id + role scoping
```

**Authentication data stored:**

- `profiles` table: user_id, email, full_name, role, avatar_url
- `business_members` table: profile_id, business_id, role (owner/admin/dentist/assistant/staff)
- `session_business` table: current active business context

### 2.2 Patient Record Access

```
Staff member (authenticated, JWT includes business_id + role)
  |
  v
Frontend requests patient data
  |
  v
Supabase PostgREST API
  |  JWT validated
  |  RLS policy checks:
  |    1. business_id matches staff member's current business
  |    2. is_business_member() returns true
  |    3. Role-based column access (e.g., billing staff cannot see clinical notes)
  v
PostgreSQL returns filtered result set
  |
  v
Frontend renders patient record
  |
  v
Supabase PostgreSQL
  |  Writes to:
  |    - gdpr_audit_log (action: view_patient_record, actor_id, patient_id)
```

### 2.3 Clinical Data Entry

```
Dentist / Assistant (authenticated)
  |
  v
Frontend clinical forms (treatment plans, notes, prescriptions)
  |  Input: diagnosis, treatment description, medication, dosage
  v
Supabase PostgREST API (with JWT)
  |  RLS: only dentist/assistant roles can INSERT/UPDATE clinical data
  v
PostgreSQL writes to:
  |  - treatment_plans (patient_id, title, description, diagnosis)
  |  - prescriptions (patient_id, medication_name, dosage, frequency)
  |  - patient_notes (patient_id, content, note_type)
  |  - dental_chart_data (patient_id, tooth data)
  |  - vital_signs (patient_id, measurements)
  |  - lab_results (patient_id, results)
  v
gdpr_audit_log (action: create/update, entity_type, before_data, after_data)
```

### 2.4 Document Upload

```
Staff member (authenticated)
  |
  v
Frontend file upload (X-ray, scan, consent form)
  |
  v
Supabase Edge Function: upload-imaging
  |  Validates file type, size, virus scan
  v
Supabase Storage (S3-compatible, eu-central-1)
  |  Encrypted at rest (AES-256)
  |  Path: /{business_id}/patients/{patient_id}/documents/
  v
PostgreSQL writes to:
  |  - patient_documents (patient_id, file_path, document_type, uploaded_by)
  |  - gdpr_audit_log (action: upload_document)
```

---

## 3. Data at Rest

### 3.1 Primary Database Tables and Data Classification

| Table | Data Classification | Contains PII | Contains Health Data (Art. 9) | Encryption | Retention Policy |
|-------|-------------------|-------------|-------------------------------|------------|------------------|
| `patients` | Special Category | Yes | Yes (medical_history) | AES-256 at rest + per-business key | Patient lifetime + 10 years (Belgian law) |
| `appointments` | Special Category | Yes (indirect via patient_id) | Yes (reason, ai_summary, urgency) | AES-256 at rest | 10 years from appointment date |
| `prescriptions` | Special Category | Yes (indirect) | Yes (medication, dosage) | AES-256 at rest | 10 years from prescription date |
| `treatment_plans` | Special Category | Yes (indirect) | Yes (diagnosis, description) | AES-256 at rest | 10 years from plan creation |
| `patient_notes` | Special Category | Yes (indirect) | Yes (clinical content) | AES-256 at rest | 10 years from note creation |
| `medical_records` | Special Category | Yes (indirect) | Yes | AES-256 at rest | 10 years (Belgian healthcare retention) |
| `dental_chart_data` | Special Category | Yes (indirect) | Yes | AES-256 at rest | 10 years |
| `vital_signs` | Special Category | Yes (indirect) | Yes | AES-256 at rest | 10 years |
| `lab_results` | Special Category | Yes (indirect) | Yes | AES-256 at rest | 10 years |
| `patient_allergies` | Special Category | Yes (indirect) | Yes | AES-256 at rest | 10 years |
| `patient_documents` | Special Category | Yes (indirect) | Potentially (imaging) | AES-256 at rest (Storage) | 10 years |
| `consent_records` | Confidential | Yes (indirect) | No | AES-256 at rest | Duration of consent + 5 years |
| `messages` | Confidential | Yes (content may contain PII) | Potentially | AES-256 at rest | 5 years |
| `communication_logs` | Confidential | Yes (phone, content summary) | Potentially | AES-256 at rest | 3 years |
| `sms_notifications` | Confidential | Yes (phone number) | No | AES-256 at rest | 2 years |
| `email_event_logs` | Confidential | Yes (email address) | No | AES-256 at rest | 2 years |
| `gdpr_requests` | Confidential | Yes (patient_id) | No | AES-256 at rest | Duration of request + 5 years |
| `gdpr_audit_log` | Confidential | Yes (actor_id, patient_id) | Yes (before_data, after_data) | AES-256 at rest | 7 years (audit requirement) |
| `breach_incidents` | Confidential | No (aggregated) | No | AES-256 at rest | 7 years |
| `vendor_registry` | Internal | No | No | AES-256 at rest | Current + 3 years after vendor offboarding |
| `payment_requests` | Confidential | Yes (patient reference) | No | AES-256 at rest | 7 years (Belgian accounting law) |
| `subscriptions` | Internal | Yes (business owner) | No | AES-256 at rest | Duration of subscription + 7 years |
| `subscription_plans` | Public | No | No | AES-256 at rest | Indefinite |
| `inventory_items` | Internal | No | No | AES-256 at rest | 3 years after item deactivation |
| `phone_usage` | Internal | No (aggregated metrics) | No | AES-256 at rest | 2 years |
| `elevenlabs_agents` | Internal | No | No | AES-256 at rest | Duration of agent configuration |
| `profiles` | Confidential | Yes (name, email) | No | AES-256 at rest | Account lifetime + 2 years |
| `business_members` | Internal | Yes (indirect via profile_id) | No | AES-256 at rest | Membership duration + 2 years |
| `business_encryption_keys` | Critical | No (but security-critical) | No | AES-256 at rest + application-level | Rotated annually, old keys archived 1 year |

### 3.2 Per-Business Encryption

Caberu implements an additional layer of encryption beyond Supabase's infrastructure-level AES-256 encryption at rest:

- Each business tenant has a dedicated encryption key stored in `business_encryption_keys`.
- Sensitive fields in `patients` (e.g., `medical_history`, `emergency_contact`) are encrypted at the application level using the business-specific key before writing to the database.
- Key rotation is managed through the application; old keys are retained only for decryption of historical records during a migration window.

### 3.3 Supabase Storage (File Objects)

- **Location:** AWS S3-compatible storage, `eu-central-1` region.
- **Encryption:** AES-256 server-side encryption at rest.
- **Access Control:** Supabase Storage policies enforce business-scoped access. Files are organized under `/{business_id}/` prefixes.
- **Content:** Patient imaging (X-rays, scans), uploaded documents, consent form scans.

---

## 4. Third-Party Data Sharing

### 4.1 ElevenLabs (Voice AI)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Real-time voice synthesis and speech-to-text for AI phone agent |
| **Data Shared** | Patient voice audio (real-time stream), conversation transcript |
| **Data Received** | AI-generated voice responses, structured data extraction (name, symptoms, urgency) |
| **Processing Location** | United States (Standard Contractual Clauses in place) |
| **Retention by Vendor** | Real-time processing only; no persistent storage of audio per DPA |
| **DPA Status** | Signed, includes SCCs for EU-US transfers |
| **Legal Basis** | Art. 6(1)(b) contract performance + Art. 9(2)(h) healthcare provision |
| **DPIA Required** | Yes -- completed, high-risk processing (AI + health data + third-country transfer) |

### 4.2 Twilio

| Attribute | Detail |
|-----------|--------|
| **Purpose** | PSTN telephony (inbound/outbound calls), SMS delivery, WhatsApp Business API |
| **Data Shared** | Patient phone numbers, SMS content (appointment confirmations/reminders), call audio relay |
| **Data Received** | Call metadata (duration, status), SMS delivery receipts, WhatsApp message status |
| **Processing Location** | Ireland (EU) for telephony; US for some infrastructure (SCCs) |
| **Retention by Vendor** | Call recordings: 30 days (configurable to 0). SMS logs: per Twilio retention policy. |
| **DPA Status** | Signed (Twilio GDPR DPA) |
| **Legal Basis** | Art. 6(1)(b) contract performance |

### 4.3 Stripe

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Subscription billing for dental practices (B2B), payment request processing |
| **Data Shared** | Business owner name, email, business name, payment method tokens (no raw card numbers) |
| **Data Received** | Payment status, subscription status, invoice data |
| **Processing Location** | Ireland (EU) primary; US infrastructure (SCCs + adequacy measures) |
| **Retention by Vendor** | Per Stripe data retention policy and PCI-DSS requirements |
| **DPA Status** | Signed (Stripe GDPR DPA) |
| **Legal Basis** | Art. 6(1)(b) contract performance |
| **Note** | Stripe does NOT receive patient health data. Payment requests reference internal IDs only. |

### 4.4 Supabase (Infrastructure Provider)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Database hosting (PostgreSQL), authentication, serverless functions, file storage, real-time subscriptions |
| **Data Shared** | All application data (Supabase is the primary data processor) |
| **Processing Location** | AWS `eu-central-1` (Frankfurt, Germany) |
| **Retention by Vendor** | Per Supabase DPA; data deleted upon project termination + grace period |
| **DPA Status** | Signed |
| **Certifications** | SOC 2 Type II |
| **Legal Basis** | Art. 6(1)(b) contract performance; Art. 28 processor agreement |
| **Sub-processors** | AWS (infrastructure), disclosed in Supabase sub-processor list |

### 4.5 Email Delivery Provider

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Transactional email delivery (confirmations, reminders, notifications) |
| **Data Shared** | Patient email address, email subject and body content |
| **Processing Location** | EU preferred; per provider DPA |
| **DPA Status** | Required before activation |
| **Legal Basis** | Art. 6(1)(b) contract performance |

---

## 5. Backup and Recovery

### 5.1 Database Backups

- **Provider:** Supabase (managed PostgreSQL backups on AWS eu-central-1).
- **Frequency:** Daily automated backups with point-in-time recovery (PITR) enabled.
- **Retention:** 30 days of backup history.
- **Encryption:** Backups are encrypted at rest using AWS KMS (AES-256).
- **Location:** Same region as primary database (eu-central-1, Frankfurt).
- **Access:** Only Supabase infrastructure automation; no Caberu staff have direct backup access.
- **Restoration:** Initiated via Supabase dashboard by authorized project administrators only.

### 5.2 File Storage Backups

- **Provider:** Supabase Storage (S3-compatible, eu-central-1).
- **Redundancy:** S3 standard redundancy (99.999999999% durability).
- **Versioning:** Enabled for patient document buckets to protect against accidental deletion.
- **Cross-region replication:** Not enabled (data residency requirement: EU only).

### 5.3 Data Export (GDPR Right to Portability)

- **Mechanism:** Supabase Edge Function `generate-data-export`.
- **Format:** Machine-readable JSON or CSV, per patient request.
- **Scope:** All personal data associated with the requesting patient across all tables.
- **Access Control:** Only the patient (authenticated) or authorized staff can trigger export.
- **Audit:** Each export request is logged in `gdpr_requests` and `gdpr_audit_log`.

### 5.4 Disaster Recovery

- **RTO (Recovery Time Objective):** 4 hours.
- **RPO (Recovery Point Objective):** 24 hours (daily backup) or near-zero with PITR.
- **Procedure:** Documented in internal runbook. Supabase manages infrastructure-level recovery; Caberu manages application-level data verification post-recovery.
- **Testing:** DR restore tested quarterly.

---

## 6. Data Deletion Flows

### 6.1 Patient Erasure Request (Art. 17)

```
Patient submits erasure request
  |  (via portal or verbal request to staff)
  v
gdpr_requests table (type: erasure, status: pending)
  |
  v
DPO reviews request
  |  Checks: legal retention obligations, ongoing treatment, outstanding payments
  v
If approved:
  |
  v
Supabase Edge Function: generate-data-export (pre-deletion archive if required)
  |
  v
Application-level deletion cascade:
  |  1. patient_notes (hard delete)
  |  2. prescriptions (hard delete or anonymize per retention)
  |  3. treatment_plans (hard delete or anonymize)
  |  4. appointments (anonymize: remove patient_id, retain aggregate data)
  |  5. messages (hard delete patient messages)
  |  6. communication_logs (anonymize)
  |  7. consent_records (retain record of consent withdrawal)
  |  8. patient_documents (delete from Storage + database reference)
  |  9. patient_allergies, vital_signs, lab_results, dental_chart_data (hard delete)
  |  10. patients record (hard delete or full anonymization)
  v
gdpr_audit_log (action: patient_erasure, before_data: [summary], after_data: null)
  |
  v
gdpr_requests (status: completed, completed_at: timestamp)
  |
  v
Notify patient of completion (email or SMS)
```

**Note:** Belgian healthcare law (Wet Patientenrechten / Loi Droits du Patient) requires retention of medical records for a minimum of 30 years from the last contact. Erasure requests for clinical data may be partially denied with documented justification per Art. 17(3)(c) GDPR (public health obligations).

### 6.2 Business Offboarding

When a dental practice terminates their Caberu subscription:

1. All patient data associated with the business is exported and provided to the practice.
2. After a 90-day grace period, all business-scoped data is permanently deleted.
3. `business_encryption_keys` are destroyed, rendering any residual encrypted data unreadable.
4. Deletion is logged in `gdpr_audit_log` and confirmed to the business owner.

---

*This document must be reviewed and updated whenever data flows change, new integrations are added, or processing purposes are modified.*
