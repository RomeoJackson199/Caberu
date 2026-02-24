-- Super admin can view all appointment reminders
CREATE POLICY "Super admins can view all reminders"
ON public.appointment_reminders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'::public.app_role
  )
);