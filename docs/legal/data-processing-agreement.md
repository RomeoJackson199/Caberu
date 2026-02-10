# Data Processing Agreement

**Pursuant to Article 28 of Regulation (EU) 2016/679 (GDPR)**

**Last updated:** 10 February 2026
**Effective date:** 10 February 2026
**Version:** 1.0

---

## Parties

**Data Controller ("Controller"):**
The dental practice or healthcare entity that has entered into a subscription agreement with Caberu SRL for the use of the Caberu platform, as identified in the applicable Order Form or subscription confirmation.

**Data Processor ("Processor"):**
Caberu SRL
Hertogenweg 20, Belgium
Email: [Romeo@caberu.be](mailto:Romeo@caberu.be)
Website: [caberu.be](https://caberu.be)

Together referred to as the "Parties" and individually as a "Party".

---

## Recitals

**WHEREAS:**

A. The Controller operates a dental or healthcare practice and has subscribed to the Caberu platform (the "Service") to manage its practice operations, including the processing of patient personal data.

B. The Processor provides the Caberu AI-powered dental practice management platform, which involves the processing of personal data on behalf of the Controller.

C. The Parties wish to establish the terms and conditions governing the processing of personal data by the Processor on behalf of the Controller, in accordance with Article 28 of the GDPR and applicable Belgian data protection law.

D. This Data Processing Agreement ("DPA") supplements and forms an integral part of the Terms of Service between the Parties.

**NOW THEREFORE, the Parties agree as follows:**

---

## 1. Definitions

In this DPA, the following terms shall have the meanings set out below. Terms not defined herein shall have the meaning given to them in the GDPR.

- **"Applicable Data Protection Law"** -- the GDPR, the Belgian Law of 30 July 2018 on the protection of natural persons with regard to the processing of personal data, and any other applicable data protection legislation.
- **"Data Breach"** -- a breach of security leading to the accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to, personal data transmitted, stored, or otherwise processed.
- **"Data Subject"** -- an identified or identifiable natural person whose personal data is processed under this DPA, primarily patients of the Controller.
- **"DPA"** -- this Data Processing Agreement.
- **"GDPR"** -- Regulation (EU) 2016/679 of the European Parliament and of the Council of 27 April 2016.
- **"Personal Data"** -- any information relating to a Data Subject processed by the Processor on behalf of the Controller in connection with the Service.
- **"Processing"** -- any operation or set of operations performed on personal data, as defined in Article 4(2) GDPR.
- **"Sub-processor"** -- any third party engaged by the Processor to process Personal Data on behalf of the Controller.
- **"Supervisory Authority"** -- the Belgian Data Protection Authority (APD/GBA) or any other competent supervisory authority under the GDPR.

---

## 2. Subject Matter, Duration, Nature, and Purpose of Processing

### 2.1 Subject Matter

This DPA governs the processing of Personal Data by the Processor in the course of providing the Caberu dental practice management platform to the Controller.

### 2.2 Duration

This DPA shall remain in effect for the duration of the Controller's subscription to the Service and shall continue until all Personal Data has been deleted or returned in accordance with Section 12.

### 2.3 Nature and Purpose of Processing

The Processor processes Personal Data for the following purposes, strictly on the documented instructions of the Controller:

| Purpose | Description |
|---|---|
| **Appointment management** | Scheduling, rescheduling, cancellation, and reminder notifications for patient appointments |
| **Patient record management** | Storage, organization, retrieval, and display of patient dental and medical records, treatment plans, clinical notes, and imaging |
| **Communications** | AI-powered telephone handling, voice message recording and playback, SMS and email notifications, chat messaging, transcription of voice interactions |
| **Billing and payments** | Invoice generation, payment processing, payment history tracking, insurance claim management |
| **Practice analytics** | Generation of aggregated reports, dashboards, and statistics for the Controller's practice management |
| **AI assistance** | AI dental chat support, appointment recommendation, voice synthesis for patient communication -- all in an assistive (non-diagnostic) capacity |
| **Data backup** | Secure backup and disaster recovery of Controller data |

### 2.4 Categories of Data Subjects

- Patients of the Controller
- Employees and staff of the Controller (to the extent their data is entered into the Platform)
- Other individuals whose data the Controller enters into the Platform (e.g., emergency contacts, referral contacts)

### 2.5 Types of Personal Data

The following types of Personal Data may be processed:

**Ordinary Personal Data:**
- Names (first name, last name)
- Contact information (phone numbers, email addresses, postal addresses)
- Date of birth
- Appointment history and scheduling data
- Communication records (SMS content, chat messages, call metadata)
- Billing and payment information
- Insurance details

**Special Categories of Personal Data (Article 9 GDPR):**
- Medical history
- Dental records and clinical notes
- Treatment plans and prescriptions
- Allergies and medication information
- X-ray and dental imaging files
- Voice recordings of patient interactions (to the extent they reveal health information)
- AI transcripts of clinical communications

---

## 3. Controller Obligations

The Controller shall:

3.1 Ensure it has a valid legal basis for the processing of Personal Data, including special category data, in compliance with Articles 6 and 9 of the GDPR and Belgian healthcare legislation.

3.2 Provide appropriate privacy notices to Data Subjects (patients) informing them of the processing, including the use of AI features, voice recording, and third-party sub-processors.

3.3 Obtain any necessary consents from Data Subjects where required by Applicable Data Protection Law (e.g., for voice recording where consent is the chosen legal basis).

3.4 Ensure the accuracy and lawfulness of Personal Data provided to the Processor.

3.5 Respond to Data Subject rights requests in a timely manner, with the Processor's assistance as described in Section 8.

3.6 Provide documented processing instructions to the Processor and inform the Processor without delay if an instruction, in the Controller's view, infringes Applicable Data Protection Law.

3.7 Comply with all applicable Belgian healthcare laws, including professional secrecy obligations.

---

## 4. Processor Obligations

The Processor shall:

### 4.1 Processing Instructions

4.1.1 Process Personal Data only on the documented instructions of the Controller, including with regard to transfers of Personal Data outside the EEA, unless required to do so by EU or Belgian law (in which case, the Processor shall inform the Controller of that legal requirement before processing, unless the law prohibits such notification).

4.1.2 Immediately inform the Controller if, in the Processor's opinion, an instruction infringes Applicable Data Protection Law. The Processor may suspend the relevant processing until the Controller confirms or modifies its instructions.

### 4.2 Confidentiality

4.2.1 Ensure that all personnel authorized to process Personal Data have committed themselves to confidentiality or are under an appropriate statutory obligation of confidentiality.

4.2.2 Limit access to Personal Data to personnel who require such access for the performance of the Service.

### 4.3 Security (Article 32 GDPR)

4.3.1 Implement and maintain appropriate technical and organizational security measures, taking into account the state of the art, the costs of implementation, the nature, scope, context, and purposes of processing, and the risk to the rights and freedoms of Data Subjects. These measures include, at a minimum:

**Technical Measures:**

| Measure | Description |
|---|---|
| **Encryption at rest** | AES-256 encryption for all stored data |
| **Encryption in transit** | TLS 1.2 or higher for all data transmission |
| **Database security** | Row Level Security (RLS) ensuring multi-tenant data isolation at the database level |
| **Authentication** | Secure password hashing, two-factor authentication (2FA) support, session token management |
| **Access control** | Role-Based Access Control (RBAC) with principle of least privilege |
| **Input validation** | Server-side input validation and sanitization (DOMPurify for XSS prevention) |
| **Backup** | Encrypted daily backups with point-in-time recovery |
| **Monitoring** | Security event logging, intrusion detection, automated vulnerability scanning |
| **Secure development** | Dependency scanning, code review processes, production console log stripping |

**Organizational Measures:**

| Measure | Description |
|---|---|
| **Personnel** | Background checks, confidentiality agreements, data protection training |
| **Access management** | Regular access reviews, prompt deprovisioning of departed personnel |
| **Incident response** | Documented incident response plan with defined roles and procedures |
| **Vendor management** | Due diligence and DPAs with all sub-processors |
| **Policy framework** | Data retention policy, acceptable use policy, security policy |
| **Audit** | Regular security audits and penetration testing |

4.3.2 Regularly test, assess, and evaluate the effectiveness of these measures and update them as appropriate.

### 4.4 Records of Processing

4.4.1 Maintain a record of all categories of processing activities carried out on behalf of the Controller in accordance with Article 30(2) GDPR.

---

## 5. Sub-Processors

### 5.1 Authorized Sub-Processors

The Controller provides general written authorization for the Processor to engage sub-processors, subject to the requirements of this Section 5.

The following sub-processors are authorized as of the effective date of this DPA:

| Sub-Processor | Purpose | Data Processed | Location | Safeguards |
|---|---|---|---|---|
| **Supabase Inc.** | Database hosting, authentication, real-time sync, file storage | All Personal Data stored in the Platform | EU (Frankfurt, Germany) | DPA, SOC 2 Type II |
| **Stripe Inc.** | Payment processing | Billing data, payment methods, transaction records | EU (Ireland), limited US processing | DPA, SCCs, PCI DSS Level 1 |
| **Twilio Inc.** | SMS and telephony services | Phone numbers, SMS content, call recordings, call metadata | US (headquarters), EU processing | DPA, SCCs, encryption |
| **ElevenLabs Inc.** | AI voice synthesis, voice processing | Voice recordings, text for synthesis | EU and US | DPA, SCCs, data minimization |

### 5.2 New Sub-Processors

5.2.1 The Processor shall notify the Controller at least **30 days** in advance of any intended addition or replacement of a sub-processor, providing the sub-processor's name, location, and purpose of processing.

5.2.2 Notification shall be sent by email to the Controller's designated contact and published at [caberu.be/sub-processors](https://caberu.be/sub-processors). Controllers may subscribe to email notifications of sub-processor changes.

5.2.3 The Controller may object to a new sub-processor within **14 days** of receiving notification, on reasonable grounds relating to data protection. The Parties shall discuss the objection in good faith and the Processor shall make reasonable efforts to accommodate the Controller's concerns (e.g., by offering an alternative sub-processor or configuration).

5.2.4 If the Parties cannot resolve the objection within 30 days and the Processor cannot reasonably provide the Service without the sub-processor, either Party may terminate the affected Service with 30 days' notice, and the Controller shall receive a pro-rata refund of any prepaid fees.

### 5.3 Sub-Processor Obligations

5.3.1 The Processor shall enter into a written agreement with each sub-processor imposing data protection obligations no less protective than those in this DPA.

5.3.2 The Processor shall remain fully liable to the Controller for the performance of each sub-processor's obligations.

---

## 6. International Data Transfers

### 6.1 Primary Processing Location

Personal Data is primarily stored and processed within the European Economic Area (Supabase EU -- Frankfurt, Germany).

### 6.2 Transfers Outside the EEA

Where Personal Data is transferred to a sub-processor outside the EEA, the Processor shall ensure that appropriate safeguards are in place in accordance with Chapter V of the GDPR:

- **EU Standard Contractual Clauses (SCCs)** as adopted by European Commission Implementing Decision (EU) 2021/914 of 4 June 2021, using the appropriate modules (Module 3: Processor to Sub-processor)
- **Transfer Impact Assessments (TIAs)** conducted in accordance with EDPB Recommendations 01/2020
- **Supplementary measures** where required by the TIA, which may include enhanced encryption, pseudonymization, or contractual commitments regarding government access requests

### 6.3 Information Regarding Transfers

The Processor shall, upon request, provide the Controller with copies of relevant SCCs and TIAs.

---

## 7. Data Breach Notification

### 7.1 Notification to Controller

7.1.1 The Processor shall notify the Controller of any Data Breach **without undue delay** and in any event **within 24 hours** of becoming aware of the breach.

7.1.2 The initial notification shall include, to the extent available:

- A description of the nature of the Data Breach, including (where possible) the categories and approximate number of Data Subjects and records concerned
- The name and contact details of the Processor's contact point for further information
- A description of the likely consequences of the Data Breach
- A description of the measures taken or proposed to address the Data Breach, including measures to mitigate possible adverse effects

7.1.3 Where it is not possible to provide all information simultaneously, the Processor shall provide the information in phases without further undue delay.

### 7.2 Cooperation

7.2.1 The Processor shall cooperate with the Controller and take all reasonable steps to assist in the investigation, mitigation, and remediation of the Data Breach.

7.2.2 The Processor shall assist the Controller in fulfilling its obligations to notify the Supervisory Authority (within 72 hours under Article 33 GDPR) and to communicate with affected Data Subjects (under Article 34 GDPR), where applicable.

7.2.3 The Processor shall document all Data Breaches, including their effects and the remedial actions taken, and make such documentation available to the Controller upon request.

---

## 8. Data Subject Rights

### 8.1 Assistance

8.1.1 The Processor shall assist the Controller in responding to Data Subject rights requests under Articles 15-22 of the GDPR, including requests for access, rectification, erasure, restriction, data portability, and objection.

8.1.2 If the Processor receives a Data Subject request directly, the Processor shall promptly redirect the Data Subject to the Controller and notify the Controller of the request within **2 business days**, unless otherwise instructed by the Controller.

### 8.2 Technical Capabilities

8.2.1 The Platform provides the following technical capabilities to support Data Subject rights:

| Right | Platform Capability |
|---|---|
| **Access** (Art. 15) | Data export functionality in machine-readable formats (CSV, JSON, PDF) |
| **Rectification** (Art. 16) | Edit and update capabilities for all patient record fields |
| **Erasure** (Art. 17) | Secure deletion of patient records with cascade deletion across related data |
| **Restriction** (Art. 18) | Ability to flag and restrict processing of specific patient records |
| **Portability** (Art. 20) | Structured data export in standard formats |
| **Objection** (Art. 21) | Opt-out mechanisms for specific processing activities (e.g., AI transcription, SMS) |

---

## 9. Data Protection Impact Assessments

The Processor shall provide reasonable assistance to the Controller in conducting Data Protection Impact Assessments (DPIAs) and prior consultations with the Supervisory Authority, to the extent that the Processor's assistance is necessary and relates to the processing carried out by the Processor.

---

## 10. Audit Rights

### 10.1 Information and Audit

10.1.1 The Processor shall make available to the Controller all information necessary to demonstrate compliance with the obligations laid down in Article 28 GDPR and this DPA.

10.1.2 The Processor shall allow for and contribute to audits, including inspections, conducted by the Controller or an independent auditor mandated by the Controller.

### 10.2 Audit Procedures

10.2.1 The Controller shall provide at least **30 days' written notice** of any audit, unless the audit is necessitated by a Data Breach or Supervisory Authority request (in which case reasonable shorter notice applies).

10.2.2 Audits shall be conducted during normal business hours, no more than **once per year** (unless required by a Supervisory Authority or triggered by a Data Breach), and shall not unreasonably disrupt the Processor's operations.

10.2.3 The Controller shall bear its own costs for audits. The Processor shall bear its own costs for making personnel and documentation available.

10.2.4 The Controller and its auditors shall be bound by confidentiality obligations regarding any proprietary or confidential information of the Processor accessed during the audit.

### 10.3 Certifications and Reports

10.3.1 To facilitate audit compliance, the Processor shall, upon request, provide:

- Summaries of independent security audit results
- Penetration testing reports (redacted to remove vulnerabilities not yet remediated)
- Relevant compliance certifications held by sub-processors (e.g., SOC 2, PCI DSS)
- Documentation of security measures and policies

---

## 11. Liability

### 11.1 Allocation

Each Party shall be liable in accordance with the GDPR and Applicable Data Protection Law for damage caused by processing that infringes the GDPR. The allocation of liability between the Parties shall be as set out in Article 82 GDPR and the Terms of Service.

### 11.2 Indemnification

11.2.1 The Processor shall indemnify the Controller for any direct damages, fines, or penalties arising from the Processor's breach of this DPA or its obligations under Applicable Data Protection Law, except to the extent such damages result from the Controller's instructions or the Controller's own breach.

11.2.2 The Controller shall indemnify the Processor for any direct damages, fines, or penalties arising from the Controller's breach of its obligations under Applicable Data Protection Law, including providing unlawful processing instructions.

### 11.3 Limitation

The total liability of the Processor under this DPA shall be subject to the limitation of liability provisions in the Terms of Service, except that this limitation shall not apply to: (a) fines imposed by a Supervisory Authority directly on the Processor; or (b) liability arising from the Processor's gross negligence or willful misconduct.

---

## 12. Data Deletion and Return

### 12.1 Upon Termination

Upon termination or expiration of the Service:

12.1.1 **Export period:** The Processor shall make Personal Data available for export by the Controller for **30 days** following the effective termination date, in structured, commonly used, machine-readable formats (CSV, JSON, PDF).

12.1.2 **Deletion:** After the export period, the Processor shall delete all Personal Data from its active systems within **60 days**, and from backup systems within **90 days**, unless retention is required by EU or Belgian law.

12.1.3 **Certification:** Upon the Controller's written request, the Processor shall provide written certification that Personal Data has been deleted in accordance with this Section.

### 12.2 Legal Retention

Where the Processor is required by EU or Belgian law to retain certain Personal Data beyond the termination date (e.g., for tax, audit, or healthcare record-keeping purposes), the Processor shall:

- Inform the Controller of the applicable legal requirement
- Continue to protect such data in accordance with this DPA
- Process such data only for the purpose of complying with the legal requirement
- Delete the data promptly upon expiration of the legal retention period

---

## 13. General Provisions

### 13.1 Governing Law

This DPA shall be governed by and construed in accordance with the laws of Belgium.

### 13.2 Conflict

In the event of a conflict between this DPA and the Terms of Service, this DPA shall prevail with respect to data protection matters.

### 13.3 Amendments

This DPA may be amended by mutual written agreement of the Parties. The Processor may update this DPA to reflect changes in Applicable Data Protection Law or regulatory guidance, provided that such updates do not materially reduce the level of data protection and the Controller is notified at least 30 days in advance.

### 13.4 Severability

If any provision of this DPA is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.

### 13.5 Entire Agreement

This DPA, together with the Terms of Service and Privacy Policy, constitutes the complete agreement between the Parties regarding the processing of Personal Data in connection with the Service.

---

## Annex A -- Technical and Organizational Measures

_See Section 4.3 of this DPA for the current list of technical and organizational measures implemented by the Processor._

---

## Annex B -- Sub-Processor List

_See Section 5.1 of this DPA for the current list of authorized sub-processors. An up-to-date list is maintained at [caberu.be/sub-processors](https://caberu.be/sub-processors)._

---

## Signature

This DPA is entered into and becomes binding upon the Controller's acceptance of the Terms of Service or execution of an Order Form referencing this DPA.

| | Controller | Processor |
|---|---|---|
| **Entity** | _[Practice name]_ | Caberu SRL |
| **Name** | _[Authorized signatory]_ | _[Authorized signatory]_ |
| **Title** | _[Title]_ | _[Title]_ |
| **Date** | _[Date]_ | _[Date]_ |
| **Signature** | ___________________ | ___________________ |

---

_This Data Processing Agreement has been prepared in accordance with Article 28 of Regulation (EU) 2016/679 (GDPR), the Belgian Law of 30 July 2018 on the protection of natural persons with regard to the processing of personal data, and guidance from the European Data Protection Board (EDPB)._
