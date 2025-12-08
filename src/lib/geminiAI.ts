import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentBusinessId } from '@/lib/businessScopedSupabase';
import { TimeSlot } from './appointmentAvailability';
import { getSlotUsageStatistics, getUnderutilizedSlots, SlotUsageStats } from './slotUsageTracking';
import { PatientPreferences } from './smartScheduling';
import { format, getDay } from 'date-fns';
import { logger } from '@/lib/logger';

// Initialize Gemini AI
const getGeminiAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY is not configured. Please add it to your .env file.');
  }
  return new GoogleGenerativeAI(apiKey);
};

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
 * Uses Gemini AI to analyze appointment patterns and recommend slots
 * This is the REAL AI making intelligent decisions about slot distribution
 */
export async function getGeminiSlotRecommendations(
  dentistId: string,
  patientId: string,
  date: Date,
  availableSlots: TimeSlot[],
  patientPreferences: PatientPreferences | null
): Promise<GeminiAnalysis> {
  const dayOfWeek = getDay(date);
  let slotStats: SlotUsageStats[] = [];

  try {
    // Get slot usage statistics
    slotStats = await getSlotUsageStatistics(dentistId);
    const underutilizedSlots = await getUnderutilizedSlots(dentistId, 50);

    // Prepare data for Gemini
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

    // Build context for AI
    const context = buildGeminiContext(
      availableSlots,
      slotStats,
      underutilizedSlots,
      patientPreferences,
      dayName
    );

    // Call Gemini AI
    const genAI = getGeminiAI();
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `You are an AI scheduling assistant for a dental practice. Your goal is to help BALANCE the dentist's schedule by promoting time slots that are booked LESS frequently.

**Current Situation:**
${context}

**Your Task:**
Analyze the available time slots and recommend which ones to promote to the patient. Focus on:
1. **Under-utilized slots** (booking rate < 50%) should be PRIORITIZED and promoted
2. **Balance** - help distribute appointments more evenly throughout the day/week
3. **Patient preferences** - consider what times the patient usually prefers, but gently guide them toward under-utilized slots if possible
4. **Practical considerations** - some slots are naturally less popular (very early, late) so be realistic

**Output Format (JSON):**
{
  "recommendations": [
    {
      "time": "09:00",
      "score": 85,
      "reasons": ["Under-utilized slot", "Good for patients", "Helps balance schedule"],
      "aiReasoning": "This 9 AM slot is rarely booked (only 25% utilization) and would help balance your schedule. It's a good morning time that most patients find convenient.",
      "shouldPromote": true
    }
  ],
  "summary": "Your dentist's schedule shows that morning slots are under-utilized. I'm recommending these times to help balance the schedule.",
  "distributionStrategy": "Focus on promoting morning appointments (9-11 AM) which have low booking rates.",
  "balanceScore": 65
}

**Important:**
- Score slots from 0-100 (higher = better for schedule balance)
- Give HIGHER scores to under-utilized slots (they need promotion)
- Be persuasive but honest in your reasoning
- Provide 3-5 top recommendations
- Include at least one under-utilized slot in top 3 if available`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    let aiAnalysis;
    try {
      aiAnalysis = JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Failed to parse AI JSON response:', error);
      throw new Error('Failed to parse AI response: ' + (error instanceof Error ? error.message : 'Invalid JSON'));
    }

    // Enrich recommendations with actual slot data
    const enrichedRecommendations = aiAnalysis.recommendations.map((rec: any) => {
      const slot = availableSlots.find(s => s.time === rec.time);
      const stats = slotStats.find(s => s.time_slot === rec.time && s.day_of_week === dayOfWeek);

      return {
        ...rec,
        isUnderutilized: stats ? stats.recent_booking_rate < 50 : false,
        bookingRate: stats ? stats.recent_booking_rate : 0,
        available: slot?.available || false
      };
    });

    // Log this AI recommendation for learning
    await logAIRecommendation(
      patientId,
      dentistId,
      date,
      enrichedRecommendations,
      aiAnalysis.summary
    );

    return {
      recommendations: enrichedRecommendations,
      summary: aiAnalysis.summary,
      distributionStrategy: aiAnalysis.distributionStrategy,
      balanceScore: aiAnalysis.balanceScore
    };

  } catch (error) {
    logger.error('Error getting Gemini recommendations:', error);

    // Fallback to rule-based if AI fails
    return getFallbackRecommendations(availableSlots, dayOfWeek, slotStats);
  }
}

/**
 * Builds context string for Gemini AI
 */
function buildGeminiContext(
  availableSlots: TimeSlot[],
  slotStats: SlotUsageStats[],
  underutilizedSlots: any[],
  patientPreferences: PatientPreferences | null,
  dayName: string
): string {
  const availableTimes = availableSlots
    .filter(s => s.available)
    .map(s => s.time)
    .join(', ');

  const underutilizedInfo = underutilizedSlots
    .slice(0, 5)
    .map(s => `${s.time_slot} (${s.recent_booking_rate.toFixed(1)}% booked)`)
    .join(', ');

  const preferredTimes = patientPreferences?.preferred_time_of_day?.join(', ') || 'no preference';

  const statsOverview = slotStats.length > 0
    ? `Average booking rate: ${(slotStats.reduce((sum, s) => sum + s.recent_booking_rate, 0) / slotStats.length).toFixed(1)}%`
    : 'No historical data yet';

  return `
**Day:** ${dayName}
**Available Times:** ${availableTimes}
**Under-utilized Slots (need promotion):** ${underutilizedInfo || 'None identified yet'}
**Patient Usually Prefers:** ${preferredTimes}
**Overall Statistics:** ${statsOverview}
**Number of tracked slots:** ${slotStats.length}
`;
}

/**
 * Fallback recommendations if AI fails
 */
function getFallbackRecommendations(
  availableSlots: TimeSlot[],
  dayOfWeek: number,
  slotStats: SlotUsageStats[]
): GeminiAnalysis {
  const recommendations = availableSlots
    .filter(slot => slot.available)
    .map(slot => {
      const stats = slotStats.find(s =>
        s.time_slot === slot.time && s.day_of_week === dayOfWeek
      );

      const isUnderutilized = stats ? stats.recent_booking_rate < 50 : false;
      const bookingRate = stats ? stats.recent_booking_rate : 0;

      // Parse hour from time string (e.g., "09:00" -> 9)
      const hour = parseInt(slot.time.split(':')[0], 10);

      // If no historical data, use time-of-day heuristics
      let score = 50;
      let reasons: string[] = [];
      let shouldPromote = false;

      if (isUnderutilized) {
        // Has stats and is underutilized
        score = 80;
        reasons = ['Under-utilized time slot', 'Helps balance schedule'];
        shouldPromote = true;
      } else if (!stats) {
        // No historical data - use smart defaults based on time of day
        if (hour >= 9 && hour <= 11) {
          // Morning slots are generally popular
          score = 75;
          reasons = ['Popular morning time', 'Good for most patients'];
          shouldPromote = true;
        } else if (hour >= 14 && hour <= 16) {
          // Early afternoon is also good
          score = 70;
          reasons = ['Convenient afternoon time', 'Good availability'];
          shouldPromote = true;
        } else if (hour >= 8 && hour < 9) {
          // Early morning
          score = 60;
          reasons = ['Early morning slot', 'Beat the rush'];
          shouldPromote = false;
        } else if (hour >= 16 && hour < 18) {
          // Late afternoon
          score = 65;
          reasons = ['After-work hours', 'Convenient for working professionals'];
          shouldPromote = false;
        } else {
          score = 50;
          reasons = ['Available slot'];
          shouldPromote = false;
        }
      } else {
        // Has stats but well-utilized
        score = 50;
        reasons = ['Available slot'];
        shouldPromote = false;
      }

      return {
        time: slot.time,
        score,
        reasons,
        aiReasoning: shouldPromote
          ? `This ${slot.time} slot is recommended based on scheduling patterns and is a convenient time for most patients.`
          : `This is an available time slot.`,
        isUnderutilized,
        bookingRate,
        shouldPromote
      };
    })
    .sort((a, b) => b.score - a.score);

  // Ensure at least top 3 slots are promoted if we have that many
  const promotedCount = recommendations.filter(r => r.shouldPromote).length;
  if (promotedCount === 0 && recommendations.length > 0) {
    // Force promote top 3 slots
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
    summary: promotedCount > 0 || recommendations.length > 0
      ? `I've highlighted ${Math.max(promotedCount, Math.min(3, recommendations.length))} time slots that work well based on scheduling patterns.`
      : 'Showing available slots.',
    distributionStrategy: 'Recommending optimal time slots based on time-of-day preferences and scheduling patterns.',
    balanceScore: 50
  };
}

/**
 * Logs AI recommendation to database for learning
 */
async function logAIRecommendation(
  patientId: string,
  dentistId: string,
  date: Date,
  recommendations: GeminiSlotRecommendation[],
  aiReasoning: string
): Promise<string | null> {
  const businessId = await getCurrentBusinessId();

  try {
    const { data, error } = await supabase
      .from('ai_slot_recommendations')
      .insert({
        business_id: businessId,
        patient_id: patientId,
        dentist_id: dentistId,
        recommended_slots: recommendations,
        ai_model_used: 'gemini-pro',
        ai_reasoning: aiReasoning,
        selected_date: format(date, 'yyyy-MM-dd')
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Error logging AI recommendation:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    logger.error('Error logging AI recommendation:', error);
    return null;
  }
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
      .from('ai_slot_recommendations')
      .update({
        selected_slot: selectedTime,
        appointment_id: appointmentId,
        was_ai_recommended: wasAIRecommended,
        updated_at: new Date().toISOString()
      })
      .eq('id', recommendationId);
  } catch (error) {
    logger.error('Error updating AI recommendation:', error);
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
  const businessId = await getCurrentBusinessId();

  try {
    const { data, error } = await supabase
      .from('ai_slot_recommendations')
      .select('was_ai_recommended, appointment_completed')
      .eq('business_id', businessId)
      .eq('dentist_id', dentistId);

    if (error || !data) {
      return {
        total_recommendations: 0,
        accepted_recommendations: 0,
        success_rate: 0,
        completed_appointments: 0
      };
    }

    const total = data.length;
    const accepted = data.filter(r => r.was_ai_recommended).length;
    const completed = data.filter(r => r.appointment_completed === true).length;

    return {
      total_recommendations: total,
      accepted_recommendations: accepted,
      success_rate: total > 0 ? (accepted / total) * 100 : 0,
      completed_appointments: completed
    };
  } catch (error) {
    logger.error('Error getting AI success rate:', error);
    return {
      total_recommendations: 0,
      accepted_recommendations: 0,
      success_rate: 0,
      completed_appointments: 0
    };
  }
}

/**
 * Simple function to test if Gemini AI is configured
 */
export async function testGeminiConnection(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        message: 'VITE_GEMINI_API_KEY is not configured'
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const result = await model.generateContent('Say "hello" if you can hear me');
    const response = result.response.text();

    return {
      success: true,
      message: `Gemini AI connected successfully! Response: ${response}`
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to connect to Gemini AI: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
