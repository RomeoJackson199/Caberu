-- Add treatment_plan_id to imaging_sets to link images to treatment plans
ALTER TABLE imaging_sets ADD COLUMN IF NOT EXISTS treatment_plan_id UUID REFERENCES treatment_plans(id) ON DELETE SET NULL;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_imaging_sets_treatment_plan_id ON imaging_sets(treatment_plan_id);

-- Function to get treatment plan with linked images and appointments
CREATE OR REPLACE FUNCTION get_treatment_plan_details(p_treatment_plan_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'treatment_plan', (
            SELECT row_to_json(tp.*) 
            FROM treatment_plans tp 
            WHERE tp.id = p_treatment_plan_id
        ),
        'appointments', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', a.id,
                    'appointment_date', a.appointment_date,
                    'status', a.status,
                    'reason', a.reason,
                    'notes', a.notes
                ) ORDER BY a.appointment_date DESC
            ), '[]'::jsonb)
            FROM appointments a
            WHERE a.treatment_plan_id = p_treatment_plan_id
        ),
        'imaging_sets', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', is2.id,
                    'imaging_type', is2.imaging_type,
                    'notes', is2.notes,
                    'created_at', is2.created_at,
                    'appointment_id', is2.appointment_id,
                    'files', (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'id', f.id,
                                'filename', f.filename,
                                'mime_type', f.mime_type,
                                'storage_path', f.storage_path,
                                'created_at', f.created_at
                            )
                        ), '[]'::jsonb)
                        FROM imaging_files f
                        WHERE f.imaging_set_id = is2.id
                    )
                ) ORDER BY is2.created_at DESC
            ), '[]'::jsonb)
            FROM imaging_sets is2
            WHERE is2.treatment_plan_id = p_treatment_plan_id
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_treatment_plan_details(UUID) TO authenticated;
