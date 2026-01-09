-- Migration: HIPAA-Compliant Full PHI/ePHI Encryption
-- Fixes: HIPAA §164.312(a)(2)(iv) - Encryption of ePHI at rest
-- Date: 2026-01-09
--
-- This migration extends encryption to ALL Protected Health Information (PHI)
-- and electronic PHI (ePHI) fields across the database.
--
-- TABLES AFFECTED:
-- 1. profiles - PII: names, email, phone, DOB, medical history
-- 2. prescriptions - PHI: medication details, dosage, instructions
-- 3. patient_notes - PHI: clinical notes content
-- 4. medical_records - PHI: title, description
-- 5. appointment_outcomes - PHI: clinical notes
-- 6. patient_allergies - PHI: allergy details
-- 7. appointments - PHI: reason, consultation notes

-- ============================================================================
-- STEP 1: SECURE KEY MANAGEMENT
-- ============================================================================
-- Replace hardcoded key with Supabase Vault integration
-- The key should be stored in Supabase Vault and accessed via settings

CREATE OR REPLACE FUNCTION private.get_app_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    vault_key TEXT;
BEGIN
    -- Try to get key from Supabase Vault first (production)
    BEGIN
        SELECT decrypted_secret INTO vault_key
        FROM vault.decrypted_secrets
        WHERE name = 'phi_encryption_key'
        LIMIT 1;

        IF vault_key IS NOT NULL THEN
            RETURN vault_key;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Vault not available, continue to fallback
        NULL;
    END;

    -- Try app settings (set via Edge Functions)
    vault_key := current_setting('app.encryption_key', true);
    IF vault_key IS NOT NULL AND vault_key != '' THEN
        RETURN vault_key;
    END IF;

    -- FALLBACK: Development/testing only - MUST be replaced in production
    -- TODO: Remove this fallback before production deployment
    RAISE WARNING 'Using fallback encryption key - configure Vault for production!';
    RETURN 'dev-key-MUST-REPLACE-IN-PRODUCTION-32ch';
END;
$$;

-- Revoke direct access to the key function
REVOKE ALL ON FUNCTION private.get_app_key() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.get_app_key() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_app_key() TO service_role;

-- ============================================================================
-- STEP 2: ADD ENCRYPTED COLUMNS TO PROFILES TABLE
-- ============================================================================
-- PII Fields: first_name, last_name, email, phone, date_of_birth, medical_history

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name_encrypted bytea,
ADD COLUMN IF NOT EXISTS last_name_encrypted bytea,
ADD COLUMN IF NOT EXISTS email_encrypted bytea,
ADD COLUMN IF NOT EXISTS phone_encrypted bytea,
ADD COLUMN IF NOT EXISTS date_of_birth_encrypted bytea,
ADD COLUMN IF NOT EXISTS medical_history_encrypted bytea;

-- ============================================================================
-- STEP 3: ADD ENCRYPTED COLUMNS TO PRESCRIPTIONS TABLE
-- ============================================================================
-- PHI Fields: medication_name, dosage, frequency, instructions

ALTER TABLE public.prescriptions
ADD COLUMN IF NOT EXISTS medication_name_encrypted bytea,
ADD COLUMN IF NOT EXISTS dosage_encrypted bytea,
ADD COLUMN IF NOT EXISTS frequency_encrypted bytea,
ADD COLUMN IF NOT EXISTS instructions_encrypted bytea;

-- ============================================================================
-- STEP 4: ADD ENCRYPTED COLUMNS TO PATIENT_NOTES TABLE
-- ============================================================================
-- PHI Fields: title, content

ALTER TABLE public.patient_notes
ADD COLUMN IF NOT EXISTS title_encrypted bytea,
ADD COLUMN IF NOT EXISTS content_encrypted bytea;

-- ============================================================================
-- STEP 5: ADD ENCRYPTED COLUMNS TO MEDICAL_RECORDS TABLE
-- ============================================================================
-- PHI Fields: title, description (findings_encrypted may already exist)

ALTER TABLE public.medical_records
ADD COLUMN IF NOT EXISTS title_encrypted bytea,
ADD COLUMN IF NOT EXISTS description_encrypted bytea;

-- ============================================================================
-- STEP 6: ADD ENCRYPTED COLUMNS TO APPOINTMENTS TABLE
-- ============================================================================
-- PHI Fields: reason, consultation_notes, ai_summary

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS reason_encrypted bytea,
ADD COLUMN IF NOT EXISTS consultation_notes_encrypted bytea,
ADD COLUMN IF NOT EXISTS ai_summary_encrypted bytea;

-- ============================================================================
-- STEP 7: CREATE ENCRYPTION TRIGGER FOR PROFILES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.encrypt_profiles_phi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    app_key TEXT;
BEGIN
    app_key := private.get_app_key();

    -- Encrypt first_name
    IF NEW.first_name IS NOT NULL AND length(NEW.first_name) > 0 THEN
        NEW.first_name_encrypted := pgp_sym_encrypt(NEW.first_name, app_key);
        NEW.first_name := '***ENCRYPTED***';
    END IF;

    -- Encrypt last_name
    IF NEW.last_name IS NOT NULL AND length(NEW.last_name) > 0 THEN
        NEW.last_name_encrypted := pgp_sym_encrypt(NEW.last_name, app_key);
        NEW.last_name := '***ENCRYPTED***';
    END IF;

    -- Encrypt email (keep original for auth lookups, encrypt for audit)
    IF NEW.email IS NOT NULL AND length(NEW.email) > 0 THEN
        NEW.email_encrypted := pgp_sym_encrypt(NEW.email, app_key);
        -- Note: email kept in plaintext for auth.users foreign key and lookups
    END IF;

    -- Encrypt phone
    IF NEW.phone IS NOT NULL AND length(NEW.phone) > 0 THEN
        NEW.phone_encrypted := pgp_sym_encrypt(NEW.phone, app_key);
        NEW.phone := NULL;
    END IF;

    -- Encrypt date_of_birth
    IF NEW.date_of_birth IS NOT NULL THEN
        NEW.date_of_birth_encrypted := pgp_sym_encrypt(NEW.date_of_birth::TEXT, app_key);
        NEW.date_of_birth := NULL;
    END IF;

    -- Encrypt medical_history
    IF NEW.medical_history IS NOT NULL AND length(NEW.medical_history) > 0 THEN
        NEW.medical_history_encrypted := pgp_sym_encrypt(NEW.medical_history, app_key);
        NEW.medical_history := NULL;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_profiles_phi ON public.profiles;
CREATE TRIGGER trg_encrypt_profiles_phi
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_profiles_phi();

-- ============================================================================
-- STEP 8: CREATE ENCRYPTION TRIGGER FOR PRESCRIPTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.encrypt_prescriptions_phi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    app_key TEXT;
BEGIN
    app_key := private.get_app_key();

    -- Encrypt medication_name
    IF NEW.medication_name IS NOT NULL AND length(NEW.medication_name) > 0 THEN
        NEW.medication_name_encrypted := pgp_sym_encrypt(NEW.medication_name, app_key);
        NEW.medication_name := '***ENCRYPTED***';
    END IF;

    -- Encrypt dosage
    IF NEW.dosage IS NOT NULL AND length(NEW.dosage) > 0 THEN
        NEW.dosage_encrypted := pgp_sym_encrypt(NEW.dosage, app_key);
        NEW.dosage := '***ENCRYPTED***';
    END IF;

    -- Encrypt frequency
    IF NEW.frequency IS NOT NULL AND length(NEW.frequency) > 0 THEN
        NEW.frequency_encrypted := pgp_sym_encrypt(NEW.frequency, app_key);
        NEW.frequency := '***ENCRYPTED***';
    END IF;

    -- Encrypt instructions
    IF NEW.instructions IS NOT NULL AND length(NEW.instructions) > 0 THEN
        NEW.instructions_encrypted := pgp_sym_encrypt(NEW.instructions, app_key);
        NEW.instructions := NULL;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_prescriptions_phi ON public.prescriptions;
CREATE TRIGGER trg_encrypt_prescriptions_phi
BEFORE INSERT OR UPDATE ON public.prescriptions
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_prescriptions_phi();

-- ============================================================================
-- STEP 9: CREATE ENCRYPTION TRIGGER FOR PATIENT_NOTES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.encrypt_patient_notes_phi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    app_key TEXT;
BEGIN
    app_key := private.get_app_key();

    -- Encrypt title
    IF NEW.title IS NOT NULL AND length(NEW.title) > 0 THEN
        NEW.title_encrypted := pgp_sym_encrypt(NEW.title, app_key);
        NEW.title := '***ENCRYPTED***';
    END IF;

    -- Encrypt content
    IF NEW.content IS NOT NULL AND length(NEW.content) > 0 THEN
        NEW.content_encrypted := pgp_sym_encrypt(NEW.content, app_key);
        NEW.content := '***ENCRYPTED***';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_patient_notes_phi ON public.patient_notes;
CREATE TRIGGER trg_encrypt_patient_notes_phi
BEFORE INSERT OR UPDATE ON public.patient_notes
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_patient_notes_phi();

-- ============================================================================
-- STEP 10: CREATE ENCRYPTION TRIGGER FOR MEDICAL_RECORDS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.encrypt_medical_records_phi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    app_key TEXT;
BEGIN
    app_key := private.get_app_key();

    -- Encrypt title
    IF NEW.title IS NOT NULL AND length(NEW.title) > 0 THEN
        NEW.title_encrypted := pgp_sym_encrypt(NEW.title, app_key);
        NEW.title := '***ENCRYPTED***';
    END IF;

    -- Encrypt description
    IF NEW.description IS NOT NULL AND length(NEW.description) > 0 THEN
        NEW.description_encrypted := pgp_sym_encrypt(NEW.description, app_key);
        NEW.description := NULL;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_medical_records_phi ON public.medical_records;
CREATE TRIGGER trg_encrypt_medical_records_phi
BEFORE INSERT OR UPDATE ON public.medical_records
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_medical_records_phi();

-- ============================================================================
-- STEP 11: CREATE ENCRYPTION TRIGGER FOR APPOINTMENTS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.encrypt_appointments_phi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    app_key TEXT;
BEGIN
    app_key := private.get_app_key();

    -- Encrypt reason
    IF NEW.reason IS NOT NULL AND length(NEW.reason) > 0 THEN
        NEW.reason_encrypted := pgp_sym_encrypt(NEW.reason, app_key);
        NEW.reason := NULL;
    END IF;

    -- Encrypt consultation_notes
    IF NEW.consultation_notes IS NOT NULL AND length(NEW.consultation_notes) > 0 THEN
        NEW.consultation_notes_encrypted := pgp_sym_encrypt(NEW.consultation_notes, app_key);
        NEW.consultation_notes := NULL;
    END IF;

    -- Encrypt ai_summary
    IF NEW.ai_summary IS NOT NULL AND length(NEW.ai_summary) > 0 THEN
        NEW.ai_summary_encrypted := pgp_sym_encrypt(NEW.ai_summary, app_key);
        NEW.ai_summary := NULL;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_appointments_phi ON public.appointments;
CREATE TRIGGER trg_encrypt_appointments_phi
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_appointments_phi();

-- ============================================================================
-- STEP 12: CREATE SECURE DECRYPTED VIEWS
-- ============================================================================

-- Secure Profiles View
CREATE OR REPLACE VIEW public.secure_profiles_view AS
SELECT
    id,
    user_id,
    CASE
        WHEN first_name_encrypted IS NOT NULL THEN pgp_sym_decrypt(first_name_encrypted, private.get_app_key())
        ELSE first_name
    END AS first_name,
    CASE
        WHEN last_name_encrypted IS NOT NULL THEN pgp_sym_decrypt(last_name_encrypted, private.get_app_key())
        ELSE last_name
    END AS last_name,
    email, -- Kept unencrypted for lookups
    CASE
        WHEN phone_encrypted IS NOT NULL THEN pgp_sym_decrypt(phone_encrypted, private.get_app_key())
        ELSE phone
    END AS phone,
    CASE
        WHEN date_of_birth_encrypted IS NOT NULL THEN pgp_sym_decrypt(date_of_birth_encrypted, private.get_app_key())::DATE
        ELSE date_of_birth
    END AS date_of_birth,
    role,
    CASE
        WHEN medical_history_encrypted IS NOT NULL THEN pgp_sym_decrypt(medical_history_encrypted, private.get_app_key())
        ELSE medical_history
    END AS medical_history,
    preferred_language,
    created_at,
    updated_at
FROM public.profiles;

GRANT SELECT ON public.secure_profiles_view TO authenticated;

-- Secure Prescriptions View
CREATE OR REPLACE VIEW public.secure_prescriptions_view AS
SELECT
    id,
    patient_id,
    dentist_id,
    CASE
        WHEN medication_name_encrypted IS NOT NULL THEN pgp_sym_decrypt(medication_name_encrypted, private.get_app_key())
        ELSE medication_name
    END AS medication_name,
    CASE
        WHEN dosage_encrypted IS NOT NULL THEN pgp_sym_decrypt(dosage_encrypted, private.get_app_key())
        ELSE dosage
    END AS dosage,
    CASE
        WHEN frequency_encrypted IS NOT NULL THEN pgp_sym_decrypt(frequency_encrypted, private.get_app_key())
        ELSE frequency
    END AS frequency,
    duration,
    CASE
        WHEN instructions_encrypted IS NOT NULL THEN pgp_sym_decrypt(instructions_encrypted, private.get_app_key())
        ELSE instructions
    END AS instructions,
    prescribed_date,
    expiry_date,
    status,
    created_at,
    updated_at
FROM public.prescriptions;

GRANT SELECT ON public.secure_prescriptions_view TO authenticated;

-- Secure Patient Notes View
CREATE OR REPLACE VIEW public.secure_patient_notes_view AS
SELECT
    id,
    patient_id,
    dentist_id,
    note_type,
    CASE
        WHEN title_encrypted IS NOT NULL THEN pgp_sym_decrypt(title_encrypted, private.get_app_key())
        ELSE title
    END AS title,
    CASE
        WHEN content_encrypted IS NOT NULL THEN pgp_sym_decrypt(content_encrypted, private.get_app_key())
        ELSE content
    END AS content,
    is_private,
    created_at,
    updated_at
FROM public.patient_notes;

GRANT SELECT ON public.secure_patient_notes_view TO authenticated;

-- Secure Medical Records View
CREATE OR REPLACE VIEW public.secure_medical_records_view AS
SELECT
    id,
    patient_id,
    dentist_id,
    record_type,
    CASE
        WHEN title_encrypted IS NOT NULL THEN pgp_sym_decrypt(title_encrypted, private.get_app_key())
        ELSE title
    END AS title,
    CASE
        WHEN description_encrypted IS NOT NULL THEN pgp_sym_decrypt(description_encrypted, private.get_app_key())
        ELSE description
    END AS description,
    file_url,
    record_date,
    created_at,
    updated_at
FROM public.medical_records;

GRANT SELECT ON public.secure_medical_records_view TO authenticated;

-- Secure Appointments View
CREATE OR REPLACE VIEW public.secure_appointments_view AS
SELECT
    a.id,
    a.patient_id,
    a.dentist_id,
    a.business_id,
    a.appointment_date,
    a.duration_minutes,
    a.status,
    a.urgency,
    CASE
        WHEN a.reason_encrypted IS NOT NULL THEN pgp_sym_decrypt(a.reason_encrypted, private.get_app_key())
        ELSE a.reason
    END AS reason,
    a.notes,
    CASE
        WHEN a.consultation_notes_encrypted IS NOT NULL THEN pgp_sym_decrypt(a.consultation_notes_encrypted, private.get_app_key())
        ELSE a.consultation_notes
    END AS consultation_notes,
    CASE
        WHEN a.ai_summary_encrypted IS NOT NULL THEN pgp_sym_decrypt(a.ai_summary_encrypted, private.get_app_key())
        ELSE a.ai_summary
    END AS ai_summary,
    a.treatment_plan_id,
    a.amount_paid_cents,
    a.payment_status,
    a.completed_at,
    a.booking_source,
    a.created_at,
    a.updated_at
FROM public.appointments a;

GRANT SELECT ON public.secure_appointments_view TO authenticated;

-- ============================================================================
-- STEP 13: DATA MIGRATION - ENCRYPT EXISTING PLAINTEXT DATA
-- ============================================================================
-- This function encrypts any existing unencrypted data
-- Run once after migration, then disable

CREATE OR REPLACE FUNCTION public.migrate_existing_phi_to_encrypted()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    app_key TEXT;
    profiles_count INT := 0;
    prescriptions_count INT := 0;
    notes_count INT := 0;
    records_count INT := 0;
    appointments_count INT := 0;
BEGIN
    app_key := private.get_app_key();

    -- Migrate profiles
    UPDATE public.profiles
    SET
        first_name_encrypted = CASE WHEN first_name IS NOT NULL AND first_name != '***ENCRYPTED***' AND first_name_encrypted IS NULL
            THEN pgp_sym_encrypt(first_name, app_key) ELSE first_name_encrypted END,
        last_name_encrypted = CASE WHEN last_name IS NOT NULL AND last_name != '***ENCRYPTED***' AND last_name_encrypted IS NULL
            THEN pgp_sym_encrypt(last_name, app_key) ELSE last_name_encrypted END,
        phone_encrypted = CASE WHEN phone IS NOT NULL AND phone_encrypted IS NULL
            THEN pgp_sym_encrypt(phone, app_key) ELSE phone_encrypted END,
        date_of_birth_encrypted = CASE WHEN date_of_birth IS NOT NULL AND date_of_birth_encrypted IS NULL
            THEN pgp_sym_encrypt(date_of_birth::TEXT, app_key) ELSE date_of_birth_encrypted END,
        medical_history_encrypted = CASE WHEN medical_history IS NOT NULL AND medical_history_encrypted IS NULL
            THEN pgp_sym_encrypt(medical_history, app_key) ELSE medical_history_encrypted END,
        -- Clear plaintext after encryption
        first_name = CASE WHEN first_name_encrypted IS NOT NULL OR (first_name IS NOT NULL AND first_name != '***ENCRYPTED***')
            THEN '***ENCRYPTED***' ELSE first_name END,
        last_name = CASE WHEN last_name_encrypted IS NOT NULL OR (last_name IS NOT NULL AND last_name != '***ENCRYPTED***')
            THEN '***ENCRYPTED***' ELSE last_name END,
        phone = NULL,
        date_of_birth = NULL,
        medical_history = NULL
    WHERE first_name_encrypted IS NULL
       OR last_name_encrypted IS NULL
       OR (phone IS NOT NULL AND phone_encrypted IS NULL)
       OR (date_of_birth IS NOT NULL AND date_of_birth_encrypted IS NULL)
       OR (medical_history IS NOT NULL AND medical_history_encrypted IS NULL);
    GET DIAGNOSTICS profiles_count = ROW_COUNT;

    -- Migrate prescriptions
    UPDATE public.prescriptions
    SET
        medication_name_encrypted = CASE WHEN medication_name IS NOT NULL AND medication_name != '***ENCRYPTED***' AND medication_name_encrypted IS NULL
            THEN pgp_sym_encrypt(medication_name, app_key) ELSE medication_name_encrypted END,
        dosage_encrypted = CASE WHEN dosage IS NOT NULL AND dosage != '***ENCRYPTED***' AND dosage_encrypted IS NULL
            THEN pgp_sym_encrypt(dosage, app_key) ELSE dosage_encrypted END,
        frequency_encrypted = CASE WHEN frequency IS NOT NULL AND frequency != '***ENCRYPTED***' AND frequency_encrypted IS NULL
            THEN pgp_sym_encrypt(frequency, app_key) ELSE frequency_encrypted END,
        instructions_encrypted = CASE WHEN instructions IS NOT NULL AND instructions_encrypted IS NULL
            THEN pgp_sym_encrypt(instructions, app_key) ELSE instructions_encrypted END,
        medication_name = CASE WHEN medication_name_encrypted IS NOT NULL OR (medication_name IS NOT NULL AND medication_name != '***ENCRYPTED***')
            THEN '***ENCRYPTED***' ELSE medication_name END,
        dosage = CASE WHEN dosage_encrypted IS NOT NULL OR (dosage IS NOT NULL AND dosage != '***ENCRYPTED***')
            THEN '***ENCRYPTED***' ELSE dosage END,
        frequency = CASE WHEN frequency_encrypted IS NOT NULL OR (frequency IS NOT NULL AND frequency != '***ENCRYPTED***')
            THEN '***ENCRYPTED***' ELSE frequency END,
        instructions = NULL
    WHERE medication_name_encrypted IS NULL
       OR dosage_encrypted IS NULL
       OR frequency_encrypted IS NULL
       OR (instructions IS NOT NULL AND instructions_encrypted IS NULL);
    GET DIAGNOSTICS prescriptions_count = ROW_COUNT;

    -- Migrate patient_notes
    UPDATE public.patient_notes
    SET
        title_encrypted = CASE WHEN title IS NOT NULL AND title != '***ENCRYPTED***' AND title_encrypted IS NULL
            THEN pgp_sym_encrypt(title, app_key) ELSE title_encrypted END,
        content_encrypted = CASE WHEN content IS NOT NULL AND content != '***ENCRYPTED***' AND content_encrypted IS NULL
            THEN pgp_sym_encrypt(content, app_key) ELSE content_encrypted END,
        title = CASE WHEN title_encrypted IS NOT NULL OR (title IS NOT NULL AND title != '***ENCRYPTED***')
            THEN '***ENCRYPTED***' ELSE title END,
        content = CASE WHEN content_encrypted IS NOT NULL OR (content IS NOT NULL AND content != '***ENCRYPTED***')
            THEN '***ENCRYPTED***' ELSE content END
    WHERE title_encrypted IS NULL OR content_encrypted IS NULL;
    GET DIAGNOSTICS notes_count = ROW_COUNT;

    -- Migrate medical_records
    UPDATE public.medical_records
    SET
        title_encrypted = CASE WHEN title IS NOT NULL AND title != '***ENCRYPTED***' AND title_encrypted IS NULL
            THEN pgp_sym_encrypt(title, app_key) ELSE title_encrypted END,
        description_encrypted = CASE WHEN description IS NOT NULL AND description_encrypted IS NULL
            THEN pgp_sym_encrypt(description, app_key) ELSE description_encrypted END,
        title = CASE WHEN title_encrypted IS NOT NULL OR (title IS NOT NULL AND title != '***ENCRYPTED***')
            THEN '***ENCRYPTED***' ELSE title END,
        description = NULL
    WHERE title_encrypted IS NULL OR (description IS NOT NULL AND description_encrypted IS NULL);
    GET DIAGNOSTICS records_count = ROW_COUNT;

    -- Migrate appointments
    UPDATE public.appointments
    SET
        reason_encrypted = CASE WHEN reason IS NOT NULL AND reason_encrypted IS NULL
            THEN pgp_sym_encrypt(reason, app_key) ELSE reason_encrypted END,
        consultation_notes_encrypted = CASE WHEN consultation_notes IS NOT NULL AND consultation_notes_encrypted IS NULL
            THEN pgp_sym_encrypt(consultation_notes, app_key) ELSE consultation_notes_encrypted END,
        ai_summary_encrypted = CASE WHEN ai_summary IS NOT NULL AND ai_summary_encrypted IS NULL
            THEN pgp_sym_encrypt(ai_summary, app_key) ELSE ai_summary_encrypted END,
        reason = NULL,
        consultation_notes = NULL,
        ai_summary = NULL
    WHERE (reason IS NOT NULL AND reason_encrypted IS NULL)
       OR (consultation_notes IS NOT NULL AND consultation_notes_encrypted IS NULL)
       OR (ai_summary IS NOT NULL AND ai_summary_encrypted IS NULL);
    GET DIAGNOSTICS appointments_count = ROW_COUNT;

    RETURN format('PHI Migration Complete - Profiles: %s, Prescriptions: %s, Notes: %s, Records: %s, Appointments: %s',
        profiles_count, prescriptions_count, notes_count, records_count, appointments_count);
END;
$$;

-- ============================================================================
-- STEP 14: AUDIT LOG FOR PHI ACCESS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.phi_access_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    table_name TEXT NOT NULL,
    record_id uuid NOT NULL,
    access_type TEXT NOT NULL CHECK (access_type IN ('read', 'write', 'decrypt')),
    ip_address INET,
    user_agent TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.phi_access_log ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (from edge functions)
CREATE POLICY "Service role can insert PHI access logs" ON public.phi_access_log
    FOR INSERT TO service_role
    WITH CHECK (true);

-- Users can view their own access logs
CREATE POLICY "Users can view their own PHI access logs" ON public.phi_access_log
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_phi_access_log_user_id ON public.phi_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_phi_access_log_table_record ON public.phi_access_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_phi_access_log_accessed_at ON public.phi_access_log(accessed_at);

-- ============================================================================
-- STEP 15: COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION private.get_app_key() IS
'HIPAA: Returns the PHI encryption key. Production MUST use Supabase Vault.';

COMMENT ON VIEW public.secure_profiles_view IS
'HIPAA §164.312(a)(2)(iv): Decrypted view of profiles with PII fields.';

COMMENT ON VIEW public.secure_prescriptions_view IS
'HIPAA §164.312(a)(2)(iv): Decrypted view of prescriptions with PHI fields.';

COMMENT ON VIEW public.secure_patient_notes_view IS
'HIPAA §164.312(a)(2)(iv): Decrypted view of patient notes with clinical data.';

COMMENT ON VIEW public.secure_medical_records_view IS
'HIPAA §164.312(a)(2)(iv): Decrypted view of medical records.';

COMMENT ON VIEW public.secure_appointments_view IS
'HIPAA §164.312(a)(2)(iv): Decrypted view of appointments with clinical notes.';

COMMENT ON TABLE public.phi_access_log IS
'HIPAA §164.312(b): Audit log tracking access to PHI/ePHI data.';

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
--
-- DEPLOYMENT STEPS:
-- 1. Apply this migration
-- 2. Set encryption key in Supabase Vault:
--    INSERT INTO vault.secrets (name, secret)
--    VALUES ('phi_encryption_key', 'your-secure-32-character-key-here');
-- 3. Run migration function:
--    SELECT public.migrate_existing_phi_to_encrypted();
-- 4. Update application to use secure_*_view instead of direct table access
-- 5. Verify encryption by checking that plaintext columns are NULL or '***ENCRYPTED***'
--
-- ROLLBACK:
-- To rollback, you would need to:
-- 1. Decrypt all data back to plaintext columns
-- 2. Drop the encrypted columns
-- 3. Drop the triggers
-- This is intentionally NOT provided as it would violate HIPAA compliance
