-- Fix RLS policies for imaging_sets
-- The issue is that auth.uid() returns user_id but business_members.profile_id is different
-- We need to join through profiles table to get the correct profile_id

-- Drop existing policies
DROP POLICY IF EXISTS "imaging_sets_select_business" ON imaging_sets;
DROP POLICY IF EXISTS "imaging_sets_select_patient" ON imaging_sets;
DROP POLICY IF EXISTS "imaging_sets_insert" ON imaging_sets;
DROP POLICY IF EXISTS "imaging_sets_update" ON imaging_sets;
DROP POLICY IF EXISTS "imaging_sets_delete" ON imaging_sets;

-- Recreate policies with correct user_id -> profile_id mapping

-- Dentists/Staff can view imaging sets for their business
CREATE POLICY "imaging_sets_select_business" ON imaging_sets
    FOR SELECT USING (
        business_id IN (
            SELECT bm.business_id FROM business_members bm
            JOIN profiles p ON p.id = bm.profile_id
            WHERE p.user_id = auth.uid()
        )
    );

-- Patients can view their own imaging sets
CREATE POLICY "imaging_sets_select_patient" ON imaging_sets
    FOR SELECT USING (
        patient_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- Dentists/Staff can insert imaging sets for their business
CREATE POLICY "imaging_sets_insert" ON imaging_sets
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT bm.business_id FROM business_members bm
            JOIN profiles p ON p.id = bm.profile_id
            WHERE p.user_id = auth.uid()
            AND bm.role IN ('admin', 'dentist', 'staff', 'owner')
        )
    );

-- Dentists/Staff can update imaging sets for their business
CREATE POLICY "imaging_sets_update" ON imaging_sets
    FOR UPDATE USING (
        business_id IN (
            SELECT bm.business_id FROM business_members bm
            JOIN profiles p ON p.id = bm.profile_id
            WHERE p.user_id = auth.uid()
            AND bm.role IN ('admin', 'dentist', 'staff', 'owner')
        )
    );

-- Dentists/Staff can delete imaging sets for their business
CREATE POLICY "imaging_sets_delete" ON imaging_sets
    FOR DELETE USING (
        business_id IN (
            SELECT bm.business_id FROM business_members bm
            JOIN profiles p ON p.id = bm.profile_id
            WHERE p.user_id = auth.uid()
            AND bm.role IN ('admin', 'dentist', 'owner')
        )
    );

-- Also fix imaging_files policies
DROP POLICY IF EXISTS "imaging_files_select" ON imaging_files;
DROP POLICY IF EXISTS "imaging_files_insert" ON imaging_files;
DROP POLICY IF EXISTS "imaging_files_delete" ON imaging_files;

-- Users can view files if they can view the parent set (relies on imaging_sets RLS)
CREATE POLICY "imaging_files_select" ON imaging_files
    FOR SELECT USING (
        imaging_set_id IN (
            SELECT id FROM imaging_sets -- This will apply imaging_sets RLS
        )
    );

-- Dentists/Staff can insert files for their business imaging sets
CREATE POLICY "imaging_files_insert" ON imaging_files
    FOR INSERT WITH CHECK (
        imaging_set_id IN (
            SELECT is2.id FROM imaging_sets is2
            WHERE is2.business_id IN (
                SELECT bm.business_id FROM business_members bm
                JOIN profiles p ON p.id = bm.profile_id
                WHERE p.user_id = auth.uid()
                AND bm.role IN ('admin', 'dentist', 'staff', 'owner')
            )
        )
    );

-- Dentists/Staff can delete files for their business
CREATE POLICY "imaging_files_delete" ON imaging_files
    FOR DELETE USING (
        imaging_set_id IN (
            SELECT is2.id FROM imaging_sets is2
            WHERE is2.business_id IN (
                SELECT bm.business_id FROM business_members bm
                JOIN profiles p ON p.id = bm.profile_id
                WHERE p.user_id = auth.uid()
                AND bm.role IN ('admin', 'dentist', 'owner')
            )
        )
    );
