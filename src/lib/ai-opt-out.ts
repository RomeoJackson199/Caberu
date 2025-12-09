import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

/**
 * Check if the current user has opted out of AI features
 * Call this before any AI-powered functionality
 */
export async function checkAIOptOut(): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('ai_opt_out')
            .eq('user_id', user.id)
            .single();

        if (error) {
            logger.error('Error checking AI opt-out status:', error);
            return false; // Default to allowing AI if we can't check
        }

        return profile?.ai_opt_out === true;
    } catch (error) {
        logger.error('Error in checkAIOptOut:', error);
        return false;
    }
}

/**
 * Toggle AI opt-out status for the current user
 */
export async function setAIOptOut(optOut: boolean): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { error } = await supabase
            .from('profiles')
            .update({ ai_opt_out: optOut })
            .eq('user_id', user.id);

        if (error) {
            logger.error('Error setting AI opt-out:', error);
            return false;
        }

        logger.info('AI opt-out status updated:', { optOut });
        return true;
    } catch (error) {
        logger.error('Error in setAIOptOut:', error);
        return false;
    }
}

/**
 * Hook-style wrapper that throws if user has opted out
 * Use this to guard AI features
 */
export async function requireAIConsent(): Promise<void> {
    const hasOptedOut = await checkAIOptOut();
    if (hasOptedOut) {
        throw new Error('AI_OPT_OUT: User has opted out of AI features');
    }
}

/**
 * Wrapper for AI calls that respects opt-out
 * Returns fallback response if user has opted out
 */
export async function withAIOptOutCheck<T>(
    aiCall: () => Promise<T>,
    fallbackResponse: T
): Promise<T> {
    const hasOptedOut = await checkAIOptOut();
    if (hasOptedOut) {
        logger.info('AI call skipped due to user opt-out');
        return fallbackResponse;
    }
    return aiCall();
}
