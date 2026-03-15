
-- WhatsApp messages table
CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  phone text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body text,
  template_sid text,
  template_name text,
  twilio_sid text,
  status text DEFAULT 'sent',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_wa_messages_business ON public.whatsapp_messages(business_id);
CREATE INDEX idx_wa_messages_patient ON public.whatsapp_messages(patient_id);
CREATE INDEX idx_wa_messages_phone ON public.whatsapp_messages(phone);
CREATE INDEX idx_wa_messages_created ON public.whatsapp_messages(created_at DESC);

-- WhatsApp sessions table (24h window tracking)
CREATE TABLE public.whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  phone text NOT NULL,
  last_inbound_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(business_id, phone)
);

ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for whatsapp_messages
CREATE POLICY "Business members can read whatsapp messages"
  ON public.whatsapp_messages FOR SELECT TO authenticated
  USING (
    business_id IN (
      SELECT bm.business_id FROM public.business_members bm
      WHERE bm.profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "Business members can insert whatsapp messages"
  ON public.whatsapp_messages FOR INSERT TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT bm.business_id FROM public.business_members bm
      WHERE bm.profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "Business members can update whatsapp messages"
  ON public.whatsapp_messages FOR UPDATE TO authenticated
  USING (
    business_id IN (
      SELECT bm.business_id FROM public.business_members bm
      WHERE bm.profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    )
  );

-- RLS policies for whatsapp_sessions
CREATE POLICY "Business members can read whatsapp sessions"
  ON public.whatsapp_sessions FOR SELECT TO authenticated
  USING (
    business_id IN (
      SELECT bm.business_id FROM public.business_members bm
      WHERE bm.profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    )
  );

-- Service role bypass for edge functions inserting messages
CREATE POLICY "Service role full access whatsapp_messages"
  ON public.whatsapp_messages FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access whatsapp_sessions"
  ON public.whatsapp_sessions FOR ALL
  USING (true) WITH CHECK (true);

-- Enable realtime for whatsapp_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
