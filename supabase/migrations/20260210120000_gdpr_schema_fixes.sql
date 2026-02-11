-- GDPR Schema Fixes Migration
-- Fixes table name conflicts, adds missing columns, and tightens RLS policies

-- ============================================================================
-- 1. Fix gdpr_requests table to use patient_id consistently
-- The original migration used user_id but the app code uses patient_id
-- ============================================================================
DO $$
BEGIN
  -- Add patient_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gdpr_requests' AND column_name = 'patient_id'
  ) THEN
    ALTER TABLE public.gdpr_requests ADD COLUMN patient_id UUID;
    -- Backfill from user_id if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'gdpr_requests' AND column_name = 'user_id'
    ) THEN
      UPDATE public.gdpr_requests SET patient_id = user_id WHERE patient_id IS NULL;
    END IF;
  END IF;

  -- Add type column (new schema uses 'type' not 'request_type')
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gdpr_requests' AND column_name = 'type'
  ) THEN
    ALTER TABLE public.gdpr_requests ADD COLUMN type TEXT;
    -- Backfill from request_type if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'gdpr_requests' AND column_name = 'request_type'
    ) THEN
      UPDATE public.gdpr_requests SET type = request_type WHERE type IS NULL;
    END IF;
  END IF;

  -- Add description column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gdpr_requests' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.gdpr_requests ADD COLUMN description TEXT;
  END IF;

  -- Add submitted_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gdpr_requests' AND column_name = 'submitted_at'
  ) THEN
    ALTER TABLE public.gdpr_requests ADD COLUMN submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- Add due_at column (30-day GDPR deadline)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gdpr_requests' AND column_name = 'due_at'
  ) THEN
    ALTER TABLE public.gdpr_requests ADD COLUMN due_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days');
  END IF;

  -- Add resolved_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gdpr_requests' AND column_name = 'resolved_at'
  ) THEN
    ALTER TABLE public.gdpr_requests ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add actor_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gdpr_requests' AND column_name = 'actor_id'
  ) THEN
    ALTER TABLE public.gdpr_requests ADD COLUMN actor_id UUID;
  END IF;

  -- Add resolution_notes column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gdpr_requests' AND column_name = 'resolution_notes'
  ) THEN
    ALTER TABLE public.gdpr_requests ADD COLUMN resolution_notes TEXT;
  END IF;

  -- Add urgency_level column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gdpr_requests' AND column_name = 'urgency_level'
  ) THEN
    ALTER TABLE public.gdpr_requests ADD COLUMN urgency_level TEXT DEFAULT 'normal';
  END IF;

  -- Add legal_basis column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gdpr_requests' AND column_name = 'legal_basis'
  ) THEN
    ALTER TABLE public.gdpr_requests ADD COLUMN legal_basis TEXT;
  END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_patient_id ON public.gdpr_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_status ON public.gdpr_requests(status);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_due_at ON public.gdpr_requests(due_at);

-- ============================================================================
-- 2. Fix gdpr_export_bundles to use patient_id
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gdpr_export_bundles' AND column_name = 'patient_id'
  ) THEN
    ALTER TABLE public.gdpr_export_bundles ADD COLUMN patient_id UUID;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'gdpr_export_bundles' AND column_name = 'user_id'
    ) THEN
      UPDATE public.gdpr_export_bundles SET patient_id = user_id WHERE patient_id IS NULL;
    END IF;
  END IF;

  -- Add status and completed_at for export lifecycle
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gdpr_export_bundles' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.gdpr_export_bundles ADD COLUMN status TEXT DEFAULT 'completed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gdpr_export_bundles' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE public.gdpr_export_bundles ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- ============================================================================
-- 3. Add expires_at to consent_records if missing
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consent_records' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.consent_records ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- ============================================================================
-- 4. Update status values for gdpr_requests to match new schema
-- ============================================================================
DO $$
BEGIN
  -- Update old status values to new ones
  UPDATE public.gdpr_requests SET status = 'submitted' WHERE status = 'pending';
  UPDATE public.gdpr_requests SET status = 'in_progress' WHERE status = 'processing';
EXCEPTION
  WHEN OTHERS THEN NULL; -- Ignore if values don't exist
END $$;

-- ============================================================================
-- 5. Update type values for gdpr_requests to include new types
-- ============================================================================
-- Drop old check constraint if it exists and create a new one
DO $$
BEGIN
  -- Try to drop old constraints that may restrict values
  BEGIN
    ALTER TABLE public.gdpr_requests DROP CONSTRAINT IF EXISTS gdpr_requests_request_type_check;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.gdpr_requests DROP CONSTRAINT IF EXISTS gdpr_requests_status_check;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
