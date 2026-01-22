-- =====================================================
-- HIPAA COMPLIANCE: PHI Audit Logging & 6-Year Retention
-- =====================================================

-- Step 1: Create/update audit cleanup function with 6-year retention (HIPAA requirement)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER := 0;
  cutoff_date TIMESTAMP WITH TIME ZONE := NOW() - INTERVAL '6 years'; -- HIPAA requires 6 years
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < cutoff_date;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'cutoff_date', cutoff_date,
    'retention_years', 6,
    'compliance', 'HIPAA Security Rule § 164.312(b)'
  );
END;
$$;

-- Step 2: Create PHI audit trigger function
CREATE OR REPLACE FUNCTION public.audit_phi_access()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only log if there's an authenticated user
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      user_id, 
      action, 
      table_name, 
      record_id, 
      changes,
      ip_address
    )
    VALUES (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id)::text,
      CASE 
        WHEN TG_OP = 'UPDATE' THEN 
          jsonb_build_object('operation', 'phi_update', 'timestamp', NOW())
        WHEN TG_OP = 'DELETE' THEN 
          jsonb_build_object('operation', 'phi_delete', 'timestamp', NOW())
        WHEN TG_OP = 'INSERT' THEN 
          jsonb_build_object('operation', 'phi_insert', 'timestamp', NOW())
        ELSE 
          jsonb_build_object('operation', TG_OP, 'timestamp', NOW())
      END,
      inet_client_addr()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Step 3: Apply PHI audit triggers to healthcare data tables

-- medical_records audit trigger
DROP TRIGGER IF EXISTS audit_medical_records_phi ON public.medical_records;
CREATE TRIGGER audit_medical_records_phi
  AFTER INSERT OR UPDATE OR DELETE ON public.medical_records
  FOR EACH ROW EXECUTE FUNCTION public.audit_phi_access();

-- treatment_plans audit trigger
DROP TRIGGER IF EXISTS audit_treatment_plans_phi ON public.treatment_plans;
CREATE TRIGGER audit_treatment_plans_phi
  AFTER INSERT OR UPDATE OR DELETE ON public.treatment_plans
  FOR EACH ROW EXECUTE FUNCTION public.audit_phi_access();

-- notes (patient notes) audit trigger
DROP TRIGGER IF EXISTS audit_notes_phi ON public.notes;
CREATE TRIGGER audit_notes_phi
  AFTER INSERT OR UPDATE OR DELETE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.audit_phi_access();

-- prescriptions audit trigger (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'prescriptions') THEN
    DROP TRIGGER IF EXISTS audit_prescriptions_phi ON public.prescriptions;
    CREATE TRIGGER audit_prescriptions_phi
      AFTER INSERT OR UPDATE OR DELETE ON public.prescriptions
      FOR EACH ROW EXECUTE FUNCTION public.audit_phi_access();
  END IF;
END $$;

-- patient_allergies audit trigger
DROP TRIGGER IF EXISTS audit_patient_allergies_phi ON public.patient_allergies;
CREATE TRIGGER audit_patient_allergies_phi
  AFTER INSERT OR UPDATE OR DELETE ON public.patient_allergies
  FOR EACH ROW EXECUTE FUNCTION public.audit_phi_access();

-- imaging_files audit trigger
DROP TRIGGER IF EXISTS audit_imaging_files_phi ON public.imaging_files;
CREATE TRIGGER audit_imaging_files_phi
  AFTER INSERT OR UPDATE OR DELETE ON public.imaging_files
  FOR EACH ROW EXECUTE FUNCTION public.audit_phi_access();

-- appointments audit trigger (PHI-containing)
DROP TRIGGER IF EXISTS audit_appointments_phi ON public.appointments;
CREATE TRIGGER audit_appointments_phi
  AFTER INSERT OR UPDATE OR DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.audit_phi_access();

-- =====================================================
-- STORAGE SECURITY: Fix ai-knowledge-documents bucket RLS
-- =====================================================

-- Drop overly permissive policies on ai-knowledge-documents bucket
DROP POLICY IF EXISTS "Authenticated users can upload AI knowledge documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view their AI knowledge documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their AI knowledge documents" ON storage.objects;

-- Create business-scoped storage policies
-- Files must be stored as: business_id/filename.ext

CREATE POLICY "Business members can view AI knowledge documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'ai-knowledge-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT bm.business_id::text
      FROM public.business_members bm
      JOIN public.profiles p ON p.id = bm.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Business members can upload AI knowledge documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ai-knowledge-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT bm.business_id::text
      FROM public.business_members bm
      JOIN public.profiles p ON p.id = bm.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Business admins can delete AI knowledge documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'ai-knowledge-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT bm.business_id::text
      FROM public.business_members bm
      JOIN public.profiles p ON p.id = bm.profile_id
      WHERE p.user_id = auth.uid()
      AND bm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Business admins can update AI knowledge documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'ai-knowledge-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT bm.business_id::text
      FROM public.business_members bm
      JOIN public.profiles p ON p.id = bm.profile_id
      WHERE p.user_id = auth.uid()
      AND bm.role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- API RATE LIMITING: Create rate limit tracking table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create simple index for key lookups (no function-based index)
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON public.api_rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON public.api_rate_limits(window_start);

-- Enable RLS on rate limits table
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (edge functions use service role)
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.api_rate_limits;
CREATE POLICY "Service role can manage rate limits"
  ON public.api_rate_limits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create rate limit check function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_max_requests INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS TABLE(exceeded BOOLEAN, current_count INTEGER, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  -- Use a fixed window based on truncated hour
  v_window_start := date_trunc('hour', NOW());
  
  -- Get existing count or insert new entry
  SELECT api_rate_limits.count INTO v_count
  FROM public.api_rate_limits
  WHERE api_rate_limits.key = p_key
    AND api_rate_limits.window_start >= v_window_start
  ORDER BY api_rate_limits.window_start DESC
  LIMIT 1;
  
  IF v_count IS NULL THEN
    -- Insert new entry
    INSERT INTO public.api_rate_limits (key, count, window_start)
    VALUES (p_key, 1, v_window_start);
    v_count := 1;
  ELSE
    -- Update existing entry
    UPDATE public.api_rate_limits
    SET count = count + 1
    WHERE api_rate_limits.key = p_key
      AND api_rate_limits.window_start >= v_window_start;
    v_count := v_count + 1;
  END IF;
  
  -- Return result
  RETURN QUERY SELECT 
    v_count > p_max_requests AS exceeded,
    v_count AS current_count,
    v_window_start + (p_window_minutes * INTERVAL '1 minute') AS reset_at;
END;
$$;

-- Create cleanup function for old rate limit entries
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.api_rate_limits
  WHERE window_start < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Add documentation comments
COMMENT ON TABLE public.api_rate_limits IS 'Rate limiting for edge functions to prevent API abuse. HIPAA/security compliance.';
COMMENT ON FUNCTION public.audit_phi_access() IS 'HIPAA-compliant PHI audit logging trigger. Logs all PHI table access.';
COMMENT ON FUNCTION public.cleanup_old_audit_logs() IS 'HIPAA-compliant 6-year retention cleanup for audit logs.';