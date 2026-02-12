
-- =============================================
-- SUPER ADMIN DASHBOARD: ALL NEW TABLES UPFRONT
-- =============================================

-- 1. Feature Flags
CREATE TABLE public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_percentage INTEGER DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  category TEXT DEFAULT 'general',
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage feature flags"
  ON public.feature_flags FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Feature Flag Overrides (per-practice)
CREATE TABLE public.feature_flag_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(flag_id, business_id)
);

ALTER TABLE public.feature_flag_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage flag overrides"
  ON public.feature_flag_overrides FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE TRIGGER update_feature_flag_overrides_updated_at
  BEFORE UPDATE ON public.feature_flag_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Feature Flag Change Log
CREATE TABLE public.feature_flag_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'created', 'enabled', 'disabled', 'rollout_changed', 'override_added', 'override_removed'
  old_value JSONB,
  new_value JSONB,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flag_changelog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view flag changelog"
  ON public.feature_flag_changelog FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Super admins can insert flag changelog"
  ON public.feature_flag_changelog FOR INSERT
  WITH CHECK (public.is_super_admin());

-- 4. Usage Metrics (granular per-practice tracking)
CREATE TABLE public.usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL, -- 'voice_minutes', 'whatsapp_messages', 'sms_sent', 'appointments_booked', 'ai_text_messages'
  metric_value NUMERIC NOT NULL DEFAULT 0,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage usage metrics"
  ON public.usage_metrics FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Also allow business staff to read their own metrics
CREATE POLICY "Business staff can view own usage metrics"
  ON public.usage_metrics FOR SELECT
  USING (business_id IN (SELECT public.get_user_business_ids()));

CREATE INDEX idx_usage_metrics_business_date ON public.usage_metrics(business_id, metric_date);
CREATE INDEX idx_usage_metrics_type_date ON public.usage_metrics(metric_type, metric_date);
CREATE UNIQUE INDEX idx_usage_metrics_unique ON public.usage_metrics(business_id, metric_type, metric_date);

-- 5. System Health Checks
CREATE TABLE public.system_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL, -- 'database', 'edge_functions', 'auth', 'storage', 'realtime', 'elevenlabs', 'twilio', 'whatsapp'
  status TEXT NOT NULL DEFAULT 'healthy', -- 'healthy', 'degraded', 'down'
  response_time_ms INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage health checks"
  ON public.system_health_checks FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE INDEX idx_health_checks_service_time ON public.system_health_checks(service_name, checked_at DESC);

-- 6. Communication Metrics (aggregated call/message analytics)
CREATE TABLE public.communication_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_calls INTEGER DEFAULT 0,
  total_call_duration_seconds INTEGER DEFAULT 0,
  completed_calls INTEGER DEFAULT 0,
  failed_calls INTEGER DEFAULT 0,
  ai_intake_completed INTEGER DEFAULT 0,
  whatsapp_sent INTEGER DEFAULT 0,
  whatsapp_delivered INTEGER DEFAULT 0,
  whatsapp_read INTEGER DEFAULT 0,
  whatsapp_failed INTEGER DEFAULT 0,
  sms_sent INTEGER DEFAULT 0,
  sms_delivered INTEGER DEFAULT 0,
  avg_call_quality_score NUMERIC(3,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.communication_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage communication metrics"
  ON public.communication_metrics FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Business staff can view own communication metrics"
  ON public.communication_metrics FOR SELECT
  USING (business_id IN (SELECT public.get_user_business_ids()));

CREATE UNIQUE INDEX idx_comm_metrics_unique ON public.communication_metrics(business_id, metric_date);
CREATE INDEX idx_comm_metrics_date ON public.communication_metrics(metric_date DESC);

CREATE TRIGGER update_communication_metrics_updated_at
  BEFORE UPDATE ON public.communication_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Platform Revenue Tracking (aggregated)
CREATE TABLE public.platform_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  revenue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subscription_revenue_cents INTEGER DEFAULT 0,
  overage_revenue_cents INTEGER DEFAULT 0,
  total_revenue_cents INTEGER GENERATED ALWAYS AS (subscription_revenue_cents + overage_revenue_cents) STORED,
  voice_cost_cents INTEGER DEFAULT 0,
  twilio_cost_cents INTEGER DEFAULT 0,
  whatsapp_cost_cents INTEGER DEFAULT 0,
  total_cost_cents INTEGER GENERATED ALWAYS AS (voice_cost_cents + twilio_cost_cents + whatsapp_cost_cents) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage revenue data"
  ON public.platform_revenue FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE UNIQUE INDEX idx_platform_revenue_unique ON public.platform_revenue(business_id, revenue_date);
CREATE INDEX idx_platform_revenue_date ON public.platform_revenue(revenue_date DESC);

CREATE TRIGGER update_platform_revenue_updated_at
  BEFORE UPDATE ON public.platform_revenue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Admin-facing aggregation function: get_admin_dashboard_stats
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS TABLE(
  total_practices bigint,
  active_practices bigint,
  trial_practices bigint,
  suspended_practices bigint,
  total_patients bigint,
  mrr_cents bigint,
  active_calls_today bigint,
  voice_minutes_today numeric,
  whatsapp_messages_today bigint,
  unresolved_errors bigint,
  new_signups_this_week bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM businesses)::bigint AS total_practices,
    (SELECT COUNT(*) FROM businesses WHERE subscription_status = 'active' OR subscription_status IS NULL)::bigint AS active_practices,
    (SELECT COUNT(*) FROM businesses WHERE subscription_status = 'trialing')::bigint AS trial_practices,
    (SELECT COUNT(*) FROM businesses WHERE subscription_status = 'suspended')::bigint AS suspended_practices,
    (SELECT COUNT(DISTINCT patient_id) FROM appointments)::bigint AS total_patients,
    (SELECT COALESCE(SUM(
      CASE 
        WHEN subscription_plan ILIKE '%enterprise%' THEN 99900
        WHEN subscription_plan ILIKE '%professional%' THEN 49900
        ELSE 24900
      END
    ), 0) FROM businesses WHERE subscription_status IN ('active', 'trialing') OR subscription_status IS NULL)::bigint AS mrr_cents,
    (SELECT COUNT(*) FROM phone_usage WHERE created_at::date = CURRENT_DATE)::bigint AS active_calls_today,
    (SELECT COALESCE(SUM(duration_seconds), 0) / 60.0 FROM phone_usage WHERE created_at::date = CURRENT_DATE)::numeric AS voice_minutes_today,
    (SELECT COUNT(*) FROM communication_logs WHERE channel = 'whatsapp' AND created_at::date = CURRENT_DATE)::bigint AS whatsapp_messages_today,
    (SELECT COUNT(*) FROM system_errors WHERE resolved = false)::bigint AS unresolved_errors,
    (SELECT COUNT(*) FROM businesses WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::bigint AS new_signups_this_week;
END;
$$;

-- 9. Get practice detail stats
CREATE OR REPLACE FUNCTION public.get_practice_detail(p_business_id uuid)
RETURNS TABLE(
  business_name text,
  slug text,
  subscription_plan text,
  subscription_status text,
  created_at timestamptz,
  owner_email text,
  owner_name text,
  staff_count bigint,
  patient_count bigint,
  total_appointments bigint,
  appointments_this_month bigint,
  voice_minutes_this_month numeric,
  whatsapp_this_month bigint,
  encryption_key_active boolean,
  last_activity timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT
    b.name AS business_name,
    b.slug,
    b.subscription_plan,
    b.subscription_status,
    b.created_at,
    p.email AS owner_email,
    COALESCE(p.first_name || ' ' || p.last_name, p.email) AS owner_name,
    (SELECT COUNT(*) FROM business_members bm WHERE bm.business_id = b.id)::bigint AS staff_count,
    (SELECT COUNT(DISTINCT a.patient_id) FROM appointments a WHERE a.business_id = b.id)::bigint AS patient_count,
    (SELECT COUNT(*) FROM appointments a WHERE a.business_id = b.id)::bigint AS total_appointments,
    (SELECT COUNT(*) FROM appointments a WHERE a.business_id = b.id AND a.created_at >= date_trunc('month', CURRENT_DATE))::bigint AS appointments_this_month,
    (SELECT COALESCE(SUM(pu.duration_seconds), 0) / 60.0 FROM phone_usage pu WHERE pu.business_id = b.id AND pu.created_at >= date_trunc('month', CURRENT_DATE))::numeric AS voice_minutes_this_month,
    (SELECT COUNT(*) FROM communication_logs cl WHERE cl.business_id = b.id AND cl.channel = 'whatsapp' AND cl.created_at >= date_trunc('month', CURRENT_DATE))::bigint AS whatsapp_this_month,
    (SELECT EXISTS(SELECT 1 FROM business_encryption_keys bek WHERE bek.business_id = b.id AND bek.is_active = true)) AS encryption_key_active,
    (SELECT MAX(a2.updated_at) FROM appointments a2 WHERE a2.business_id = b.id) AS last_activity
  FROM businesses b
  LEFT JOIN profiles p ON p.id = b.owner_profile_id
  WHERE b.id = p_business_id;
END;
$$;

-- 10. Check if a feature flag is enabled for a business
CREATE OR REPLACE FUNCTION public.is_feature_enabled(p_flag_key text, p_business_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_flag RECORD;
  v_override RECORD;
BEGIN
  SELECT * INTO v_flag FROM feature_flags WHERE flag_key = p_flag_key;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check for per-business override
  IF p_business_id IS NOT NULL THEN
    SELECT * INTO v_override FROM feature_flag_overrides 
    WHERE flag_id = v_flag.id AND business_id = p_business_id;
    
    IF FOUND THEN
      RETURN v_override.is_enabled;
    END IF;
  END IF;

  -- Check global flag + rollout percentage
  IF NOT v_flag.is_enabled THEN
    RETURN false;
  END IF;

  IF v_flag.rollout_percentage >= 100 THEN
    RETURN true;
  END IF;

  -- Simple deterministic rollout based on business_id hash
  IF p_business_id IS NOT NULL THEN
    RETURN (abs(hashtext(p_business_id::text || p_flag_key)) % 100) < v_flag.rollout_percentage;
  END IF;

  RETURN v_flag.is_enabled;
END;
$$;
