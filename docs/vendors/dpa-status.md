# Vendor Data Processing Agreement (DPA) Status Review

**Last reviewed:** 2026-02-10
**Next review due:** 2026-08-10
**Owner:** Data Protection Lead

---

## Overview

Caberu processes personal data (including special category health data under GDPR Article 9) through several third-party sub-processors. Under GDPR Article 28, a Data Processing Agreement must be in place with every processor that handles personal data on our behalf. This document tracks the DPA status, data flows, and required actions for each vendor.

---

## 1. Supabase

| Field | Detail |
|---|---|
| **Role** | Database, authentication, file storage, real-time subscriptions, Edge Functions |
| **Region** | EU (Frankfurt) |
| **Certifications** | SOC 2 Type II |
| **DPA status** | Available at [supabase.com/legal](https://supabase.com/legal) |
| **GDPR adequacy** | EU-hosted; no cross-border transfer for primary data processing |

### Data sent to Supabase

- All patient records (names, contact details, medical history, treatment plans, imaging references)
- All appointment and scheduling data
- Authentication tokens and session data
- Practice configuration and staff records
- Audit logs
- File storage objects (documents, images)

### Sub-processors

Supabase maintains a list of sub-processors in their DPA. Key sub-processors include their cloud infrastructure provider (AWS EU region). The full sub-processor list should be reviewed against our records quarterly.

### Risk assessment

Supabase processes **all** patient data, making it our most critical vendor from a GDPR perspective. The EU hosting region eliminates cross-border transfer concerns for primary processing. SOC 2 Type II certification provides assurance of operational controls.

### Action items

- [ ] Download and countersign the current Supabase DPA
- [ ] Verify EU region is explicitly specified in the DPA and cannot be unilaterally changed
- [ ] Review the Supabase sub-processor list and document all sub-processors
- [ ] Subscribe to Supabase sub-processor change notifications
- [ ] Confirm data deletion procedures align with our retention policy (Article 17 compliance)
- [ ] Verify Row Level Security (RLS) configuration meets DPA data isolation requirements
- [ ] Request confirmation that SOC 2 Type II audit is current (not older than 12 months)
- [ ] File signed DPA in the compliance records

---

## 2. ElevenLabs

| Field | Detail |
|---|---|
| **Role** | Voice AI synthesis for automated phone intake and patient interaction |
| **Region** | EU processing available (must be explicitly configured) |
| **Certifications** | To be verified |
| **DPA status** | **Needs to be signed** |
| **GDPR adequacy** | EU processing must be contractually guaranteed |

### Data sent to ElevenLabs

- Patient voice audio recordings during phone intake calls
- Conversation context including symptoms described by the patient
- Patient names if spoken during the call
- Synthesized voice responses (contain practice-specific information)

### Biometric data concern

**Voice data constitutes biometric data under GDPR Article 9(1).** Voice recordings can uniquely identify a natural person and therefore qualify as special category data. This triggers additional requirements:

- Explicit consent (Article 9(2)(a)) or another Article 9 exception must be established
- A Data Protection Impact Assessment (DPIA) is mandatory for biometric processing (Article 35)
- The DPA must include specific provisions for biometric data handling, retention, and deletion

### Risk assessment

ElevenLabs presents the **highest vendor risk** due to biometric data processing. Voice data combined with health information (symptoms, conditions discussed during calls) creates a dual special-category data exposure. The lack of a signed DPA is a critical compliance gap.

### Action items

- [ ] **URGENT:** Contact ElevenLabs to negotiate and sign a DPA before processing any patient voice data
- [ ] Confirm EU processing is contractually guaranteed and request written confirmation of the processing region
- [ ] Require ElevenLabs to confirm they do not use patient voice data for model training
- [ ] Require ElevenLabs to confirm they do not retain voice data beyond the processing session (or document exact retention)
- [ ] Negotiate data deletion SLAs (maximum 24-hour deletion after processing completion)
- [ ] Request ElevenLabs' sub-processor list
- [ ] Verify ElevenLabs' security certifications (SOC 2, ISO 27001, or equivalent)
- [ ] Include biometric data provisions in the DPA (purpose limitation, storage limitation, security measures)
- [ ] Implement explicit consent flow for voice AI processing in the patient-facing interface
- [ ] Complete DPIA for voice data processing (see `/docs/gdpr/risk-assessment.md`)
- [ ] Evaluate whether voice data can be processed without retaining raw audio (transcription-only mode)
- [ ] File signed DPA in the compliance records

---

## 3. Twilio

| Field | Detail |
|---|---|
| **Role** | SMS notifications, phone call routing and handling |
| **Region** | US-based company with EU processing capabilities |
| **Certifications** | SOC 2 Type II, ISO 27001 |
| **DPA status** | DPA available from Twilio |
| **GDPR adequacy** | Standard Contractual Clauses (SCCs) needed for US processing |

### Data sent to Twilio

- Patient phone numbers
- SMS message content including:
  - Appointment reminders (contain patient names and appointment dates/times)
  - Practice name and contact information
  - Confirmation/cancellation links
- Call metadata (caller ID, call duration, timestamps)
- Call audio when routing through Twilio programmable voice

### Cross-border transfer concern

Twilio is a US-based company. Even with EU processing infrastructure, some data may transit through or be accessible from US systems (support, monitoring, infrastructure management). Standard Contractual Clauses (SCCs) under GDPR Article 46(2)(c) are required, along with a Transfer Impact Assessment (TIA).

### Risk assessment

Twilio processes patient phone numbers and appointment information that, in combination, constitute personal health data (the fact that someone has a dental appointment is health-related). The US processing component introduces transfer risk that must be mitigated through SCCs.

### Action items

- [ ] Sign the Twilio DPA (available in Twilio account settings or via legal team)
- [ ] Execute Standard Contractual Clauses (SCCs) with Twilio for US data transfers
- [ ] Complete a Transfer Impact Assessment (TIA) for US processing
- [ ] Review SMS content to minimize personal data (e.g., use appointment codes instead of full names)
- [ ] Verify Twilio's EU processing region is enabled for our account
- [ ] Request Twilio's current sub-processor list
- [ ] Confirm Twilio message retention settings align with our data retention policy
- [ ] Configure Twilio to delete message logs after the minimum required retention period
- [ ] Verify that call recordings (if enabled) are stored in the EU region
- [ ] Review SOC 2 Type II and ISO 27001 certificates for currency
- [ ] File signed DPA and SCCs in the compliance records

---

## 4. Stripe

| Field | Detail |
|---|---|
| **Role** | Payment processing for practice billing and subscriptions |
| **Region** | EU entity available (Stripe Payments Europe, Ltd.) |
| **Certifications** | PCI-DSS Level 1 (highest level) |
| **DPA status** | DPA available from Stripe |
| **GDPR adequacy** | EU entity processes EU data; SCCs available for any US transfers |

### Data sent to Stripe

- Practice billing information (business name, address, tax ID)
- Payment method details (credit card numbers processed directly by Stripe, never touch our servers)
- Subscription plan and billing history
- Invoice amounts and descriptions

### Data NOT sent to Stripe

- **No patient health data** is sent to Stripe
- **No patient personal data** is sent to Stripe (billing is at the practice level, not patient level)
- **No medical record information** is included in payment descriptions

### Risk assessment

Stripe presents the **lowest GDPR risk** among our vendors because it processes only practice-level billing data, not patient personal or health data. Stripe's PCI-DSS Level 1 certification provides the highest level of payment security assurance. The EU entity (Stripe Payments Europe, Ltd.) processes EU transactions.

### Action items

- [ ] Sign the Stripe DPA (available in Stripe Dashboard under compliance settings)
- [ ] Verify that the Stripe account is configured to use the EU entity (Stripe Payments Europe, Ltd.)
- [ ] Confirm that no patient-identifiable information is included in payment descriptions or metadata
- [ ] Review Stripe's data retention settings for compliance
- [ ] Verify PCI-DSS Level 1 certificate currency
- [ ] File signed DPA in the compliance records

---

## Summary status

| Vendor | DPA signed | SCCs needed | SCCs signed | Biometric data | Risk level |
|---|---|---|---|---|---|
| Supabase | Pending | No (EU) | N/A | No | Medium |
| ElevenLabs | **Not signed** | TBD | TBD | **Yes** | **Critical** |
| Twilio | Pending | **Yes** | Pending | No | High |
| Stripe | Pending | No (EU entity) | N/A | No | Low |

## Priority actions

1. **Immediately** halt any production voice AI processing through ElevenLabs until DPA is signed and biometric consent is implemented
2. **Within 2 weeks:** Sign Supabase and Stripe DPAs (standard, low-friction process)
3. **Within 4 weeks:** Sign Twilio DPA and execute SCCs; complete Transfer Impact Assessment
4. **Within 6 weeks:** Complete ElevenLabs DPA negotiation including biometric data provisions
5. **Quarterly:** Review all vendor DPAs, sub-processor lists, and certification statuses

---

## Document history

| Date | Author | Change |
|---|---|---|
| 2026-02-10 | Data Protection Lead | Initial vendor DPA status review |
