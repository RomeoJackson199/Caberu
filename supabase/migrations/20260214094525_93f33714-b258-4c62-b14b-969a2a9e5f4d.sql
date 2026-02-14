
-- Replace overly permissive policies with role-based ones
DROP POLICY "Service role full access on sms_logs" ON public.sms_logs;
DROP POLICY "Service role full access on sms_templates" ON public.sms_templates;

-- sms_logs: super admins can read, service role handles inserts via edge functions
CREATE POLICY "Super admins can read sms_logs"
  ON public.sms_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- sms_templates: super admins can manage templates
CREATE POLICY "Super admins can manage sms_templates"
  ON public.sms_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );
