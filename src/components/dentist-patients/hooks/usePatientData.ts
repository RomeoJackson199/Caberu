import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DentistPatient, PatientFlags, PatientAppointment } from '../types';

interface UsePatientDataOptions {
  dentistId: string;
  businessId?: string;
}

export function usePatientData({ dentistId, businessId }: UsePatientDataOptions) {
  const [patients, setPatients] = useState<DentistPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientFlags, setPatientFlags] = useState<Record<string, PatientFlags>>({});

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

  const fetchPatientAppointments = useCallback(async (patientId: string): Promise<PatientAppointment[]> => {
    try {
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
      return (data || []) as PatientAppointment[];
    } catch (error) {
      console.error('Error fetching appointments:', error);
      return [];
    }
  }, [dentistId, businessId]);

  return {
    patients,
    loading,
    patientFlags,
    fetchPatients,
    fetchPatientFlags,
    fetchPatientAppointments
  };
}
