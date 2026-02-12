import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminDashboardStats {
  total_practices: number;
  active_practices: number;
  trial_practices: number;
  suspended_practices: number;
  total_patients: number;
  mrr_cents: number;
  active_calls_today: number;
  voice_minutes_today: number;
  whatsapp_messages_today: number;
  unresolved_errors: number;
  new_signups_this_week: number;
}

export interface PracticeDetail {
  business_name: string;
  slug: string;
  subscription_plan: string | null;
  subscription_status: string | null;
  created_at: string;
  owner_email: string;
  owner_name: string;
  staff_count: number;
  patient_count: number;
  total_appointments: number;
  appointments_this_month: number;
  voice_minutes_this_month: number;
  whatsapp_this_month: number;
  encryption_key_active: boolean;
  last_activity: string | null;
}

export interface PracticeListItem {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string | null;
  subscription_status: string | null;
  created_at: string;
  owner_email: string | null;
  members_count: number;
  patients_count: number;
  appointments_count: number;
}

export function useAdminDashboardStats() {
  return useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
      if (error) throw error;
      // RPC returns array for RETURNS TABLE, take first row
      const row = Array.isArray(data) ? data[0] : data;
      return row as AdminDashboardStats;
    },
    refetchInterval: 60000,
  });
}

export function usePracticeDetail(businessId: string | null) {
  return useQuery({
    queryKey: ['practice-detail', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      const { data, error } = await supabase.rpc('get_practice_detail', {
        p_business_id: businessId,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row as PracticeDetail;
    },
    enabled: !!businessId,
  });
}

export function usePracticeList() {
  return useQuery({
    queryKey: ['admin-practice-list'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_businesses_admin');
      if (error) throw error;
      return (data || []) as PracticeListItem[];
    },
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: async () => {
      // Fetch recent businesses (signups), errors, and appointments in parallel
      const [businessesRes, errorsRes, appointmentsRes] = await Promise.all([
        supabase
          .from('businesses')
          .select('id, name, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('system_errors')
          .select('id, error_type, error_message, severity, created_at')
          .eq('resolved', false)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('appointments')
          .select('id, created_at, status, business_id')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const activities: ActivityItem[] = [];

      // New signups
      businessesRes.data?.forEach((b) => {
        activities.push({
          id: `biz-${b.id}`,
          type: 'signup',
          title: `New practice: ${b.name}`,
          timestamp: b.created_at,
        });
      });

      // Errors
      errorsRes.data?.forEach((e) => {
        activities.push({
          id: `err-${e.id}`,
          type: 'error',
          title: `${e.severity}: ${e.error_type}`,
          description: e.error_message,
          timestamp: e.created_at,
          severity: e.severity,
        });
      });

      // Sort by timestamp desc
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return activities.slice(0, 10);
    },
    refetchInterval: 30000,
  });
}

export interface ActivityItem {
  id: string;
  type: 'signup' | 'error' | 'appointment' | 'payment';
  title: string;
  description?: string;
  timestamp: string;
  severity?: string;
}

export function useUsageAlerts() {
  return useQuery({
    queryKey: ['admin-usage-alerts'],
    queryFn: async () => {
      const alerts: UsageAlert[] = [];

      // Check for unresolved critical errors
      const { count: criticalErrors } = await supabase
        .from('system_errors')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false)
        .eq('severity', 'critical');

      if (criticalErrors && criticalErrors > 0) {
        alerts.push({
          id: 'critical-errors',
          type: 'error',
          severity: 'critical',
          title: `${criticalErrors} critical unresolved error${criticalErrors > 1 ? 's' : ''}`,
          action: 'View errors',
        });
      }

      // Check for practices with suspended status
      const { count: suspendedCount } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'suspended');

      if (suspendedCount && suspendedCount > 0) {
        alerts.push({
          id: 'suspended-practices',
          type: 'billing',
          severity: 'warning',
          title: `${suspendedCount} suspended practice${suspendedCount > 1 ? 's' : ''}`,
          action: 'View practices',
        });
      }

      return alerts;
    },
    refetchInterval: 60000,
  });
}

export interface UsageAlert {
  id: string;
  type: 'usage' | 'billing' | 'error' | 'system';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description?: string;
  action?: string;
}
