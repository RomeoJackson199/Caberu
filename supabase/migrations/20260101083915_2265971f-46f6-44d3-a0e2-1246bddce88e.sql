-- Add new columns to treatment_plans for MVP requirements
ALTER TABLE public.treatment_plans 
ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS total_estimated_cents integer,
ADD COLUMN IF NOT EXISTS created_from_appointment_id uuid REFERENCES public.appointments(id),
ADD COLUMN IF NOT EXISTS created_by_dentist_id uuid REFERENCES public.dentists(id);

-- Update status column to use new values (migrate existing data)
-- First allow new values
ALTER TABLE public.treatment_plans 
DROP CONSTRAINT IF EXISTS treatment_plans_status_check;

-- Update existing statuses to new values
UPDATE public.treatment_plans 
SET status = CASE 
  WHEN status = 'active' THEN 'proposed'
  WHEN status = 'completed' THEN 'completed'
  ELSE 'draft'
END;

-- Add constraint for new status values
ALTER TABLE public.treatment_plans 
ADD CONSTRAINT treatment_plans_status_check 
CHECK (status IN ('draft', 'proposed', 'superseded', 'completed'));

-- Create treatment_plan_items table
CREATE TABLE IF NOT EXISTS public.treatment_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_plan_id uuid NOT NULL REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  procedure_code text,
  tooth text,
  qty integer NOT NULL DEFAULT 1,
  unit_price_cents integer NOT NULL DEFAULT 0,
  line_total_cents integer GENERATED ALWAYS AS (qty * unit_price_cents) STORED,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on treatment_plan_items
ALTER TABLE public.treatment_plan_items ENABLE ROW LEVEL SECURITY;

-- Create treatment_templates table for clinic-scoped templates
CREATE TABLE IF NOT EXISTS public.treatment_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  default_items jsonb NOT NULL DEFAULT '[]',
  created_by_dentist_id uuid REFERENCES public.dentists(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on treatment_templates
ALTER TABLE public.treatment_templates ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient_id ON public.treatment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_business_id ON public.treatment_plans(business_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_status ON public.treatment_plans(status);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_created_from_appointment ON public.treatment_plans(created_from_appointment_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plan_items_plan_id ON public.treatment_plan_items(treatment_plan_id);
CREATE INDEX IF NOT EXISTS idx_treatment_templates_business_id ON public.treatment_templates(business_id);

-- RLS Policies for treatment_plan_items

-- Business members can manage items for their clinic's plans
CREATE POLICY "Business members can manage treatment plan items"
ON public.treatment_plan_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.treatment_plans tp
    JOIN public.business_members bm ON bm.business_id = tp.business_id
    JOIN public.profiles p ON p.id = bm.profile_id
    WHERE tp.id = treatment_plan_items.treatment_plan_id
    AND p.user_id = auth.uid()
  )
);

-- Patients can view items for non-draft plans
CREATE POLICY "Patients can view their treatment plan items"
ON public.treatment_plan_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.treatment_plans tp
    JOIN public.profiles p ON p.id = tp.patient_id
    WHERE tp.id = treatment_plan_items.treatment_plan_id
    AND p.user_id = auth.uid()
    AND tp.status != 'draft'
  )
);

-- RLS Policies for treatment_templates

-- Business members can manage their clinic's templates
CREATE POLICY "Business members can manage treatment templates"
ON public.treatment_templates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.business_members bm
    JOIN public.profiles p ON p.id = bm.profile_id
    WHERE bm.business_id = treatment_templates.business_id
    AND p.user_id = auth.uid()
  )
);

-- Update RLS on treatment_plans for patient visibility (non-draft only)
DROP POLICY IF EXISTS "Patients can view own treatment plans" ON public.treatment_plans;

CREATE POLICY "Patients can view own non-draft treatment plans"
ON public.treatment_plans
FOR SELECT
USING (
  patient_id IN (
    SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid()
  )
  AND status != 'draft'
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_treatment_plan_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER treatment_plan_items_updated_at
BEFORE UPDATE ON public.treatment_plan_items
FOR EACH ROW
EXECUTE FUNCTION public.update_treatment_plan_items_updated_at();

CREATE TRIGGER treatment_templates_updated_at
BEFORE UPDATE ON public.treatment_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_treatment_plan_items_updated_at();