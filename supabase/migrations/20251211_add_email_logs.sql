-- Add email count and customer count columns directly to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS emails_sent_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS customer_count integer DEFAULT 0;

-- Create function to increment email count
CREATE OR REPLACE FUNCTION increment_email_count(business_uuid uuid)
RETURNS void AS $$
BEGIN
    UPDATE public.businesses 
    SET emails_sent_count = COALESCE(emails_sent_count, 0) + 1
    WHERE id = business_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment customer count
CREATE OR REPLACE FUNCTION increment_customer_count(business_uuid uuid)
RETURNS void AS $$
BEGIN
    UPDATE public.businesses 
    SET customer_count = COALESCE(customer_count, 0) + 1
    WHERE id = business_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN public.businesses.emails_sent_count IS 'Total count of emails sent by this business';
COMMENT ON COLUMN public.businesses.customer_count IS 'Total count of customers for this business';
