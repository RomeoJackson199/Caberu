
CREATE TABLE public.pipeline_prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  rating NUMERIC(2,1),
  review_count INTEGER,
  dentist_count INTEGER,
  languages TEXT[] NOT NULL DEFAULT '{}',
  online_booking TEXT NOT NULL DEFAULT 'false',
  priority TEXT NOT NULL DEFAULT 'Warm' CHECK (priority IN ('Hot', 'Warm', 'Cold')),
  reception_signal TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  -- New fields
  contact_name TEXT NOT NULL DEFAULT '',
  contact_role TEXT NOT NULL DEFAULT '',
  contact_personality TEXT NOT NULL DEFAULT '',
  pain_points TEXT[] NOT NULL DEFAULT '{}',
  visit_date DATE,
  visit_notes TEXT NOT NULL DEFAULT '',
  personal_notes TEXT NOT NULL DEFAULT '',
  talk_track TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'meeting_scheduled', 'visited', 'proposal_sent', 'won', 'lost')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.pipeline_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage prospects"
  ON public.pipeline_prospects
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
