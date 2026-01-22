-- Add RLS policies for system_errors_archive table
-- Only super admins and service role should access archived errors

-- Enable RLS on archive table
ALTER TABLE system_errors_archive ENABLE ROW LEVEL SECURITY;

-- Allow super admins to view archived errors
CREATE POLICY "Super admins can view archived errors" 
ON system_errors_archive FOR SELECT 
USING (public.is_super_admin());

-- Allow super admins to delete archived errors (for GDPR purge)
CREATE POLICY "Super admins can delete archived errors" 
ON system_errors_archive FOR DELETE 
USING (public.is_super_admin());