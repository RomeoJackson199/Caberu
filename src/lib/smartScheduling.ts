import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, addMinutes, getHours, getDay } from 'date-fns';
import { getCurrentBusinessId } from '@/lib/businessScopedSupabase';
import { TimeSlot } from './appointmentAvailability';
import { getGeminiSlotRecommendations, GeminiSlotRecommendation } from './geminiAI';
import { logger } from '@/lib/logger';

// Stub functions - slot tracking was unused, provide minimal implementation
function isSlotUnderutilized(_dentistId: string, _date: Date, _slotTime: string): boolean {
  return false;
}

async function updateSlotStatisticsAfterBooking(_dentistId: string): Promise<void> {
  // No-op: slot statistics tracking removed
}

async function calculateSlotUsageStatistics(_dentistId?: string): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}

// Re-export for convenience (stubs)
export { updateSlotStatisticsAfterBooking, calculateSlotUsageStatistics };

export interface RecommendedSlot extends TimeSlot {
  score: number; // 0-100, higher is better
  reasons: string[]; // Why this slot is recommended
  isRecommended?: boolean;
  aiReasoning?: string; // Gemini AI's explanation
  isUnderutilized?: boolean; // Is this an under-utilized slot?
  shouldPromote?: boolean; // Should we actively promote this slot?
}

export interface PatientPreferences {
  preferred_time_of_day: string[];
  preferred_days_of_week: number[];
  preferred_dentist_id: string | null;
  reliability_score: number;
  no_show_rate: number;
}

export interface CapacityInfo {
  total_slots: number;
  booked_slots: number;
  available_slots: number;
  capacity_percentage: number;
  is_near_capacity: boolean;
  is_overbooked: boolean;
}

/**
 * Gets intelligent slot recommendations for a patient
 * NOW POWERED BY GEMINI AI to promote under-utilized slots and balance schedules
 * Considers: patient preferences, dentist capacity, historical patterns, slot usage patterns
 */
export async function getRecommendedSlots(
  dentistId: string,
  patientId: string,
  date: Date,
  availableSlots: TimeSlot[],
  appointmentTypeId?: string
): Promise<RecommendedSlot[]> {
  const businessId = await getCurrentBusinessId();

  // Fetch patient preferences and dentist capacity in parallel
  const [preferencesResult, capacityResult, appointmentTypeResult] = await Promise.all([
    supabase
      .from('patient_preferences')
      .select('*')
      .eq('patient_id', patientId)
      .eq('business_id', businessId)
      .maybeSingle(),

    supabase
      .rpc('get_dentist_capacity_usage', {
        p_dentist_id: dentistId,
        p_date: format(date, 'yyyy-MM-dd'),
        p_business_id: businessId
      }),

    appointmentTypeId
      ? supabase
          .from('appointment_types')
          .select('*')
          .eq('id', appointmentTypeId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null })
  ]);

  const preferences = preferencesResult.data as PatientPreferences | null;
  const capacity = capacityResult.data?.[0] as CapacityInfo | null;
  const appointmentType = appointmentTypeResult.data;

  // Try to get AI-powered recommendations first
  try {
    const aiAnalysis = await getGeminiSlotRecommendations(
      dentistId,
      patientId,
      date,
      availableSlots,
      preferences
    );

    // Map AI recommendations to our slot format
    const aiRecommendedSlots: RecommendedSlot[] = availableSlots
      .filter(slot => slot.available)
      .map(slot => {
        const aiRec = aiAnalysis.recommendations.find(r => r.time === slot.time);

        if (aiRec) {
          // This slot was recommended by AI
          return {
            ...slot,
            score: aiRec.score,
            reasons: aiRec.reasons,
            aiReasoning: aiRec.aiReasoning,
            isRecommended: aiRec.shouldPromote || aiRec.score >= 70,
            isUnderutilized: aiRec.isUnderutilized,
            shouldPromote: aiRec.shouldPromote
          };
        } else {
          // Slot not in AI recommendations, use fallback scoring
          const score = calculateSlotScore(slot, date, preferences, capacity, appointmentType);
          return {
            ...slot,
            score: score.total,
            reasons: score.reasons,
            isRecommended: score.total >= 70
          };
        }
      });

    // Sort: prioritize AI-recommended under-utilized slots
    aiRecommendedSlots.sort((a, b) => {
      // First priority: AI says to promote
      if (a.shouldPromote && !b.shouldPromote) return -1;
      if (!a.shouldPromote && b.shouldPromote) return 1;

      // Second priority: under-utilized slots
      if (a.isUnderutilized && !b.isUnderutilized) return -1;
      if (!a.isUnderutilized && b.isUnderutilized) return 1;

      // Third priority: score
      return b.score - a.score;
    });

    logger.debug('🤖 AI-powered recommendations:', {
      summary: aiAnalysis.summary,
      strategy: aiAnalysis.distributionStrategy,
      balanceScore: aiAnalysis.balanceScore,
      topSlots: aiRecommendedSlots.slice(0, 3).map(s => s.time)
    });

    return aiRecommendedSlots;

  } catch (error) {
    console.warn('AI recommendations failed, using fallback:', error);

    // Fallback to rule-based scoring with under-utilization detection
    const scoredSlots: RecommendedSlot[] = await Promise.all(
      availableSlots
        .filter(slot => slot.available)
        .map(async slot => {
          const score = calculateSlotScore(slot, date, preferences, capacity, appointmentType);
          const isUnderutilized = await isSlotUnderutilized(dentistId, date, slot.time);

          // Boost score for under-utilized slots
          const finalScore = isUnderutilized ? Math.min(100, score.total + 20) : score.total;
          const finalReasons = isUnderutilized
            ? [...score.reasons, '📊 Helps balance schedule (under-utilized)']
            : score.reasons;

          return {
            ...slot,
            score: finalScore,
            reasons: finalReasons,
            isRecommended: finalScore >= 70,
            isUnderutilized,
            shouldPromote: isUnderutilized
          };
        })
    );

    // Sort by score descending, prioritizing under-utilized
    scoredSlots.sort((a, b) => {
      if (a.isUnderutilized && !b.isUnderutilized) return -1;
      if (!a.isUnderutilized && b.isUnderutilized) return 1;
      return b.score - a.score;
    });

    return scoredSlots;
  }
}

/**
 * Calculates a score (0-100) for a time slot based on multiple factors
 */
function calculateSlotScore(
  slot: TimeSlot,
  date: Date,
  preferences: PatientPreferences | null,
  capacity: CapacityInfo | null,
  appointmentType: any
): { total: number; reasons: string[] } {
  let score = 50; // Base score
  const reasons: string[] = [];

  const slotDateTime = new Date(`${format(date, 'yyyy-MM-dd')}T${slot.time}`);
  const hour = getHours(slotDateTime);
  const dayOfWeek = getDay(date);

  // Factor 1: Patient's preferred time of day (weight: 25 points)
  if (preferences?.preferred_time_of_day && preferences.preferred_time_of_day.length > 0) {
    const timeOfDay = getTimeOfDay(hour);
    if (preferences.preferred_time_of_day.includes(timeOfDay)) {
      score += 25;
      reasons.push(`Matches your preferred ${timeOfDay} time`);
    }
  }

  // Factor 2: Patient's preferred day of week (weight: 15 points)
  if (preferences?.preferred_days_of_week && preferences.preferred_days_of_week.includes(dayOfWeek)) {
    score += 15;
    reasons.push('Your usual booking day');
  }

  // Factor 3: Capacity management (weight: 20 points)
  if (capacity) {
    if (capacity.is_near_capacity) {
      score -= 15;
      reasons.push('Limited availability - book soon');
    } else if (capacity.capacity_percentage < 50) {
      score += 20;
      reasons.push('Good availability');
    }
  }

  // Factor 4: Optimal appointment times (weight: 15 points)
  // Morning slots (9-11 AM) and early afternoon (2-3 PM) are generally preferred
  if ((hour >= 9 && hour < 11) || (hour >= 14 && hour < 15)) {
    score += 15;
    reasons.push('Popular time slot');
  }

  // Factor 5: Not too early, not too late (weight: 10 points)
  if (hour >= 8 && hour < 17) {
    score += 10;
  } else {
    score -= 10;
    if (hour < 8) reasons.push('Early morning slot');
    if (hour >= 17) reasons.push('Evening slot');
  }

  // Factor 6: Appointment type considerations (weight: 10 points)
  if (appointmentType) {
    // Longer procedures better in the morning
    if (appointmentType.default_duration_minutes > 45 && hour >= 9 && hour < 12) {
      score += 10;
      reasons.push('Good time for longer appointments');
    }
    // Quick appointments can fit anywhere
    if (appointmentType.default_duration_minutes <= 30) {
      score += 5;
      reasons.push('Quick appointment');
    }
  }

  // Factor 7: Patient reliability (weight: 5 points)
  // High-reliability patients get slight boost for prime times
  if (preferences?.reliability_score && preferences.reliability_score > 80) {
    if (hour >= 10 && hour < 15) {
      score += 5;
      reasons.push('Priority time for reliable patients');
    }
  }

  // Ensure score is within 0-100 range
  score = Math.max(0, Math.min(100, score));

  return { total: Math.round(score), reasons };
}

/**
 * Gets time of day category from hour
 */
function getTimeOfDay(hour: number): string {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/**
 * Calculates if a dentist has capacity for more appointments on a given date
 */
export async function checkDentistCapacity(
  dentistId: string,
  date: Date
): Promise<CapacityInfo | null> {
  const businessId = await getCurrentBusinessId();

  const { data, error } = await supabase
    .rpc('get_dentist_capacity_usage', {
      p_dentist_id: dentistId,
      p_date: format(date, 'yyyy-MM-dd'),
      p_business_id: businessId
    });

  if (error) {
    logger.error('Error checking capacity:', error);
    return null;
  }

  return data?.[0] || null;
}

/**
 * Gets or creates patient preferences
 */
export async function getPatientPreferences(
  patientId: string
): Promise<PatientPreferences | null> {
  const businessId = await getCurrentBusinessId();

  // Try to get existing preferences
  let { data, error } = await supabase
    .from('patient_preferences')
    .select('*')
    .eq('patient_id', patientId)
    .eq('business_id', businessId)
    .maybeSingle();

  if (error) {
    logger.error('Error fetching preferences:', error);
    return null;
  }

  // If no preferences exist, calculate them
  if (!data) {
    await supabase.rpc('calculate_patient_preferences', {
      p_patient_id: patientId,
      p_business_id: businessId
    });

    // Fetch again
    const result = await supabase
      .from('patient_preferences')
      .select('*')
      .eq('patient_id', patientId)
      .eq('business_id', businessId)
      .maybeSingle();

    data = result.data;
  }

  return data as PatientPreferences;
}

/**
 * Logs recommended slots for learning and analytics
 */
export async function logSlotRecommendations(
  patientId: string,
  dentistId: string,
  recommendedSlots: RecommendedSlot[]
): Promise<string | null> {
  const businessId = await getCurrentBusinessId();

  const { data, error } = await supabase
    .from('slot_recommendations')
    .insert({
      patient_id: patientId,
      dentist_id: dentistId,
      business_id: businessId,
      recommended_slots: recommendedSlots.map(slot => ({
        time: slot.time,
        score: slot.score,
        reasons: slot.reasons
      }))
    })
    .select('id')
    .single();

  if (error) {
    logger.error('Error logging recommendations:', error);
    return null;
  }

  return data.id;
}

/**
 * Updates recommendation with selected slot
 */
export async function updateRecommendationWithSelection(
  recommendationId: string,
  selectedSlot: string,
  appointmentId: string,
  wasRecommended: boolean
): Promise<void> {
  await supabase
    .from('slot_recommendations')
    .update({
      selected_slot: selectedSlot,
      appointment_id: appointmentId,
      was_recommended: wasRecommended
    })
    .eq('id', recommendationId);
}

/**
 * Calculates appointment duration including buffer time
 */
export async function getAppointmentDurationWithBuffer(
  appointmentTypeId: string
): Promise<{ duration: number; buffer: number; total: number }> {
  const { data, error } = await supabase
    .from('appointment_types')
    .select('default_duration_minutes, buffer_time_after_minutes')
    .eq('id', appointmentTypeId)
    .single();

  if (error || !data) {
    return { duration: 30, buffer: 5, total: 35 };
  }

  return {
    duration: data.default_duration_minutes,
    buffer: data.buffer_time_after_minutes,
    total: data.default_duration_minutes + data.buffer_time_after_minutes
  };
}

/**
 * Balances workload across multiple dentists
 * Returns the dentist with the most capacity for the given date
 */
export async function findBestAvailableDentist(
  date: Date,
  dentistIds: string[]
): Promise<{ dentistId: string; capacity: CapacityInfo } | null> {
  const businessId = await getCurrentBusinessId();
  const dateStr = format(date, 'yyyy-MM-dd');

  const capacityChecks = await Promise.all(
    dentistIds.map(async (dentistId) => {
      const { data } = await supabase
        .rpc('get_dentist_capacity_usage', {
          p_dentist_id: dentistId,
          p_date: dateStr,
          p_business_id: businessId
        });

      return {
        dentistId,
        capacity: data?.[0] as CapacityInfo | null
      };
    })
  );

  // Filter out dentists who are overbooked or near capacity
  const availableDentists = capacityChecks
    .filter(check => check.capacity && !check.capacity.is_overbooked)
    .sort((a, b) => {
      // Sort by lowest capacity usage (most available)
      return (a.capacity?.capacity_percentage || 0) - (b.capacity?.capacity_percentage || 0);
    });

  if (availableDentists.length === 0) {
    return null;
  }

  return {
    dentistId: availableDentists[0].dentistId,
    capacity: availableDentists[0].capacity!
  };
}

/**
 * Checks if adding an appointment would violate buffer time constraints
 */
export async function validateBufferTimes(
  dentistId: string,
  proposedDateTime: Date,
  durationMinutes: number
): Promise<{ valid: boolean; conflicts: string[] }> {
  const businessId = await getCurrentBusinessId();
  const conflicts: string[] = [];

  // Get appointments within 2 hours of proposed time
  const startWindow = addMinutes(proposedDateTime, -120);
  const endWindow = addMinutes(proposedDateTime, durationMinutes + 120);

  const { data: nearbyAppointments, error } = await supabase
    .from('appointments_decrypted')
    .select(`
      id,
      appointment_date,
      duration_minutes,
      appointment_type_id,
      appointment_types (
        buffer_time_after_minutes
      )
    `)
    .eq('dentist_id', dentistId)
    .eq('business_id', businessId)
    .gte('appointment_date', startWindow.toISOString())
    .lte('appointment_date', endWindow.toISOString())
    .neq('status', 'cancelled');

  if (error || !nearbyAppointments) {
    return { valid: true, conflicts: [] };
  }

  // Check each nearby appointment for buffer conflicts
  for (const apt of nearbyAppointments) {
    const aptStart = parseISO(apt.appointment_date);
    const aptDuration = apt.duration_minutes || 30;
    const bufferTime = (apt.appointment_types as any)?.buffer_time_after_minutes || 0;
    const aptEnd = addMinutes(aptStart, aptDuration + bufferTime);

    const proposedEnd = addMinutes(proposedDateTime, durationMinutes);

    // Check for overlap including buffer
    if (
      (proposedDateTime >= aptStart && proposedDateTime < aptEnd) ||
      (proposedEnd > aptStart && proposedEnd <= aptEnd) ||
      (proposedDateTime <= aptStart && proposedEnd >= aptEnd)
    ) {
      conflicts.push(
        `Conflicts with appointment at ${format(aptStart, 'HH:mm')} (including ${bufferTime}min buffer)`
      );
    }
  }

  return {
    valid: conflicts.length === 0,
    conflicts
  };
}
