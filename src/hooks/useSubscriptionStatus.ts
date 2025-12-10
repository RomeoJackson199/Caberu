import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionStatus {
    hasSubscription: boolean;
    isActive: boolean;
    status: string | null;
    planName: string | null;
    currentPeriodEnd: Date | null;
    daysRemaining: number | null;
}

export function useSubscriptionStatus(dentistId: string | null) {
    const [subscription, setSubscription] = useState<SubscriptionStatus>({
        hasSubscription: false,
        isActive: false,
        status: null,
        planName: null,
        currentPeriodEnd: null,
        daysRemaining: null,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const checkSubscription = useCallback(async () => {
        if (!dentistId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            const { data, error: fetchError } = await supabase
                .from('subscriptions')
                .select(`
          id,
          status,
          current_period_end,
          cancel_at_period_end,
          subscription_plans:plan_id (
            name,
            slug
          )
        `)
                .eq('dentist_id', dentistId)
                .maybeSingle();

            if (fetchError) throw fetchError;

            if (data) {
                const periodEnd = data.current_period_end ? new Date(data.current_period_end) : null;
                const now = new Date();
                const daysRemaining = periodEnd ? Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

                // Check if subscription is active
                const isActive = data.status === 'active' &&
                    (!periodEnd || periodEnd > now) &&
                    !data.cancel_at_period_end;

                setSubscription({
                    hasSubscription: true,
                    isActive,
                    status: data.status,
                    planName: (data.subscription_plans as any)?.name || null,
                    currentPeriodEnd: periodEnd,
                    daysRemaining,
                });
            } else {
                setSubscription({
                    hasSubscription: false,
                    isActive: false,
                    status: null,
                    planName: null,
                    currentPeriodEnd: null,
                    daysRemaining: null,
                });
            }
        } catch (err) {
            console.error('Error checking subscription:', err);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [dentistId]);

    useEffect(() => {
        checkSubscription();
    }, [checkSubscription]);

    return { subscription, loading, error, refetch: checkSubscription };
}
