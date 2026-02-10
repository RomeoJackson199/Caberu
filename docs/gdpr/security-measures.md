# Caberu -- Technical and Organisational Security Measures (TOMs)

**Document Owner:** Romeo & Thomas (Co-founders, Caberu)
**Classification:** Internal -- Confidential
**Last Reviewed:** 2026-02-10
**Review Cycle:** Annual (next review: 2027-02-10)
**Applicable Regulation:** GDPR (EU 2016/679), Belgian Data Protection Act (30 July 2018)

---

## 1. Purpose

This document describes the technical and organisational measures implemented by Caberu to protect personal data -- including special-category health data (Article 9 GDPR) -- processed through the Caberu dental practice management platform. These measures fulfil the requirements of Articles 5(1)(f), 25, and 32 of the GDPR.

Caberu is an AI-powered dental practice management platform serving Belgian healthcare providers. It processes patient health records, appointment data, billing information, voice call recordings, and communications on behalf of dental practices (the data controllers).

---

## 2. Technical Measures

### 2.1 Encryption

#### 2.1.1 Data in Transit

- All communications between clients and servers are encrypted using **TLS 1.3**.
- Supabase enforces HTTPS on all API endpoints; plaintext HTTP connections are rejected.
- WebSocket connections (Supabase Realtime) use WSS (WebSocket Secure).
- Edge Function invocations travel exclusively over HTTPS.

#### 2.1.2 Data at Rest

- All database storage is encrypted at rest using **AES-256** encryption, managed by Supabase's underlying infrastructure (AWS eu-central-1).
- Supabase Storage buckets (patient documents, imaging, attachments) are encrypted at rest using AES-256 server-side encryption.
- Database backups are encrypted using the same AES-256 standard.

#### 2.1.3 Application-Level Encryption

- Per-business encryption keys are maintained in the `business_encryption_keys` table, enabling tenant-specific encryption of sensitive fields.
- Encryption keys are rotated according to a defined key rotation schedule.
- Decryption is performed server-side within Supabase Edge Functions; keys never leave the server environment.

#### 2.1.4 Password Security

- User passwords are hashed using **bcrypt** with an appropriate work factor, managed by Supabase Auth.
- Plaintext passwords are never stored, logged, or transmitted after initial authentication.

### 2.2 Access Controls

#### 2.2.1 Row Level Security (RLS)

- **Row Level Security (RLS) is enabled on all tables** in the PostgreSQL database.
- RLS policies enforce that users can only access data belonging to their own business (tenant), identified by `business_id`.
- Policies are defined at the database level, making them impossible to bypass from the application layer.

#### 2.2.2 Role-Based Access Control (RBAC)

The platform implements a four-tier role hierarchy:

| Role | Description | Access Scope |
|------|-------------|-------------|
| `super_admin` | Platform administrators (founders only) | Cross-tenant administrative access with full audit logging |
| `admin` | Practice administrator | Full access within their own business tenant |
| `dentist` | Dental practitioner | Patient records, appointments, and clinical data within their business |
| `patient` | Patient (portal access) | Own records, appointments, and communications only |

- Role assignments are stored in the database and enforced through RLS policies.
- Role changes are logged in the audit system.

#### 2.2.3 Multi-Factor Authentication (MFA)

- MFA is supported for all user roles via Supabase Auth.
- Two-factor authentication is implemented using time-based codes delivered via the `send-2fa-code` and `verify-2fa-code` Edge Functions.
- SMS verification is available through the `send-sms-verification` Edge Function (Twilio).

### 2.3 Audit Logging

#### 2.3.1 GDPR Audit Log

- The `gdpr_audit_log` table records all access to Protected Health Information (PHI).
- Each log entry captures: user ID, action performed, resource accessed, timestamp, IP address, and business context.
- Audit logs are append-only; no user role has the ability to modify or delete audit entries through the application.
- Retention: 7 years (see Data Retention Policy).

#### 2.3.2 Super Admin Audit Log

- The `super_admin_audit_log` table tracks all actions performed by platform administrators.
- This provides accountability for any cross-tenant access performed during support or maintenance operations.

#### 2.3.3 Security Audit Logs

- The `security_audit_logs` table records all authentication events: successful logins, failed login attempts, password resets, MFA challenges, and session terminations.
- These logs feed into the automated breach detection system (see Incident Response Plan).

### 2.4 Session Management

- User sessions have a **15-minute idle timeout**, compliant with GDPR data minimisation principles and Belgian healthcare security standards.
- Authentication uses the **PKCE (Proof Key for Code Exchange)** flow, preventing authorization code interception attacks.
- Session tokens are stored securely and are not accessible to JavaScript (HttpOnly where applicable).
- Expired sessions require full re-authentication; session extension is not automatic.

### 2.5 API Security

#### 2.5.1 Edge Functions

- All 59 Supabase Edge Functions enforce authentication verification before processing requests.
- Functions validate the caller's JWT token and role before executing any data operations.
- Functions operate under the principle of least privilege, using scoped database connections.

#### 2.5.2 CORS Configuration

- Cross-Origin Resource Sharing (CORS) is configured to allow requests only from approved origins (the Caberu web application domain).
- Wildcard origins are not permitted in production.

#### 2.5.3 Rate Limiting

- The `check-login-rate-limit` Edge Function enforces rate limiting on authentication endpoints to prevent brute-force attacks.
- Rate limits are applied per IP address and per account.
- Excessive failed attempts trigger temporary account lockouts and generate security audit log entries.

#### 2.5.4 Input Validation and Sanitisation

- All user input is validated using **Zod** schemas on the client side and again within Edge Functions on the server side.
- HTML content is sanitised using **DOMPurify** to prevent Cross-Site Scripting (XSS) attacks.
- SQL injection is prevented by using Supabase's parameterised query interface; raw SQL is never constructed from user input.

### 2.6 Infrastructure Security

- The production database is hosted on **Supabase's EU region (AWS eu-central-1, Frankfurt)**, ensuring all data resides within the European Economic Area.
- No patient data is replicated to regions outside the EEA.
- Database connections use SSL/TLS and are restricted to authenticated clients.
- Production console.log statements are stripped during the build process to prevent inadvertent data leakage in browser developer tools.

---

## 3. Organisational Measures

### 3.1 Personnel Access

- **Production database access is limited exclusively to the co-founders** (Romeo and Thomas).
- No other employees, contractors, or automated systems have direct database access outside of the application layer's RLS-enforced queries.
- Access credentials are personal and non-transferable.

### 3.2 Secret Management

- All sensitive configuration values (API keys, database credentials, third-party service tokens) are stored as **environment variables**.
- No credentials are hardcoded in the source code.
- Environment variables are managed separately for development and production environments.
- The `.env` file is excluded from version control via `.gitignore`.

### 3.3 Environment Separation

- **Development and production use separate Supabase projects** with distinct databases, API keys, and configurations.
- Test data is never commingled with production patient data.
- Development environments use synthetic data only.

### 3.4 Multi-Tenant Data Isolation

- All data tables include a `business_id` column that identifies the owning dental practice (tenant).
- RLS policies enforce strict tenant isolation: a user authenticated under one practice cannot access another practice's data under any circumstances.
- Cross-tenant queries are only possible via the `super_admin` role, and all such access is logged in the `super_admin_audit_log`.

### 3.5 Deployment and Change Management

- Application deployments are managed through **GitHub Actions** CI/CD pipelines.
- Supabase Edge Functions are deployed via the `deploy-supabase-functions.yml` workflow.
- All code changes go through version control (Git) with a documented history.
- Database schema changes are managed through numbered **migration files** (`supabase/migrations/`), ensuring reproducibility and auditability.

### 3.6 Security Awareness

- All personnel with system access are briefed on GDPR obligations, data handling procedures, and incident response protocols.
- This document and related policies are reviewed annually and after any significant security incident.

---

## 4. Vendor Security Assessment

### 4.1 Supabase (Primary Infrastructure Provider)

| Attribute | Detail |
|-----------|--------|
| **Service** | Database (PostgreSQL), Authentication, Edge Functions, Realtime, Storage |
| **Certifications** | SOC 2 Type II |
| **GDPR Compliance** | GDPR-compliant; Data Processing Agreement (DPA) in place |
| **Data Location** | EU region (AWS eu-central-1, Frankfurt, Germany) |
| **Encryption** | AES-256 at rest, TLS 1.3 in transit |
| **Backup** | Automated daily backups with point-in-time recovery |

### 4.2 ElevenLabs (Voice AI Provider)

| Attribute | Detail |
|-----------|--------|
| **Service** | AI voice synthesis for patient communications and voice call AI |
| **Data Processed** | Voice prompts and generated audio; no persistent patient data storage |
| **Integration** | Via `voice-call-ai` and `elevenlabs-webhook` Edge Functions |
| **GDPR Consideration** | Voice data is processed transiently; recordings are retained per the Data Retention Policy (30 days) |

### 4.3 Twilio (Communications Provider)

| Attribute | Detail |
|-----------|--------|
| **Service** | SMS delivery for appointment reminders, MFA codes, and patient notifications |
| **Certifications** | SOC 2 Type II |
| **GDPR Compliance** | GDPR Data Processing Addendum (DPA) available and executed |
| **Data Processed** | Phone numbers and message content |
| **Data Location** | Messages routed through EU infrastructure where available |

### 4.4 Stripe (Payment Processing)

| Attribute | Detail |
|-----------|--------|
| **Service** | Subscription management, payment processing, invoicing |
| **Certifications** | PCI-DSS Level 1 (highest level) |
| **GDPR Compliance** | GDPR-compliant; DPA in place |
| **Data Processed** | Billing contact details, payment methods, transaction history |
| **Note** | Caberu does not store credit card numbers; all payment data is tokenised by Stripe |

### 4.5 Vendor DPA Register

Data Processing Agreements (DPAs) are maintained with all sub-processors. The register is reviewed annually and updated whenever a new sub-processor is engaged, in accordance with Article 28 GDPR.

| Vendor | DPA Signed | Last Reviewed |
|--------|-----------|---------------|
| Supabase | Yes | 2026-02-10 |
| Twilio | Yes | 2026-02-10 |
| Stripe | Yes | 2026-02-10 |
| ElevenLabs | Yes | 2026-02-10 |

---

## 5. Data Protection Impact Assessment (DPIA) Reference

Given that Caberu processes special-category health data (Article 9) at scale and employs automated decision-making (AI-assisted features), a Data Protection Impact Assessment has been conducted in accordance with Article 35 GDPR. The DPIA identified the measures documented herein as appropriate to mitigate identified risks to an acceptable level.

---

## 6. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-10 | Caberu Team | Initial document creation |

---

*This document is reviewed annually or after any significant change to the platform's architecture, security posture, or regulatory requirements.*
