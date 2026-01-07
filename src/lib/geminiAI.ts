/**
 * SECURITY: All AI API calls are now routed through server-side edge functions.
 * The Gemini API key is stored securely as an edge function secret.
 * This prevents exposure of the API key in client-side code.
 */

import { supabase } from '@/integrations/supabase/client';
import { getCurrentBusinessId } from '@/lib/businessScopedSupabase';
import { TimeSlot } from './appointmentAvailability';
import { PatientPreferences } from './smartScheduling';
import { format } from 'date-fns';

export interface GeminiSlotRecommendation {
  time: string;
  score: number; // 0-100
  reasons: string[];
  aiReasoning: string;
  isUnderutilized: boolean;
  bookingRate: number;
  shouldPromote: boolean; // AI decision to actively promote this slot
}

export interface GeminiAnalysis {
  recommendations: GeminiSlotRecommendation[];
  summary: string;
  distributionStrategy: string;
  balanceScore: number;
}

/**
 * Uses AI to analyze appointment patterns and recommend slots
 * All AI calls are proxied through secure edge functions
 */
export async function getGeminiSlotRecommendations(
  dentistId: string,
  patientId: string,
  date: Date,
  availableSlots: TimeSlot[],
  patientPreferences: PatientPreferences | null
): Promise<GeminiAnalysis> {
  try {
    const businessId = await getCurrentBusinessId();

    // Call the secure edge function (API key is server-side only)
    const { data, error } = await supabase.functions.invoke('ai-slot-recommendations', {
      body: {
        dentistId,
        patientId,
        date: format(date, 'yyyy-MM-dd'),
        availableSlots,
        patientPreferences,
        businessId,
      },
    });

    if (error) {
      console.error('Error calling AI edge function:', error);
      return getFallbackRecommendations(availableSlots);
    }

    return data as GeminiAnalysis;
  } catch (error) {
    console.error('Error getting AI recommendations:', error);
    return getFallbackRecommendations(availableSlots);
  }
}

/**
 * Fallback recommendations if AI fails
 */
function getFallbackRecommendations(availableSlots: TimeSlot[]): GeminiAnalysis {
  const recommendations = availableSlots
    .filter(slot => slot.available)
    .map(slot => {
      const hour = parseInt(slot.time.split(':')[0], 10);
      let score = 50;
      let reasons: string[] = [];
      let shouldPromote = false;

      if (hour >= 9 && hour <= 11) {
        score = 75;
        reasons = ['Popular morning time', 'Good for most patients'];
        shouldPromote = true;
      } else if (hour >= 14 && hour <= 16) {
        score = 70;
        reasons = ['Convenient afternoon time', 'Good availability'];
        shouldPromote = true;
      } else if (hour >= 8 && hour < 9) {
        score = 60;
        reasons = ['Early morning slot', 'Beat the rush'];
      } else if (hour >= 16 && hour < 18) {
        score = 65;
        reasons = ['After-work hours', 'Convenient for working professionals'];
      } else {
        score = 50;
        reasons = ['Available slot'];
      }

      return {
        time: slot.time,
        score,
        reasons,
        aiReasoning: shouldPromote
          ? `This ${slot.time} slot is recommended based on scheduling patterns.`
          : `This is an available time slot.`,
        isUnderutilized: false,
        bookingRate: 0,
        shouldPromote,
      };
    })
    .sort((a, b) => b.score - a.score);

  // Force promote top 3 if none promoted
  const promotedCount = recommendations.filter(r => r.shouldPromote).length;
  if (promotedCount === 0 && recommendations.length > 0) {
    recommendations.slice(0, Math.min(3, recommendations.length)).forEach(rec => {
      rec.shouldPromote = true;
      rec.score = Math.max(rec.score, 70);
      if (!rec.reasons.includes('Recommended time')) {
        rec.reasons.unshift('Recommended time');
      }
    });
  }

  return {
    recommendations,
    summary: recommendations.length > 0
      ? `I've highlighted ${Math.max(promotedCount, Math.min(3, recommendations.length))} time slots based on scheduling patterns.`
      : 'Showing available slots.',
    distributionStrategy: 'Recommending optimal time slots based on time-of-day preferences.',
    balanceScore: 50,
  };
}

/**
 * Updates AI recommendation with user's selection
 */
export async function updateAIRecommendationSelection(
  recommendationId: string,
  selectedTime: string,
  appointmentId: string,
  wasAIRecommended: boolean
): Promise<void> {
  try {
    await supabase
      .from('slot_recommendations')
      .update({
        selected_slot: selectedTime,
        appointment_id: appointmentId,
        was_ai_recommended: wasAIRecommended,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recommendationId);
  } catch (error) {
    console.error('Error updating AI recommendation:', error);
  }
}

/**
 * Gets AI recommendation success rate
 */
export async function getAIRecommendationSuccessRate(
  dentistId: string
): Promise<{
  total_recommendations: number;
  accepted_recommendations: number;
  success_rate: number;
  completed_appointments: number;
}> {
  try {
    const businessId = await getCurrentBusinessId();

    const { data, error } = await supabase
      .from('slot_recommendations')
      .select('was_ai_recommended, appointment_completed')
      .eq('business_id', businessId)
      .eq('dentist_id', dentistId);

    if (error || !data) {
      return {
        total_recommendations: 0,
        accepted_recommendations: 0,
        success_rate: 0,
        completed_appointments: 0,
      };
    }

    const total = data.length;
    const accepted = data.filter(r => r.was_ai_recommended).length;
    const completed = data.filter(r => r.appointment_completed === true).length;

    return {
      total_recommendations: total,
      accepted_recommendations: accepted,
      success_rate: total > 0 ? (accepted / total) * 100 : 0,
      completed_appointments: completed,
    };
  } catch (error) {
    console.error('Error getting AI success rate:', error);
    return {
      total_recommendations: 0,
      accepted_recommendations: 0,
      success_rate: 0,
      completed_appointments: 0,
    };
  }
}

/**
 * Test if AI service is configured and working
 */
export async function testGeminiConnection(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Test by calling the edge function with minimal data
    const { data, error } = await supabase.functions.invoke('ai-slot-recommendations', {
      body: {
        dentistId: 'test',
        patientId: 'test',
        date: new Date().toISOString().split('T')[0],
        availableSlots: [{ time: '09:00', available: true }],
        patientPreferences: null,
        businessId: 'test',
      },
    });

    if (error) {
      // 401/403 means auth required, which is expected for test
      if (error.message?.includes('Unauthorized') || error.message?.includes('Access denied')) {
        return {
          success: true,
          message: 'AI service is configured (authentication required for actual use)',
        };
      }
      return {
        success: false,
        message: `AI service error: ${error.message}`,
      };
    }

    return {
      success: true,
      message: 'AI service connected successfully!',
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to connect to AI service: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
