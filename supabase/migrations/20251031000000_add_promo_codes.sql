-- Create promo_codes table
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('free', 'percentage', 'fixed_amount')),
  discount_value INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read active promo codes (for validation)
CREATE POLICY "Users can read active promo codes" ON public.promo_codes
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = TRUE);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_promo_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER promo_codes_updated_at
BEFORE UPDATE ON public.promo_codes
FOR EACH ROW
EXECUTE FUNCTION update_promo_codes_updated_at();

-- Insert ILOVECABERU promo code (completely free)
INSERT INTO public.promo_codes (code, discount_type, discount_value, is_active, max_uses, expires_at)
VALUES ('ILOVECABERU', 'free', 100, TRUE, NULL, NULL);

-- Create function to increment promo code usage
CREATE OR REPLACE FUNCTION increment_promo_usage(promo_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.promo_codes
  SET uses_count = uses_count + 1
  WHERE id = promo_id;
END;
$$;
