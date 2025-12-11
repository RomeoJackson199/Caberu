-- Create email_logs table to track all emails sent by each business
CREATE TABLE IF NOT EXISTS public.email_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    recipient_email text NOT NULL,
    recipient_name text,
    subject text,
    email_type text NOT NULL, -- e.g., 'appointment_reminder', 'confirmation', 'notification', etc.
    status text DEFAULT 'sent', -- 'sent', 'failed', 'bounced'
    sent_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

-- Add index for fast business lookup
CREATE INDEX IF NOT EXISTS idx_email_logs_business_id ON public.email_logs(business_id);

-- Add RLS policies
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Allow business owners/admins to view their email logs
CREATE POLICY "Business members can view email logs"
    ON public.email_logs
    FOR SELECT
    USING (
        business_id IN (
            SELECT bm.business_id 
            FROM business_members bm 
            JOIN profiles p ON p.id = bm.profile_id
            WHERE p.user_id = auth.uid()
        )
    );

-- Allow service role to insert email logs
CREATE POLICY "Service role can insert email logs"
    ON public.email_logs
    FOR INSERT
    WITH CHECK (true);

COMMENT ON TABLE public.email_logs IS 'Tracks all emails sent by each business for billing and analytics';
