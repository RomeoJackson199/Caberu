import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from '@/hooks/useBusinessContext';

export interface BusinessSubscriptionStatus {
    hasSubscription: boolean;
    isActive: boolean;
    status: string | null;
    planName: string | null;
    endsAt: Date | null;
    loading: boolean;
    error: Error | null;
}

export function useBusinessSubscription() {
    const { businessId, loading: businessLoading } = useBusinessContext();
    const [status, setStatus] = useState<BusinessSubscriptionStatus>({
        hasSubscription: false,
        isActive: false,
        status: null,
        planName: null,
        endsAt: null,
        loading: true,
        error: null,
    });

    const checkSubscription = useCallback(async () => {
        if (!businessId) {
            setStatus(prev => ({ ...prev, loading: false }));
            return;
        }

        try {
            setStatus(prev => ({ ...prev, loading: true, error: null }));

            const { data: business, error } = await supabase
                .from('businesses')
                .select('subscription_status, subscription_plan, subscription_ends_at')
                .eq('id', businessId)
                .single();

            if (error) throw error;

            if (business) {
                const endsAt = business.subscription_ends_at
                    ? new Date(business.subscription_ends_at)
                    : null;
                const now = new Date();

                // Check if subscription is active
                // Active statuses: 'active', 'trialing', 'cancelling' (valid until end date)
                const activeStatuses = ['active', 'trialing', 'cancelling'];
                const hasValidStatus = activeStatuses.includes(business.subscription_status || '');
                const notExpired = !endsAt || endsAt > now;
                const isActive = hasValidStatus && notExpired;

                // Debug logging
                console.log('🔐 Subscription Check:', {
                    businessId,
                    status: business.subscription_status,
                    endsAt: endsAt?.toISOString(),
                    now: now.toISOString(),
                    hasValidStatus,
                    notExpired,
                    isActive
                });

                setStatus({
                    hasSubscription: !!business.subscription_status,
                    isActive,
                    status: business.subscription_status,
                    planName: business.subscription_plan,
                    endsAt,
                    loading: false,
                    error: null,
                });
            } else {
                setStatus({
                    hasSubscription: false,
                    isActive: false,
                    status: null,
                    planName: null,
                    endsAt: null,
                    loading: false,
                    error: null,
                });
            }
        } catch (err) {
            console.error('Error checking business subscription:', err);
            setStatus(prev => ({
                ...prev,
                loading: false,
                error: err as Error,
            }));
        }
    }, [businessId]);

    useEffect(() => {
        if (!businessLoading) {
            checkSubscription();
        }
    }, [businessLoading, checkSubscription]);

    return { ...status, refetch: checkSubscription };
}
