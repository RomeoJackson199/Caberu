-- Table to store Twilio phone numbers linked to businesses
CREATE TABLE public.business_phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  label text DEFAULT 'Main Line',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(phone_number)
);

ALTER TABLE public.business_phone_numbers ENABLE ROW LEVEL SECURITY;

-- Business staff can view their phone numbers
CREATE POLICY "Business staff can view phone numbers"
  ON public.business_phone_numbers
  FOR SELECT
  TO authenticated
  USING (public.is_business_staff(auth.uid(), business_id));

-- Business owners can manage phone numbers
CREATE POLICY "Business owners can manage phone numbers"
  ON public.business_phone_numbers
  FOR ALL
  TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id))
  WITH CHECK (public.is_business_owner(auth.uid(), business_id));

-- Service role (edge functions) can query by phone number
CREATE POLICY "Service role full access"
  ON public.business_phone_numbers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);