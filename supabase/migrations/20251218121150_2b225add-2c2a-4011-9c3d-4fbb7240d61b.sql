-- Allow anyone to view vacation days for booking purposes (they need to know which dates are unavailable)
CREATE POLICY "Anyone can view vacation days for booking"
ON public.dentist_vacation_days
FOR SELECT
USING (is_approved = true);