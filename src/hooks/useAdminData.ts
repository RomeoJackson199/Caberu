import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLogAction } from '@/hooks/useSuperAdmin';
import type {
  AdminOverviewStats,
  AdminBusiness,
  AdminBusinessDetail,
  AdminUser,
  AdminAppointment,
  AdminPhoneCall,
  AdminChatMessage,
  AdminMessage,
  AdminSystemError,
  AdminGdprRequest,
  AdminGdprExportBundle,
  AdminAuditLogEntry,
  AdminFeatureFlag,
  AdminFeatureFlagOverride,
  AdminFeatureFlagChangelogEntry,
  AdminPromoCode,
  AdminSubscriptionPlan,
  AdminEncryptionKeyStatus,
  AdminSuperAuditLog,
  AdminElevenLabsAgent,
  AdminEmailLog,
  AdminPatientConsent,
  AdminPracticeConsent,
  PRICING_TIERS,
} from '@/types/admin-dashboard';

// ==================== Overview ====================

export function useAdminOverviewStats() {
  return useQuery({
    queryKey: ['admin-overview-stats'],
    queryFn: async (): Promise<AdminOverviewStats> => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [bizRes, profileRes, registeredRes, apptRes, errRes] = await Promise.all([
        supabase.from('businesses').select('id, subscription_plan, subscription_status'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).not('user_id', 'is', null),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
        supabase.from('system_errors').select('id', { count: 'exact', head: true }).eq('resolved', false),
      ]);

      // Calculate MRR from businesses with active subscription
      const businesses = bizRes.data || [];
      const pricingMap: Record<string, number> = { starter: 24900, professional: 49900, enterprise: 99900 };
      let mrr = 0;
      for (const biz of businesses) {
        if (biz.subscription_status === 'active' && biz.subscription_plan) {
          const plan = biz.subscription_plan.toLowerCase();
          if (plan === 'monthly' || plan === 'yearly') {
            // For generic plans, use starter as default
            mrr += pricingMap.starter;
          } else if (pricingMap[plan]) {
            mrr += pricingMap[plan];
          }
        }
      }

      return {
        total_businesses: businesses.length,
        total_users: profileRes.count || 0,
        registered_users: registeredRes.count || 0,
        appointments_this_month: apptRes.count || 0,
        active_errors: errRes.count || 0,
        mrr_cents: mrr,
      };
    },
    refetchInterval: 60000,
  });
}

export function useAppointmentsOverTime() {
  return useQuery({
    queryKey: ['admin-appointments-over-time'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('appointments')
        .select('id, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by date
      const grouped: Record<string, number> = {};
      (data || []).forEach((a) => {
        const date = new Date(a.created_at).toISOString().split('T')[0];
        grouped[date] = (grouped[date] || 0) + 1;
      });

      return Object.entries(grouped).map(([date, count]) => ({ date, count }));
    },
  });
}

export function usePhoneUsageOverTime() {
  return useQuery({
    queryKey: ['admin-phone-usage-over-time'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('phone_usage')
        .select('id, call_started_at, duration_seconds')
        .gte('call_started_at', thirtyDaysAgo.toISOString())
        .order('call_started_at', { ascending: true });

      if (error) throw error;

      const grouped: Record<string, { calls: number; minutes: number }> = {};
      (data || []).forEach((p) => {
        if (!p.call_started_at) return;
        const date = new Date(p.call_started_at).toISOString().split('T')[0];
        if (!grouped[date]) grouped[date] = { calls: 0, minutes: 0 };
        grouped[date].calls++;
        grouped[date].minutes += (p.duration_seconds || 0) / 60;
      });

      return Object.entries(grouped).map(([date, data]) => ({
        date,
        calls: data.calls,
        minutes: Math.round(data.minutes * 10) / 10,
      }));
    },
  });
}

export function useSystemErrorsTrend() {
  return useQuery({
    queryKey: ['admin-errors-trend'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('system_errors')
        .select('id, severity, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      const grouped: Record<string, Record<string, number>> = {};
      (data || []).forEach((e) => {
        const date = new Date(e.created_at).toISOString().split('T')[0];
        if (!grouped[date]) grouped[date] = { low: 0, medium: 0, high: 0, critical: 0 };
        grouped[date][e.severity] = (grouped[date][e.severity] || 0) + 1;
      });

      return Object.entries(grouped).map(([date, severities]) => ({
        date,
        ...severities,
      }));
    },
  });
}

export function useAdminAlerts() {
  return useQuery({
    queryKey: ['admin-alerts'],
    queryFn: async () => {
      const alerts: Array<{ id: string; type: string; severity: string; title: string; count: number }> = [];

      const [criticalRes, gdprRes, keyRes] = await Promise.all([
        supabase
          .from('system_errors')
          .select('id', { count: 'exact', head: true })
          .eq('resolved', false)
          .in('severity', ['critical', 'high']),
        supabase
          .from('gdpr_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('admin_encryption_key_status' as 'business_encryption_keys')
          .select('id, expires_at')
          .not('expires_at', 'is', null),
      ]);

      if (criticalRes.count && criticalRes.count > 0) {
        alerts.push({
          id: 'critical-errors',
          type: 'error',
          severity: 'critical',
          title: `${criticalRes.count} unresolved critical/high errors`,
          count: criticalRes.count,
        });
      }

      if (gdprRes.count && gdprRes.count > 0) {
        alerts.push({
          id: 'pending-gdpr',
          type: 'gdpr',
          severity: 'warning',
          title: `${gdprRes.count} pending GDPR request(s)`,
          count: gdprRes.count,
        });
      }

      // Check expiring keys
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiringKeys = (keyRes.data || []).filter(
        (k: { expires_at: string | null }) => k.expires_at && new Date(k.expires_at) < thirtyDaysFromNow
      );
      if (expiringKeys.length > 0) {
        alerts.push({
          id: 'expiring-keys',
          type: 'security',
          severity: 'warning',
          title: `${expiringKeys.length} encryption key(s) expiring soon`,
          count: expiringKeys.length,
        });
      }

      return alerts;
    },
    refetchInterval: 60000,
  });
}

// ==================== Practices ====================

export function useAdminBusinesses() {
  return useQuery({
    queryKey: ['admin-businesses'],
    queryFn: async (): Promise<AdminBusiness[]> => {
      const { data: businesses, error } = await supabase
        .from('businesses')
        .select(`
          id, name, slug, subscription_plan, subscription_status, subscription_ends_at,
          owner_profile_id, created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!businesses) return [];

      // Fetch counts in parallel
      const bizIds = businesses.map((b) => b.id);
      const ownerIds = businesses.map((b) => b.owner_profile_id).filter(Boolean) as string[];

      const [membersRes, apptsRes, phonesRes, ownersRes] = await Promise.all([
        supabase.from('business_members').select('business_id').in('business_id', bizIds),
        supabase.from('appointments').select('business_id').in('business_id', bizIds),
        supabase.from('phone_usage').select('business_id').in('business_id', bizIds),
        ownerIds.length > 0
          ? supabase.from('profiles').select('id, first_name, last_name, email').in('id', ownerIds)
          : Promise.resolve({ data: [] }),
      ]);

      const memberCounts: Record<string, number> = {};
      (membersRes.data || []).forEach((m) => {
        memberCounts[m.business_id] = (memberCounts[m.business_id] || 0) + 1;
      });

      const apptCounts: Record<string, number> = {};
      (apptsRes.data || []).forEach((a) => {
        if (a.business_id) apptCounts[a.business_id] = (apptCounts[a.business_id] || 0) + 1;
      });

      const phoneCounts: Record<string, number> = {};
      (phonesRes.data || []).forEach((p) => {
        if (p.business_id) phoneCounts[p.business_id] = (phoneCounts[p.business_id] || 0) + 1;
      });

      const ownerMap: Record<string, { name: string; email: string }> = {};
      (ownersRes.data || []).forEach((o: { id: string; first_name: string | null; last_name: string | null; email: string | null }) => {
        ownerMap[o.id] = {
          name: [o.first_name, o.last_name].filter(Boolean).join(' ') || 'Unknown',
          email: o.email || '',
        };
      });

      return businesses.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        subscription_plan: b.subscription_plan,
        subscription_status: b.subscription_status,
        subscription_ends_at: b.subscription_ends_at,
        owner_profile_id: b.owner_profile_id,
        owner_name: b.owner_profile_id ? ownerMap[b.owner_profile_id]?.name || null : null,
        owner_email: b.owner_profile_id ? ownerMap[b.owner_profile_id]?.email || null : null,
        member_count: memberCounts[b.id] || 0,
        appointment_count: apptCounts[b.id] || 0,
        phone_call_count: phoneCounts[b.id] || 0,
        created_at: b.created_at,
      }));
    },
  });
}

export function useAdminBusinessDetail(businessId: string | null) {
  return useQuery({
    queryKey: ['admin-business-detail', businessId],
    queryFn: async (): Promise<AdminBusinessDetail | null> => {
      if (!businessId) return null;
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (error) throw error;
      return data as AdminBusinessDetail;
    },
    enabled: !!businessId,
  });
}

export function useUpdateBusinessSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (params: {
      businessId: string;
      subscription_status?: string;
      subscription_plan?: string;
    }) => {
      const updates: Record<string, string> = {};
      if (params.subscription_status) updates.subscription_status = params.subscription_status;
      if (params.subscription_plan) updates.subscription_plan = params.subscription_plan;

      const { error } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', params.businessId);

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast({ title: 'Subscription updated' });
      logAction.mutate({
        action: 'UPDATE_SUBSCRIPTION',
        resource_type: 'business',
        resource_id: vars.businessId,
        details: vars,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-business-detail', vars.businessId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ==================== Users ====================

export function useAdminUsers(filters?: { role?: string; businessId?: string; search?: string }) {
  return useQuery({
    queryKey: ['admin-users', filters],
    queryFn: async (): Promise<AdminUser[]> => {
      let query = supabase
        .from('profiles')
        .select(`
          id, user_id, first_name, last_name, email, phone, role,
          business_id, patient_status, onboarding_completed, created_at, updated_at
        `)
        .order('created_at', { ascending: false });

      if (filters?.businessId) {
        query = query.eq('business_id', filters.businessId);
      }
      if (filters?.role) {
        query = query.eq('role', filters.role);
      }
      if (filters?.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      const { data: profiles, error } = await query;
      if (error) throw error;
      if (!profiles) return [];

      // Get business names
      const bizIds = [...new Set(profiles.map((p) => p.business_id).filter(Boolean))] as string[];
      const bizMap: Record<string, string> = {};
      if (bizIds.length > 0) {
        const { data: bizData } = await supabase
          .from('businesses')
          .select('id, name')
          .in('id', bizIds);
        (bizData || []).forEach((b) => { bizMap[b.id] = b.name; });
      }

      // Get user_roles
      const userIds = profiles.map((p) => p.user_id).filter(Boolean) as string[];
      const rolesMap: Record<string, string[]> = {};
      if (userIds.length > 0) {
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);
        (rolesData || []).forEach((r) => {
          if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
          rolesMap[r.user_id].push(r.role);
        });
      }

      return profiles.map((p) => ({
        id: p.id,
        user_id: p.user_id,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
        phone: p.phone,
        role: p.role,
        business_id: p.business_id,
        business_name: p.business_id ? bizMap[p.business_id] || null : null,
        roles: p.user_id ? rolesMap[p.user_id] || [] : [],
        patient_status: p.patient_status ?? null,
        onboarding_completed: p.onboarding_completed ?? null,
        created_at: p.created_at,
        updated_at: p.updated_at,
      }));
    },
  });
}

export function useAdminUpdateUserRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (params: { userId: string; role: string }) => {
      // Upsert into user_roles
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: params.userId, role: params.role as 'admin' | 'provider' | 'customer' | 'staff' | 'patient' | 'waiter' | 'cook' | 'host' | 'manager' | 'super_admin' });

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast({ title: 'Role updated' });
      logAction.mutate({
        action: 'UPDATE_USER_ROLE',
        resource_type: 'user',
        resource_id: vars.userId,
        details: { role: vars.role },
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ==================== Appointments ====================

export function useAdminAppointments(filters?: {
  businessId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  bookingSource?: string;
}) {
  return useQuery({
    queryKey: ['admin-appointments', filters],
    queryFn: async (): Promise<AdminAppointment[]> => {
      let query = supabase
        .from('appointments')
        .select(`
          id, patient_id, dentist_id, business_id, appointment_date,
          status, booking_source, duration_minutes, reason, notes,
          ai_summary, patient_name, created_at
        `)
        .order('appointment_date', { ascending: false })
        .limit(200);

      if (filters?.businessId) query = query.eq('business_id', filters.businessId);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.bookingSource) query = query.eq('booking_source', filters.bookingSource);
      if (filters?.dateFrom) query = query.gte('appointment_date', filters.dateFrom);
      if (filters?.dateTo) query = query.lte('appointment_date', filters.dateTo);

      const { data, error } = await query;
      if (error) throw error;
      if (!data) return [];

      // Fetch business names and dentist names
      const bizIds = [...new Set(data.map((a) => a.business_id).filter(Boolean))] as string[];
      const dentistIds = [...new Set(data.map((a) => a.dentist_id).filter(Boolean))] as string[];

      const [bizRes, dentistRes] = await Promise.all([
        bizIds.length > 0
          ? supabase.from('businesses').select('id, name').in('id', bizIds)
          : Promise.resolve({ data: [] }),
        dentistIds.length > 0
          ? supabase.from('dentists').select('id, first_name, last_name').in('id', dentistIds)
          : Promise.resolve({ data: [] }),
      ]);

      const bizMap: Record<string, string> = {};
      (bizRes.data || []).forEach((b) => { bizMap[b.id] = b.name; });

      const dentistMap: Record<string, string> = {};
      (dentistRes.data || []).forEach((d: { id: string; first_name: string; last_name: string }) => {
        dentistMap[d.id] = [d.first_name, d.last_name].filter(Boolean).join(' ');
      });

      return data.map((a) => ({
        id: a.id,
        patient_id: a.patient_id,
        patient_name: a.patient_name || '[Encrypted]',
        dentist_id: a.dentist_id,
        dentist_name: a.dentist_id ? dentistMap[a.dentist_id] || 'Unknown' : null,
        business_id: a.business_id,
        business_name: a.business_id ? bizMap[a.business_id] || 'Unknown' : null,
        appointment_date: a.appointment_date,
        status: a.status,
        booking_source: a.booking_source,
        duration_minutes: a.duration_minutes,
        reason: a.reason ? '[Encrypted]' : null,
        notes: a.notes ? '[Encrypted]' : null,
        ai_summary: a.ai_summary ? '[Encrypted]' : null,
        created_at: a.created_at,
      }));
    },
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (params: { appointmentId: string; status: string }) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: params.status })
        .eq('id', params.appointmentId);

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast({ title: 'Appointment updated' });
      logAction.mutate({
        action: 'UPDATE_APPOINTMENT_STATUS',
        resource_type: 'appointment',
        resource_id: vars.appointmentId,
        details: { status: vars.status },
      });
      queryClient.invalidateQueries({ queryKey: ['admin-appointments'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ==================== Communications ====================

export function useAdminPhoneCalls() {
  return useQuery({
    queryKey: ['admin-phone-calls'],
    queryFn: async (): Promise<AdminPhoneCall[]> => {
      const { data, error } = await supabase
        .from('phone_usage')
        .select('*')
        .order('call_started_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get business names
      const bizIds = [...new Set((data || []).map((p) => p.business_id).filter(Boolean))] as string[];
      const bizMap: Record<string, string> = {};
      if (bizIds.length > 0) {
        const { data: bizData } = await supabase.from('businesses').select('id, name').in('id', bizIds);
        (bizData || []).forEach((b) => { bizMap[b.id] = b.name; });
      }

      return (data || []).map((p) => ({
        ...p,
        business_name: p.business_id ? bizMap[p.business_id] || null : null,
        transcript: p.transcript as Record<string, unknown> | null,
      }));
    },
  });
}

export function useAdminChatMessages() {
  return useQuery({
    queryKey: ['admin-chat-messages'],
    queryFn: async (): Promise<AdminChatMessage[]> => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, session_id, business_id, is_bot, message, message_type, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const bizIds = [...new Set((data || []).map((c) => c.business_id).filter(Boolean))] as string[];
      const bizMap: Record<string, string> = {};
      if (bizIds.length > 0) {
        const { data: bizData } = await supabase.from('businesses').select('id, name').in('id', bizIds);
        (bizData || []).forEach((b) => { bizMap[b.id] = b.name; });
      }

      return (data || []).map((c) => ({
        ...c,
        message: c.message ? '[Encrypted]' : null,
        business_name: c.business_id ? bizMap[c.business_id] || null : null,
      }));
    },
  });
}

export function useAdminMessages() {
  return useQuery({
    queryKey: ['admin-messages'],
    queryFn: async (): Promise<AdminMessage[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, business_id, sender_profile_id, recipient_profile_id, message_text, is_read, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get profile names and business names
      const profileIds = [...new Set(
        (data || []).flatMap((m) => [m.sender_profile_id, m.recipient_profile_id]).filter(Boolean)
      )] as string[];
      const bizIds = [...new Set((data || []).map((m) => m.business_id).filter(Boolean))] as string[];

      const [profileRes, bizRes] = await Promise.all([
        profileIds.length > 0
          ? supabase.from('profiles').select('id, first_name, last_name').in('id', profileIds)
          : Promise.resolve({ data: [] }),
        bizIds.length > 0
          ? supabase.from('businesses').select('id, name').in('id', bizIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap: Record<string, string> = {};
      (profileRes.data || []).forEach((p: { id: string; first_name: string | null; last_name: string | null }) => {
        profileMap[p.id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown';
      });
      const bizMap: Record<string, string> = {};
      (bizRes.data || []).forEach((b) => { bizMap[b.id] = b.name; });

      return (data || []).map((m) => ({
        id: m.id,
        business_id: m.business_id,
        business_name: m.business_id ? bizMap[m.business_id] || null : null,
        sender_name: m.sender_profile_id ? profileMap[m.sender_profile_id] || null : null,
        recipient_name: m.recipient_profile_id ? profileMap[m.recipient_profile_id] || null : null,
        message_text: m.message_text ? '[Encrypted]' : null,
        is_read: m.is_read,
        created_at: m.created_at,
      }));
    },
  });
}

export function useAdminEmailLogs() {
  return useQuery({
    queryKey: ['admin-email-logs'],
    queryFn: async (): Promise<AdminEmailLog[]> => {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const bizIds = [...new Set((data || []).map((e) => e.business_id).filter(Boolean))] as string[];
      const bizMap: Record<string, string> = {};
      if (bizIds.length > 0) {
        const { data: bizData } = await supabase.from('businesses').select('id, name').in('id', bizIds);
        (bizData || []).forEach((b) => { bizMap[b.id] = b.name; });
      }

      return (data || []).map((e) => ({
        ...e,
        business_name: e.business_id ? bizMap[e.business_id] || null : null,
      }));
    },
  });
}

export function useAdminElevenLabsAgents() {
  return useQuery({
    queryKey: ['admin-elevenlabs-agents'],
    queryFn: async (): Promise<AdminElevenLabsAgent[]> => {
      const { data, error } = await supabase
        .from('elevenlabs_agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const bizIds = [...new Set((data || []).map((a) => a.business_id).filter(Boolean))] as string[];
      const bizMap: Record<string, string> = {};
      if (bizIds.length > 0) {
        const { data: bizData } = await supabase.from('businesses').select('id, name').in('id', bizIds);
        (bizData || []).forEach((b) => { bizMap[b.id] = b.name; });
      }

      return (data || []).map((a) => ({
        ...a,
        business_name: a.business_id ? bizMap[a.business_id] || null : null,
        settings: a.settings as Record<string, unknown> | null,
      }));
    },
  });
}

// ==================== System Health ====================

export function useAdminSystemErrors(filters?: {
  severity?: string;
  businessId?: string;
  resolved?: boolean;
}) {
  return useQuery({
    queryKey: ['admin-system-errors', filters],
    queryFn: async (): Promise<AdminSystemError[]> => {
      let query = supabase
        .from('system_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (filters?.severity) query = query.eq('severity', filters.severity);
      if (filters?.businessId) query = query.eq('business_id', filters.businessId);
      if (filters?.resolved !== undefined) query = query.eq('resolved', filters.resolved);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AdminSystemError[];
    },
  });
}

export function useAdminSystemErrorsArchive() {
  return useQuery({
    queryKey: ['admin-system-errors-archive'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_errors_archive')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data || []) as AdminSystemError[];
    },
  });
}

export function useAdminResolveError() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (errorId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('system_errors')
        .update({
          resolved: true,
          resolved_by: userData?.user?.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', errorId);

      if (error) throw error;
    },
    onSuccess: (_, errorId) => {
      toast({ title: 'Error resolved' });
      logAction.mutate({
        action: 'RESOLVE_ERROR',
        resource_type: 'system_error',
        resource_id: errorId,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-system-errors'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview-stats'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAdminDeleteArchivedError() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (errorId: string) => {
      const { error } = await supabase
        .from('system_errors_archive')
        .delete()
        .eq('id', errorId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Archived error deleted' });
      queryClient.invalidateQueries({ queryKey: ['admin-system-errors-archive'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAdminHealthChecks() {
  return useQuery({
    queryKey: ['admin-health-checks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_health_checks')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
  });
}

// ==================== GDPR & Compliance ====================

export function useAdminGdprRequests() {
  return useQuery({
    queryKey: ['admin-gdpr-requests'],
    queryFn: async (): Promise<AdminGdprRequest[]> => {
      const { data, error } = await supabase
        .from('gdpr_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as AdminGdprRequest[];
    },
  });
}

export function useAdminUpdateGdprRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (params: {
      requestId: string;
      status: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const updates: Record<string, unknown> = {
        status: params.status,
        processed_by: userData?.user?.id,
      };
      if (params.status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('gdpr_requests')
        .update(updates)
        .eq('id', params.requestId);

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast({ title: 'GDPR request updated' });
      logAction.mutate({
        action: 'UPDATE_GDPR_REQUEST',
        resource_type: 'gdpr_request',
        resource_id: vars.requestId,
        details: { status: vars.status },
      });
      queryClient.invalidateQueries({ queryKey: ['admin-gdpr-requests'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAdminGdprExportBundles() {
  return useQuery({
    queryKey: ['admin-gdpr-export-bundles'],
    queryFn: async (): Promise<AdminGdprExportBundle[]> => {
      const { data, error } = await supabase
        .from('gdpr_export_bundles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as AdminGdprExportBundle[];
    },
  });
}

export function useAdminAuditLogs() {
  return useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async (): Promise<AdminAuditLogEntry[]> => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (error) throw error;
      return (data || []).map((l) => ({
        ...l,
        changes: l.changes as Record<string, unknown> | null,
      }));
    },
  });
}

export function useAdminPatientConsents() {
  return useQuery({
    queryKey: ['admin-patient-consents'],
    queryFn: async (): Promise<AdminPatientConsent[]> => {
      const { data, error } = await supabase
        .from('patient_consents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as AdminPatientConsent[];
    },
  });
}

export function useAdminPracticeConsents() {
  return useQuery({
    queryKey: ['admin-practice-consents'],
    queryFn: async (): Promise<AdminPracticeConsent[]> => {
      const { data, error } = await supabase
        .from('practice_consents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as AdminPracticeConsent[];
    },
  });
}

export function useAdminEncryptionKeys() {
  return useQuery({
    queryKey: ['admin-encryption-keys'],
    queryFn: async (): Promise<AdminEncryptionKeyStatus[]> => {
      // Use the safe view that excludes the actual encrypted_key
      const { data, error } = await supabase
        .from('admin_encryption_key_status' as 'business_encryption_keys')
        .select('id, business_id, key_version, is_active, created_at, rotated_at, expires_at, created_by');

      if (error) throw error;
      return (data || []) as unknown as AdminEncryptionKeyStatus[];
    },
  });
}

// ==================== Feature Flags ====================

export function useAdminFeatureFlags() {
  return useQuery({
    queryKey: ['admin-feature-flags'],
    queryFn: async (): Promise<AdminFeatureFlag[]> => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((f) => ({
        ...f,
        metadata: f.metadata as Record<string, unknown> | null,
      }));
    },
  });
}

export function useAdminCreateFeatureFlag() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (params: {
      flag_key: string;
      name: string;
      description?: string;
      category?: string;
      is_enabled?: boolean;
      rollout_percentage?: number;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('feature_flags')
        .insert({
          flag_key: params.flag_key,
          name: params.name,
          description: params.description || null,
          category: params.category || null,
          is_enabled: params.is_enabled ?? false,
          rollout_percentage: params.rollout_percentage ?? 0,
          created_by: userData?.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: 'Feature flag created' });
      logAction.mutate({
        action: 'CREATE_FEATURE_FLAG',
        resource_type: 'feature_flag',
        resource_id: data?.id,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAdminUpdateFeatureFlag() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (params: {
      flagId: string;
      updates: Partial<{
        is_enabled: boolean;
        rollout_percentage: number;
        name: string;
        description: string;
        category: string;
      }>;
    }) => {
      const { error } = await supabase
        .from('feature_flags')
        .update(params.updates)
        .eq('id', params.flagId);

      if (error) throw error;

      // Log to changelog
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from('feature_flag_changelog').insert({
        flag_id: params.flagId,
        action: 'update',
        new_value: params.updates as Record<string, unknown>,
        changed_by: userData?.user?.id,
      });
    },
    onSuccess: (_, vars) => {
      toast({ title: 'Feature flag updated' });
      logAction.mutate({
        action: 'UPDATE_FEATURE_FLAG',
        resource_type: 'feature_flag',
        resource_id: vars.flagId,
        details: vars.updates,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] });
      queryClient.invalidateQueries({ queryKey: ['admin-feature-flag-changelog'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAdminFeatureFlagOverrides(flagId?: string) {
  return useQuery({
    queryKey: ['admin-feature-flag-overrides', flagId],
    queryFn: async (): Promise<AdminFeatureFlagOverride[]> => {
      let query = supabase
        .from('feature_flag_overrides')
        .select('*')
        .order('created_at', { ascending: false });

      if (flagId) query = query.eq('flag_id', flagId);

      const { data, error } = await query;
      if (error) throw error;

      // Get business names
      const bizIds = [...new Set((data || []).map((o) => o.business_id).filter(Boolean))] as string[];
      const bizMap: Record<string, string> = {};
      if (bizIds.length > 0) {
        const { data: bizData } = await supabase.from('businesses').select('id, name').in('id', bizIds);
        (bizData || []).forEach((b) => { bizMap[b.id] = b.name; });
      }

      return (data || []).map((o) => ({
        ...o,
        business_name: o.business_id ? bizMap[o.business_id] || null : null,
      }));
    },
  });
}

export function useAdminCreateFlagOverride() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (params: {
      flag_id: string;
      business_id: string;
      is_enabled: boolean;
      reason?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('feature_flag_overrides')
        .insert({
          flag_id: params.flag_id,
          business_id: params.business_id,
          is_enabled: params.is_enabled,
          reason: params.reason || null,
          created_by: userData?.user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Override created' });
      logAction.mutate({ action: 'CREATE_FLAG_OVERRIDE', resource_type: 'feature_flag_override' });
      queryClient.invalidateQueries({ queryKey: ['admin-feature-flag-overrides'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAdminFeatureFlagChangelog() {
  return useQuery({
    queryKey: ['admin-feature-flag-changelog'],
    queryFn: async (): Promise<AdminFeatureFlagChangelogEntry[]> => {
      const { data, error } = await supabase
        .from('feature_flag_changelog')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((c) => ({
        ...c,
        old_value: c.old_value as Record<string, unknown> | null,
        new_value: c.new_value as Record<string, unknown> | null,
      }));
    },
  });
}

// ==================== Revenue & Billing ====================

export function useAdminSubscriptionPlans() {
  return useQuery({
    queryKey: ['admin-subscription-plans'],
    queryFn: async (): Promise<AdminSubscriptionPlan[]> => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      return (data || []).map((p) => ({
        ...p,
        features: p.features as Record<string, unknown> | null,
      }));
    },
  });
}

export function useAdminUpdateSubscriptionPlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (params: {
      planId: string;
      updates: Partial<{
        price_monthly: number;
        price_yearly: number;
        customer_limit: number;
        email_limit_monthly: number;
        phone_minutes_daily: number;
        is_active: boolean;
      }>;
    }) => {
      const { error } = await supabase
        .from('subscription_plans')
        .update(params.updates)
        .eq('id', params.planId);

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast({ title: 'Plan updated' });
      logAction.mutate({
        action: 'UPDATE_SUBSCRIPTION_PLAN',
        resource_type: 'subscription_plan',
        resource_id: vars.planId,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-subscription-plans'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Promo codes are now managed via Stripe Dashboard — these hooks are deprecated.
// See: https://dashboard.stripe.com/coupons

export function useAdminPlatformRevenue() {
  return useQuery({
    queryKey: ['admin-platform-revenue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_revenue')
        .select('*')
        .order('revenue_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
  });
}

// ==================== Business Status Toggle ====================

export function useToggleBusinessSubscriptionStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (params: {
      businessId: string;
      newStatus: string;
      oldStatus: string;
      businessName: string;
    }) => {
      const { error } = await supabase
        .from('businesses')
        .update({ subscription_status: params.newStatus })
        .eq('id', params.businessId);

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast({
        title: vars.newStatus === 'active' ? 'Business Activated' : 'Business Deactivated',
        description: `${vars.businessName} status changed to ${vars.newStatus}`,
      });
      logAction.mutate({
        action: 'update_business_status',
        resource_type: 'business',
        resource_id: vars.businessId,
        details: { old_status: vars.oldStatus, new_status: vars.newStatus },
      });
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-business-detail', vars.businessId] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview-stats'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ==================== Business Settings Update ====================

export function useUpdateBusinessSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (params: {
      businessId: string;
      updates: Record<string, unknown>;
    }) => {
      const { error } = await supabase
        .from('businesses')
        .update(params.updates)
        .eq('id', params.businessId);

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast({ title: 'Business updated' });
      logAction.mutate({
        action: 'update_business',
        resource_type: 'business',
        resource_id: vars.businessId,
        details: vars.updates,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-business-detail', vars.businessId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ==================== Business Members ====================

export function useAdminBusinessMembers(businessId: string | null) {
  return useQuery({
    queryKey: ['admin-business-members', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from('business_members')
        .select('id, business_id, profile_id, role, is_active, created_at')
        .eq('business_id', businessId);

      if (error) throw error;

      const profileIds = (data || []).map((m) => m.profile_id).filter(Boolean) as string[];
      const profileMap: Record<string, { first_name: string | null; last_name: string | null; email: string | null }> = {};
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', profileIds);
        (profiles || []).forEach((p) => { profileMap[p.id] = p; });
      }

      return (data || []).map((m) => ({
        ...m,
        profile_name: m.profile_id ? [profileMap[m.profile_id]?.first_name, profileMap[m.profile_id]?.last_name].filter(Boolean).join(' ') || profileMap[m.profile_id]?.email || 'Unknown' : 'Unknown',
        profile_email: m.profile_id ? profileMap[m.profile_id]?.email || null : null,
      }));
    },
    enabled: !!businessId,
  });
}

export function useRemoveBusinessMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (params: { memberId: string; businessId: string }) => {
      const { error } = await supabase
        .from('business_members')
        .delete()
        .eq('id', params.memberId);

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast({ title: 'Member removed' });
      logAction.mutate({
        action: 'remove_business_member',
        resource_type: 'business_member',
        resource_id: vars.memberId,
        details: { business_id: vars.businessId },
      });
      queryClient.invalidateQueries({ queryKey: ['admin-business-members', vars.businessId] });
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ==================== User Profile Update ====================

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (params: {
      profileId: string;
      updates: Record<string, unknown>;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update(params.updates)
        .eq('id', params.profileId);

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast({ title: 'Profile updated' });
      logAction.mutate({
        action: 'update_profile',
        resource_type: 'profile',
        resource_id: vars.profileId,
        details: vars.updates,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', vars.profileId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ==================== User Detail ====================

export function useAdminUserDetail(profileId: string | null) {
  return useQuery({
    queryKey: ['admin-user-detail', profileId],
    queryFn: async () => {
      if (!profileId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, email, phone, role, business_id, patient_status, onboarding_completed, created_at, updated_at')
        .eq('id', profileId)
        .single();

      if (error) throw error;

      // Get business name
      let businessName: string | null = null;
      if (data.business_id) {
        const { data: biz } = await supabase.from('businesses').select('name').eq('id', data.business_id).single();
        businessName = biz?.name || null;
      }

      // Get user_roles
      let roles: string[] = [];
      if (data.user_id) {
        const { data: rolesData } = await supabase.from('user_roles').select('role').eq('user_id', data.user_id);
        roles = (rolesData || []).map((r) => r.role);
      }

      // Get business memberships
      const { data: memberships } = await supabase
        .from('business_members')
        .select('id, business_id, role, is_active, created_at')
        .eq('profile_id', profileId);

      const memBizIds = (memberships || []).map((m) => m.business_id).filter(Boolean) as string[];
      const memBizMap: Record<string, string> = {};
      if (memBizIds.length > 0) {
        const { data: bizData } = await supabase.from('businesses').select('id, name').in('id', memBizIds);
        (bizData || []).forEach((b) => { memBizMap[b.id] = b.name; });
      }

      return {
        ...data,
        business_name: businessName,
        roles,
        memberships: (memberships || []).map((m) => ({
          ...m,
          business_name: m.business_id ? memBizMap[m.business_id] || 'Unknown' : 'Unknown',
        })),
      };
    },
    enabled: !!profileId,
  });
}

export function useAddUserRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (params: { userId: string; role: string; profileId: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: params.userId, role: params.role as 'admin' | 'provider' | 'customer' | 'staff' | 'patient' | 'waiter' | 'cook' | 'host' | 'manager' | 'super_admin' });

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast({ title: 'Role added' });
      logAction.mutate({
        action: 'add_user_role',
        resource_type: 'user_role',
        resource_id: vars.userId,
        details: { role: vars.role },
      });
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', vars.profileId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRemoveUserRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (params: { userId: string; role: string; profileId: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', params.userId)
        .eq('role', params.role);

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast({ title: 'Role removed' });
      logAction.mutate({
        action: 'remove_user_role',
        resource_type: 'user_role',
        resource_id: vars.userId,
        details: { role: vars.role },
      });
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', vars.profileId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ==================== Admin Audit Log ====================

export function useAdminSuperAuditLog() {
  return useQuery({
    queryKey: ['admin-super-audit-log'],
    queryFn: async (): Promise<AdminSuperAuditLog[]> => {
      const { data, error } = await supabase
        .from('super_admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data || []).map((l) => ({
        ...l,
        details: l.details as Record<string, unknown> | null,
      }));
    },
  });
}
