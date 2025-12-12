-- Storage bucket configuration for clinic imaging
-- Run this after the main migration to set up storage

-- Create the clinic-imaging bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'clinic-imaging',
    'clinic-imaging',
    false,
    52428800, -- 50MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/dicom']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/dicom'];

-- Storage RLS policies for clinic-imaging bucket

-- Policy: Authenticated users can upload to their business folder
CREATE POLICY "clinic_imaging_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'clinic-imaging'
    AND (storage.foldername(name))[1] IN (
        SELECT bm.business_id::text FROM business_members bm
        WHERE bm.profile_id = auth.uid()
        AND bm.role IN ('admin', 'dentist', 'staff')
    )
);

-- Policy: Users can view files from their business or their own files (patients)
CREATE POLICY "clinic_imaging_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'clinic-imaging'
    AND (
        -- Business members can view all business files
        (storage.foldername(name))[1] IN (
            SELECT bm.business_id::text FROM business_members bm
            WHERE bm.profile_id = auth.uid()
        )
        -- OR patient can view files in their folder
        OR (storage.foldername(name))[2] = auth.uid()::text
    )
);

-- Policy: Dentists/Admins can delete files from their business
CREATE POLICY "clinic_imaging_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'clinic-imaging'
    AND (storage.foldername(name))[1] IN (
        SELECT bm.business_id::text FROM business_members bm
        WHERE bm.profile_id = auth.uid()
        AND bm.role IN ('admin', 'dentist')
    )
);
