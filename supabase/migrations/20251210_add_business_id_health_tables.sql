-- =====================================================
-- ISSUE #10 FIX: ADD BUSINESS_ID TO HEALTH DATA TABLES
-- Multi-tenant isolation for patient health data
-- =====================================================

BEGIN;

-- =====================================================
-- 1. ADD BUSINESS_ID COLUMNS (nullable first for existing data)
-- =====================================================

-- patients table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'business_id'
  ) THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patients') THEN
      ALTER TABLE public.patients ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- medical_records table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'medical_records' AND column_name = 'business_id'
  ) THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medical_records') THEN
      ALTER TABLE public.medical_records ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- prescriptions table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prescriptions' AND column_name = 'business_id'
  ) THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prescriptions') THEN
      ALTER TABLE public.prescriptions ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- treatment_plans table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'treatment_plans' AND column_name = 'business_id'
  ) THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'treatment_plans') THEN
      ALTER TABLE public.treatment_plans ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- patient_notes table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patient_notes' AND column_name = 'business_id'
  ) THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_notes') THEN
      ALTER TABLE public.patient_notes ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_patients_business_id ON public.patients(business_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_business_id ON public.medical_records(business_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_business_id ON public.prescriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_business_id ON public.treatment_plans(business_id);
CREATE INDEX IF NOT EXISTS idx_patient_notes_business_id ON public.patient_notes(business_id);

-- =====================================================
-- 3. UPDATE RLS POLICIES FOR MULTI-TENANT ISOLATION
-- =====================================================

-- Patients: Business members can only access their business's patients
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patients') THEN
    DROP POLICY IF EXISTS "Business members view patients" ON public.patients;
    
    EXECUTE 'CREATE POLICY "Business members view patients" ON public.patients
      FOR SELECT USING (
        business_id IS NULL OR
        EXISTS (
          SELECT 1 FROM public.business_members bm
          JOIN public.profiles p ON p.id = bm.profile_id
          WHERE p.user_id = auth.uid() 
            AND bm.business_id = patients.business_id
            AND bm.is_active = true
        )
      )';
  END IF;
END $$;

-- Medical Records: Multi-tenant isolation
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medical_records') THEN
    DROP POLICY IF EXISTS "Business members view medical records" ON public.medical_records;
    
    EXECUTE 'CREATE POLICY "Business members view medical records" ON public.medical_records
      FOR SELECT USING (
        business_id IS NULL OR
        EXISTS (
          SELECT 1 FROM public.business_members bm
          JOIN public.profiles p ON p.id = bm.profile_id
          WHERE p.user_id = auth.uid() 
            AND bm.business_id = medical_records.business_id
            AND bm.is_active = true
        )
      )';
  END IF;
END $$;

-- Prescriptions: Multi-tenant isolation
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prescriptions') THEN
    DROP POLICY IF EXISTS "Business members view prescriptions" ON public.prescriptions;
    
    EXECUTE 'CREATE POLICY "Business members view prescriptions" ON public.prescriptions
      FOR SELECT USING (
        business_id IS NULL OR
        EXISTS (
          SELECT 1 FROM public.business_members bm
          JOIN public.profiles p ON p.id = bm.profile_id
          WHERE p.user_id = auth.uid() 
            AND bm.business_id = prescriptions.business_id
            AND bm.is_active = true
        )
      )';
  END IF;
END $$;

-- Treatment Plans: Multi-tenant isolation
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'treatment_plans') THEN
    DROP POLICY IF EXISTS "Business members view treatment plans" ON public.treatment_plans;
    
    EXECUTE 'CREATE POLICY "Business members view treatment plans" ON public.treatment_plans
      FOR SELECT USING (
        business_id IS NULL OR
        EXISTS (
          SELECT 1 FROM public.business_members bm
          JOIN public.profiles p ON p.id = bm.profile_id
          WHERE p.user_id = auth.uid() 
            AND bm.business_id = treatment_plans.business_id
            AND bm.is_active = true
        )
      )';
  END IF;
END $$;

-- Patient Notes: Multi-tenant isolation
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_notes') THEN
    DROP POLICY IF EXISTS "Business members view patient notes" ON public.patient_notes;
    
    EXECUTE 'CREATE POLICY "Business members view patient notes" ON public.patient_notes
      FOR SELECT USING (
        business_id IS NULL OR
        EXISTS (
          SELECT 1 FROM public.business_members bm
          JOIN public.profiles p ON p.id = bm.profile_id
          WHERE p.user_id = auth.uid() 
            AND bm.business_id = patient_notes.business_id
            AND bm.is_active = true
        )
      )';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- NOTE: After running this migration, you should:
-- 1. Backfill business_id from appointments or dentist data
-- 2. Optionally make business_id NOT NULL after backfill
-- =====================================================
