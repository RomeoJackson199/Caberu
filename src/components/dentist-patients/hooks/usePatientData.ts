import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DentistPatient, PatientFlags, PatientAppointment } from '../types';

interface UsePatientDataOptions {
  dentistId: string;
  businessId?: string;
}

const APPOINTMENTS_PAGE_SIZE = 10;

export function usePatientData({ dentistId, businessId }: UsePatientDataOptions) {
  const [patients, setPatients] = useState<DentistPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientFlags, setPatientFlags] = useState<Record<string, PatientFlags>>({});
  const [appointmentsCache, setAppointmentsCache] = useState<Record<string, {
    appointments: PatientAppointment[];
    hasMore: boolean;
    loading: boolean;
  }>>({});

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[usePatientData] Fetching patients for dentist:', dentistId, 'business:', businessId);

      let appointmentQuery = supabase
        .from('appointments')
        .select(`
          patient_id,
          profiles!appointments_patient_id_fkey (
            id, first_name, last_name, email, phone, date_of_birth,
            address, medical_history, emergency_contact, profile_picture_url
          )
        `)
        .eq('dentist_id', dentistId);

      if (businessId) {
        appointmentQuery = appointmentQuery.eq('business_id', businessId);
      }

      const { data: appointmentData, error: appointmentError } = await appointmentQuery;
      
      console.log('[usePatientData] Appointment data:', appointmentData, 'Error:', appointmentError);
      
      if (appointmentError) throw appointmentError;

      const patientsFromAppointments = (appointmentData || [])
        .map(apt => Array.isArray(apt.profiles) ? apt.profiles[0] : apt.profiles)
        .filter(Boolean) as DentistPatient[];

      // Remove duplicates
      const uniquePatients = patientsFromAppointments.filter((patient, index, self) =>
        patient && self.findIndex(p => p?.id === patient.id) === index
      );

      console.log('[usePatientData] Unique patients:', uniquePatients.length);
      
      setPatients(uniquePatients);
      
      // Fetch flags for all patients
      uniquePatients.forEach(patient => fetchPatientFlags(patient.id));
      
      return uniquePatients;
    } catch (error) {
      console.error('[usePatientData] Error fetching patients:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [dentistId, businessId]);

  const fetchPatientFlags = useCallback(async (patientId: string) => {
    try {
      const now = new Date();

      // Fetch appointments
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .eq('dentist_id', dentistId);

      const hasUpcomingAppointment = (appointmentsData || []).some(a => {
        try { return new Date(a.appointment_date) > now && a.status !== 'cancelled'; } catch { return false; }
      });

      const lastVisitDate = (appointmentsData || [])
        .filter(a => a.status === 'completed')
        .map(a => a.appointment_date)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

      const nextAppointmentDate = (appointmentsData || [])
        .filter(a => new Date(a.appointment_date) > now && a.status !== 'cancelled')
        .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())[0]?.appointment_date;

      // Fetch treatment plans
      const { data: treatmentData } = await supabase
        .from('treatment_plans')
        .select('status')
        .eq('patient_id', patientId)
        .eq('dentist_id', dentistId);

      const hasActiveTreatmentPlan = (treatmentData || []).some(t => t.status === 'active');

      // Fetch payment requests
      let outstandingCents = 0;
      try {
        const { data: prs } = await supabase
          .from('payment_requests')
          .select('amount, status')
          .eq('patient_id', patientId)
          .eq('dentist_id', dentistId);
        outstandingCents = (prs || [])
          .filter((p: any) => p.status !== 'paid' && p.status !== 'cancelled')
          .reduce((s: number, p: any) => s + (p.amount || 0), 0);
      } catch { }

      const flags: PatientFlags = {
        hasUnpaidBalance: outstandingCents > 0,
        outstandingCents,
        hasUpcomingAppointment,
        hasActiveTreatmentPlan,
        lastVisitDate,
        nextAppointmentDate,
        totalAppointments: (appointmentsData || []).length,
        completedAppointments: (appointmentsData || []).filter(a => a.status === 'completed').length
      };

      setPatientFlags(prev => ({ ...prev, [patientId]: flags }));
      return flags;
    } catch (error) {
      console.error('Error fetching patient flags:', error);
      return null;
    }
  }, [dentistId]);

  const fetchPatientAppointments = useCallback(async (
    patientId: string, 
    loadMore: boolean = false
  ): Promise<{ appointments: PatientAppointment[]; hasMore: boolean }> => {
    try {
      // Use functional state update to avoid stale closure with appointmentsCache
      let offset = 0;
      
      if (loadMore) {
        // Get current offset from state
        const currentCacheSnap = appointmentsCache[patientId];
        offset = currentCacheSnap?.appointments?.length || 0;
      }
      
      // Set loading state
      setAppointmentsCache(prev => ({
        ...prev,
        [patientId]: {
          appointments: loadMore ? (prev[patientId]?.appointments || []) : [],
          hasMore: prev[patientId]?.hasMore ?? true,
          loading: true
        }
      }));

      let query = supabase
        .from('appointments')
        .select('*', { count: 'exact' })
        .eq('patient_id', patientId)
        .eq('dentist_id', dentistId);

      if (businessId) {
        query = query.eq('business_id', businessId);
      }

      const { data, error, count } = await query
        .order('appointment_date', { ascending: false })
        .range(offset, offset + APPOINTMENTS_PAGE_SIZE - 1);
      
      if (error) throw error;
      
      const newAppointments = (data || []) as PatientAppointment[];
      
      // Use functional update to get latest state
      let result = { appointments: [] as PatientAppointment[], hasMore: false };
      
      setAppointmentsCache(prev => {
        const existingAppointments = loadMore && prev[patientId] ? prev[patientId].appointments : [];
        const allAppointments = [...existingAppointments, ...newAppointments];
        const hasMore = count ? allAppointments.length < count : false;
        
        result = { appointments: allAppointments, hasMore };
        
        return {
          ...prev,
          [patientId]: {
            appointments: allAppointments,
            hasMore,
            loading: false
          }
        };
      });

      return result;
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointmentsCache(prev => ({
        ...prev,
        [patientId]: {
          appointments: prev[patientId]?.appointments || [],
          hasMore: false,
          loading: false
        }
      }));
      return { appointments: [], hasMore: false };
    }
  // Remove appointmentsCache from dependencies to avoid infinite loop
  }, [dentistId, businessId]);

  // Optimistic update for appointment status
  const updateAppointmentOptimistically = useCallback((
    patientId: string,
    appointmentId: string,
    updates: Partial<PatientAppointment>
  ) => {
    setAppointmentsCache(prev => {
      const cache = prev[patientId];
      if (!cache) return prev;
      
      return {
        ...prev,
        [patientId]: {
          ...cache,
          appointments: cache.appointments.map(apt =>
            apt.id === appointmentId ? { ...apt, ...updates } : apt
          )
        }
      };
    });
  }, []);

  // Rollback optimistic update
  const rollbackAppointmentUpdate = useCallback((
    patientId: string,
    appointmentId: string,
    originalAppointment: PatientAppointment
  ) => {
    setAppointmentsCache(prev => {
      const cache = prev[patientId];
      if (!cache) return prev;
      
      return {
        ...prev,
        [patientId]: {
          ...cache,
          appointments: cache.appointments.map(apt =>
            apt.id === appointmentId ? originalAppointment : apt
          )
        }
      };
    });
  }, []);

  const getPatientAppointmentsCache = useCallback((patientId: string) => {
    return appointmentsCache[patientId] || { appointments: [], hasMore: true, loading: false };
  }, [appointmentsCache]);

  return {
    patients,
    loading,
    patientFlags,
    fetchPatients,
    fetchPatientFlags,
    fetchPatientAppointments,
    getPatientAppointmentsCache,
    updateAppointmentOptimistically,
    rollbackAppointmentUpdate
  };
}