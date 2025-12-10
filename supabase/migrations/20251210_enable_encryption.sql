-- Migration: Enable Data Encryption for Health Records
-- Fixes Critical Vulnerability: Sensitive health data stored in plain text

-- 1. Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Add Encrypted Columns to Medical Records
ALTER TABLE medical_records 
ADD COLUMN IF NOT EXISTS findings_encrypted bytea;

-- 3. Add Encrypted Columns to Treatment Plans
ALTER TABLE treatment_plans 
ADD COLUMN IF NOT EXISTS diagnosis_encrypted bytea;

-- 4. Note on Usage:
-- Application should use pgp_sym_encrypt(data, key) for writing
-- and pgp_sym_decrypt(data, key) for reading.
-- Keys should be stored in Edge Function secrets or environment variables, NOT in the database.
