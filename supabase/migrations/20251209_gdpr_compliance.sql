-- =====================================================
-- GDPR COMPLIANCE MIGRATION
-- Creates missing tables and fixes RLS policies
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. GDPR REQUEST TRACKING TABLE
-- Tracks data access, export, and deletion requests
-- =====================================================
CREATE TABLE IF NOT EXISTS public.gdpr_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('access', 'export', 'deletion', 'rectification', 'portability')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. GDPR EXPORT BUNDLES TABLE
-- Stores exported data bundles for portability requests
-- =====================================================
CREATE TABLE IF NOT EXISTS public.gdpr_export_bundles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.gdpr_requests(id) ON DELETE SET NULL,
  file_path TEXT,
  file_size_bytes BIGINT,
  format TEXT DEFAULT 'json' CHECK (format IN ('json', 'csv', 'xml')),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  downloaded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. AUDIT LOG TABLE
-- Comprehensive audit trail for data access/modifications
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'export', 'login', 'logout')),
  table_name TEXT,
  record_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);

-- =====================================================
-- 4. UPDATE CONSENT TABLES WITH ADDITIONAL METADATA
-- =====================================================
-- Add consent_version if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'practice_consents' AND column_name = 'consent_version') THEN
    ALTER TABLE public.practice_consents ADD COLUMN consent_version VARCHAR(10) DEFAULT '1.0';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'patient_consents' AND column_name = 'consent_version') THEN
    ALTER TABLE public.patient_consents ADD COLUMN consent_version VARCHAR(10) DEFAULT '1.0';
  END IF;
END $$;

-- =====================================================
-- 5. RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Enable RLS
ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_export_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- GDPR Requests: Users can view and create their own requests
CREATE POLICY "Users can view own GDPR requests" ON public.gdpr_requests
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own GDPR requests" ON public.gdpr_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- GDPR Export Bundles: Users can view and download their own exports
CREATE POLICY "Users can view own export bundles" ON public.gdpr_export_bundles
  FOR SELECT USING (user_id = auth.uid());

-- Audit Logs: Users can only view their own audit entries
CREATE POLICY "Users can view own audit logs" ON public.audit_logs
  FOR SELECT USING (user_id = auth.uid());

-- =====================================================
-- 6. PATIENT SELF-ACCESS RLS POLICIES
-- Allow patients to view their own health data
-- =====================================================

-- Medical Records: Patient can view their own records
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medical_records') THEN
    DROP POLICY IF EXISTS "Patients can view own medical records" ON public.medical_records;
    EXECUTE 'CREATE POLICY "Patients can view own medical records" ON public.medical_records
      FOR SELECT USING (
        patient_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      )';
  END IF;
END $$;

-- Prescriptions: Patient can view their own prescriptions
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prescriptions') THEN
    DROP POLICY IF EXISTS "Patients can view own prescriptions" ON public.prescriptions;
    EXECUTE 'CREATE POLICY "Patients can view own prescriptions" ON public.prescriptions
      FOR SELECT USING (
        patient_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      )';
  END IF;
END $$;

-- Treatment Plans: Patient can view their own treatment plans
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'treatment_plans') THEN
    DROP POLICY IF EXISTS "Patients can view own treatment plans" ON public.treatment_plans;
    EXECUTE 'CREATE POLICY "Patients can view own treatment plans" ON public.treatment_plans
      FOR SELECT USING (
        patient_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      )';
  END IF;
END $$;

-- Patient Notes: Patient can view their own notes
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_notes') THEN
    DROP POLICY IF EXISTS "Patients can view own notes" ON public.patient_notes;
    EXECUTE 'CREATE POLICY "Patients can view own notes" ON public.patient_notes
      FOR SELECT USING (
        patient_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      )';
  END IF;
END $$;

-- Appointments: Patient can view their own appointments
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
    DROP POLICY IF EXISTS "Patients can view own appointments" ON public.appointments;
    EXECUTE 'CREATE POLICY "Patients can view own appointments" ON public.appointments
      FOR SELECT USING (
        patient_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      )';
  END IF;
END $$;

-- =====================================================
-- 7. AI OPT-OUT FIELD (if not exists)
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'ai_opt_out') THEN
    ALTER TABLE public.profiles ADD COLUMN ai_opt_out BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- =====================================================
-- 8. DATA DELETION HELPER FUNCTION
-- For GDPR right to erasure
-- =====================================================
CREATE OR REPLACE FUNCTION public.process_gdpr_deletion(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB := '{}';
BEGIN
  -- Log the deletion request
  INSERT INTO public.audit_logs (user_id, action, table_name, notes)
  VALUES (target_user_id, 'delete', 'GDPR_DELETION', 'User requested account deletion');
  
  -- Anonymize personal data instead of hard delete (for legal retention requirements)
  UPDATE public.profiles
  SET 
    first_name = 'DELETED',
    last_name = 'USER',
    phone = NULL,
    avatar_url = NULL,
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  result := jsonb_build_object(
    'success', true,
    'anonymized_at', NOW(),
    'message', 'User data has been anonymized per GDPR requirements'
  );
  
  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.process_gdpr_deletion(UUID) TO authenticated;

COMMENT ON TABLE public.gdpr_requests IS 'GDPR Article 15-21 request tracking';
COMMENT ON TABLE public.gdpr_export_bundles IS 'GDPR Article 20 data portability exports';
COMMENT ON TABLE public.audit_logs IS 'GDPR Article 30 processing activity records';
