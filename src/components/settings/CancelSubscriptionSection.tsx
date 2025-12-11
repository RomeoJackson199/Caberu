import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    current_period_start?: string;
    billing_cycle?: 'monthly' | 'yearly';
    plan_id?: string;
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
    const [promoCode, setPromoCode] = useState('');
    const [applyingPromo, setApplyingPromo] = useState(false);

    useEffect(() => {
        loadSubscription();
    }, [businessId]);

    const loadSubscription = async () => {
        try {
            setLoading(true);

            if (!businessId) {
                console.log('No businessId provided');
                return;
            }

            // Get subscription info directly from businesses table
            const { data: business, error } = await supabase
                .from('businesses')
                .select('subscription_status, subscription_plan, subscription_ends_at, subscription_started_at, promo_code_used')
                .eq('id', businessId)
                .single();

            if (error) {
                console.log('Business fetch error:', error);
                return;
            }

            console.log('Business subscription data:', business);

            if (business?.subscription_status === 'active' && business?.subscription_ends_at) {
                setSubscription({
                    id: businessId,
                    status: business.subscription_status,
                    current_period_end: business.subscription_ends_at,
                    cancel_at_period_end: false,
                    subscription_plans: {
                        name: business.subscription_plan || 'Promo',
                        price_monthly: 0,
                    },
                });
            } else {
                setSubscription(null);
            }
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

    const handleApplyPromoCode = async () => {
        if (!promoCode.trim()) return;

        try {
            setApplyingPromo(true);

            const { data, error } = await supabase.functions.invoke('apply-promo-code', {
                body: JSON.stringify({
                    promo_code: promoCode.trim(),
                    business_id: businessId,
                }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            toast({
                title: 'Promo Code Applied!',
                description: data.new_period_end
                    ? `You're covered until ${new Date(data.new_period_end).toLocaleDateString()}.`
                    : data.message || 'Your subscription has been extended.',
            });

            setPromoCode('');
            await loadSubscription();
        } catch (err) {
            console.error('Promo code error:', err);
            toast({
                title: 'Error',
                description: err instanceof Error ? err.message : 'Failed to apply promo code',
                variant: 'destructive',
            });
        } finally {
            setApplyingPromo(false);
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
                <CardContent className="space-y-6">
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="font-medium">No Active Subscription</span>
                        </div>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                            You don't have an active subscription. Please subscribe or redeem a promo code to access features.
                        </p>
                    </div>

                    <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                        <h4 className="font-medium text-sm">Redeem Promo Code</h4>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Enter promo code"
                                value={promoCode}
                                onChange={(e) => setPromoCode(e.target.value)}
                                className="bg-background"
                            />
                            <Button
                                onClick={handleApplyPromoCode}
                                disabled={applyingPromo || !promoCode}
                                variant="outline"
                            >
                                {applyingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                            </Button>
                        </div>
                    </div>

                    <Button className="w-full" onClick={() => window.location.href = '/pricing'}>
                        View Subscription Plans
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const periodEndDate = new Date(subscription.current_period_end);
    const isActive = subscription.status === 'active' && !subscription.cancel_at_period_end;
    const daysRemaining = Math.max(0, Math.ceil((periodEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    const cycleLabel = subscription.billing_cycle === 'yearly' ? 'yearly' : 'monthly';

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
            <CardContent className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="border rounded-lg p-4 bg-muted/30">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Plan</p>
                        <p className="text-base font-semibold">
                            {subscription.subscription_plans?.name || 'Current Plan'}
                        </p>
                        <p className="text-sm text-muted-foreground">Billed {cycleLabel}</p>
                    </div>

                    <div className="border rounded-lg p-4 bg-muted/30">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Next bill date</p>
                        <p className="text-base font-semibold">
                            {subscription.cancel_at_period_end ? 'Access ends' : 'Renews'} on {periodEndDate.toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Calendar className="h-4 w-4" />
                            <span>{daysRemaining} days remaining</span>
                        </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-muted/30">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                        <p className="text-base font-semibold capitalize">{subscription.status}</p>
                        <p className="text-sm text-muted-foreground">
                            {subscription.cancel_at_period_end
                                ? 'Your subscription stays active until the end of this period.'
                                : 'Active and set to auto-renew.'}
                        </p>
                    </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <h4 className="font-medium text-sm">Redeem Promo Code</h4>
                    <div className="flex gap-2 flex-col sm:flex-row">
                        <Input
                            placeholder="Enter promo code"
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value)}
                            className="bg-background"
                        />
                        <Button
                            onClick={handleApplyPromoCode}
                            disabled={applyingPromo || !promoCode}
                            variant="outline"
                            className="sm:min-w-[120px]"
                        >
                            {applyingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Applying a valid promo code immediately extends your paid-through date. Your free month will appear in the
                        next bill date shown above.
                    </p>
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
