import { supabase } from '@/integrations/supabase/client';
import { format, addDays, parseISO, isAfter, isBefore } from 'date-fns';
import { getCurrentBusinessId } from '@/lib/businessScopedSupabase';
import { fetchDentistAvailability } from './appointmentAvailability';
import { getRecommendedSlots, RecommendedSlot } from './smartScheduling';
import { logger } from '@/lib/logger';
import { NotificationService } from '@/lib/notificationService';

export interface RescheduleSuggestion {
  date: Date;
  slot: RecommendedSlot;
  rank: number; // 1-3, best to worst
}

export interface RescheduleOptions {
  reason: 'dentist_vacation' | 'dentist_cancelled' | 'patient_requested' | 'emergency';
  searchDays?: number; // How many days ahead to search (default: 14)
  sameDentist?: boolean; // Must be same dentist (default: true)
  minScore?: number; // Minimum slot score to suggest (default: 60)
}

/**
 * Finds the best alternative slots for rescheduling an appointment
 * Returns top 3 recommendations based on patient preferences and availability
 */
export async function findRescheduleOptions(
  appointmentId: string,
  options: RescheduleOptions = { reason: 'patient_requested' }
): Promise<RescheduleSuggestion[]> {
  const businessId = await getCurrentBusinessId();

  // Get original appointment details
  const { data: appointment, error: aptError } = await supabase
    .from('appointments_decrypted' as any)
    .select(`
      *,
      appointment_type_id,
      patient_id,
      dentist_id
    `)
    .eq('id', appointmentId)
    .single();

  if (aptError || !appointment) {
    logger.error('Error fetching appointment:', aptError);
    return [];
  }

  const searchDays = options.searchDays || 14;
  const sameDentist = options.sameDentist !== false; // default true
  const minScore = options.minScore || 60;

  // Search for available slots across multiple days
  const suggestions: RescheduleSuggestion[] = [];
  const originalDate = parseISO(appointment.appointment_date);

  for (let i = 1; i <= searchDays; i++) {
    const checkDate = addDays(originalDate, i);

    // Get available slots for this date
    const availableSlots = await fetchDentistAvailability(
      appointment.dentist_id,
      checkDate
    );

    // Get intelligent recommendations
    const recommendedSlots = await getRecommendedSlots(
      appointment.dentist_id,
      appointment.patient_id,
      checkDate,
      availableSlots,
      appointment.appointment_type_id
    );

    // Take top slots that meet minimum score
    const topSlots = recommendedSlots
      .filter(slot => slot.score >= minScore && slot.available)
      .slice(0, 3);

    for (const slot of topSlots) {
      suggestions.push({
        date: checkDate,
        slot,
        rank: suggestions.length + 1
      });
    }

    // Stop searching if we have enough suggestions
    if (suggestions.length >= 5) break;
  }

  // Sort by score and take top 3
  suggestions.sort((a, b) => b.slot.score - a.slot.score);
  const topSuggestions = suggestions.slice(0, 3);

  // Update ranks
  topSuggestions.forEach((suggestion, index) => {
    suggestion.rank = index + 1;
  });

  // Log the suggestions
  await logRescheduleSuggestions(appointmentId, topSuggestions, options.reason);

  return topSuggestions;
}

/**
 * Logs reschedule suggestions for analytics
 */
async function logRescheduleSuggestions(
  appointmentId: string,
  suggestions: RescheduleSuggestion[],
  reason: string
): Promise<void> {
  const businessId = await getCurrentBusinessId();

  const { error } = await supabase
    .from('reschedule_suggestions')
    .insert({
      original_appointment_id: appointmentId,
      business_id: businessId,
      reason,
      suggested_slots: suggestions.map(s => ({
        date: format(s.date, 'yyyy-MM-dd'),
        time: s.slot.time,
        score: s.slot.score,
        reasons: s.slot.reasons,
        rank: s.rank
      }))
    });

  if (error) {
    logger.error('Failed to log reschedule suggestions:', error);
  }
}

/**
 * Auto-reschedules an appointment to a suggested slot
 */
export async function autoRescheduleAppointment(
  appointmentId: string,
  newDateTime: Date,
  notifyPatient: boolean = true
): Promise<{ success: boolean; error?: string }> {
  const businessId = await getCurrentBusinessId();

  // Update appointment date
  const { error: updateError } = await supabase
    .from('appointments')
    .update({
      appointment_date: newDateTime.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', appointmentId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Update the reschedule suggestion log
  const { error: suggestionError } = await supabase
    .from('reschedule_suggestions')
    .update({
      accepted_slot: newDateTime.toISOString(),
      accepted_at: new Date().toISOString(),
      was_auto_rescheduled: true
    })
    .eq('original_appointment_id', appointmentId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (suggestionError) {
    logger.error('Failed to update reschedule suggestion log:', suggestionError);
    // Don't fail the reschedule if logging fails
  }

  // Trigger notification if requested
  if (notifyPatient) {
    try {
      const { data: appointment } = await supabase
        .from('appointments_decrypted')
        .select('patient_id, appointment_date')
        .eq('id', appointmentId)
        .single();

      if (appointment) {
        await NotificationService.createNotification(
          appointment.patient_id,
          'Appointment Rescheduled',
          `Your appointment has been rescheduled to ${format(newDateTime, 'PPP p')}`,
          'appointment_rescheduled',
          'info',
          undefined,
          {
            appointmentId,
            newDateTime: newDateTime.toISOString()
          }
        );
      }
    } catch (notifError) {
      logger.error('Failed to send reschedule notification:', notifError);
      // Don't fail the reschedule if notification fails
    }
  }

  return { success: true };
}

/**
 * Handles bulk rescheduling (e.g., when dentist goes on vacation)
 * Finds best alternatives for all affected appointments
 */
export async function bulkRescheduleForDentist(
  dentistId: string,
  startDate: Date,
  endDate: Date,
  reason: string = 'dentist_vacation'
): Promise<{
  total: number;
  processed: number;
  suggestions: Map<string, RescheduleSuggestion[]>;
}> {
  const businessId = await getCurrentBusinessId();

  // Get all appointments in the date range
  const { data: appointments, error } = await supabase
    .from('appointments_decrypted')
    .select('id, appointment_date, patient_id')
    .eq('dentist_id', dentistId)
    .eq('business_id', businessId)
    .gte('appointment_date', startDate.toISOString())
    .lte('appointment_date', endDate.toISOString())
    .neq('status', 'cancelled');

  if (error || !appointments) {
    return { total: 0, processed: 0, suggestions: new Map() };
  }

  const suggestions = new Map<string, RescheduleSuggestion[]>();

  for (const appointment of appointments) {
    const options = await findRescheduleOptions(appointment.id, {
      reason: reason as any,
      searchDays: 21, // Look further ahead for bulk reschedule
      sameDentist: true
    });

    suggestions.set(appointment.id, options);
  }

  return {
    total: appointments.length,
    processed: suggestions.size,
    suggestions
  };
}

/**
 * Finds alternative dentists if the preferred dentist is not available
 */
export async function findAlternativeDentists(
  originalDentistId: string,
  date: Date,
  appointmentTypeId?: string
): Promise<Array<{ dentistId: string; name: string; availableSlots: number }>> {
  const businessId = await getCurrentBusinessId();

  // Get all active dentists in the same business
  const { data: dentists, error } = await supabase
    .from('dentists')
    .select(`
      id,
      profiles (
        first_name,
        last_name
      )
    `)
    .eq('business_id', businessId)
    .eq('is_active', true)
    .neq('id', originalDentistId);

  if (error || !dentists) {
    return [];
  }

  // Check availability for each dentist
  const alternatives = await Promise.all(
    dentists.map(async (dentist) => {
      const slots = await fetchDentistAvailability(dentist.id, date);
      const availableCount = slots.filter(s => s.available).length;

      const profile = dentist.profiles as any;
      return {
        dentistId: dentist.id,
        name: `${profile.first_name} ${profile.last_name}`,
        availableSlots: availableCount
      };
    })
  );

  // Filter and sort by availability
  return alternatives
    .filter(alt => alt.availableSlots > 0)
    .sort((a, b) => b.availableSlots - a.availableSlots);
}

/**
 * Sends reschedule suggestions to patient via notification
 */
export async function sendRescheduleSuggestions(
  appointmentId: string,
  suggestions: RescheduleSuggestion[]
): Promise<{ success: boolean; error?: string }> {
  // Get appointment and patient details
  const { data: appointment, error } = await supabase
    .from('appointments_decrypted')
    .select(`
      id,
      patient_id,
      profiles (
        email,
        first_name,
        phone
      )
    `)
    .eq('id', appointmentId)
    .single();

  if (error || !appointment) {
    return { success: false, error: 'Appointment not found' };
  }

  const patient = appointment.profiles as any;

  // Format suggestions for notification
  const suggestionText = suggestions
    .map((s, i) => `${i + 1}. ${format(s.date, 'EEEE, MMMM d')} at ${s.slot.time}`)
    .join('\n');

  // Send notification through notification service
  try {
    await NotificationService.createNotification(
      appointment.patient_id,
      'Appointment Rescheduling Options',
      `Your appointment needs to be rescheduled. Here are some suggested times:\n\n${suggestionText}\n\nPlease contact us to confirm.`,
      'appointment_reschedule',
      'info',
      undefined,
      {
        appointmentId,
        suggestions: suggestions.map(s => ({
          date: format(s.date, 'yyyy-MM-dd'),
          time: s.slot.time
        }))
      }
    );
  } catch (notifError) {
    logger.error('Failed to send reschedule suggestions notification:', notifError);
    return { success: false, error: 'Failed to send notification' };
  }

  return { success: true };
}

/**
 * Checks if a patient has any upcoming appointments that need rescheduling
 */
export async function getPatientRescheduleNeeds(
  patientId: string
): Promise<Array<{
  appointmentId: string;
  originalDate: Date;
  suggestions: RescheduleSuggestion[];
}>> {
  const businessId = await getCurrentBusinessId();

  // Find appointments with pending reschedule suggestions
  const { data: suggestions, error } = await supabase
    .from('reschedule_suggestions')
    .select(`
      original_appointment_id,
      suggested_slots,
      created_at,
      accepted_slot,
      appointments (
        appointment_date,
        patient_id
      )
    `)
    .eq('business_id', businessId)
    .is('accepted_slot', null) // Not yet accepted
    .order('created_at', { ascending: false });

  if (error || !suggestions) {
    return [];
  }

  // Filter for this patient and parse suggestions
  return suggestions
    .filter(s => (s.appointments as any)?.patient_id === patientId)
    .map(s => ({
      appointmentId: s.original_appointment_id,
      originalDate: parseISO((s.appointments as any).appointment_date),
      suggestions: (s.suggested_slots as any[]).map((slot, index) => ({
        date: parseISO(slot.date),
        slot: {
          time: slot.time,
          available: true,
          score: slot.score,
          reasons: slot.reasons,
          isRecommended: slot.score >= 70
        },
        rank: index + 1
      }))
    }));
}

/**
 * Accepts a reschedule suggestion and updates the appointment
 */
export async function acceptRescheduleSuggestion(
  appointmentId: string,
  selectedDate: Date,
  selectedTime: string
): Promise<{ success: boolean; error?: string }> {
  const dateTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}`);

  const result = await autoRescheduleAppointment(appointmentId, dateTime, true);

  if (result.success) {
    // Mark suggestion as accepted
    const { error } = await supabase
      .from('reschedule_suggestions')
      .update({
        accepted_slot: dateTime.toISOString(),
        accepted_at: new Date().toISOString()
      })
      .eq('original_appointment_id', appointmentId)
      .is('accepted_slot', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      logger.error('Failed to mark reschedule suggestion as accepted:', error);
      // Don't fail the operation if marking fails
    }
  }

  return result;
}
