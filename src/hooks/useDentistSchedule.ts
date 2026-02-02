/**
 * Shared data fetching hook for dentist schedule
 * Consolidates schedule loading logic across components
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, addDays } from 'date-fns';

interface DentistAvailability {
  id: string;
  dentist_id: string;
  business_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  break_start_time: string | null;
  break_end_time: string | null;
}

interface DentistDateOverride {
  id: string;
  dentist_id: string;
  business_id: string;
  override_date: string;
  is_available: boolean | null;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

interface AppointmentSlot {
  id: string;
  dentist_id: string;
  business_id: string;
  slot_date: string;
  slot_time: string;
  is_available: boolean | null;
  appointment_id: string | null;
}

/**
 * Fetch dentist weekly availability pattern
 */
export function useDentistAvailability(dentistId: string | null | undefined, businessId: string | null | undefined) {
  return useQuery({
    queryKey: ['dentist-availability', dentistId, businessId],
    queryFn: async (): Promise<DentistAvailability[]> => {
      if (!dentistId || !businessId) return [];
      
      const { data, error } = await supabase
        .from('dentist_availability')
        .select('*')
        .eq('dentist_id', dentistId)
        .eq('business_id', businessId)
        .order('day_of_week');
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!dentistId && !!businessId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch dentist date-specific overrides
 */
export function useDentistDateOverrides(
  dentistId: string | null | undefined, 
  businessId: string | null | undefined,
  startDate: Date,
  endDate: Date
) {
  return useQuery({
    queryKey: ['dentist-overrides', dentistId, businessId, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async (): Promise<DentistDateOverride[]> => {
      if (!dentistId || !businessId) return [];
      
      const { data, error } = await supabase
        .from('dentist_date_overrides')
        .select('*')
        .eq('dentist_id', dentistId)
        .eq('business_id', businessId)
        .gte('override_date', format(startDate, 'yyyy-MM-dd'))
        .lte('override_date', format(endDate, 'yyyy-MM-dd'));
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!dentistId && !!businessId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch appointment slots for a date range
 */
export function useAppointmentSlots(
  dentistId: string | null | undefined,
  businessId: string | null | undefined,
  date: Date
) {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['appointment-slots', dentistId, businessId, dateStr],
    queryFn: async (): Promise<AppointmentSlot[]> => {
      if (!dentistId || !businessId) return [];
      
      const { data, error } = await supabase
        .from('appointment_slots')
        .select('*')
        .eq('dentist_id', dentistId)
        .eq('business_id', businessId)
        .eq('slot_date', dateStr)
        .order('slot_time');
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!dentistId && !!businessId,
    staleTime: 1 * 60 * 1000, // 1 minute - slots can change frequently
  });
}

/**
 * Fetch dentist vacation days
 */
export function useDentistVacations(
  dentistId: string | null | undefined,
  businessId: string | null | undefined,
  startDate?: Date,
  endDate?: Date
) {
  const start = startDate || new Date();
  const end = endDate || addDays(new Date(), 90);
  
  return useQuery({
    queryKey: ['dentist-vacations', dentistId, businessId, format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!dentistId || !businessId) return [];
      
      const { data, error } = await supabase
        .from('dentist_vacation_days')
        .select('*')
        .eq('dentist_id', dentistId)
        .eq('business_id', businessId)
        .gte('end_date', format(start, 'yyyy-MM-dd'))
        .lte('start_date', format(end, 'yyyy-MM-dd'))
        .eq('is_approved', true);
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!dentistId && !!businessId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Check if a specific date is blocked (vacation or override)
 */
export function isDateBlocked(
  date: Date,
  overrides: DentistDateOverride[],
  vacations: Array<{ start_date: string; end_date: string }>
): boolean {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  // Check overrides
  const override = overrides.find(o => o.override_date === dateStr);
  if (override && override.is_available === false) return true;
  
  // Check vacations
  for (const vacation of vacations) {
    if (dateStr >= vacation.start_date && dateStr <= vacation.end_date) {
      return true;
    }
  }
  
  return false;
}
