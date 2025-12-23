-- Patient Tags System
CREATE TABLE public.patient_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id, name)
);

-- Patient Tag Assignments (many-to-many)
CREATE TABLE public.patient_tag_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.patient_tags(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(patient_id, tag_id)
);

-- Patient Allergies (for medical alerts)
CREATE TABLE public.patient_allergies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  allergy_name TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'moderate' CHECK (severity IN ('mild', 'moderate', 'severe', 'life-threatening')),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Patient Documents
CREATE TABLE public.patient_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Communication Logs
CREATE TABLE public.communication_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'phone', 'in-app')),
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  subject TEXT,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add patient status and last contact tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS patient_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_recall_date DATE,
ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false;

-- Enable RLS on all new tables
ALTER TABLE public.patient_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for patient_tags
CREATE POLICY "Business members can view tags" ON public.patient_tags
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM business_members WHERE business_members.business_id = patient_tags.business_id AND business_members.profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM businesses WHERE businesses.id = patient_tags.business_id AND businesses.owner_profile_id = auth.uid())
  );

CREATE POLICY "Business owners/dentists can manage tags" ON public.patient_tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM businesses WHERE businesses.id = patient_tags.business_id AND businesses.owner_profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM business_members WHERE business_members.business_id = patient_tags.business_id AND business_members.profile_id = auth.uid() AND business_members.role IN ('owner', 'dentist', 'admin'))
  );

-- RLS Policies for patient_tag_assignments
CREATE POLICY "Business members can view tag assignments" ON public.patient_tag_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patient_tags pt
      JOIN business_members bm ON bm.business_id = pt.business_id
      WHERE pt.id = patient_tag_assignments.tag_id AND bm.profile_id = auth.uid()
    )
  );

CREATE POLICY "Dentists can manage tag assignments" ON public.patient_tag_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM patient_tags pt
      JOIN business_members bm ON bm.business_id = pt.business_id
      WHERE pt.id = patient_tag_assignments.tag_id AND bm.profile_id = auth.uid() AND bm.role IN ('owner', 'dentist', 'admin')
    )
  );

-- RLS Policies for patient_allergies
CREATE POLICY "Business members can view allergies" ON public.patient_allergies
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM business_members WHERE business_members.business_id = patient_allergies.business_id AND business_members.profile_id = auth.uid())
  );

CREATE POLICY "Dentists can manage allergies" ON public.patient_allergies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM business_members WHERE business_members.business_id = patient_allergies.business_id AND business_members.profile_id = auth.uid() AND business_members.role IN ('owner', 'dentist', 'admin'))
  );

-- Patients can view their own allergies
CREATE POLICY "Patients can view own allergies" ON public.patient_allergies
  FOR SELECT USING (patient_id = auth.uid());

-- RLS Policies for patient_documents
CREATE POLICY "Business members can view documents" ON public.patient_documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM business_members WHERE business_members.business_id = patient_documents.business_id AND business_members.profile_id = auth.uid())
  );

CREATE POLICY "Dentists can manage documents" ON public.patient_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM business_members WHERE business_members.business_id = patient_documents.business_id AND business_members.profile_id = auth.uid() AND business_members.role IN ('owner', 'dentist', 'admin'))
  );

CREATE POLICY "Patients can view own documents" ON public.patient_documents
  FOR SELECT USING (patient_id = auth.uid());

-- RLS Policies for communication_logs
CREATE POLICY "Business members can view communication logs" ON public.communication_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM business_members WHERE business_members.business_id = communication_logs.business_id AND business_members.profile_id = auth.uid())
  );

CREATE POLICY "Dentists can create communication logs" ON public.communication_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM business_members WHERE business_members.business_id = communication_logs.business_id AND business_members.profile_id = auth.uid())
  );

-- Create indexes for performance
CREATE INDEX idx_patient_allergies_patient ON public.patient_allergies(patient_id);
CREATE INDEX idx_patient_allergies_business ON public.patient_allergies(business_id);
CREATE INDEX idx_patient_documents_patient ON public.patient_documents(patient_id);
CREATE INDEX idx_patient_tag_assignments_patient ON public.patient_tag_assignments(patient_id);
CREATE INDEX idx_communication_logs_patient ON public.communication_logs(patient_id);
CREATE INDEX idx_profiles_next_recall ON public.profiles(next_recall_date) WHERE next_recall_date IS NOT NULL;

-- Create storage bucket for patient documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('patient-documents', 'patient-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for patient documents
CREATE POLICY "Business members can view patient documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'patient-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Dentists can upload patient documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'patient-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Dentists can delete patient documents" ON storage.objects
  FOR DELETE USING (bucket_id = 'patient-documents' AND auth.role() = 'authenticated');