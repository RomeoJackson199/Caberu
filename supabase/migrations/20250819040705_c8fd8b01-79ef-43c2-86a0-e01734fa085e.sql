-- Create import_jobs table for tracking import sessions
CREATE TABLE public.import_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dentist_id UUID NOT NULL,
  filename TEXT NOT NULL,
  file_size BIGINT,
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  successful_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  import_type TEXT NOT NULL DEFAULT 'appointments' CHECK (import_type IN ('appointments', 'patients', 'treatments', 'financial')),
  timezone TEXT DEFAULT 'UTC',
  mapping_config JSONB DEFAULT '{}',
  error_details JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create import_job_items table for tracking individual import rows
CREATE TABLE public.import_job_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_data JSONB NOT NULL,
  processed_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'skipped')),
  error_message TEXT,
  created_record_id UUID,
  created_record_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create import_templates table for saving common import configurations
CREATE TABLE public.import_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dentist_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  import_type TEXT NOT NULL CHECK (import_type IN ('appointments', 'patients', 'treatments', 'financial')),
  mapping_config JSONB NOT NULL DEFAULT '{}',
  validation_rules JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_import_jobs_dentist_id ON public.import_jobs(dentist_id);
CREATE INDEX idx_import_jobs_status ON public.import_jobs(status);
CREATE INDEX idx_import_jobs_created_at ON public.import_jobs(created_at DESC);
CREATE INDEX idx_import_job_items_job_id ON public.import_job_items(job_id);
CREATE INDEX idx_import_job_items_status ON public.import_job_items(status);
CREATE INDEX idx_import_templates_dentist_id ON public.import_templates(dentist_id);

-- Enable RLS
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_job_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for import_jobs
CREATE POLICY "Dentists can manage their own import jobs"
ON public.import_jobs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM dentists d
    JOIN profiles p ON p.id = d.profile_id
    WHERE d.id = import_jobs.dentist_id 
    AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM dentists d
    JOIN profiles p ON p.id = d.profile_id
    WHERE d.id = import_jobs.dentist_id 
    AND p.user_id = auth.uid()
  )
);

-- Create RLS policies for import_job_items
CREATE POLICY "Dentists can manage their own import job items"
ON public.import_job_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM import_jobs ij
    JOIN dentists d ON d.id = ij.dentist_id
    JOIN profiles p ON p.id = d.profile_id
    WHERE ij.id = import_job_items.job_id 
    AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM import_jobs ij
    JOIN dentists d ON d.id = ij.dentist_id
    JOIN profiles p ON p.id = d.profile_id
    WHERE ij.id = import_job_items.job_id 
    AND p.user_id = auth.uid()
  )
);

-- Create RLS policies for import_templates
CREATE POLICY "Dentists can manage their own import templates"
ON public.import_templates
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM dentists d
    JOIN profiles p ON p.id = d.profile_id
    WHERE d.id = import_templates.dentist_id 
    AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM dentists d
    JOIN profiles p ON p.id = d.profile_id
    WHERE d.id = import_templates.dentist_id 
    AND p.user_id = auth.uid()
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_import_jobs_updated_at
  BEFORE UPDATE ON public.import_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_import_templates_updated_at
  BEFORE UPDATE ON public.import_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update import job progress
CREATE OR REPLACE FUNCTION public.update_import_job_progress(p_job_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.import_jobs 
  SET 
    processed_rows = (
      SELECT COUNT(*) FROM import_job_items 
      WHERE job_id = p_job_id AND status != 'pending'
    ),
    successful_rows = (
      SELECT COUNT(*) FROM import_job_items 
      WHERE job_id = p_job_id AND status = 'success'
    ),
    failed_rows = (
      SELECT COUNT(*) FROM import_job_items 
      WHERE job_id = p_job_id AND status = 'failed'
    ),
    updated_at = now()
  WHERE id = p_job_id;
END;
$$;