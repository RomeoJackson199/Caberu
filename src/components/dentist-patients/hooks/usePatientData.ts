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


      // Fetch patient IDs from appointments, then profiles separately
      let appointmentQuery = supabase
        .from('appointments')
        .select('patient_id')
        .eq('dentist_id', dentistId);

      if (businessId) {
        appointmentQuery = appointmentQuery.eq('business_id', businessId);
      }

      const { data: appointmentData, error: appointmentError } = await appointmentQuery;

      if (appointmentError) throw appointmentError;

      const patientIds = [...new Set((appointmentData || []).map(a => a.patient_id).filter(Boolean))];
      const { data: profilesData } = patientIds.length > 0
        ? await supabase.from('profiles').select('id, first_name, last_name, email, phone, date_of_birth, address, medical_history, emergency_contact, avatar_url').in('id', patientIds)
        : { data: [] };

      const patientsFromAppointments = (profilesData || []).filter(Boolean) as DentistPatient[];

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

      // Fetch appointments scoped to current business
      let appointmentsQuery = supabase
        .from('appointments_decrypted')
        .select('*')
        .eq('patient_id', patientId)
        .eq('dentist_id', dentistId);

      if (businessId) {
        appointmentsQuery = appointmentsQuery.eq('business_id', businessId);
      }

      const { data: appointmentsData } = await appointmentsQuery;

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

      // Fetch treatment plans scoped to current business
      let treatmentQuery = supabase
        .from('treatment_plans_decrypted')
        .select('status')
        .eq('patient_id', patientId)
        .eq('dentist_id', dentistId);

      if (businessId) {
        treatmentQuery = treatmentQuery.eq('business_id', businessId);
      }

      const { data: treatmentData } = await treatmentQuery;

      const hasActiveTreatmentPlan = (treatmentData || []).some(t => t.status === 'active');

      // Fetch payment requests scoped to current business
      let outstandingCents = 0;
      try {
        let paymentQuery = supabase
          .from('payment_requests')
          .select('amount, status')
          .eq('patient_id', patientId)
          .eq('dentist_id', dentistId);

        if (businessId) {
          paymentQuery = paymentQuery.eq('business_id', businessId);
        }

        const { data: prs } = await paymentQuery;
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
  }, [dentistId, businessId]);

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
        .from('appointments_decrypted')
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