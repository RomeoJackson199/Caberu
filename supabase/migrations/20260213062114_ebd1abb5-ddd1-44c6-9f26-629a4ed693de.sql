
-- Scheduled downtimes table for platform-wide or per-service maintenance windows
CREATE TABLE public.scheduled_downtimes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  severity TEXT NOT NULL DEFAULT 'maintenance' CHECK (severity IN ('maintenance', 'partial', 'major', 'critical')),
  affected_services TEXT[] DEFAULT '{}',
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notify_users BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.scheduled_downtimes ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "Super admins manage downtimes"
  ON public.scheduled_downtimes
  FOR ALL
  USING (public.is_super_admin());

-- Public read access for public downtimes (status page)
CREATE POLICY "Public can view public downtimes"
  ON public.scheduled_downtimes
  FOR SELECT
  USING (is_public = true);

-- Index for efficient queries
CREATE INDEX idx_scheduled_downtimes_status ON public.scheduled_downtimes(status);
CREATE INDEX idx_scheduled_downtimes_schedule ON public.scheduled_downtimes(scheduled_start, scheduled_end);

-- Platform status config (for the status page banner message etc)
CREATE TABLE public.platform_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  overall_status TEXT NOT NULL DEFAULT 'operational' CHECK (overall_status IN ('operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance')),
  status_message TEXT,
  show_banner BOOLEAN DEFAULT false,
  banner_message TEXT,
  banner_severity TEXT DEFAULT 'info' CHECK (banner_severity IN ('info', 'warning', 'error', 'critical')),
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage platform status"
  ON public.platform_status
  FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Public can view platform status"
  ON public.platform_status
  FOR SELECT
  USING (true);

-- Insert default row
INSERT INTO public.platform_status (overall_status, status_message, show_banner, banner_message)
VALUES ('operational', 'All systems operational', false, null);
