# Caberu -- Data Breach Incident Response Plan

**Document Owner:** Romeo & Thomas (Co-founders, Caberu)
**Classification:** Internal -- Confidential
**Effective Date:** 2026-02-10
**Last Reviewed:** 2026-02-10
**Review Cycle:** Annual (next review: 2027-02-10)
**Applicable Regulation:** GDPR (EU 2016/679) Articles 33 and 34, Belgian Data Protection Act (30 July 2018)

---

## 1. Purpose

This document establishes the incident response procedures for personal data breaches affecting the Caberu dental practice management platform. It ensures compliance with the GDPR's mandatory breach notification obligations (Articles 33 and 34) and provides a structured, repeatable process for detecting, containing, investigating, and resolving security incidents involving personal data -- including special-category health data processed on behalf of Belgian dental practices.

---

## 2. Scope

This plan covers any confirmed or suspected breach of security leading to the accidental or unlawful destruction, loss, alteration, unauthorised disclosure of, or access to personal data transmitted, stored, or otherwise processed through the Caberu platform. This includes but is not limited to:

- Unauthorised access to patient health records
- Exfiltration of personal data from the database
- Compromise of user accounts (practice staff or patients)
- Ransomware or malware affecting platform infrastructure
- Accidental exposure of personal data (e.g., misconfigured access controls)
- Loss of data availability affecting patient care
- Sub-processor breaches (Supabase, Twilio, Stripe, ElevenLabs) that affect Caberu data

---

## 3. Key Contacts

### 3.1 Internal Incident Response Team

| Role | Name | Contact | Responsibility |
|------|------|---------|---------------|
| **Incident Commander** | Romeo | Romeo@caberu.be | Overall incident coordination, DPA notification decisions, external communications |
| **Technical Lead** | Thomas | Thomas@caberu.be | Technical investigation, containment, remediation |

### 3.2 External Contacts

| Organisation | Contact Details | When to Contact |
|-------------|----------------|-----------------|
| **Belgian Data Protection Authority (APD/GBA)** | Rue de la Presse 35 / Drukpersstraat 35, 1000 Brussels, Belgium | Within 72 hours for notifiable breaches |
| | Tel: +32 (0)2 274 48 00 | |
| | Email: contact@apd-gba.be | |
| | Online notification: https://www.gegevensbeschermingsautoriteit.be | |
| **Supabase Security Team** | Via Supabase dashboard support or security@supabase.io | Infrastructure-related incidents |
| **Twilio Security** | Via Twilio console or security@twilio.com | SMS/communications-related incidents |
| **Stripe Security** | Via Stripe dashboard or security@stripe.com | Payment-related incidents |
| **ElevenLabs** | Via support channels | Voice AI-related incidents |
| **Legal Counsel** | [To be designated] | All P1 and P2 incidents |

---

## 4. Detection

### 4.1 Automated Detection Mechanisms

The following automated systems continuously monitor for potential security incidents:

#### 4.1.1 Security Audit Log Monitoring

- The `security_audit_logs` table records all authentication events (logins, failures, MFA challenges, session terminations).
- Automated alerts are triggered for:
  - **Brute-force detection:** More than 10 failed login attempts for a single account within 15 minutes.
  - **Credential stuffing patterns:** High volume of failed logins across multiple accounts from a single IP or IP range.
  - **Impossible travel:** Successful logins from geographically distant locations within a timeframe that makes physical travel impossible.
  - **Off-hours access:** Access to the platform outside of the practice's configured business hours (configurable per tenant).

#### 4.1.2 Unusual Data Access Pattern Detection

- The `gdpr_audit_log` monitors all PHI access events.
- Alerts are triggered for:
  - **Bulk record access:** A single user accessing more than 50 patient records within a 1-hour window.
  - **Cross-patient scanning:** Sequential access to unrelated patient records without a scheduling or treatment context.
  - **Unusual query patterns:** Data access patterns that deviate significantly from the user's historical baseline.

#### 4.1.3 Bulk Export Alerts

- Any data export operation (CSV export, report generation, API bulk queries) triggers a log entry and real-time alert.
- Exports exceeding defined thresholds (e.g., more than 100 records) require additional confirmation and generate an immediate notification to the practice administrator and Caberu's Incident Commander.

#### 4.1.4 Failed Authentication Monitoring

- The `check-login-rate-limit` Edge Function enforces rate limiting and logs all rate-limit triggers.
- Repeated rate-limit activations for a single account or IP address are escalated as potential incidents.

### 4.2 Manual Detection Channels

- **User reports:** Patients or practice staff may report suspicious activity via the platform's support channels or directly to their practice administrator.
- **Vendor notifications:** Sub-processors (Supabase, Twilio, Stripe, ElevenLabs) may notify Caberu of breaches affecting shared infrastructure.
- **External researchers:** A responsible disclosure channel (security@caberu.be) is available for external security researchers.
- **Internal discovery:** Platform administrators may identify anomalies during routine monitoring or maintenance.

---

## 5. Severity Classification

All incidents are classified according to the following severity levels to guide response priority, resource allocation, and notification obligations.

### 5.1 Classification Matrix

| Severity | Label | Description | Examples | Response Time | DPA Notification |
|----------|-------|-------------|----------|--------------|-----------------|
| **P1** | Critical | Active data breach with confirmed exposure of patient data or ongoing unauthorised access | Active exfiltration of patient records; ransomware encrypting production database; confirmed unauthorised access to PHI by external actor | Immediate (within 1 hour) | Required within 72 hours |
| **P2** | High | Potential breach with high likelihood of data exposure, or discovery of an actively exploitable vulnerability | Exploitable vulnerability in authentication system; compromised staff credentials with evidence of use; sub-processor breach notification involving Caberu data | Within 4 hours | Likely required; assess within 24 hours |
| **P3** | Medium | Suspicious activity or policy violation without confirmed data exposure | Unusual access patterns without confirmed exfiltration; single account compromise without evidence of data access; internal policy violation (e.g., sharing credentials) | Within 24 hours | Unlikely; document assessment |
| **P4** | Low | Configuration issue, minor anomaly, or procedural gap with no evidence of data exposure | Misconfigured RLS policy on a non-sensitive table (detected before exploitation); minor logging gap; failed penetration test finding | Within 72 hours | Not required; document finding |

### 5.2 Escalation Rules

- Any incident initially classified as P3 or P4 must be **immediately re-classified** if new evidence suggests data exposure occurred.
- When in doubt, classify at the **higher severity level** and de-escalate if investigation warrants.
- The Incident Commander has final authority on classification decisions.

---

## 6. Incident Response Phases

### Phase 1: Initial Response and Assessment (0-1 hours for P1)

**Objective:** Confirm the incident, assemble the response team, and perform initial assessment.

1. **Acknowledge the alert or report.** Record the initial detection time (this becomes the reference point for the 72-hour notification window).

2. **Assemble the response team:**
   - Incident Commander (Romeo) is notified immediately for P1/P2.
   - Technical Lead (Thomas) is notified immediately for P1/P2.
   - For P3/P4, the first available team member begins assessment.

3. **Initial assessment -- answer these questions:**
   - What type of data is potentially affected? (PHI, financial, authentication credentials, contact information)
   - How many data subjects (patients/staff) are potentially affected?
   - Is the incident ongoing or contained?
   - Which tenants (dental practices) are affected?
   - What is the initial severity classification?

4. **Document everything** from this point forward in an incident log. Include timestamps, actions taken, personnel involved, and decisions made.

### Phase 2: Containment (Immediate for P1, within 4 hours for P2)

**Objective:** Stop the breach from spreading and prevent further data exposure.

#### 2a. Short-Term Containment Actions

Depending on the nature of the incident, apply one or more of the following:

| Action | Command / Procedure | When to Apply |
|--------|-------------------|---------------|
| **Lock affected user accounts** | Disable the user via Supabase Auth admin API; set `banned_until` to a future date | Compromised credentials, unauthorised access |
| **Revoke all sessions for affected users** | Invalidate all refresh tokens for the affected user(s) via Supabase Auth | Account compromise |
| **Revoke compromised API keys** | Rotate the Supabase anon key and/or service role key in the Supabase dashboard; update environment variables | API key exposure |
| **Isolate affected tenant data** | Enable additional RLS restrictions or temporarily disable API access for the affected `business_id` | Tenant-specific breach |
| **Block suspicious IP addresses** | Add IP to the deny list in the Edge Function rate limiter or at the infrastructure level | External attack source identified |
| **Disable affected Edge Functions** | Temporarily undeploy the compromised function via Supabase CLI | Vulnerability in a specific function |
| **Enable enhanced logging** | Increase log verbosity for affected systems to capture forensic detail | All P1/P2 incidents |

#### 2b. Evidence Preservation

Before performing any remediation that might alter evidence:

1. Export relevant `security_audit_logs`, `gdpr_audit_log`, and `super_admin_audit_log` entries for the affected time period.
2. Capture database query logs from Supabase if available.
3. Preserve any affected Edge Function logs.
4. Screenshot or export any relevant dashboard data.
5. Store all evidence in a secure, access-controlled location with timestamps.

### Phase 3: Notification (Within 72 hours for P1/P2)

**Objective:** Fulfil GDPR notification obligations.

#### 3a. Supervisory Authority Notification (Article 33 GDPR)

The Belgian Data Protection Authority (APD/GBA) must be notified **within 72 hours** of becoming aware of a breach that is likely to result in a risk to the rights and freedoms of natural persons.

**Notification is required when:**
- Patient health data has been or may have been exposed to unauthorised persons.
- A significant volume of personal data has been compromised.
- The breach could result in discrimination, identity theft, financial loss, damage to reputation, or other significant harm.

**Notification is NOT required when:**
- The breach is unlikely to result in a risk to individuals (e.g., encrypted data exposed but encryption keys are secure).
- The affected data was already publicly available.
- The incident was contained before any data exposure occurred and this can be demonstrated with evidence.

**The Incident Commander makes the final notification decision** and documents the rationale, whether the decision is to notify or not to notify.

**Notification method:** Submit via the APD/GBA online notification form at https://www.gegevensbeschermingsautoriteit.be or by email to contact@apd-gba.be.

#### 3b. Data Controller Notification

Since Caberu acts as a **data processor**, the affected dental practice(s) (data controllers) must be notified **without undue delay** after Caberu becomes aware of the breach, so that the controllers can fulfil their own notification obligations.

#### 3c. Data Subject Notification (Article 34 GDPR)

Affected patients must be notified **without undue delay** when the breach is likely to result in a **high risk** to their rights and freedoms. This notification is the responsibility of the data controller (the dental practice), but Caberu will provide all necessary information and template communications.

**Notification is NOT required when:**
- Appropriate technical measures (e.g., encryption) rendered the data unintelligible to the unauthorised party.
- Subsequent measures ensure the high risk is no longer likely to materialise.
- Notification would involve disproportionate effort (in which case, a public communication must be made).

---

## 7. Template Communications

### 7.1 Template: DPA Notification (Article 33)

```
NOTIFICATION OF A PERSONAL DATA BREACH
To: Autoriteit Persoonsgegevens / Gegevensbeschermingsautoriteit (APD/GBA)

1. IDENTITY OF THE DATA PROCESSOR
   Name: Caberu
   Contact: Romeo@caberu.be
   Address: [Caberu registered address]

2. IDENTITY OF THE DATA CONTROLLER(S) AFFECTED
   Name: [Dental Practice Name]
   Contact: [Practice contact details]

3. DESCRIPTION OF THE BREACH
   Nature of the breach: [Confidentiality / Integrity / Availability breach]
   Date and time of discovery: [YYYY-MM-DD HH:MM CET]
   Date and time breach occurred (estimated): [YYYY-MM-DD HH:MM CET]
   Description: [Clear, factual description of what happened]

4. CATEGORIES AND APPROXIMATE NUMBER OF DATA SUBJECTS
   Categories: Patients of [Practice Name]
   Approximate number: [Number]

5. CATEGORIES AND APPROXIMATE NUMBER OF RECORDS
   Categories: [e.g., patient health records, contact information, appointment history]
   Approximate number: [Number]

6. LIKELY CONSEQUENCES
   [Description of the likely consequences of the breach for affected data subjects]

7. MEASURES TAKEN OR PROPOSED
   Containment: [Actions taken to stop the breach]
   Mitigation: [Actions taken to mitigate harm to data subjects]
   Prevention: [Planned measures to prevent recurrence]

8. CONTACT POINT FOR FURTHER INFORMATION
   Name: Romeo
   Email: Romeo@caberu.be
   Phone: [Phone number]

9. CROSS-BORDER PROCESSING
   This breach [does / does not] involve cross-border processing.
   [If yes: other supervisory authorities involved]

10. ADDITIONAL INFORMATION
    [Any other relevant details; indicate if this is an initial or supplementary notification]
```

### 7.2 Template: Data Controller Notification (to Dental Practice)

```
Subject: URGENT -- Personal Data Breach Notification -- Caberu Platform

Dear [Practice Administrator Name],

We are writing to inform you of a personal data breach affecting data processed
by Caberu on behalf of [Practice Name].

WHAT HAPPENED
[Clear, factual description of the incident]

WHEN IT HAPPENED
- Breach occurred (estimated): [Date/Time]
- Breach discovered: [Date/Time]
- Breach contained: [Date/Time]

WHAT DATA WAS AFFECTED
[Specific categories of data: patient names, health records, contact details, etc.]

HOW MANY PATIENTS ARE AFFECTED
Approximately [Number] patients of [Practice Name].

WHAT WE HAVE DONE
1. [Containment actions taken]
2. [Investigation steps completed]
3. [Remediation measures implemented]

YOUR OBLIGATIONS AS DATA CONTROLLER
Under Article 33 GDPR, you are required to notify the Belgian Data Protection
Authority (APD/GBA) within 72 hours if this breach is likely to result in a
risk to the rights and freedoms of your patients. We recommend [notification /
that you assess notification requirements with your legal counsel].

Under Article 34 GDPR, you may be required to notify affected patients without
undue delay if the breach presents a high risk. We have prepared a template
patient notification for your review (attached).

NEXT STEPS
- We will provide a full root cause analysis within [timeframe].
- [Additional remediation steps planned].
- We are available for an immediate call to discuss this matter.

Contact: Romeo@caberu.be

Sincerely,
Romeo & Thomas
Caberu
```

### 7.3 Template: Patient Notification (for use by Data Controller)

```
Subject: Important Information About the Security of Your Data

Dear [Patient Name],

We are writing to inform you about a security incident that may have affected
some of your personal information held by [Practice Name].

WHAT HAPPENED
[Brief, clear description in plain language]

WHAT INFORMATION WAS INVOLVED
[Specific data types, e.g., your name, contact details, appointment history,
dental treatment records]

WHAT WE ARE DOING
[Actions taken to address the breach and protect your data]

WHAT YOU CAN DO
- Be alert for any unusual communications claiming to be from our practice.
- If you receive suspicious emails or calls, do not provide personal information.
- [If credentials were affected: Please change your password at [URL].]
- Contact us if you notice anything unusual.

CONTACT INFORMATION
If you have questions or concerns, please contact:
- [Practice Name]: [Practice contact details]
- Belgian Data Protection Authority (APD/GBA): +32 (0)2 274 48 00 or
  https://www.gegevensbeschermingsautoriteit.be

We sincerely apologise for this incident and are committed to protecting your
personal data.

Sincerely,
[Practice Name]
```

---

## 8. Investigation and Root Cause Analysis

### Phase 4: Investigation (Begins during Phase 2, completed within 7 days for P1/P2)

**Objective:** Determine exactly what happened, what data was affected, and why.

#### 8.1 Investigation Steps

1. **Timeline reconstruction:** Build a complete chronological timeline of the incident using all available logs (`security_audit_logs`, `gdpr_audit_log`, `super_admin_audit_log`, Edge Function logs, Supabase infrastructure logs).

2. **Scope determination:**
   - Identify all affected tables and records.
   - Determine the complete list of affected data subjects (patients and/or staff).
   - Identify all affected tenants (dental practices).
   - Determine whether data was viewed, copied, modified, or deleted.

3. **Attack vector analysis:**
   - How did the attacker gain access? (credential compromise, vulnerability exploitation, insider threat, social engineering, misconfiguration)
   - What privileges did the attacker obtain?
   - What actions did the attacker perform?
   - Was the attack targeted or opportunistic?

4. **Impact assessment:**
   - What is the nature of the affected data? (health data carries higher risk)
   - Could the data be used for identity theft, fraud, or discrimination?
   - Is there evidence that the data has been published, sold, or further disseminated?

5. **Sub-processor investigation:** If the breach originated from or involved a sub-processor (Supabase, Twilio, Stripe, ElevenLabs), coordinate the investigation with the vendor's security team.

#### 8.2 Root Cause Analysis

After the immediate investigation, conduct a formal root cause analysis:

1. **Identify the root cause:** Not just the proximate cause ("attacker used stolen credentials") but the underlying systemic issue ("MFA was not enforced for admin accounts").

2. **Contributing factors:** Identify all factors that enabled or failed to prevent the incident.

3. **Detection gap analysis:** How long did the breach go undetected? Why did existing detection mechanisms not catch it sooner?

---

## 9. Remediation and Documentation

### Phase 5: Remediation (Within 30 days for P1/P2)

**Objective:** Fix the root cause, strengthen defences, and prevent recurrence.

#### 9.1 Remediation Actions

Based on the root cause analysis, implement corrective measures. Common actions include:

| Root Cause | Remediation |
|-----------|-------------|
| Credential compromise | Force password reset for affected accounts; enforce MFA for all accounts in the affected role |
| Vulnerable Edge Function | Patch the vulnerability; deploy updated function; review similar functions for the same class of vulnerability |
| RLS policy gap | Correct the policy; audit all RLS policies across all tables; add automated RLS testing |
| Misconfigured access | Correct the configuration; implement infrastructure-as-code to prevent configuration drift |
| Social engineering | Conduct targeted security awareness training; implement additional verification procedures |
| Sub-processor breach | Review and update DPA terms; assess whether alternative providers are needed; implement additional monitoring |

#### 9.2 Post-Incident Documentation

A formal incident report must be completed within 14 days of incident closure. The report includes:

1. **Executive summary:** One-paragraph overview suitable for stakeholders.
2. **Timeline:** Complete chronological record of the incident and response.
3. **Impact assessment:** Final determination of affected data, data subjects, and tenants.
4. **Root cause analysis:** Detailed findings.
5. **Notification record:** Whether DPA, controllers, and data subjects were notified, with dates and rationale.
6. **Remediation actions:** What was done, by whom, and when.
7. **Lessons learned:** What went well, what could be improved, and specific recommendations.
8. **Policy updates:** Any changes to this plan or related policies resulting from the incident.

#### 9.3 Incident Register

All incidents (regardless of severity) are recorded in a central incident register. The register is retained for 7 years and includes:

- Incident reference number
- Date and time of detection
- Severity classification
- Brief description
- Affected data categories and approximate number of data subjects
- Notification decisions (DPA, controllers, data subjects) with rationale
- Remediation status
- Date of closure

This register serves as evidence of GDPR compliance (Article 33(5)) and is available for inspection by the supervisory authority.

---

## 10. Post-Incident Review

Within 30 days of incident closure, the Incident Response Team conducts a post-incident review:

1. **Review the response:** Was the plan followed? Were response times met?
2. **Evaluate detection:** Did automated systems detect the incident? If not, why?
3. **Assess containment:** Were containment actions effective and timely?
4. **Review communications:** Were notifications accurate, timely, and appropriate?
5. **Update the plan:** Incorporate lessons learned into this incident response plan.
6. **Update detection rules:** Implement new monitoring rules to detect similar incidents in the future.
7. **Schedule follow-up:** Set a date (typically 90 days) to verify that all remediation actions have been completed.

---

## 11. Training and Testing

### 11.1 Training

- All members of the incident response team review this plan upon joining and annually thereafter.
- Response team members are briefed on any updates to the plan.

### 11.2 Tabletop Exercises

- A tabletop exercise simulating a data breach scenario is conducted **annually**.
- Scenarios rotate through different breach types (external attack, insider threat, sub-processor breach, accidental exposure).
- Findings from exercises are used to update and improve this plan.

### 11.3 Technical Testing

- Detection mechanisms (log monitoring, anomaly detection, rate limiting) are tested at least annually to confirm they generate appropriate alerts.
- Containment procedures (account locking, token revocation, tenant isolation) are tested in the development environment to confirm they function correctly.

---

## 12. Plan Maintenance

| Activity | Frequency | Responsible |
|----------|-----------|-------------|
| Full plan review and update | Annual (February) | Romeo & Thomas |
| Contact details verification | Quarterly | Romeo |
| Detection mechanism testing | Annual | Thomas |
| Tabletop exercise | Annual | Romeo & Thomas |
| Post-incident plan update | After each incident | Incident Commander |

---

## 13. Related Documents

- [Security Measures (TOMs)](../gdpr/security-measures.md)
- [Data Retention Policy](./data-retention-policy.md)
- GDPR Audit Log schema (database)
- Data Processing Agreements with sub-processors

---

## 14. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-10 | Caberu Team | Initial plan creation |

---

*This plan is classified as confidential. Distribution is limited to the incident response team and authorised personnel. This plan must not be shared externally without approval from the Incident Commander.*
