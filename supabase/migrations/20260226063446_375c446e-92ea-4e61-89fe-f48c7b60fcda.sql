
-- Drop the increment_promo_usage function
DROP FUNCTION IF EXISTS public.increment_promo_usage(uuid);

-- Drop the update_promo_codes_updated_at trigger function
DROP FUNCTION IF EXISTS public.update_promo_codes_updated_at() CASCADE;

-- Drop the promo_codes table (Stripe is now the single source of truth for promo codes)
DROP TABLE IF EXISTS public.promo_codes CASCADE;
