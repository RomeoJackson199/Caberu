import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { utcToClinicTime } from '@/lib/timezone';
import { useBusinessContext } from './useBusinessContext';
import { logger } from '@/lib/logger';

export interface Appointment {
  id: string;
  patient_id: string;
  dentist_id: string;
  appointment_date: string;
  reason: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  urgency: 'low' | 'medium' | 'high';
  patient_name?: string;
  duration_minutes?: number;
  created_at: string;
  updated_at: string;

  // Related data
  patient?: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  dentist?: {
    profiles: {
      first_name: string;
      last_name: string;
    };
  };
}

export interface AppointmentCounts {
  today: number;
  upcoming: number;
  completed: number;
  total: number;
}

interface UseAppointmentsParams {
  role: 'patient' | 'dentist';
  userId?: string;
  dentistId?: string;
  patientId?: string;
  status?: string[];
  fromDate?: Date;
  toDate?: Date;
  autoRefresh?: boolean;
}

interface UseAppointmentsReturn {
  appointments: Appointment[];
  counts: AppointmentCounts;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<void>;
}

// Enhanced appointment creation with email notifications
export async function createAppointmentWithNotification(appointmentData: {
  patient_id: string;
  dentist_id: string;
  appointment_date: string;
  reason: string;
  notes?: string;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  urgency?: 'low' | 'medium' | 'high';
  patient_name?: string;
  duration_minutes?: number;
}): Promise<Appointment> {

  // Create the appointment
  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      ...appointmentData,
      status: appointmentData.status || 'confirmed',
      urgency: appointmentData.urgency || 'medium'
    })
    .select(`
      *,
      profiles(
        first_name,
        last_name,
        email,
        phone
      ),
      dentists(
        profiles(
          first_name,
          last_name
        )
      )
    `)
    .single();

  if (error) throw error;

  // Sync to Google Calendar
  try {
    await supabase.functions.invoke('google-calendar-create-event', {
      body: { appointmentId: appointment.id, action: 'create' }
    });
  } catch (calendarError) {
    logger.error('Failed to sync appointment to Google Calendar:', calendarError);
    // Don't fail the appointment creation if Google Calendar sync fails
  }

  // Send confirmation email
  try {
    const patient = appointment.patient;
    const dentist = appointment.dentist;

    if (patient?.email && dentist?.profiles) {
      const appointmentDate = new Date(appointment.appointment_date);
      const formattedDate = appointmentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      const emailSubject = `Appointment Confirmation - ${formattedDate} at ${formattedTime}`;
      const emailMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2D5D7B; margin-bottom: 24px;">Your Appointment is Confirmed!</h2>
          
          <div style="background: #f8fafc; padding: 24px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e293b; margin: 0 0 16px 0;">Appointment Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Date:</td>
                <td style="padding: 8px 0; color: #1e293b;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Time:</td>
                <td style="padding: 8px 0; color: #1e293b;">${formattedTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Dentist:</td>
                <td style="padding: 8px 0; color: #1e293b;">Dr. ${dentist.profiles.first_name} ${dentist.profiles.last_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Reason:</td>
                <td style="padding: 8px 0; color: #1e293b;">${appointment.reason}</td>
              </tr>
            </table>
          </div>

          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #1e40af; margin: 0 0 12px 0;">📍 Important Notes:</h4>
            <ul style="color: #1e40af; margin: 0; padding-left: 20px;">
              <li>Please arrive 10 minutes early for check-in</li>
              <li>Bring a valid ID and insurance card</li>
              <li>If you need to reschedule, please call us at least 24 hours in advance</li>
            </ul>
          </div>

          <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
            Thank you for choosing our dental practice. We look forward to seeing you soon!
          </p>
        </div>
      `;

      await supabase.functions.invoke('send-email-notification', {
        body: {
          to: patient.email,
          subject: emailSubject,
          message: emailMessage,
          messageType: 'appointment_confirmation',
          patientId: appointment.patient_id,
          dentistId: appointment.dentist_id,
          isSystemNotification: true,
          appointmentDate: formattedDate,
          appointmentTime: formattedTime
        }
      });
    }
  } catch (emailError) {
    logger.error('Failed to send appointment confirmation email:', emailError);
    // Don't fail the appointment creation if email fails
  }

  return appointment as Appointment;
}

export function useAppointments(params: UseAppointmentsParams): UseAppointmentsReturn {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [counts, setCounts] = useState<AppointmentCounts>({
    today: 0,
    upcoming: 0,
    completed: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { businessId } = useBusinessContext();

  const calculateCounts = (appointmentsList: Appointment[]): AppointmentCounts => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    return {
      today: appointmentsList.filter(apt => {
        const aptDate = utcToClinicTime(new Date(apt.appointment_date));
        return aptDate >= today && aptDate < tomorrow && apt.status !== 'cancelled';
      }).length,
      upcoming: appointmentsList.filter(apt => {
        const aptDate = utcToClinicTime(new Date(apt.appointment_date));
        return aptDate >= now && apt.status !== 'cancelled' && apt.status !== 'completed';
      }).length,
      completed: appointmentsList.filter(apt => apt.status === 'completed').length,
      total: appointmentsList.length
    };
  };

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('appointments')
        .select(`
          *,
          profiles(
            first_name,
            last_name,
            email,
            phone
          ),
          dentists(
            profiles(
              first_name,
              last_name
            )
          )
        `);

      // Apply filters based on role and parameters
      if (params.role === 'patient' && params.patientId) {
        query = query.eq('patient_id', params.patientId);
        // Filter by current business for patients
        if (businessId) {
          query = query.eq('business_id', businessId);
        }
      } else if (params.role === 'dentist' && params.dentistId) {
        query = query.eq('dentist_id', params.dentistId);
        // Filter by current business for dentists
        if (businessId) {
          query = query.eq('business_id', businessId);
        }
      }

      if (params.status && params.status.length > 0) {
        query = query.in('status', params.status as ('pending' | 'confirmed' | 'cancelled' | 'completed')[]);
      }

      if (params.fromDate) {
        query = query.gte('appointment_date', params.fromDate.toISOString());
      }

      if (params.toDate) {
        query = query.lte('appointment_date', params.toDate.toISOString());
      }

      query = query.order('appointment_date', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;

      const appointmentsList = (data || []) as Appointment[];
      setAppointments(appointmentsList);
      setCounts(calculateCounts(appointmentsList));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch appointments';
      setError(errorMessage);
      logger.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  }, [params.role, params.patientId, params.dentistId, params.status, params.fromDate, params.toDate, businessId]);

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Sync update to Google Calendar
      try {
        await supabase.functions.invoke('google-calendar-create-event', {
          body: { appointmentId: id, action: 'update' }
        });
      } catch (calendarError) {
        logger.error('Failed to sync appointment update to Google Calendar:', calendarError);
      }

      // Optimistically update local state
      setAppointments(prev =>
        prev.map(apt =>
          apt.id === id ? { ...apt, ...updates } : apt
        )
      );

      // Recalculate counts
      const updatedAppointments = appointments.map(apt =>
        apt.id === id ? { ...apt, ...updates } : apt
      );
      setCounts(calculateCounts(updatedAppointments));

      toast({
        title: "Success",
        description: "Appointment updated successfully",
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update appointment';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const refetch = useCallback(async () => {
    await fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!params.autoRefresh) return;

    const interval = setInterval(() => {
      fetchAppointments();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [params.autoRefresh, fetchAppointments]);

  // Real-time subscriptions for appointments
  useEffect(() => {
    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: params.dentistId
            ? `dentist_id=eq.${params.dentistId}`
            : params.patientId
              ? `patient_id=eq.${params.patientId}`
              : undefined
        },
        () => {
          // Refetch data when changes occur
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.dentistId, params.patientId, fetchAppointments]);

  return {
    appointments,
    counts,
    loading,
    error,
    refetch,
    updateAppointment
  };
}