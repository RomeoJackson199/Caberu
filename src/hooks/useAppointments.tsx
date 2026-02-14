import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { utcToClinicTime, formatClinicTime } from '@/lib/timezone';
import { useBusinessContext } from './useBusinessContext';
import { logger } from '@/lib/logger';
import { handleEmailError } from '@/hooks/useEmailLimit';

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
  business_id?: string;
}): Promise<Appointment> {


  // Get business_id if not provided
  let businessId = appointmentData.business_id;
  if (!businessId) {
    try {
      // Try to get business_id from dentist's business membership
      const { data: dentistData, error: dentistErr } = await supabase
        .from('dentists')
        .select('profile_id')
        .eq('id', appointmentData.dentist_id)
        .single();

      if (dentistErr) {
        logger.warn('Could not fetch dentist profile for business_id resolution:', dentistErr);
      } else if (dentistData?.profile_id) {
        const { data: membership, error: membershipErr } = await supabase
          .from('business_members')
          .select('business_id')
          .eq('profile_id', dentistData.profile_id)
          .limit(1)
          .maybeSingle();

        if (membershipErr) {
          logger.warn('Could not fetch business membership:', membershipErr);
        } else {
          businessId = membership?.business_id;
        }
      }
    } catch (err) {
      logger.error('Error resolving business_id:', err);
    }
  }


  // Create the appointment
  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      ...appointmentData,
      business_id: businessId,
      status: appointmentData.status || 'confirmed',
      urgency: appointmentData.urgency || 'medium'
    })
    .select('id, patient_id, dentist_id, appointment_date, reason, notes, status, urgency, patient_name, duration_minutes, created_at, updated_at, business_id')
    .single();

  if (error) {
    logger.error('Failed to create appointment:', error);
    throw error;
  }


  // Fetch patient data separately for reliability
  const { data: patient, error: patientError } = await supabase
    .from('secure_profiles_view')
    .select('first_name, last_name, email, phone')
    .eq('id', appointment.patient_id)
    .single();

  if (patientError) {
    logger.error('Failed to fetch patient data for appointment notification:', patientError);

  }

  // Fetch dentist data separately
  const { data: dentist, error: dentistError } = await supabase
    .from('dentists')
    .select('profile_id, profiles(first_name, last_name)')
    .eq('id', appointment.dentist_id)
    .single();

  if (dentistError) {
    logger.error('Failed to fetch dentist data for appointment notification:', dentistError);

  }



  // Sync to Google Calendar
  try {
    await supabase.functions.invoke('google-calendar-create-event', {
      body: { appointmentId: appointment.id, action: 'create' }
    });
  } catch (calendarError) {
    logger.error('Failed to sync appointment to Google Calendar:', calendarError);
    // Don't fail the appointment creation if Google Calendar sync fails
  }

  // Send confirmation email to patient
  try {
    const dentistProfile = (dentist?.profiles as unknown) as { first_name: string; last_name: string } | null;



    if (patient?.email && dentistProfile) {
      const formattedDate = formatClinicTime(appointment.appointment_date, 'EEEE, MMMM d, yyyy');
      const formattedTime = formatClinicTime(appointment.appointment_date, 'h:mm a');

      const emailSubject = `Dr. ${dentistProfile.first_name} ${dentistProfile.last_name} has booked your appointment`;
      const emailMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2D5D7B; margin-bottom: 24px;">Your Dentist Has Scheduled an Appointment for You</h2>
          
          <p>Dear ${patient.first_name},</p>
          
          <p><strong>Dr. ${dentistProfile.first_name} ${dentistProfile.last_name}</strong> has scheduled a dental appointment for you. Here are the details:</p>
          
          <div style="background: #f8fafc; padding: 24px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e293b; margin: 0 0 16px 0;">📅 Appointment Details:</h3>
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
                <td style="padding: 8px 0; color: #1e293b;">Dr. ${dentistProfile.first_name} ${dentistProfile.last_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Reason:</td>
                <td style="padding: 8px 0; color: #1e293b;">${appointment.reason}</td>
              </tr>
            </table>
          </div>

          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #1e40af; margin: 0 0 12px 0;">📍 Please Remember:</h4>
            <ul style="color: #1e40af; margin: 0; padding-left: 20px;">
              <li>Arrive 10 minutes early for check-in</li>
              <li>Bring a valid ID and insurance card</li>
              <li>Contact us at least 24 hours in advance if you need to reschedule</li>
            </ul>
          </div>
          
          <p style="color: #059669; font-size: 14px; background: #d1fae5; padding: 12px; border-radius: 6px;">
            📧 You'll receive a reminder 24 hours before your appointment.
          </p>

          <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
            We look forward to seeing you!
          </p>
        </div>
      `;



      const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email-notification', {
        body: {
          to: patient.email,
          subject: emailSubject,
          message: emailMessage,
          messageType: 'appointment_confirmation',
          patientId: appointment.patient_id,
          dentistId: appointment.dentist_id,
          businessId: businessId,
          appointmentDate: formattedDate,
          appointmentTime: formattedTime,
          isSystemNotification: true
        }
      });

      if (emailError) {
        logger.error('Email sending failed:', emailError);
      } else {

        logger.info(`✅ Confirmation email sent to ${patient.email} for appointment ${appointment.id}`);
      }
    } else {
      logger.warn('Cannot send email - missing patient email or dentist profile');
    }
  } catch (emailError: unknown) {
    // Check if it's an email limit error and show popup
    if (!handleEmailError(emailError)) {
      logger.error('Failed to send appointment confirmation email:', emailError);
    }
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
          id,
          patient_id,
          dentist_id,
          appointment_date,
          reason,
          notes,
          status,
          urgency,
          patient_name,
          duration_minutes,
          created_at,
          updated_at,
          profiles:secure_profiles_view(
            first_name,
            last_name,
            email,
            phone
          ),
          dentists(
            profiles:secure_profiles_view(
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

  // Real-time subscriptions for appointments with optimized server-side filtering
  useEffect(() => {
    // Build filter string for server-side filtering
    let filter: string | undefined;

    if (businessId && params.dentistId) {
      // Filter by both business and dentist for maximum efficiency
      filter = `business_id=eq.${businessId},dentist_id=eq.${params.dentistId}`;
    } else if (businessId && params.patientId) {
      // Filter by both business and patient
      filter = `business_id=eq.${businessId},patient_id=eq.${params.patientId}`;
    } else if (params.dentistId) {
      filter = `dentist_id=eq.${params.dentistId}`;
    } else if (params.patientId) {
      filter = `patient_id=eq.${params.patientId}`;
    } else if (businessId) {
      // At minimum, filter by business to avoid cross-business updates
      filter = `business_id=eq.${businessId}`;
    }

    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: filter
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
  }, [params.dentistId, params.patientId, businessId, fetchAppointments]);

  return {
    appointments,
    counts,
    loading,
    error,
    refetch,
    updateAppointment
  };
}