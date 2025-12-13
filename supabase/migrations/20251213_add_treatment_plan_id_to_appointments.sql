-- Add treatment_plan_id column to appointments table to link appointments with treatment plans
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS treatment_plan_id UUID REFERENCES public.treatment_plans(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_appointments_treatment_plan_id ON public.appointments(treatment_plan_id);

-- Comment explaining the column
COMMENT ON COLUMN public.appointments.treatment_plan_id IS 'Optional link to a treatment plan this appointment is part of';
