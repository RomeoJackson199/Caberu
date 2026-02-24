import { useQuery } from '@tanstack/react-query';
import { addDays, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export interface AppointmentReminder {
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

export interface AppointmentWithReminders {
  id: string;
  patient_id: string;
  dentist_id: string;
  appointment_date: string;
  reason: string | null;
  status: string;
  duration_minutes: number | null;
  patient: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  reminders: AppointmentReminder[];
}

interface UseAppointmentRemindersParams {
  dentistId?: string | null;
  businessId: string | null;
  daysAhead?: number;
}

export function useAppointmentReminders({
  dentistId,
  businessId,
  daysAhead = 7,
}: UseAppointmentRemindersParams) {
  return useQuery({
    queryKey: ['appointment-reminders-map', dentistId ?? null, businessId, daysAhead],
    queryFn: async (): Promise<AppointmentWithReminders[]> => {
      if (!businessId) return [];

      const from = startOfDay(new Date()).toISOString();
      const to = addDays(new Date(), daysAhead).toISOString();

      // Fetch upcoming appointments
      let query = supabase
        .from('appointments_decrypted')
        .select('id, patient_id, dentist_id, appointment_date, reason, status, duration_minutes')
        .eq('business_id', businessId)
        .gte('appointment_date', from)
        .lte('appointment_date', to)
        .not('status', 'eq', 'cancelled')
        .order('appointment_date', { ascending: true });

      if (dentistId) {
        query = query.eq('dentist_id', dentistId);
      }

      const { data: appointments, error: aptError } = await query;

      if (aptError) throw aptError;
      if (!appointments?.length) return [];

      // Fetch patient profiles
      const patientIds = [...new Set(appointments.map((a) => a.patient_id).filter(Boolean))];
      const { data: profiles } = patientIds.length
        ? await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .in('id', patientIds)
        : { data: [] };

      // Fetch reminders for these appointments
      const appointmentIds = appointments.map((a) => a.id);
      const { data: reminders, error: remindersError } = await supabase
        .from('appointment_reminders')
        .select('*')
        .in('appointment_id', appointmentIds);

      if (remindersError) throw remindersError;

      // Build Map<appointmentId, AppointmentReminder[]>
      const remindersMap = new Map<string, AppointmentReminder[]>();
      for (const reminder of reminders ?? []) {
        const existing = remindersMap.get(reminder.appointment_id) ?? [];
        existing.push(reminder as AppointmentReminder);
        remindersMap.set(reminder.appointment_id, existing);
      }

      // Build Map<profileId, profile>
      const profilesMap = new Map((profiles ?? []).map((p) => [p.id, p]));

      return appointments.map((apt) => ({
        id: apt.id,
        patient_id: apt.patient_id,
        dentist_id: apt.dentist_id,
        appointment_date: apt.appointment_date,
        reason: apt.reason ?? null,
        status: apt.status,
        duration_minutes: apt.duration_minutes ?? null,
        patient: profilesMap.get(apt.patient_id) ?? null,
        reminders: remindersMap.get(apt.id) ?? [],
      }));
    },
    enabled: !!businessId,
    staleTime: 60_000,
  });
}
