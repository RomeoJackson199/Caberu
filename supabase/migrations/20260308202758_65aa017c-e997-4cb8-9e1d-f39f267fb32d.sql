
-- ============================================================
-- Consolidate duplicate/overlapping RLS policies
-- Removes redundant SELECT policies that add query overhead
-- ============================================================

-- APPOINTMENTS: Remove duplicate SELECT policies
-- Keep: "Dentist access appointments" (ALL policy covers business members + patients)
-- Keep: "Super admins can view all appointments"
-- Keep: "Patients can view own appointments" (for non-business-member patients)

-- These two are identical:
DROP POLICY IF EXISTS "Business members can view appointments" ON appointments;

-- Covered by the ALL policy "Dentist access appointments" which uses is_member_of_business()
DROP POLICY IF EXISTS "Business members can view their business appointments" ON appointments;

-- The ALL policy already covers dentist SELECT via is_member_of_business()
DROP POLICY IF EXISTS "Dentists can view appointments" ON appointments;

-- Duplicate of "Patients can view own appointments"
DROP POLICY IF EXISTS "Patients can view their own appointments" ON appointments;


-- PATIENT_ALLERGIES: Remove duplicate SELECT policies
-- Keep: "Dentists can manage allergies" (ALL policy covers staff access)
-- Keep: "Patients can view own allergies"

-- Covered by the ALL policy "Dentists can manage allergies"
DROP POLICY IF EXISTS "Business staff view allergies" ON patient_allergies;
DROP POLICY IF EXISTS "Business members can view allergies" ON patient_allergies;

-- Duplicate of "Patients can view own allergies"  
DROP POLICY IF EXISTS "Patients view own allergies" ON patient_allergies;

-- Also remove redundant CUD policies covered by the ALL policy
DROP POLICY IF EXISTS "Business staff insert allergies" ON patient_allergies;
DROP POLICY IF EXISTS "Business staff update allergies" ON patient_allergies;
DROP POLICY IF EXISTS "Business staff delete allergies" ON patient_allergies;


-- PATIENT_DOCUMENTS: Remove duplicate SELECT policies
-- Keep: "Dentists can manage documents" (ALL policy covers staff access)
-- Keep: "Patients can view own documents"

-- Covered by the ALL policy "Dentists can manage documents"
DROP POLICY IF EXISTS "Business staff view documents" ON patient_documents;
DROP POLICY IF EXISTS "Business members can view documents" ON patient_documents;

-- Duplicate of "Patients can view own documents"
DROP POLICY IF EXISTS "Patients view own documents" ON patient_documents;

-- Also remove redundant CUD policies covered by the ALL policy
DROP POLICY IF EXISTS "Business staff insert documents" ON patient_documents;
DROP POLICY IF EXISTS "Business staff update documents" ON patient_documents;
DROP POLICY IF EXISTS "Business staff delete documents" ON patient_documents;
