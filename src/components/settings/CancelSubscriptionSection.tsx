import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard, AlertTriangle, Calendar } from 'lucide-react';
import { useBusinessContext } from '@/hooks/useBusinessContext';

interface Subscription {
    id: string;
    status: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    subscription_plans: {
        name: string;
        price_monthly: number;
    };
}

export function CancelSubscriptionSection() {
    const { toast } = useToast();
    const { businessId } = useBusinessContext();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        loadSubscription();
    }, [businessId]);

    const loadSubscription = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!profile) return;

            // Get dentist for this business
            const { data: dentist } = await supabase
                .from('dentists')
                .select('id')
                .eq('profile_id', profile.id)
                .eq('business_id', businessId)
                .maybeSingle();

            if (!dentist) return;

            // Get subscription
            const { data: sub, error } = await supabase
                .from('subscriptions')
                .select(`
          id,
          status,
          current_period_end,
          cancel_at_period_end,
          subscription_plans (name, price_monthly)
        `)
                .eq('dentist_id', dentist.id)
                .maybeSingle();

            if (error) throw error;
            setSubscription(sub);
        } catch (err) {
            console.error('Error loading subscription:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelSubscription = async (immediately: boolean = false) => {
        if (!subscription) return;

        try {
            setCancelling(true);

            const { data, error } = await supabase.functions.invoke('cancel-subscription', {
                body: {
                    subscription_id: subscription.id,
                    cancel_immediately: immediately,
                },
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            toast({
                title: immediately ? 'Subscription Cancelled' : 'Subscription Cancellation Scheduled',
                description: immediately
                    ? 'Your subscription has been cancelled. You no longer have access to premium features.'
                    : `Your subscription will end on ${new Date(data.current_period_end).toLocaleDateString()}. You'll have access until then.`,
            });

            // Reload subscription data
            await loadSubscription();
        } catch (err) {
            console.error('Cancel error:', err);
            toast({
                title: 'Error',
                description: err instanceof Error ? err.message : 'Failed to cancel subscription',
                variant: 'destructive',
            });
        } finally {
            setCancelling(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    if (!subscription) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Subscription
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">No active subscription found.</p>
                    <Button className="mt-4" variant="outline" onClick={() => window.location.href = '/pricing'}>
                        View Plans
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const periodEndDate = new Date(subscription.current_period_end);
    const isActive = subscription.status === 'active' && !subscription.cancel_at_period_end;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Subscription
                    </CardTitle>
                    <Badge variant={isActive ? 'default' : 'secondary'}>
                        {subscription.cancel_at_period_end ? 'Cancelling' : subscription.status}
                    </Badge>
                </div>
                <CardDescription>
                    {subscription.subscription_plans?.name || 'Current Plan'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {subscription.cancel_at_period_end ? (
                        <span>Access ends on {periodEndDate.toLocaleDateString()}</span>
                    ) : (
                        <span>Renews on {periodEndDate.toLocaleDateString()}</span>
                    )}
                </div>

                {subscription.cancel_at_period_end ? (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="font-medium">Subscription ending soon</span>
                        </div>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                            Your subscription will end on {periodEndDate.toLocaleDateString()}.
                            You'll lose access to premium features after this date.
                        </p>
                    </div>
                ) : (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={cancelling}>
                                {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Cancel Subscription
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Your subscription will remain active until {periodEndDate.toLocaleDateString()}.
                                    After that, you'll lose access to premium features.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => handleCancelSubscription(false)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    Cancel at Period End
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </CardContent>
        </Card>
    );
}

export default CancelSubscriptionSection;
