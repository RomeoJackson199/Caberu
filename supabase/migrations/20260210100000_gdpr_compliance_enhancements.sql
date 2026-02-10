-- GDPR Compliance Enhancements Migration
-- Adds RLS policies to GDPR tables and creates helper functions

-- ============================================================================
-- RLS Policies for consent_records
-- ============================================================================

-- Patients can view their own consent records
CREATE POLICY "patients_view_own_consents"
  ON public.consent_records FOR SELECT
  USING (patient_id = auth.uid());

-- Patients can insert their own consent records
CREATE POLICY "patients_insert_own_consents"
  ON public.consent_records FOR INSERT
  WITH CHECK (patient_id = auth.uid());

-- Patients can update their own consent records (to withdraw)
CREATE POLICY "patients_update_own_consents"
  ON public.consent_records FOR UPDATE
  USING (patient_id = auth.uid());

-- Authenticated users can manage consents (for staff acting on behalf)
CREATE POLICY "staff_manage_consents"
  ON public.consent_records FOR ALL
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- RLS Policies for gdpr_requests
-- ============================================================================

-- Patients can view their own requests
CREATE POLICY "patients_view_own_requests"
  ON public.gdpr_requests FOR SELECT
  USING (patient_id = auth.uid());

-- Patients can submit requests
CREATE POLICY "patients_submit_requests"
  ON public.gdpr_requests FOR INSERT
  WITH CHECK (patient_id = auth.uid());

-- Staff can view and manage all requests
CREATE POLICY "staff_manage_requests"
  ON public.gdpr_requests FOR ALL
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- RLS Policies for gdpr_audit_log
-- ============================================================================

-- Patients can view their own audit logs
CREATE POLICY "patients_view_own_audit_logs"
  ON public.gdpr_audit_log FOR SELECT
  USING (patient_id = auth.uid());

-- Authenticated users can insert audit logs
CREATE POLICY "authenticated_insert_audit_logs"
  ON public.gdpr_audit_log FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Staff can view all audit logs
CREATE POLICY "staff_view_audit_logs"
  ON public.gdpr_audit_log FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- RLS Policies for gdpr_export_bundles
-- ============================================================================

CREATE POLICY "patients_view_own_exports"
  ON public.gdpr_export_bundles FOR SELECT
  USING (patient_id = auth.uid());

CREATE POLICY "staff_manage_exports"
  ON public.gdpr_export_bundles FOR ALL
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- RLS Policies for breach_incidents
-- ============================================================================

-- Only authenticated staff can manage breach incidents
CREATE POLICY "staff_manage_breaches"
  ON public.breach_incidents FOR ALL
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- RLS Policies for vendor_registry
-- ============================================================================

CREATE POLICY "staff_view_vendors"
  ON public.vendor_registry FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- RLS Policies for retention_policies
-- ============================================================================

CREATE POLICY "staff_view_retention_policies"
  ON public.retention_policies FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- RLS Policies for data_minimization_settings
-- ============================================================================

CREATE POLICY "patients_manage_own_minimization"
  ON public.data_minimization_settings FOR ALL
  USING (patient_id = auth.uid());

CREATE POLICY "staff_manage_minimization"
  ON public.data_minimization_settings FOR ALL
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- Seed default retention policies
-- ============================================================================

INSERT INTO public.retention_policies (entity_type, retention_period_months, legal_basis, is_locked) VALUES
  ('call_recordings', 1, 'Consent - auto-expire', false),
  ('voice_messages', 1, 'Consent - temporary storage', false),
  ('ai_transcripts', 3, 'Consent - AI processing', false),
  ('chat_messages', 3, 'Contract performance', false),
  ('sms_notifications', 3, 'Contract performance', false),
  ('email_logs', 3, 'Contract performance', false),
  ('appointment_history', 84, 'Belgian healthcare law', true),
  ('patient_data', 24, '2 years after last interaction', false),
  ('billing_records', 84, 'Belgian tax law', true),
  ('audit_logs', 84, 'Compliance requirement', true),
  ('prescriptions', 84, 'Belgian medical records law', true),
  ('treatment_plans', 84, 'Belgian medical records law', true)
ON CONFLICT (entity_type) DO NOTHING;

-- ============================================================================
-- Seed default vendor registry
-- ============================================================================

INSERT INTO public.vendor_registry (name, purpose, data_categories, region, has_dpa, contact_email) VALUES
  ('Supabase', 'Database, authentication, storage, and edge functions', ARRAY['patient_data', 'health_data', 'auth_data', 'business_data'], 'EU', true, 'privacy@supabase.io'),
  ('ElevenLabs', 'AI voice synthesis for phone intake', ARRAY['voice_data', 'conversation_data'], 'EU/US', false, 'privacy@elevenlabs.io'),
  ('Twilio', 'SMS notifications and telephony', ARRAY['phone_numbers', 'sms_content'], 'US (EU processing)', true, 'privacy@twilio.com'),
  ('Stripe', 'Payment processing', ARRAY['billing_data', 'payment_data'], 'EU', true, 'privacy@stripe.com')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Add business_id to GDPR tables for multi-tenant support
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consent_records' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.consent_records ADD COLUMN business_id UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gdpr_requests' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.gdpr_requests ADD COLUMN business_id UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gdpr_audit_log' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.gdpr_audit_log ADD COLUMN business_id UUID;
  END IF;
END $$;

-- Add indexes for business_id on GDPR tables
CREATE INDEX IF NOT EXISTS idx_consent_records_business_id ON public.consent_records(business_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_business_id ON public.gdpr_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_log_business_id ON public.gdpr_audit_log(business_id);
