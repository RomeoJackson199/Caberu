-- Create table for tracking tour completion status
CREATE TABLE public.tour_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_type TEXT NOT NULL, -- 'patient' or 'dentist'
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tour_type)
);

-- Enable RLS
ALTER TABLE public.tour_completions ENABLE ROW LEVEL SECURITY;

-- Users can view their own tour completions
CREATE POLICY "Users can view own tour completions"
ON public.tour_completions
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own tour completions
CREATE POLICY "Users can insert own tour completions"
ON public.tour_completions
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can delete their own tour completions (for reset)
CREATE POLICY "Users can delete own tour completions"
ON public.tour_completions
FOR DELETE
USING (user_id = auth.uid());