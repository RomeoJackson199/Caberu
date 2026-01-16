import { supabase } from "@/integrations/supabase/client";
import { ChatMessage } from "@/types/chat";
import { logger } from '@/lib/logger';
import { WIDGET_CODES, DENTIST_NAMES } from './constants';

interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  [key: string]: unknown;
}

interface DetectedCodes {
  cleanedText: string;
  detectedWidgets: string[];
  recommendedDentists: string[];
  recommendedService?: string;
  symptomSummary?: string;
}

/**
 * Detects and extracts widget codes, dentist recommendations, and service tags from AI response text
 */
export const detectAndExtractCodes = (text: string): DetectedCodes => {
  let cleanedText = text;
  const detectedWidgets: string[] = [];
  const recommendedDentists: string[] = [];
  let recommendedService: string | undefined;
  let symptomSummary: string | undefined;

  // Extract [[SERVICE:...]] tag
  const serviceMatch = cleanedText.match(/\[\[SERVICE:([^\]]+)\]\]/);
  if (serviceMatch) {
    recommendedService = serviceMatch[1].trim();
    cleanedText = cleanedText.replace(/\[\[SERVICE:[^\]]+\]\]\s*/g, '');
  }

  // Extract [[SYMPTOMS:...]] tag
  const symptomsMatch = cleanedText.match(/\[\[SYMPTOMS:([^\]]+)\]\]/);
  if (symptomsMatch) {
    symptomSummary = symptomsMatch[1].trim();
    cleanedText = cleanedText.replace(/\[\[SYMPTOMS:[^\]]+\]\]\s*/g, '');
  }

  // Detect and remove widget codes from text
  Object.entries(WIDGET_CODES).forEach(([code, widget]) => {
    const codeRegex = new RegExp(`\\b${code}\\b\\s*`, 'g');
    if (codeRegex.test(cleanedText)) {
      detectedWidgets.push(widget);
      // Remove the code from the displayed text
      cleanedText = cleanedText.replace(codeRegex, '');
    }
  });

  // Extract dentist recommendations from text
  DENTIST_NAMES.forEach(name => {
    if (cleanedText.toLowerCase().includes(name.toLowerCase())) {
      recommendedDentists.push(name);
    }
  });

  return { cleanedText, detectedWidgets, recommendedDentists, recommendedService, symptomSummary };
};

interface AIResponseResult {
  message: ChatMessage;
  fallback: boolean;
  suggestions: string[];
  recommendedDentists: string[];
  recommendedService?: string;
  symptomSummary?: string;
}

/**
 * Generates a bot response using the AI service
 */
export const generateBotResponse = async (
  userMessage: string,
  history: ChatMessage[],
  sessionId: string,
  userProfile: UserProfile | null,
  user: any,
  businessId: string | null
): Promise<AIResponseResult> => {
  try {
    // Get business_id - fallback to first available business if not in context
    let effectiveBusinessId = businessId;
    if (!effectiveBusinessId) {
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id')
        .limit(1)
        .single();
      effectiveBusinessId = businesses?.id || null;
    }

    logger.debug('Sending AI request with business_id:', effectiveBusinessId);

    // Use business context for AI customization
    const aiResponse = await supabase.functions.invoke('dental-ai-chat', {
      body: {
        message: userMessage,
        conversation_history: history,
        user_profile: userProfile || (user ? {
          name: user.email?.split('@')[0] || 'Patient',
          email: user.email
        } : {
          name: 'Guest',
          email: null
        }),
        business_id: effectiveBusinessId
      }
    });

    if (aiResponse.error) {
      logger.error('AI function error:', aiResponse.error);
      // If backend returned a JSON body, try to use it instead of failing hard
      if (!aiResponse.data) {
        throw aiResponse.error;
      }
    }

    const serverData = (aiResponse as any).data || {};
    const responseText = serverData.response || serverData.fallback_response || "";
    if (!responseText) {
      throw new Error('Empty AI response');
    }

    // Detect and extract widget codes from AI response (no forced codes)
    const { cleanedText, detectedWidgets, recommendedDentists, recommendedService, symptomSummary } = detectAndExtractCodes(responseText);

    const result = {
      id: crypto.randomUUID(),
      session_id: sessionId as any,
      message: cleanedText,
      is_bot: true,
      message_type: 'text',
      created_at: new Date().toISOString(),
    } as ChatMessage;
    return {
      message: result,
      fallback: Boolean(aiResponse.data?.fallback_response && !aiResponse.data?.response),
      suggestions: detectedWidgets,
      recommendedDentists: recommendedDentists,
      recommendedService,
      symptomSummary
    };
  } catch (error) {
    logger.error('Error generating AI response:', error);
    return {
      message: {
        id: crypto.randomUUID(),
        session_id: sessionId as any,
        message: "I'm sorry, I couldn't process your request.",
        is_bot: true,
        message_type: 'text',
        created_at: new Date().toISOString(),
      } as ChatMessage,
      fallback: true,
      suggestions: [],
      recommendedDentists: []
    };
  }
};
