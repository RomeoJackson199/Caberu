-- ============================================
-- SECURITY IMPROVEMENTS - PHASE 3
-- Strengthen RLS Policies for Patient Data
-- ============================================

-- ============================================
-- MEDICAL RECORDS - Secure patient data
-- ============================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Patients view own medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Dentists view assigned patient records" ON public.medical_records;
DROP POLICY IF EXISTS "medical_records_select" ON public.medical_records;
DROP POLICY IF EXISTS "medical_records_insert" ON public.medical_records;
DROP POLICY IF EXISTS "medical_records_update" ON public.medical_records;
DROP POLICY IF EXISTS "medical_records_delete" ON public.medical_records;
DROP POLICY IF EXISTS "Business staff can view patient records" ON public.medical_records;
DROP POLICY IF EXISTS "Patients can view own medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Business staff can insert medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Business staff can update medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Business staff can delete medical records" ON public.medical_records;

-- Patients can view their own medical records
CREATE POLICY "Patients can view own medical records"
ON public.medical_records
FOR SELECT
TO authenticated
USING (
  patient_id = public.get_user_profile_id(auth.uid())
);

-- Business staff can view medical records for patients in their business
CREATE POLICY "Business staff can view patient records"
ON public.medical_records
FOR SELECT
TO authenticated
USING (
  public.is_business_staff(auth.uid(), business_id)
);

-- Business staff can insert medical records
CREATE POLICY "Business staff can insert medical records"
ON public.medical_records
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_business_staff(auth.uid(), business_id)
);

-- Business staff can update medical records
CREATE POLICY "Business staff can update medical records"
ON public.medical_records
FOR UPDATE
TO authenticated
USING (
  public.is_business_staff(auth.uid(), business_id)
);

-- Business staff can delete medical records
CREATE POLICY "Business staff can delete medical records"
ON public.medical_records
FOR DELETE
TO authenticated
USING (
  public.is_business_staff(auth.uid(), business_id)
);

-- ============================================
-- TREATMENT PLANS - Secure patient data  
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Patients view own treatment plans" ON public.treatment_plans;
DROP POLICY IF EXISTS "Anyone can view active treatment_plans" ON public.treatment_plans;
DROP POLICY IF EXISTS "Patients can view their own treatment plans" ON public.treatment_plans;
DROP POLICY IF EXISTS "Dentists can view treatment plans" ON public.treatment_plans;
DROP POLICY IF EXISTS "Staff can manage treatment plans" ON public.treatment_plans;
DROP POLICY IF EXISTS "Business members can manage treatment plans" ON public.treatment_plans;
DROP POLICY IF EXISTS "treatment_plans_select" ON public.treatment_plans;
DROP POLICY IF EXISTS "treatment_plans_insert" ON public.treatment_plans;
DROP POLICY IF EXISTS "Business staff can view treatment plans" ON public.treatment_plans;
DROP POLICY IF EXISTS "Patients can view own treatment plans" ON public.treatment_plans;
DROP POLICY IF EXISTS "Business staff can insert treatment plans" ON public.treatment_plans;
DROP POLICY IF EXISTS "Business staff can update treatment plans" ON public.treatment_plans;
DROP POLICY IF EXISTS "Business staff can delete treatment plans" ON public.treatment_plans;

-- Patients can view their own treatment plans
CREATE POLICY "Patients can view own treatment plans"
ON public.treatment_plans
FOR SELECT
TO authenticated
USING (
  patient_id = public.get_user_profile_id(auth.uid())
);

-- Business staff can view treatment plans for their business
CREATE POLICY "Business staff can view treatment plans"
ON public.treatment_plans
FOR SELECT
TO authenticated
USING (
  public.is_business_staff(auth.uid(), business_id)
);

-- Business staff can insert treatment plans
CREATE POLICY "Business staff can insert treatment plans"
ON public.treatment_plans
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_business_staff(auth.uid(), business_id)
);

-- Business staff can update treatment plans
CREATE POLICY "Business staff can update treatment plans"
ON public.treatment_plans
FOR UPDATE
TO authenticated
USING (
  public.is_business_staff(auth.uid(), business_id)
);

-- Business staff can delete treatment plans
CREATE POLICY "Business staff can delete treatment plans"
ON public.treatment_plans
FOR DELETE
TO authenticated
USING (
  public.is_business_staff(auth.uid(), business_id)
);

-- ============================================
-- NOTES - Secure clinical notes
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Dentists can create notes" ON public.notes;
DROP POLICY IF EXISTS "Dentists can update their notes" ON public.notes;
DROP POLICY IF EXISTS "Dentists can view notes" ON public.notes;
DROP POLICY IF EXISTS "Patients can view non-private notes" ON public.notes;
DROP POLICY IF EXISTS "Staff can delete notes" ON public.notes;
DROP POLICY IF EXISTS "Patients view own notes" ON public.notes;
DROP POLICY IF EXISTS "Dentists view patient notes" ON public.notes;
DROP POLICY IF EXISTS "Dentists create notes" ON public.notes;
DROP POLICY IF EXISTS "Dentists update own notes" ON public.notes;
DROP POLICY IF EXISTS "Dentists delete own notes" ON public.notes;

-- Patients can view their own non-private notes
CREATE POLICY "Patients view own notes"
ON public.notes
FOR SELECT
TO authenticated
USING (
  patient_id = public.get_user_profile_id(auth.uid())
  AND (is_private = false OR is_private IS NULL)
);

-- Dentists can view all notes for their patients
CREATE POLICY "Dentists view patient notes"
ON public.notes
FOR SELECT
TO authenticated
USING (
  public.dentist_has_patient_access(auth.uid(), patient_id)
);

-- Dentists can create notes for their patients
CREATE POLICY "Dentists create notes"
ON public.notes
FOR INSERT
TO authenticated
WITH CHECK (
  public.dentist_has_patient_access(auth.uid(), patient_id)
);

-- Dentists can update their own notes
CREATE POLICY "Dentists update own notes"
ON public.notes
FOR UPDATE
TO authenticated
USING (
  created_by IN (
    SELECT d.id FROM public.dentists d
    JOIN public.profiles p ON p.id = d.profile_id
    WHERE p.user_id = auth.uid()
  )
);

-- Dentists can delete their own notes
CREATE POLICY "Dentists delete own notes"
ON public.notes
FOR DELETE
TO authenticated
USING (
  created_by IN (
    SELECT d.id FROM public.dentists d
    JOIN public.profiles p ON p.id = d.profile_id
    WHERE p.user_id = auth.uid()
  )
);

-- ============================================
-- PATIENT ALLERGIES - Secure health data
-- ============================================

DROP POLICY IF EXISTS "Business members can manage allergies" ON public.patient_allergies;
DROP POLICY IF EXISTS "Patients view own allergies" ON public.patient_allergies;
DROP POLICY IF EXISTS "Patients can view own allergies" ON public.patient_allergies;
DROP POLICY IF EXISTS "Business staff view allergies" ON public.patient_allergies;
DROP POLICY IF EXISTS "Business staff manage allergies" ON public.patient_allergies;

-- Patients can view their own allergies
CREATE POLICY "Patients view own allergies"
ON public.patient_allergies
FOR SELECT
TO authenticated
USING (patient_id = public.get_user_profile_id(auth.uid()));

-- Business staff can view patient allergies
CREATE POLICY "Business staff view allergies"
ON public.patient_allergies
FOR SELECT
TO authenticated
USING (public.is_business_staff(auth.uid(), business_id));

-- Business staff can insert allergies
CREATE POLICY "Business staff insert allergies"
ON public.patient_allergies
FOR INSERT
TO authenticated
WITH CHECK (public.is_business_staff(auth.uid(), business_id));

-- Business staff can update allergies
CREATE POLICY "Business staff update allergies"
ON public.patient_allergies
FOR UPDATE
TO authenticated
USING (public.is_business_staff(auth.uid(), business_id));

-- Business staff can delete allergies
CREATE POLICY "Business staff delete allergies"
ON public.patient_allergies
FOR DELETE
TO authenticated
USING (public.is_business_staff(auth.uid(), business_id));

-- ============================================
-- PATIENT DOCUMENTS - Secure files
-- ============================================

DROP POLICY IF EXISTS "Business members can manage documents" ON public.patient_documents;
DROP POLICY IF EXISTS "Patients can view own documents" ON public.patient_documents;
DROP POLICY IF EXISTS "Patients view own documents" ON public.patient_documents;
DROP POLICY IF EXISTS "Business staff view documents" ON public.patient_documents;
DROP POLICY IF EXISTS "Business staff manage documents" ON public.patient_documents;

-- Patients can view their own documents
CREATE POLICY "Patients view own documents"
ON public.patient_documents
FOR SELECT
TO authenticated
USING (patient_id = public.get_user_profile_id(auth.uid()));

-- Business staff can view patient documents
CREATE POLICY "Business staff view documents"
ON public.patient_documents
FOR SELECT
TO authenticated
USING (public.is_business_staff(auth.uid(), business_id));

-- Business staff can insert documents
CREATE POLICY "Business staff insert documents"
ON public.patient_documents
FOR INSERT
TO authenticated
WITH CHECK (public.is_business_staff(auth.uid(), business_id));

-- Business staff can update documents
CREATE POLICY "Business staff update documents"
ON public.patient_documents
FOR UPDATE
TO authenticated
USING (public.is_business_staff(auth.uid(), business_id));

-- Business staff can delete documents
CREATE POLICY "Business staff delete documents"
ON public.patient_documents
FOR DELETE
TO authenticated
USING (public.is_business_staff(auth.uid(), business_id));