# Legitimate Interest Assessments (LIA)

**Last reviewed:** 2026-02-10
**Next review due:** 2026-08-10
**Owner:** Data Protection Lead
**Legal basis:** GDPR Article 6(1)(f) - Processing necessary for legitimate interests

---

## Overview

Certain processing activities within Caberu are not based on patient consent (Article 6(1)(a)) or contractual necessity (Article 6(1)(b)), but on the legitimate interests of the data controller or a third party. Under GDPR Article 6(1)(f), such processing is lawful only where the interests or fundamental rights of the data subject do not override the controller's legitimate interest.

This document contains Legitimate Interest Assessments for each such processing activity, following the three-part test required by the GDPR:

1. **Purpose test:** Is there a legitimate interest?
2. **Necessity test:** Is the processing necessary to achieve it?
3. **Balancing test:** Do the data subject's rights override the interest?

**Important note on health data:** Legitimate interest alone is NOT a valid legal basis for processing special category health data under Article 9. Where any of the assessments below involve health data, an additional Article 9 exception (such as Article 9(2)(h) for healthcare provision or Article 9(2)(c) for vital interests) must also apply. This is noted in each assessment where relevant.

---

## 1. Service improvement through anonymized statistics

### Purpose

**Legitimate interest identified:** Improving the quality, reliability, and effectiveness of the Caberu platform by analyzing aggregated, anonymized usage statistics. This benefits both the dental practices (better software) and their patients (improved healthcare delivery through better tools).

The interest is legitimate because:
- Software quality improvement is a recognized legitimate business interest
- Better dental practice management tools contribute to improved patient care
- The Belgian DPA recognizes service improvement as a legitimate interest when appropriately safeguarded

### Necessity

**Is the processing necessary to achieve the purpose?**

Yes. Understanding how the platform is used, which features are effective, and where errors occur requires analysis of usage patterns. Without this processing:
- Software bugs may go undetected until they cause visible failures
- Features that do not serve practitioner needs would remain unchanged
- Platform development would be uninformed by actual usage patterns

**Could the purpose be achieved with less data?**

The processing uses **anonymized and aggregated** data only. Individual-level analysis is not required for service improvement purposes. The following data minimization measures are applied:
- All statistics are aggregated at the practice level or above (no patient-level metrics)
- No patient identifiers are included in analytics data
- Usage patterns are recorded as counts and durations, not content
- Analytics events do not contain patient health information

### Balancing test

| Factor | Assessment |
|---|---|
| **Nature of data** | Anonymized usage statistics only; no personal data, no health data, no identifiable information |
| **Reasonable expectations** | Users reasonably expect that software providers analyze aggregated usage to improve the product; this is standard practice |
| **Relationship** | Direct relationship between Caberu and the dental practices (customers); indirect relationship with patients (data subjects) |
| **Impact on data subjects** | Negligible; data is anonymized before analysis; no decisions are made about individuals based on this data |
| **Vulnerable data subjects** | Patients are considered vulnerable as healthcare data subjects, but anonymization eliminates the link to individuals |
| **Safeguards in place** | Anonymization at collection; aggregation before analysis; no re-identification capability; no sharing of statistics with third parties |
| **Data subject rights** | Right to object (Article 21) is available but has limited practical effect since data is already anonymized |

**Balancing conclusion:** The legitimate interest of the data controller clearly prevails. The processing uses only anonymized, aggregated data with no impact on data subject rights or freedoms. The data minimization measures (anonymization and aggregation) reduce the privacy impact to negligible levels.

### Safeguards

- Anonymization is irreversible (no re-identification key is maintained)
- Aggregation thresholds applied (no statistics for groups smaller than 10 to prevent inference)
- Analytics data stored separately from patient data
- No third-party analytics services receive the data
- Annual review of anonymization techniques to ensure they remain effective against re-identification attacks
- Privacy notice informs data subjects about this processing and their right to object

### Conclusion

**Processing is justified under Article 6(1)(f).** The legitimate interest in service improvement is achieved through anonymized data with negligible impact on data subjects. No Article 9 exception is needed because the data is anonymized and no longer constitutes personal data or special category data.

---

## 2. Fraud prevention and security monitoring

### Purpose

**Legitimate interest identified:** Detecting and preventing unauthorized access, fraud, and security threats to protect patient health data, practice information, and platform integrity. This serves the interests of:
- Dental practices (protection of their data and business operations)
- Patients (protection of their health records and personal data)
- Caberu (obligation to maintain platform security, especially for HIPAA/GDPR compliance)

The interest is legitimate because:
- Security monitoring is explicitly recognized by GDPR Recital 49 as a legitimate interest
- Healthcare data controllers have a legal obligation to implement appropriate security measures (Article 32)
- The Belgian DPA considers fraud prevention a legitimate interest

### Necessity

**Is the processing necessary to achieve the purpose?**

Yes. Detecting unauthorized access, brute force attacks, session hijacking, and data exfiltration requires monitoring of:
- Authentication events (login attempts, failures, 2FA bypass attempts)
- Access patterns (unusual data access volumes, off-hours access, cross-tenant access attempts)
- API usage patterns (rate limit violations, malformed requests, injection attempts)
- Session behavior (concurrent sessions, geographic anomalies)

**Could the purpose be achieved with less data?**

The processing is limited to security-relevant metadata:
- IP addresses and user agents (for threat detection)
- Timestamps and access patterns (for anomaly detection)
- Authentication event types (success, failure, lockout)
- API endpoint and method (for abuse detection)

Patient health data content is NOT analyzed for security monitoring purposes. Only access metadata is used.

### Balancing test

| Factor | Assessment |
|---|---|
| **Nature of data** | Security metadata: IP addresses, timestamps, access patterns, authentication events. These are personal data (IP address) but not special category data |
| **Reasonable expectations** | Users fully expect security monitoring on a healthcare platform; failure to monitor would be unreasonable given the sensitivity of health data |
| **Relationship** | Direct relationship with practices; security monitoring protects their data |
| **Impact on data subjects** | Minimal for legitimate users; security alerts may trigger account review; false positives could temporarily restrict access |
| **Vulnerable data subjects** | Patients are not directly affected by security monitoring (monitoring targets staff access patterns, not patient behavior) |
| **Safeguards in place** | Monitoring limited to metadata; automated alerts reviewed by humans before action; false positive handling procedure; monitoring data retained for limited period |
| **Data subject rights** | Right to object is available but may be restricted under Article 21(1) where security monitoring is necessary to protect others' rights |

**Balancing conclusion:** The legitimate interest of the data controller and third parties (patients whose data is protected) clearly prevails. GDPR Recital 49 explicitly supports this processing. The security of health data is a fundamental requirement that benefits all parties.

### Safeguards

- Security monitoring is limited to metadata, not content
- Automated alerts require human review before account action
- Security log retention limited to 12 months (unless incident investigation requires longer)
- Access to security monitoring data restricted to security personnel only
- False positive handling procedure prevents unnecessary account restrictions
- Privacy notice informs data subjects about security monitoring
- Annual review of monitoring scope to prevent scope creep

### Conclusion

**Processing is justified under Article 6(1)(f), supported by Recital 49.** Security monitoring is essential for protecting health data and is expected by all stakeholders. No Article 9 exception is needed because health data content is not processed; only security metadata is analyzed.

---

## 3. System performance monitoring

### Purpose

**Legitimate interest identified:** Monitoring system performance, availability, and reliability to ensure uninterrupted access to patient records and practice management functionality. In a healthcare context, system downtime can directly impact patient care (inability to access medical records, scheduling failures, communication disruptions).

The interest is legitimate because:
- Ensuring availability of healthcare systems is a recognized operational necessity
- GDPR Article 32(1)(b) requires "the ability to ensure the ongoing confidentiality, integrity, availability and resilience of processing systems"
- Dental practices depend on Caberu for patient care delivery

### Necessity

**Is the processing necessary to achieve the purpose?**

Yes. Detecting performance degradation, outages, and errors before they impact users requires:
- Response time metrics for API endpoints and page loads
- Error rates and types across system components
- Resource utilization (database connections, function execution times)
- Availability metrics (uptime, latency, throughput)

**Could the purpose be achieved with less data?**

Performance monitoring uses technical metrics, not user-identifiable data:
- Endpoint paths and response codes (no query parameters containing personal data)
- Aggregated timing metrics (not per-user breakdowns)
- Error stack traces with personal data stripped
- System-level metrics (CPU, memory, connection counts)

### Balancing test

| Factor | Assessment |
|---|---|
| **Nature of data** | Technical performance metrics; minimal personal data (potentially IP addresses in error logs); no health data |
| **Reasonable expectations** | Users expect a healthcare platform to be monitored for reliability; monitoring is standard for all web applications |
| **Relationship** | Direct relationship with practices who rely on system availability |
| **Impact on data subjects** | Negligible; performance monitoring does not affect individuals; it improves service for all users |
| **Vulnerable data subjects** | No differential impact on vulnerable individuals |
| **Safeguards in place** | Personal data stripped from performance logs; aggregated metrics used; no content-level monitoring; retention limited to operational necessity |
| **Data subject rights** | Right to object available but impractical since data is technical in nature |

**Balancing conclusion:** The legitimate interest clearly prevails. Performance monitoring contains minimal personal data, has negligible impact on data subjects, and directly supports the GDPR Article 32 obligation to ensure system availability.

### Safeguards

- Performance logs do not contain patient data or health information
- Personal data (IP addresses) in error logs is automatically masked after 48 hours
- Performance data is aggregated for long-term storage (no individual request logs retained beyond 30 days)
- Monitoring dashboards are access-restricted to operations personnel
- Error reports are automatically scrubbed of query parameters, request bodies, and headers that might contain personal data
- No third-party performance monitoring services receive personal data (or if they do, DPA is in place)

### Conclusion

**Processing is justified under Article 6(1)(f).** Performance monitoring is an operational necessity for a healthcare platform, directly supports GDPR Article 32 requirements, and involves negligible personal data. No Article 9 exception is needed because no health data is processed.

---

## 4. Emergency detection override

### Purpose

**Legitimate interest identified:** Processing patient data without explicit prior consent when the AI system detects a potential dental emergency during phone intake, in order to protect the vital interests of the patient. This includes:
- Prioritizing the patient for urgent care
- Sharing relevant information with the treating dentist immediately
- Potentially contacting emergency services if life-threatening symptoms are described

The interest is legitimate because:
- Protecting patient vital interests is recognized by GDPR Article 6(1)(d) and Article 9(2)(c)
- Belgian healthcare law imposes a duty of care that can override consent requirements in emergencies
- Failure to act on detected emergencies could result in patient harm

**Important note:** This assessment documents legitimate interest as a supporting basis. The primary legal basis for emergency processing is **Article 6(1)(d) (vital interests)** combined with **Article 9(2)(c) (vital interests where data subject cannot consent)**. The legitimate interest analysis below provides additional justification and documents the balancing exercise.

### Necessity

**Is the processing necessary to achieve the purpose?**

Yes. When a patient describes symptoms indicative of a dental emergency (severe pain, uncontrolled bleeding, facial swelling suggesting infection, trauma), delaying processing to obtain explicit consent could:
- Delay urgent care, worsening patient outcomes
- Result in conditions progressing to life-threatening complications (e.g., Ludwig's angina from untreated dental abscess)
- Prevent timely coordination with the treating dentist

The processing in the emergency override consists of:
- Flagging the interaction as a potential emergency
- Routing the patient to the next available urgent care slot
- Sharing symptom information with the treating dentist
- Generating an emergency notification to the practice

**Could the purpose be achieved with less data?**

The emergency override processes only the data necessary for emergency triage:
- Symptoms described by the patient during the current interaction
- Patient identity (to schedule the urgent appointment)
- Contact information (to confirm the emergency appointment)
- No historical medical records are accessed beyond what the patient provides in the current interaction

### Balancing test

| Factor | Assessment |
|---|---|
| **Nature of data** | Health data (special category under Article 9): symptoms, emergency classification, patient identity. This is the most sensitive category. |
| **Reasonable expectations** | Patients contacting a dental practice with emergency symptoms would reasonably expect the practice to act urgently, even without formal consent procedures |
| **Relationship** | Direct care relationship (patient contacting their dental practice) |
| **Impact on data subjects** | Positive: the emergency override exists to protect the patient. Negative: data is processed without explicit consent, which could feel intrusive if the emergency was misidentified (false positive) |
| **Vulnerable data subjects** | Patients in dental emergencies are highly vulnerable; this processing protects rather than exploits that vulnerability |
| **Safeguards in place** | AI detection is advisory (human confirmation required before emergency classification is finalized); patient is informed of the emergency flagging during the interaction; scope of data processing is limited to the current interaction |
| **Data subject rights** | Patient can decline emergency treatment; after the emergency, patient is informed of all processing that occurred and can exercise their rights |

**Balancing conclusion:** The vital interests of the patient clearly justify the processing. The emergency override serves a protective purpose aligned with the data subject's own fundamental interests (health and life). The Belgian duty of care further supports this processing. Any privacy impact from a false positive is minor compared to the risk of failing to detect a genuine emergency.

### Safeguards

- Emergency detection is advisory: a human practitioner must confirm the emergency classification before it is finalized
- The scope of processing is strictly limited to data necessary for emergency triage (current interaction only)
- The patient is informed during the interaction that their case has been flagged as a potential emergency
- After the emergency is resolved, the patient receives a clear notification of all data processing that occurred
- The patient can exercise all GDPR rights after the emergency (access, rectification, erasure of non-clinical data)
- All emergency override activations are logged with full reasoning for audit
- False positive rates are monitored and the AI model is adjusted to minimize unnecessary emergency overrides
- The emergency override cannot be used to justify processing data for non-emergency purposes
- Regular review of emergency detection criteria by qualified dental professionals

### Conclusion

**Processing is justified under Article 6(1)(d) (vital interests) as the primary basis, supported by Article 6(1)(f) (legitimate interest) as an additional basis.** For Article 9, the applicable exception is **Article 9(2)(c) (vital interests where the data subject is physically or legally incapable of giving consent).**

The emergency detection override is a patient-protective measure that operates within strict limits. The balancing test strongly favors processing because:
1. The purpose is to protect the patient's own vital interests
2. Processing is limited to the minimum necessary for emergency triage
3. Human confirmation is required before emergency classification is finalized
4. The patient is informed and can exercise rights after the emergency
5. Belgian healthcare duty of care obligations support urgent action

---

## General notes on all Legitimate Interest Assessments

### Right to object

Under Article 21(1), data subjects have the right to object to processing based on legitimate interest. For each processing activity above:

- **Service improvement:** Objection will be honored; the data subject's data will be excluded from analytics (though in practice, the data is already anonymized)
- **Fraud prevention:** Objection may be restricted where security monitoring is necessary to protect the rights of other data subjects (Article 21(1) compelling grounds)
- **System performance:** Objection will be honored where feasible, though the data involved is predominantly technical
- **Emergency detection:** Objection will be honored prospectively (patient can opt out of AI-based emergency detection for future interactions), but cannot be applied retroactively to an emergency in progress

### Record of Processing Activities (ROPA)

All processing activities documented here must be included in the Record of Processing Activities under Article 30, with reference to Article 6(1)(f) as the legal basis and this document as the supporting Legitimate Interest Assessment.

### Review schedule

These assessments must be reviewed:
- At least annually (next review: 2026-08-10)
- When the processing activity changes in scope or nature
- When new case law or DPA guidance affects the balancing test
- When data subject objections reveal unforeseen impacts
- When the Belgian DPA issues relevant decisions

---

## Document history

| Date | Author | Change |
|---|---|---|
| 2026-02-10 | Data Protection Lead | Initial Legitimate Interest Assessments |
