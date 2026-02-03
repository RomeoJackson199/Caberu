
# Phased Data Encryption Implementation Plan

## Current State Analysis

### What's Already Set Up
- **Encryption Key**: `app_encryption_key` exists in Supabase Vault
- **pgcrypto Extension**: Enabled for `pgp_sym_encrypt`/`pgp_sym_decrypt`
- **Encrypted Columns Exist**: 14 columns across 5 tables have `_encrypted` columns already defined

### Current Issues
The previous encryption implementation had problems that caused data corruption (values like `***ENCRYPTED***` or `vault:%` appearing). The triggers were disabled in migration `20260113062339` to prevent further issues.

**Root Causes Identified:**
1. Inconsistent key retrieval (some triggers used `current_setting`, others used Vault)
2. Triggers cleared plaintext fields, breaking app reads before views were updated
3. No proper rollback mechanism for failed encryptions
4. Mixed encoding approaches (base64 string vs raw bytea)

---

## Phased Implementation Strategy

### Phase 1: Low-Risk Data (Testing Ground)
**Target Tables**: Business metadata, non-PHI operational data
**Risk Level**: LOW - No patient health information

| Table | Columns to Encrypt | Data Sensitivity |
|-------|-------------------|------------------|
| `communication_logs` | `content`, `subject` | Low (internal comms) |
| `email_logs` | `subject` | Low |
| `appointment_reminders` | `error_message` | Low |

**Why Start Here:**
- No PHI involved
- Low read frequency
- If encryption breaks, impact is minimal
- Perfect for validating the encryption pipeline

---

### Phase 2: Medium-Risk Data
**Target Tables**: Appointment details, chat content
**Risk Level**: MEDIUM - Contains patient interactions but not core medical records

| Table | Columns to Encrypt | Data Sensitivity |
|-------|-------------------|------------------|
| `appointments` | `reason`, `notes`, `consultation_notes`, `ai_summary`, `patient_name` | Medium |
| `chat_messages` | `message`, `metadata` | Medium |
| `messages` | `message_text` | Medium |

**Why Phase 2:**
- Contains patient context but not direct PHI
- Higher read frequency - good stress test
- AI features depend on this data

---

### Phase 3: High-Risk PHI Data (Re-enable)
**Target Tables**: Core PHI tables (re-implement with fixes)
**Risk Level**: HIGH - Protected Health Information

| Table | Columns to Encrypt | Already Has `_encrypted` Column |
|-------|-------------------|--------------------------------|
| `profiles` | `first_name`, `last_name`, `phone`, `date_of_birth`, `medical_history`, `address`, `emergency_contact` | Yes (7 columns) |
| `treatment_plans` | `diagnosis`, `description` | Yes (2 columns) |
| `medical_records` | `findings` | Yes (1 column) |
| `notes` | `content`, `title` | Yes (2 columns) |
| `patient_allergies` | `allergy_name`, `notes` | Yes (2 columns) |

---

### Phase 4: Clinical Imaging & Documents
**Target Tables**: File metadata and notes
**Risk Level**: HIGH - Direct patient clinical data

| Table | Columns to Encrypt | Data Sensitivity |
|-------|-------------------|------------------|
| `imaging_sets` | `notes` | High |
| `imaging_files` | `metadata` (JSONB) | High |
| `patient_documents` | `title`, `file_name` | High |

---

## Technical Implementation Approach

### Key Architecture Improvements

1. **Unified Key Retrieval Function**
```sql
CREATE OR REPLACE FUNCTION private.get_encryption_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  enc_key TEXT;
BEGIN
  -- Primary: Supabase Vault
  SELECT decrypted_secret INTO enc_key
  FROM vault.decrypted_secrets
  WHERE name = 'app_encryption_key'
  LIMIT 1;
  
  RETURN enc_key;
END;
$$;
```

2. **Non-Destructive Encryption (Keep Plaintext)**
```sql
-- Phase 1: Encrypt but DON'T clear plaintext
-- This allows rollback if issues occur
IF NEW.content IS NOT NULL THEN
  NEW.content_encrypted := pgp_sym_encrypt(NEW.content, enc_key);
  -- DO NOT set NEW.content := NULL yet!
END IF;
```

3. **Read Via Secure Views**
```sql
CREATE VIEW secure_communication_logs AS
SELECT 
  id,
  COALESCE(
    pgp_sym_decrypt(content_encrypted, private.get_encryption_key()),
    content
  ) AS content,
  -- ... other columns
FROM communication_logs;
```

4. **Phase 2: Clear Plaintext (After Validation)**
Once views are confirmed working:
```sql
-- Backfill migration
UPDATE communication_logs
SET content = NULL
WHERE content_encrypted IS NOT NULL;
```

---

## Migration Files to Create

### Phase 1 Migrations

| File | Purpose |
|------|---------|
| `001_fix_key_retrieval_function.sql` | Create robust `private.get_encryption_key()` |
| `002_add_communication_logs_encryption.sql` | Add encrypted columns + trigger |
| `003_add_email_logs_encryption.sql` | Add encrypted columns + trigger |
| `004_create_secure_views_phase1.sql` | Secure views for Phase 1 tables |
| `005_backfill_phase1_encryption.sql` | Encrypt existing data |
| `006_validate_phase1.sql` | Validation queries + optional plaintext clear |

### Phase 2 Migrations

| File | Purpose |
|------|---------|
| `007_add_appointments_encryption.sql` | Add encrypted columns + trigger |
| `008_add_chat_messages_encryption.sql` | Add encrypted columns + trigger |
| `009_add_messages_encryption.sql` | Add encrypted columns + trigger |
| `010_create_secure_views_phase2.sql` | Secure views |
| `011_backfill_phase2_encryption.sql` | Encrypt existing data |

### Phase 3 Migrations (Re-implementation)

| File | Purpose |
|------|---------|
| `012_fix_profiles_encryption.sql` | Re-enable profiles encryption properly |
| `013_fix_treatment_plans_encryption.sql` | Fix treatment plans triggers |
| `014_fix_medical_records_encryption.sql` | Fix medical records triggers |
| `015_fix_notes_encryption.sql` | Fix notes triggers |
| `016_fix_patient_allergies_encryption.sql` | Fix patient allergies triggers |
| `017_create_secure_views_phase3.sql` | Updated secure views |
| `018_backfill_phase3_encryption.sql` | Backfill with validation |

### Phase 4 Migrations

| File | Purpose |
|------|---------|
| `019_add_imaging_encryption.sql` | Imaging sets/files encryption |
| `020_add_patient_documents_encryption.sql` | Document metadata encryption |
| `021_create_secure_views_phase4.sql` | Secure views |
| `022_final_plaintext_cleanup.sql` | Clear all plaintext (final step) |

---

## Frontend Changes Required

### Update Data Access Layer
Replace direct table queries with secure view queries:

```typescript
// Before
const { data } = await supabase
  .from('profiles')
  .select('*');

// After
const { data } = await supabase
  .from('secure_profiles_view')
  .select('*');
```

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/usePatientProfile.ts` | Use `secure_profiles_view` |
| `src/hooks/useBusinessDetails.ts` | No change (business data not encrypted) |
| `src/integrations/supabase/types.ts` | Add types for secure views |
| Components using `profiles` table | Update to use secure view |
| Components using `treatment_plans` | Update to use secure view |
| Components using `medical_records` | Update to use secure view |

---

## Validation & Testing Strategy

### Each Phase Validation
1. **Pre-encryption baseline**: Count rows, sample data
2. **Post-trigger test**: Insert new data, verify encryption works
3. **View test**: Query secure view, verify decryption
4. **Backfill test**: Encrypt 10% of data, validate
5. **Full backfill**: Encrypt remaining data
6. **Plaintext clear**: Only after 7-day validation period

### Rollback Procedure
If issues occur:
```sql
-- Disable encryption trigger
DROP TRIGGER IF EXISTS trg_encrypt_[table] ON [table];

-- Restore plaintext from encrypted (if needed)
UPDATE [table]
SET [column] = pgp_sym_decrypt([column]_encrypted, private.get_encryption_key())
WHERE [column] IS NULL AND [column]_encrypted IS NOT NULL;
```

---

## Timeline Estimate

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1 (Low-risk) | 2-3 days | Week 1 |
| Phase 1 Validation | 3-5 days | Week 1-2 |
| Phase 2 (Medium-risk) | 3-4 days | Week 2 |
| Phase 2 Validation | 5-7 days | Week 2-3 |
| Phase 3 (PHI re-enable) | 4-5 days | Week 3-4 |
| Phase 3 Validation | 7 days | Week 4-5 |
| Phase 4 (Clinical docs) | 3-4 days | Week 5 |
| Final cleanup | 2-3 days | Week 6 |

**Total: ~6 weeks for complete rollout**

---

## Security Considerations

1. **Key Rotation**: Plan for annual key rotation
2. **Audit Logging**: All encryption/decryption operations are already logged
3. **Backup Strategy**: Ensure backups include encryption keys (stored separately)
4. **Access Control**: Only service_role can access `private.get_encryption_key()`
5. **HIPAA Compliance**: Encryption at rest satisfies HIPAA technical safeguard requirements

---

## Summary

This phased approach ensures:
- **Low risk of data loss** by testing on non-critical data first
- **Reversibility** by keeping plaintext until encryption is validated
- **HIPAA compliance** by encrypting all PHI with AES-256 (pgp_sym_encrypt)
- **Minimal app disruption** through gradual rollout and secure views
