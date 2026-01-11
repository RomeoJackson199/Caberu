import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DentistPatient, PatientFlags, PatientAppointment } from '../types';

interface UsePatientDataOptions {
  dentistId: string;
  businessId?: string;
}

const APPOINTMENTS_PAGE_SIZE = 50; // Fetch more to ensure all status groups are populated

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


      let appointmentQuery = supabase
        .from('appointments')
        .select(`
          patient_id,
          secure_profiles_view!appointments_patient_id_fkey (
            id, first_name, last_name, email, phone, date_of_birth,
            address, medical_history, emergency_contact, profile_picture_url
          )
        `)
        .eq('dentist_id', dentistId);

      if (businessId) {
        appointmentQuery = appointmentQuery.eq('business_id', businessId);
      }

      const { data: appointmentData, error: appointmentError } = await appointmentQuery;



      if (appointmentError) throw appointmentError;

      const patientsFromAppointments = (appointmentData || [])
        .map(apt => Array.isArray(apt.secure_profiles_view) ? apt.secure_profiles_view[0] : apt.secure_profiles_view)
        .filter(Boolean) as DentistPatient[];

      // Remove duplicates
      const uniquePatients = patientsFromAppointments.filter((patient, index, self) =>
        patient && self.findIndex(p => p?.id === patient.id) === index
      );



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
          .filter((p) => p.status !== 'paid' && p.status !== 'cancelled')
          .reduce((s: number, p) => s + (p.amount || 0), 0);
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
    _loadMore: boolean = false // kept for API compatibility
  ): Promise<{ appointments: PatientAppointment[]; hasMore: boolean }> => {
    try {
      // Set loading state
      setAppointmentsCache(prev => ({
        ...prev,
        [patientId]: {
          appointments: prev[patientId]?.appointments || [],
          hasMore: false,
          loading: true
        }
      }));

      let query = supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .eq('dentist_id', dentistId);

      if (businessId) {
        query = query.eq('business_id', businessId);
      }

      const { data, error } = await query.order('appointment_date', { ascending: false });

      if (error) throw error;

      const appointments = (data || []) as PatientAppointment[];

      setAppointmentsCache(prev => ({
        ...prev,
        [patientId]: {
          appointments,
          hasMore: false,
          loading: false
        }
      }));

      return { appointments, hasMore: false };
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