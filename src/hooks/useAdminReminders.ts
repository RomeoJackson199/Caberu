import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminReminder {
  id: string;
  appointment_id: string;
  reminder_type: string;
  scheduled_for: string;
  sent_at: string | null;
  status: string;
  notification_method: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminReminderRow {
  reminder: AdminReminder;
  appointment_date: string;
  appointment_status: string;
  business_id: string;
  business_name: string;
  patient_first_name: string | null;
  patient_last_name: string | null;
  dentist_first_name: string | null;
  dentist_last_name: string | null;
}

interface UseAdminRemindersParams {
  businessId?: string | null; // null = all businesses
  statusFilter?: string; // 'all' | 'pending' | 'sent' | 'failed'
  limit?: number;
}

export function useAdminReminders({
  businessId,
  statusFilter = 'all',
  limit = 200,
}: UseAdminRemindersParams) {
  return useQuery({
    queryKey: ['admin-reminders', businessId, statusFilter, limit],
    queryFn: async (): Promise<AdminReminderRow[]> => {
      // 1. Fetch reminders
      let remindersQuery = supabase
        .from('appointment_reminders')
        .select('*')
        .order('scheduled_for', { ascending: false })
        .limit(limit);

      if (statusFilter !== 'all') {
        remindersQuery = remindersQuery.eq('status', statusFilter);
      }

      const { data: reminders, error: rErr } = await remindersQuery;
      if (rErr) throw rErr;
      if (!reminders?.length) return [];

      // 2. Fetch linked appointments
      const appointmentIds = [...new Set(reminders.map((r) => r.appointment_id))];
      const { data: appointments, error: aErr } = await supabase
        .from('appointments')
        .select('id, appointment_date, status, business_id, patient_id, dentist_id')
        .in('id', appointmentIds);
      if (aErr) throw aErr;

      // Filter by business if needed
      const filteredApts = businessId
        ? (appointments ?? []).filter((a) => a.business_id === businessId)
        : (appointments ?? []);
      const aptMap = new Map(filteredApts.map((a) => [a.id, a]));

      // 3. Fetch businesses
      const businessIds = [...new Set(filteredApts.map((a) => a.business_id))];
      const { data: businesses } = businessIds.length
        ? await supabase.from('businesses').select('id, name').in('id', businessIds)
        : { data: [] };
      const bizMap = new Map((businesses ?? []).map((b) => [b.id, b.name]));

      // 4. Fetch patient profiles
      const patientIds = [...new Set(filteredApts.map((a) => a.patient_id).filter(Boolean))];
      const { data: patients } = patientIds.length
        ? await supabase.from('profiles').select('id, first_name, last_name').in('id', patientIds)
        : { data: [] };
      const patMap = new Map((patients ?? []).map((p) => [p.id, p]));

      // 5. Fetch dentists
      const dentistIds = [...new Set(filteredApts.map((a) => a.dentist_id).filter(Boolean))];
      const { data: dentists } = dentistIds.length
        ? await supabase.from('dentists').select('id, first_name, last_name').in('id', dentistIds)
        : { data: [] };
      const denMap = new Map((dentists ?? []).map((d) => [d.id, d]));

      // 6. Build rows
      const rows: AdminReminderRow[] = [];
      for (const r of reminders) {
        const apt = aptMap.get(r.appointment_id);
        if (!apt) continue; // filtered out by business or missing
        const patient = patMap.get(apt.patient_id);
        const dentist = denMap.get(apt.dentist_id);
        rows.push({
          reminder: r as AdminReminder,
          appointment_date: apt.appointment_date,
          appointment_status: apt.status,
          business_id: apt.business_id,
          business_name: bizMap.get(apt.business_id) ?? 'Unknown',
          patient_first_name: patient?.first_name ?? null,
          patient_last_name: patient?.last_name ?? null,
          dentist_first_name: dentist?.first_name ?? null,
          dentist_last_name: dentist?.last_name ?? null,
        });
      }

      return rows;
    },
    staleTime: 30_000,
  });
}

export function useBusinessList() {
  return useQuery({
    queryKey: ['admin-businesses-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 120_000,
  });
}
