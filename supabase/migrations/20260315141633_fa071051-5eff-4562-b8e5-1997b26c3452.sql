
-- Fix: restrict service role policies to service_role only
DROP POLICY "Service role full access whatsapp_messages" ON public.whatsapp_messages;
DROP POLICY "Service role full access whatsapp_sessions" ON public.whatsapp_sessions;

-- Recreate as service_role specific
CREATE POLICY "Service role whatsapp_messages"
  ON public.whatsapp_messages FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role whatsapp_sessions"
  ON public.whatsapp_sessions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Also allow service_role to upsert sessions
CREATE POLICY "Business members can insert whatsapp sessions"
  ON public.whatsapp_sessions FOR INSERT TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT bm.business_id FROM public.business_members bm
      WHERE bm.profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    )
  );
