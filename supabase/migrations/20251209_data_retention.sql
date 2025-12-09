-- =====================================================
-- DATA RETENTION AUTOMATION
-- Scheduled functions for GDPR-compliant data lifecycle
-- =====================================================

-- =====================================================
-- 1. ARCHIVE OLD APPOINTMENTS (> 2 years)
-- Archives appointments older than 2 years to separate table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.archived_appointments (
  LIKE public.appointments INCLUDING ALL,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.archive_old_appointments()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  archived_count INTEGER := 0;
  cutoff_date TIMESTAMP WITH TIME ZONE := NOW() - INTERVAL '2 years';
BEGIN
  -- Archive appointments older than 2 years
  WITH moved AS (
    DELETE FROM public.appointments
    WHERE created_at < cutoff_date
    AND status IN ('completed', 'cancelled', 'no_show')
    RETURNING *
  )
  INSERT INTO public.archived_appointments
  SELECT *, NOW() as archived_at FROM moved;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  -- Log the operation
  INSERT INTO public.audit_logs (action, table_name, changes)
  VALUES ('archive', 'appointments', jsonb_build_object(
    'archived_count', archived_count,
    'cutoff_date', cutoff_date,
    'operation', 'data_retention'
  ));
  
  RETURN jsonb_build_object(
    'success', true,
    'archived_count', archived_count,
    'cutoff_date', cutoff_date
  );
END;
$$;

-- =====================================================
-- 2. DELETE EXPIRED GDPR EXPORT BUNDLES (> 7 days)
-- Cleans up expired data export files
-- =====================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_exports()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  DELETE FROM public.gdpr_export_bundles
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the operation
  INSERT INTO public.audit_logs (action, table_name, changes)
  VALUES ('delete', 'gdpr_export_bundles', jsonb_build_object(
    'deleted_count', deleted_count,
    'operation', 'cleanup_expired_exports'
  ));
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count
  );
END;
$$;

-- =====================================================
-- 3. ANONYMIZE OLD BILLING RECORDS (> 7 years)
-- Belgian tax law requires 7-year retention for financial records
-- =====================================================
CREATE OR REPLACE FUNCTION public.anonymize_old_billing()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  anonymized_count INTEGER := 0;
  cutoff_date TIMESTAMP WITH TIME ZONE := NOW() - INTERVAL '7 years';
BEGIN
  -- Check if invoices table exists before updating
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    UPDATE public.invoices
    SET 
      patient_name = 'ANONYMIZED',
      patient_email = NULL,
      patient_phone = NULL,
      notes = 'Data anonymized per GDPR retention policy'
    WHERE created_at < cutoff_date
    AND patient_name != 'ANONYMIZED';
    
    GET DIAGNOSTICS anonymized_count = ROW_COUNT;
  END IF;
  
  -- Log the operation
  INSERT INTO public.audit_logs (action, table_name, changes)
  VALUES ('update', 'invoices', jsonb_build_object(
    'anonymized_count', anonymized_count,
    'cutoff_date', cutoff_date,
    'operation', 'anonymize_billing'
  ));
  
  RETURN jsonb_build_object(
    'success', true,
    'anonymized_count', anonymized_count,
    'cutoff_date', cutoff_date
  );
END;
$$;

-- =====================================================
-- 4. CLEANUP OLD AUDIT LOGS (> 3 years)
-- Keeps audit logs for 3 years then deletes
-- =====================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
  cutoff_date TIMESTAMP WITH TIME ZONE := NOW() - INTERVAL '3 years';
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < cutoff_date;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'cutoff_date', cutoff_date
  );
END;
$$;

-- =====================================================
-- 5. MASTER DATA RETENTION FUNCTION
-- Runs all retention tasks in sequence
-- Call this via CRON (e.g., weekly)
-- =====================================================
CREATE OR REPLACE FUNCTION public.run_data_retention_tasks()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB := '{}';
  appointments_result JSONB;
  exports_result JSONB;
  billing_result JSONB;
  audit_result JSONB;
BEGIN
  -- Run all retention tasks
  SELECT public.archive_old_appointments() INTO appointments_result;
  SELECT public.cleanup_expired_exports() INTO exports_result;
  SELECT public.anonymize_old_billing() INTO billing_result;
  SELECT public.cleanup_old_audit_logs() INTO audit_result;
  
  result := jsonb_build_object(
    'run_at', NOW(),
    'appointments', appointments_result,
    'exports', exports_result,
    'billing', billing_result,
    'audit_logs', audit_result
  );
  
  -- Log the master run
  INSERT INTO public.audit_logs (action, table_name, changes)
  VALUES ('export', 'DATA_RETENTION', result);
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.archive_old_appointments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_exports() TO authenticated;
GRANT EXECUTE ON FUNCTION public.anonymize_old_billing() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_audit_logs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_data_retention_tasks() TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION public.archive_old_appointments() IS 'Archives appointments > 2 years old';
COMMENT ON FUNCTION public.cleanup_expired_exports() IS 'Deletes expired GDPR export bundles';
COMMENT ON FUNCTION public.anonymize_old_billing() IS 'Anonymizes billing records > 7 years (Belgian law)';
COMMENT ON FUNCTION public.cleanup_old_audit_logs() IS 'Deletes audit logs > 3 years';
COMMENT ON FUNCTION public.run_data_retention_tasks() IS 'Master function to run all retention tasks - schedule via pg_cron';

-- =====================================================
-- TO ENABLE AUTOMATIC SCHEDULING (requires pg_cron extension):
-- 
-- 1. Enable pg_cron in Supabase Dashboard > Database > Extensions
-- 2. Run: 
--    SELECT cron.schedule('data-retention-weekly', 
--      '0 3 * * 0',  -- Every Sunday at 3 AM
--      'SELECT public.run_data_retention_tasks()'
--    );
-- =====================================================
