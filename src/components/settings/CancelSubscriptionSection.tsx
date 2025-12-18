import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Loader2, CreditCard, AlertTriangle, Calendar, Users, CheckCircle2 } from 'lucide-react';
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

interface PlanLimits {
    customer_limit: number;
    email_limit_monthly: number;
    features: string[];
}

interface UsageStats {
    customerCount: number;
    emailsSent: number;
    teamMembers: number;
}

interface PendingPlanChange {
    planName: string;
    changeDate: string;
}

export function CancelSubscriptionSection() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const { businessId } = useBusinessContext();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
    const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
    const [pendingChange, setPendingChange] = useState<PendingPlanChange | null>(null);
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
                .select('subscription_status, subscription_plan, subscription_ends_at, subscription_started_at, promo_code_used, pending_plan_change, pending_plan_change_date, emails_sent_count, customer_count')
                .eq('id', businessId)
                .single();

            if (error) {
                console.log('Business fetch error:', error);
                return;
            }

            console.log('Business subscription data:', business);

            if (business?.subscription_status && business?.subscription_ends_at) {
                // Show subscription for any status (active, cancelled, cancelling)
                setSubscription({
                    id: businessId,
                    status: business.subscription_status,
                    current_period_end: business.subscription_ends_at,
                    cancel_at_period_end: business.subscription_status === 'cancelling',
                    subscription_plans: {
                        name: business.subscription_plan || 'Free',
                        price_monthly: 0,
                    },
                });

                // Fetch plan limits from subscription_plans table
                if (business.subscription_plan) {
                    const { data: plan } = await supabase
                        .from('subscription_plans')
                        .select('customer_limit, email_limit_monthly, features')
                        .ilike('name', `%${business.subscription_plan}%`)
                        .maybeSingle();

                    if (plan) {
                        setPlanLimits({
                            customer_limit: plan.customer_limit || -1, // -1 = unlimited
                            email_limit_monthly: plan.email_limit_monthly || -1, // -1 = unlimited
                            features: plan.features || ['Basic features'],
                        });
                        // Default limits for promo/free plans (unlimited)
                        setPlanLimits({
                            customer_limit: -1, // Unlimited
                            email_limit_monthly: -1, // Unlimited
                            features: ['All features included for promotion period'],
                        });
                    }
                }
            } else if (business?.subscription_plan) {
                // Business has a plan but no end date (e.g., free plan)
                setSubscription({
                    id: businessId,
                    status: business.subscription_status || 'inactive',
                    current_period_end: undefined as unknown as string,
                    cancel_at_period_end: false,
                    subscription_plans: {
                        name: business.subscription_plan || 'Free',
                        price_monthly: 0,
                    },
                });
                setPlanLimits({
                    customer_limit: -1, // Unlimited
                    email_limit_monthly: -1, // Unlimited
                    features: ['Unlimited appointments', 'Unlimited emails'],
                });
            } else {
                setSubscription(null);
                setPlanLimits(null);
            }

            // Set pending plan change if exists
            if (business?.pending_plan_change) {
                setPendingChange({
                    planName: business.pending_plan_change,
                    changeDate: business.pending_plan_change_date || '',
                });
            } else {
                setPendingChange(null);
            }

            // Fetch usage stats - use columns from business query plus team member count
            if (businessId && business) {
                // Get team member count (not stored on business table)
                const { count: teamCount } = await supabase
                    .from('business_members')
                    .select('*', { count: 'exact', head: true })
                    .eq('business_id', businessId);

                // Calculate customer count dynamically if business count is 0
                let customerCount = business.customer_count || 0;

                if (customerCount === 0) {
                    // Try counting unique patients from appointments
                    const { data: appointments } = await supabase
                        .from('appointments')
                        .select('patient_id')
                        .eq('business_id', businessId);

                    if (appointments) {
                        const uniquePatients = new Set(appointments.map(a => a.patient_id));
                        customerCount = uniquePatients.size;
                    }

                    // If still 0, try patients table explicitly
                    if (customerCount === 0) {
                        const { count: patientTblCount } = await supabase
                            .from('patients')
                            .select('*', { count: 'exact', head: true })
                            .eq('business_id', businessId);
                        customerCount = patientTblCount || 0;
                    }
                }

                setUsageStats({
                    customerCount: customerCount,
                    teamMembers: teamCount || 0,
                    emailsSent: business.emails_sent_count || 0,
                });
            }
        } catch (err) {
            console.error('Error loading subscription:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelSubscription = async (immediately: boolean = false) => {
        if (!businessId) return;

        try {
            setCancelling(true);

            const { data, error } = await supabase.functions.invoke('cancel-subscription', {
                body: {
                    business_id: businessId,
                    cancel_immediately: immediately,
                },
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            toast({
                title: immediately ? 'Subscription Cancelled' : 'Subscription Cancellation Scheduled',
                description: data.message || (immediately
                    ? 'Your subscription has been cancelled.'
                    : `Your subscription will end on ${new Date(data.current_period_end).toLocaleDateString()}.`),
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
                            You don't have an active subscription. Subscribe or use a promo code on the pricing page.
                        </p>
                    </div>

                    <Button className="w-full" onClick={() => navigate('/pricing')}>
                        View Plans & Promo Codes
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const periodEndDate = subscription.current_period_end ? new Date(subscription.current_period_end) : null;
    const isExpired = periodEndDate && periodEndDate < new Date(); // Check if subscription period has ended
    const isActive = subscription.status === 'active' && !subscription.cancel_at_period_end && !isExpired;
    const isCancelled = subscription.status === 'cancelled' || isExpired; // Also cancelled if expired
    const isCancelling = (subscription.status === 'cancelling' || subscription.cancel_at_period_end) && !isExpired;
    const daysRemaining = periodEndDate ? Math.max(0, Math.ceil((periodEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
    const cycleLabel = subscription.billing_cycle === 'yearly' ? 'yearly' : 'monthly';

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Subscription
                    </CardTitle>
                    <Badge variant={isCancelled ? 'destructive' : isActive ? 'default' : 'secondary'}>
                        {isCancelled ? 'Cancelled' : isCancelling ? 'Cancelling' : 'Active'}
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
                            {periodEndDate
                                ? `${isCancelling ? 'Access ends' : 'Renews'} on ${periodEndDate.toLocaleDateString()}`
                                : 'No end date set'}
                        </p>
                        {periodEndDate && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <Calendar className="h-4 w-4" />
                                <span>{daysRemaining} days remaining</span>
                            </div>
                        )}
                    </div>

                    <div className="border rounded-lg p-4 bg-muted/30">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                        <p className="text-base font-semibold capitalize">
                            {isCancelled ? 'Cancelled' : isCancelling ? 'Cancelling' : 'Active'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {isCancelled
                                ? 'Your subscription has been cancelled.'
                                : isCancelling
                                    ? 'Your subscription stays active until the end of this period.'
                                    : 'Active and set to auto-renew.'}
                        </p>
                    </div>
                </div>

                {/* Pending Plan Change */}
                {pendingChange && (
                    <div className="border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/20">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                            <Calendar className="h-4 w-4" />
                            Scheduled Plan Change
                        </h4>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            Your plan will change to <strong>{pendingChange.planName}</strong> on{' '}
                            <strong>{pendingChange.changeDate ? new Date(pendingChange.changeDate).toLocaleDateString() : 'TBD'}</strong>
                        </p>
                    </div>
                )}

                {/* Plan Limits & Usage Stats */}
                {planLimits && (
                    <div className="border rounded-lg p-4 bg-muted/10">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Plan Limits & Usage
                        </h4>

                        {/* Usage Stats Grid */}
                        <div className="grid gap-3 sm:grid-cols-2 mb-4">
                            {/* Team Members */}
                            <div className="p-3 bg-background rounded-md border">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-muted-foreground">Team Members</span>
                                    <span className="text-xs font-medium">{usageStats?.teamMembers || 0}</span>
                                </div>
                                <div className="text-lg font-semibold">{usageStats?.teamMembers || 0}</div>
                            </div>

                            {/* Emails Sent with Progress Bar */}
                            <div className="p-3 bg-background rounded-md border">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-muted-foreground">Emails Sent</span>
                                    <span className="text-xs font-medium">
                                        {usageStats?.emailsSent || 0} / {planLimits.email_limit_monthly === -1 ? '∞' : planLimits.email_limit_monthly?.toLocaleString() || '∞'}
                                    </span>
                                </div>
                                {/* Only show progress bar if not unlimited */}
                                {planLimits.email_limit_monthly !== -1 && (
                                    <div className="w-full bg-muted rounded-full h-2 mb-1">
                                        <div
                                            className={`h-2 rounded-full transition-all ${(usageStats?.emailsSent || 0) >= (planLimits.email_limit_monthly || 10000)
                                                ? 'bg-red-500'
                                                : (usageStats?.emailsSent || 0) >= (planLimits.email_limit_monthly || 10000) * 0.8
                                                    ? 'bg-yellow-500'
                                                    : 'bg-green-500'
                                                }`}
                                            style={{ width: `${Math.min(100, ((usageStats?.emailsSent || 0) / (planLimits.email_limit_monthly || 10000)) * 100)}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Current Plan Info */}
                        <div className="flex items-center justify-between p-3 bg-background rounded-md border mb-3">
                            <span className="text-sm text-muted-foreground">Current Plan</span>
                            <span className="font-semibold capitalize">{subscription.subscription_plans?.name || 'Standard'}</span>
                        </div>

                        {planLimits.features && planLimits.features.length > 0 && (
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Features Included</p>
                                <div className="grid gap-1.5 sm:grid-cols-2">
                                    {planLimits.features.slice(0, 6).map((feature, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                        variant={isCancelled ? 'default' : 'outline'}
                        onClick={() => navigate('/pricing')}
                        className="flex-1"
                    >
                        {isCancelled ? 'Reactivate Subscription' : 'Change Plan'}
                    </Button>

                    {isCancelled ? (
                        <div className="flex-1 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                            <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
                                <AlertTriangle className="h-4 w-4" />
                                <span>Subscription cancelled{periodEndDate ? ` - expired ${periodEndDate.toLocaleDateString()}` : ''}</span>
                            </div>
                        </div>
                    ) : isCancelling ? (
                        <div className="flex-1 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200 text-sm">
                                <AlertTriangle className="h-4 w-4" />
                                <span>Ending on {periodEndDate?.toLocaleDateString()}</span>
                            </div>
                        </div>
                    ) : (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={cancelling} className="flex-1">
                                    {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Cancel Subscription
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Your subscription will remain active until {periodEndDate?.toLocaleDateString() || 'the end of your billing period'}.
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
                </div>
            </CardContent>
        </Card>
    );
}

export default CancelSubscriptionSection;
