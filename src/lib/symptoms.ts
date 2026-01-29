import { supabase } from "@/integrations/supabase/client";
import { ChatMessage } from "@/types/chat";
import type { UserProfile } from "@/types/common";
import { logger } from '@/lib/logger';

/**
 * Generate a short symptom description using the dental AI function.
 */
export const generateSymptomSummary = async (
  messages: ChatMessage[],
  userProfile: UserProfile
): Promise<string> => {
  try {
    const { data, error } = await supabase.functions.invoke('dental-ai-chat', {
      body: {
        message: 'Summarize the patient symptoms in one or two sentences.',
        conversation_history: messages,
        user_profile: userProfile,
      },
    });
    if (error) throw error;
    return (data.response || data.fallback_response || '').trim();
  } catch (err) {
    logger.error('Error generating symptom summary:', err);
    return '';
  }
};

/**
 * Generate a concise appointment reason (2-5 words) from chat conversation.
 */
export const generateAppointmentReason = async (
  messages: ChatMessage[],
  userProfile: UserProfile
): Promise<string> => {
  try {
    const { data, error } = await supabase.functions.invoke('dental-ai-chat', {
      body: {
        message: 'Based on this conversation, generate a very concise appointment reason in 2-5 words (e.g., "Tooth pain", "Routine checkup", "Crown replacement"). Only return the reason, nothing else.',
        conversation_history: messages,
        user_profile: userProfile,
      },
    });
    if (error) throw error;
    const reason = (data.response || data.fallback_response || '').trim();
    return reason || 'General consultation';
  } catch (err) {
    logger.error('Error generating appointment reason:', err);
    return 'General consultation';
  }
};
