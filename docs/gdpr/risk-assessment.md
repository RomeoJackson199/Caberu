# Data Protection Impact Assessment (DPIA) - Risk Assessment

**Last reviewed:** 2026-02-10
**Next review due:** 2026-08-10
**Owner:** Data Protection Lead
**Legal basis:** GDPR Article 35 (mandatory for high-risk processing of health data and biometric data)
**Jurisdiction:** Belgium (Belgian Data Protection Authority / Gegevensbeschermingsautoriteit)

---

## Overview

This DPIA risk assessment covers the high-risk processing activities within the Caberu dental practice management platform. Under GDPR Article 35(3), a DPIA is required when processing:

- Health data on a large scale (Article 9)
- Biometric data for identification purposes (Article 9)
- Systematic monitoring of data subjects
- Automated decision-making with legal or significant effects

Caberu performs several of these activities and therefore requires a comprehensive DPIA.

---

## Risk scoring methodology

| Level | Likelihood definition | Impact definition |
|---|---|---|
| **Low** | Unlikely to occur; strong controls in place | Minor inconvenience; no health data exposed; easily remediated |
| **Medium** | Could occur under specific circumstances; controls exist but have gaps | Limited data exposure; affects small number of patients; recoverable |
| **High** | Likely to occur or has occurred in similar systems; insufficient controls | Significant data breach; health data exposed; regulatory action; patient harm |

**Residual risk** is the remaining risk after current mitigations are applied.

---

## 1. Voice recording and transcription

| Field | Assessment |
|---|---|
| **Activity** | Recording and transcribing patient voice during AI-powered phone intake via ElevenLabs |
| **Data processed** | Voice audio (biometric data), spoken symptoms, patient names, appointment requests, conversation transcripts |
| **Risk description** | Voice data constitutes biometric data under GDPR Article 9. Unauthorized access, retention, or misuse of voice recordings could expose patient identity and health information simultaneously. Voice data sent to ElevenLabs could be retained for model training without explicit agreement. |
| **Likelihood** | **High** - Voice data is transmitted to a third party (ElevenLabs) for every phone intake interaction; the volume of processing increases exposure |
| **Impact** | **High** - Biometric and health data combined; breach would affect Article 9 special category data; Belgian DPA likely to consider this a serious violation |
| **Current mitigations** | EU processing region configured for ElevenLabs; TLS encryption in transit; access controls on transcripts within Supabase |
| **Residual risk** | **High** - No signed DPA with ElevenLabs; no verified data deletion SLA; no explicit patient consent for biometric processing; unclear retention policy |
| **Additional measures needed** | Sign DPA with ElevenLabs including biometric data provisions; implement explicit patient consent for voice recording before call begins; configure automatic deletion of voice data after transcription; implement option to opt out of voice AI (transfer to human); verify ElevenLabs does not use data for model training; consider on-premise or self-hosted transcription alternative |

---

## 2. AI emergency detection

| Field | Assessment |
|---|---|
| **Activity** | Automated detection of dental emergencies during AI phone intake and chat interactions, triggering priority scheduling |
| **Data processed** | Patient-reported symptoms, pain levels, medical context, automated severity classification |
| **Risk description** | Automated decision-making about medical urgency could lead to incorrect triage. A false negative (missing a real emergency) could result in patient harm. A false positive could cause unnecessary alarm. This constitutes automated decision-making with significant effects under Article 22. |
| **Likelihood** | **Medium** - AI models can misinterpret symptoms; edge cases in dental emergencies are common |
| **Impact** | **High** - Incorrect emergency classification could delay urgent care or create unnecessary panic; potential patient harm; liability exposure |
| **Current mitigations** | AI emergency detection flags for human review; does not replace professional medical judgment; appointment system allows manual override |
| **Residual risk** | **Medium** - Human review step reduces risk, but relies on staff responsiveness; after-hours scenarios may lack immediate human oversight |
| **Additional measures needed** | Implement mandatory human confirmation for all emergency classifications before action is taken; document that AI triage is advisory only (never autonomous); add clear disclaimers in patient-facing communications; log all emergency detection decisions with reasoning for audit; establish after-hours escalation protocol; provide patients the right to contest automated decisions (Article 22(3)) |

---

## 3. Automated appointment booking

| Field | Assessment |
|---|---|
| **Activity** | AI-assisted appointment scheduling based on patient symptoms, provider availability, and treatment type |
| **Data processed** | Patient symptoms and treatment needs, schedule preferences, provider availability, historical appointment data |
| **Risk description** | Automated scheduling decisions based on health data could be considered automated decision-making under Article 22. Incorrect slot assignment based on misunderstood symptoms could lead to inadequate appointment time or wrong provider type. |
| **Likelihood** | **Medium** - Scheduling algorithms may not account for all clinical nuances; patient-described symptoms may be ambiguous |
| **Impact** | **Medium** - Incorrect appointment type or duration is inconvenient but generally correctable; no direct health data breach risk |
| **Current mitigations** | AI slot recommendations are suggestions, not final bookings; staff can review and modify appointments; patient receives confirmation with ability to reschedule |
| **Residual risk** | **Low** - Human oversight in the booking confirmation step and patient ability to modify reduce risk effectively |
| **Additional measures needed** | Ensure all AI-recommended appointments are clearly flagged as suggestions requiring confirmation; provide patients with transparent information about how appointment recommendations are made; log AI recommendation reasoning for audit purposes; allow patients to bypass AI and book manually |

---

## 4. WhatsApp health information

| Field | Assessment |
|---|---|
| **Activity** | Sending appointment reminders and health-related communications via WhatsApp (through Twilio) |
| **Data processed** | Patient phone numbers, appointment details, practice information, potentially treatment-related reminders |
| **Risk description** | WhatsApp messages containing health information transit through Meta (WhatsApp parent company) infrastructure. Even with end-to-end encryption, metadata is visible to Meta. Message content on the patient's device may be accessible to others who share the device. WhatsApp Business API terms may allow Meta to process metadata. |
| **Likelihood** | **Medium** - WhatsApp is widely used but Meta's data practices create transfer and processing concerns; shared device access is common |
| **Impact** | **High** - Health information disclosure to unauthorized persons (shared devices); potential US data transfer through Meta infrastructure; Belgian DPA has expressed concerns about Meta's data processing |
| **Current mitigations** | End-to-end encryption on WhatsApp messages; messages contain minimal clinical detail; patient must opt in to WhatsApp communications |
| **Residual risk** | **Medium** - Metadata exposure to Meta; shared device risk; unclear Meta data processing for WhatsApp Business API |
| **Additional measures needed** | Minimize health information in WhatsApp messages (use generic reminders with links to secure portal); implement explicit opt-in consent specific to WhatsApp (separate from general SMS consent); provide alternative communication channels (SMS, email, patient portal); document Meta/WhatsApp data processing in privacy notice; evaluate whether WhatsApp Business API requires a separate DPA with Meta; consider removing specific health details entirely from WhatsApp messages |

---

## 5. Multi-tenant data access

| Field | Assessment |
|---|---|
| **Activity** | Multiple dental practices share the same Supabase database infrastructure with Row Level Security (RLS) enforcing data isolation |
| **Data processed** | All patient data, appointment records, billing, staff records, and clinical notes for all practices in a shared database |
| **Risk description** | A failure in RLS policies could expose one practice's patient data to another practice. A misconfigured policy, a new table without RLS, or a database migration error could create cross-tenant data leakage. This would constitute a breach affecting special category health data across multiple data controllers. |
| **Likelihood** | **Medium** - RLS is robust when correctly configured, but human error during development or migration can introduce gaps; complexity grows with each new table or feature |
| **Impact** | **High** - Cross-tenant data breach would expose health data of patients from multiple practices; each practice is a separate data controller, multiplying regulatory exposure; notification obligations to multiple DPAs |
| **Current mitigations** | RLS enabled and enforced on patient data tables; Supabase Auth integration with RLS; code review process for database changes |
| **Residual risk** | **Medium** - RLS coverage must be continuously verified; new tables or migrations could introduce gaps |
| **Additional measures needed** | Implement automated RLS verification tests that run on every database migration; create a CI/CD check that verifies RLS is enabled on all tables in the public schema; conduct periodic cross-tenant penetration testing; document all RLS policies in a central registry; implement database-level alerts for any RLS policy changes; consider additional application-level tenant filtering as defense in depth |

---

## 6. Third-party data sharing (ElevenLabs, Twilio)

| Field | Assessment |
|---|---|
| **Activity** | Transmitting patient personal and health data to third-party processors for voice AI (ElevenLabs) and SMS/telephony (Twilio) |
| **Data processed** | ElevenLabs: voice audio, symptoms, names. Twilio: phone numbers, SMS content with appointment details and patient names, call metadata |
| **Risk description** | Data transmitted to third parties is subject to their security practices and potential sub-processor chains. Data may be processed or stored in jurisdictions without adequate GDPR protection. Vendors may experience their own data breaches. Twilio is US-based, raising Schrems II transfer concerns. |
| **Likelihood** | **Medium** - Third-party breaches are not uncommon; US transfer risks are well-documented post-Schrems II |
| **Impact** | **High** - Health data breach at a vendor level could affect many patients; limited control over vendor incident response; regulatory exposure for inadequate vendor management |
| **Current mitigations** | TLS encryption for all vendor API calls; vendor selection based on security certifications; EU processing configured where available |
| **Residual risk** | **High** - ElevenLabs DPA not signed; Twilio SCCs not executed; vendor sub-processor chains not fully mapped; limited visibility into vendor security practices |
| **Additional measures needed** | Sign DPAs with all vendors (see `/docs/vendors/dpa-status.md`); execute SCCs with Twilio; complete Transfer Impact Assessments for non-EU transfers; implement data minimization for all vendor transmissions; establish vendor security review schedule (annual); require breach notification SLAs in all DPAs (72 hours maximum); map all vendor sub-processor chains; implement fallback procedures for vendor outages that do not compromise data |

---

## 7. Employee access to patient data

| Field | Assessment |
|---|---|
| **Activity** | Practice staff (dentists, hygienists, receptionists, administrators) accessing patient health records, appointments, and communications |
| **Data processed** | All patient data within the practice: medical history, treatment plans, clinical notes, contact information, billing, appointment history |
| **Risk description** | Excessive access privileges could allow staff to view patient data beyond their role requirements. Lack of access logging could prevent detection of unauthorized access. Former employees with active credentials could access data after leaving. Staff could extract patient data through screenshots, exports, or manual copying. |
| **Likelihood** | **Medium** - Insider access incidents are a common source of healthcare data breaches; staff turnover in dental practices is relatively high |
| **Impact** | **High** - Unauthorized access to health records is a serious GDPR violation; patient trust damage; regulatory penalties; potential for data to be used for identity theft or blackmail |
| **Current mitigations** | Role-Based Access Control (RBAC) at database level; Supabase Auth with 2FA; audit logging of data access |
| **Residual risk** | **Medium** - RBAC reduces excessive access; audit logging enables detection; but staff with legitimate access could still misuse data within their role |
| **Additional measures needed** | Implement principle of least privilege review (verify each role has minimum necessary access); establish immediate credential revocation procedure for departing staff; implement unusual access pattern detection (e.g., receptionist accessing clinical notes); restrict data export functionality to admin roles only; conduct regular access reviews (quarterly); implement staff data protection training requirements; add break-the-glass logging for access outside normal patterns |

---

## 8. Data retention and deletion

| Field | Assessment |
|---|---|
| **Activity** | Retaining patient data for treatment continuity and legal requirements, and deleting data upon request or after retention period expiry |
| **Data processed** | All patient records, including medical history, treatment records, imaging, communications, and billing |
| **Risk description** | Belgian law requires retention of medical records for 30 years (Wet betreffende de rechten van de patient / Loi relative aux droits du patient). Balancing this with GDPR's storage limitation principle and right to erasure (Article 17) creates complexity. Incomplete deletion (data remaining in backups, logs, or vendor systems) could violate erasure requests. |
| **Likelihood** | **Medium** - Deletion across distributed systems (Supabase, ElevenLabs, Twilio, Stripe, backups) is technically complex; incomplete deletion is common |
| **Impact** | **High** - Failure to delete constitutes ongoing GDPR violation; Belgian DPA may impose fines; patient complaints about non-deletion are common DPA triggers |
| **Current mitigations** | Supabase allows record deletion; data retention awareness in development |
| **Residual risk** | **High** - No documented retention policy; no automated retention enforcement; no verified deletion across all vendor systems; backup deletion not addressed |
| **Additional measures needed** | Define and document data retention policy aligned with Belgian medical record requirements (30 years for clinical data, shorter for non-clinical); implement automated retention period tracking and expiry notifications; build deletion workflow that covers all systems (Supabase, vendor data, backups); verify deletion completeness after each erasure request; document legal grounds for refusing erasure where Belgian retention law applies (Article 17(3)(c)); implement data subject access request (DSAR) response procedure with 30-day SLA |

---

## 9. Backup and recovery

| Field | Assessment |
|---|---|
| **Activity** | Automated database backups for disaster recovery, containing all patient and practice data |
| **Data processed** | Complete database snapshots including all patient health records, authentication data, audit logs, and practice configurations |
| **Risk description** | Backups contain full copies of all patient data. If backups are not encrypted, not access-controlled, or retained beyond the data retention policy, they create additional attack surface. A deleted record that persists in backups has not been truly erased. Backup restoration could reintroduce deleted data. |
| **Likelihood** | **Medium** - Backup-related incidents are less common than direct database breaches, but backup mismanagement is widespread |
| **Impact** | **High** - A backup breach would expose all patient data across all practices simultaneously; scale of impact is maximum |
| **Current mitigations** | Supabase managed backups with encryption; access restricted to Supabase infrastructure |
| **Residual risk** | **Medium** - Supabase manages encryption and access, but retention alignment with GDPR, deletion propagation to backups, and restoration procedures need verification |
| **Additional measures needed** | Verify backup encryption at rest (AES-256 or equivalent); confirm backup storage is EU-only; define backup retention period aligned with data retention policy; implement procedure to handle erasure requests in backups (document approach: either propagate deletion or document that backup overwrite will eventually remove data); test backup restoration procedure and verify data integrity; restrict backup access to named authorized personnel; log all backup access and restoration events |

---

## 10. Vendor security dependencies

| Field | Assessment |
|---|---|
| **Activity** | Reliance on third-party vendors (Supabase, ElevenLabs, Twilio, Stripe) for core platform functionality and data processing |
| **Data processed** | Varies by vendor (see vendor DPA status document); collectively, all patient and practice data passes through at least one vendor |
| **Risk description** | A security incident at any vendor could compromise Caberu patient data. Vendor service outages could prevent access to patient records. Vendor business failure could result in data loss. Caberu's security posture is limited by the weakest vendor in the chain. Lack of vendor security visibility creates blind spots. |
| **Likelihood** | **Medium** - Major SaaS vendors experience security incidents; Supabase, ElevenLabs, and Twilio have varying security maturity levels |
| **Impact** | **High** - A vendor breach could expose data for all Caberu practices simultaneously; Caberu would be liable as data controller even for processor failures; business continuity at risk |
| **Current mitigations** | Vendor selection based on security certifications (SOC 2, PCI-DSS); EU processing regions where available; TLS for all vendor communications |
| **Residual risk** | **Medium** - Vendor certifications provide assurance but do not eliminate risk; limited ability to audit vendor security directly |
| **Additional measures needed** | Establish vendor security assessment procedure (annual questionnaire or certification review); require breach notification SLAs in all DPAs; develop business continuity plan for each vendor failure scenario; implement data portability strategy (ability to migrate off any vendor); monitor vendor security advisories and incident disclosures; evaluate cyber insurance coverage for vendor-related incidents; maintain up-to-date vendor contact list for incident coordination |

---

## Risk summary matrix

| # | Activity | Likelihood | Impact | Residual risk | Priority |
|---|---|---|---|---|---|
| 1 | Voice recording and transcription | High | High | **High** | **Critical** |
| 2 | AI emergency detection | Medium | High | **Medium** | High |
| 3 | Automated appointment booking | Medium | Medium | **Low** | Medium |
| 4 | WhatsApp health information | Medium | High | **Medium** | High |
| 5 | Multi-tenant data access | Medium | High | **Medium** | High |
| 6 | Third-party data sharing | Medium | High | **High** | **Critical** |
| 7 | Employee access to patient data | Medium | High | **Medium** | High |
| 8 | Data retention and deletion | Medium | High | **High** | **Critical** |
| 9 | Backup and recovery | Medium | High | **Medium** | High |
| 10 | Vendor security dependencies | Medium | High | **Medium** | High |

---

## Critical actions (must address before launch)

1. **Sign ElevenLabs DPA** with biometric data provisions and implement patient consent for voice recording
2. **Execute Twilio SCCs** and complete Transfer Impact Assessment
3. **Define and document data retention policy** aligned with Belgian medical records law
4. **Implement deletion workflow** covering all systems and vendors
5. **Verify RLS coverage** across all database tables with automated testing

---

## DPIA review schedule

This DPIA must be reviewed:

- At least annually (next review: 2026-08-10)
- When introducing new processing activities
- When changing vendors or vendor processing regions
- When modifying data flows or adding new data categories
- After any data breach or security incident
- When requested by the Belgian DPA

---

## Document history

| Date | Author | Change |
|---|---|---|
| 2026-02-10 | Data Protection Lead | Initial DPIA risk assessment |
