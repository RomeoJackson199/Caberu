-- Level-1 Imaging Integration
-- Tables for storing imaging sets and files linked to appointments

-- Create imaging type enum
DO $$ BEGIN
    CREATE TYPE imaging_type AS ENUM ('xray', 'photo', 'scan', 'unknown');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Imaging Sets - Groups of images per appointment
CREATE TABLE IF NOT EXISTS imaging_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    uploaded_by UUID NOT NULL REFERENCES profiles(id),
    imaging_type imaging_type DEFAULT 'unknown',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Imaging Files - Individual files within a set
CREATE TABLE IF NOT EXISTS imaging_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imaging_set_id UUID NOT NULL REFERENCES imaging_sets(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_filename TEXT,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    width INTEGER,
    height INTEGER,
    metadata JSONB DEFAULT '{}',
    thumbnail_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_imaging_sets_business_id ON imaging_sets(business_id);
CREATE INDEX IF NOT EXISTS idx_imaging_sets_patient_id ON imaging_sets(patient_id);
CREATE INDEX IF NOT EXISTS idx_imaging_sets_appointment_id ON imaging_sets(appointment_id);
CREATE INDEX IF NOT EXISTS idx_imaging_sets_created_at ON imaging_sets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_imaging_files_set_id ON imaging_files(imaging_set_id);

-- Enable RLS
ALTER TABLE imaging_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE imaging_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for imaging_sets

-- Dentists/Staff can view imaging sets for their business
CREATE POLICY "imaging_sets_select_business" ON imaging_sets
    FOR SELECT USING (
        business_id IN (
            SELECT bm.business_id FROM business_members bm
            WHERE bm.profile_id = auth.uid()
        )
    );

-- Patients can view their own imaging sets
CREATE POLICY "imaging_sets_select_patient" ON imaging_sets
    FOR SELECT USING (patient_id = auth.uid());

-- Dentists/Staff can insert imaging sets for their business
CREATE POLICY "imaging_sets_insert" ON imaging_sets
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT bm.business_id FROM business_members bm
            WHERE bm.profile_id = auth.uid()
            AND bm.role IN ('admin', 'dentist', 'staff')
        )
    );

-- Dentists/Staff can update imaging sets for their business
CREATE POLICY "imaging_sets_update" ON imaging_sets
    FOR UPDATE USING (
        business_id IN (
            SELECT bm.business_id FROM business_members bm
            WHERE bm.profile_id = auth.uid()
            AND bm.role IN ('admin', 'dentist', 'staff')
        )
    );

-- Dentists/Staff can delete imaging sets for their business
CREATE POLICY "imaging_sets_delete" ON imaging_sets
    FOR DELETE USING (
        business_id IN (
            SELECT bm.business_id FROM business_members bm
            WHERE bm.profile_id = auth.uid()
            AND bm.role IN ('admin', 'dentist')
        )
    );

-- RLS Policies for imaging_files

-- Users can view files if they can view the parent set
CREATE POLICY "imaging_files_select" ON imaging_files
    FOR SELECT USING (
        imaging_set_id IN (
            SELECT id FROM imaging_sets
        )
    );

-- Dentists/Staff can insert files for their business imaging sets
CREATE POLICY "imaging_files_insert" ON imaging_files
    FOR INSERT WITH CHECK (
        imaging_set_id IN (
            SELECT is2.id FROM imaging_sets is2
            WHERE is2.business_id IN (
                SELECT bm.business_id FROM business_members bm
                WHERE bm.profile_id = auth.uid()
                AND bm.role IN ('admin', 'dentist', 'staff')
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
                WHERE bm.profile_id = auth.uid()
                AND bm.role IN ('admin', 'dentist')
            )
        )
    );

-- Updated_at trigger for imaging_sets
CREATE OR REPLACE FUNCTION update_imaging_sets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS imaging_sets_updated_at ON imaging_sets;
CREATE TRIGGER imaging_sets_updated_at
    BEFORE UPDATE ON imaging_sets
    FOR EACH ROW
    EXECUTE FUNCTION update_imaging_sets_updated_at();

-- Function to get appointment imaging status
CREATE OR REPLACE FUNCTION get_appointment_imaging_status(p_appointment_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'has_imaging', COUNT(is2.id) > 0,
        'imaging_count', COUNT(is2.id),
        'file_count', COALESCE(SUM((SELECT COUNT(*) FROM imaging_files WHERE imaging_set_id = is2.id)), 0),
        'imaging_types', COALESCE(array_agg(DISTINCT is2.imaging_type) FILTER (WHERE is2.imaging_type IS NOT NULL), ARRAY[]::imaging_type[]),
        'has_notes', EXISTS (SELECT 1 FROM imaging_sets WHERE appointment_id = p_appointment_id AND notes IS NOT NULL AND notes != '')
    ) INTO result
    FROM imaging_sets is2
    WHERE is2.appointment_id = p_appointment_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check workflow flags
CREATE OR REPLACE FUNCTION check_imaging_workflow_flags(p_appointment_id UUID)
RETURNS JSONB AS $$
DECLARE
    has_imaging BOOLEAN;
    has_notes BOOLEAN;
    has_treatment BOOLEAN;
    result JSONB;
BEGIN
    -- Check if appointment has imaging
    SELECT COUNT(*) > 0 INTO has_imaging
    FROM imaging_sets WHERE appointment_id = p_appointment_id;
    
    -- Check if imaging has notes
    SELECT EXISTS (
        SELECT 1 FROM imaging_sets 
        WHERE appointment_id = p_appointment_id 
        AND notes IS NOT NULL AND notes != ''
    ) INTO has_notes;
    
    -- Check if appointment has treatment notes
    SELECT EXISTS (
        SELECT 1 FROM appointments 
        WHERE id = p_appointment_id 
        AND (notes IS NOT NULL AND notes != '')
    ) INTO has_treatment;
    
    result := jsonb_build_object(
        'has_imaging', has_imaging,
        'has_imaging_notes', has_notes,
        'has_treatment', has_treatment,
        'warning_imaging_without_notes', has_imaging AND NOT has_notes,
        'warning_treatment_without_imaging', has_treatment AND NOT has_imaging
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_appointment_imaging_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_imaging_workflow_flags(UUID) TO authenticated;
