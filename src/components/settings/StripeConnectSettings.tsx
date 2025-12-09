import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useToast } from "@/hooks/use-toast";
import {
    CreditCard,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ExternalLink,
    RefreshCw,
    Banknote
} from "lucide-react";
import { logger } from "@/lib/logger";

interface StripeConnectStatus {
    connected: boolean;
    account_id?: string;
    charges_enabled: boolean;
    payouts_enabled: boolean;
    onboarding_completed: boolean;
    status: 'not_connected' | 'pending' | 'active' | 'restricted';
    requirements?: string[];
    message: string;
}

export function StripeConnectSettings() {
    const { businessId, businessName } = useBusinessContext();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [status, setStatus] = useState<StripeConnectStatus | null>(null);

    useEffect(() => {
        if (businessId) {
            checkStatus();
        }
    }, [businessId]);

    const checkStatus = async () => {
        if (!businessId) return;

        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('check-stripe-connect-status', {
                body: { business_id: businessId }
            });

            if (error) throw error;
            setStatus(data);
        } catch (error: any) {
            logger.error('Error checking Stripe Connect status:', error);
            setStatus({
                connected: false,
                charges_enabled: false,
                payouts_enabled: false,
                onboarding_completed: false,
                status: 'not_connected',
                message: 'Unable to check Stripe status',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        if (!businessId) {
            toast({
                title: "Error",
                description: "No business selected",
                variant: "destructive",
            });
            return;
        }

        setConnecting(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-stripe-connect-account', {
                body: {
                    business_id: businessId,
                    return_url: `${window.location.origin}/dentist/settings?tab=branding&stripe=complete`,
                    refresh_url: `${window.location.origin}/dentist/settings?tab=branding&stripe=refresh`,
                }
            });

            if (error) throw error;

            if (data?.url) {
                // Redirect to Stripe onboarding
                window.location.href = data.url;
            } else {
                throw new Error('No onboarding URL returned');
            }
        } catch (error: any) {
            logger.error('Error connecting Stripe:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to start Stripe Connect setup",
                variant: "destructive",
            });
        } finally {
            setConnecting(false);
        }
    };

    const getStatusBadge = () => {
        if (!status) return null;

        switch (status.status) {
            case 'active':
                return <Badge className="bg-green-600 text-white">Active</Badge>;
            case 'pending':
                return <Badge variant="secondary">Setup Incomplete</Badge>;
            case 'restricted':
                return <Badge variant="destructive">Action Required</Badge>;
            default:
                return <Badge variant="outline">Not Connected</Badge>;
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Payment Processing
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Payment Processing
                        </CardTitle>
                        <CardDescription>
                            Connect your Stripe account to receive patient payments directly
                        </CardDescription>
                    </div>
                    {getStatusBadge()}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {status?.status === 'active' ? (
                    <>
                        <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800 dark:text-green-200">
                                <strong>Stripe Connected!</strong> Patient payments will be deposited directly to your bank account.
                            </AlertDescription>
                        </Alert>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="flex items-center gap-3 p-4 border rounded-lg">
                                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="font-medium">Card Payments</p>
                                    <p className="text-sm text-muted-foreground">Ready to accept</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 border rounded-lg">
                                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <Banknote className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="font-medium">Payouts</p>
                                    <p className="text-sm text-muted-foreground">
                                        {status.payouts_enabled ? 'Enabled' : 'Pending verification'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={checkStatus}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refresh Status
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                                <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Stripe Dashboard
                                </a>
                            </Button>
                        </div>
                    </>
                ) : status?.status === 'pending' || status?.status === 'restricted' ? (
                    <>
                        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="text-amber-800 dark:text-amber-200">
                                {status.status === 'restricted'
                                    ? 'Your Stripe account needs attention. Please complete the required steps.'
                                    : 'Complete your Stripe setup to start receiving patient payments.'}
                            </AlertDescription>
                        </Alert>

                        <Button onClick={handleConnect} disabled={connecting}>
                            {connecting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Loading...
                                </>
                            ) : (
                                <>
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Complete Stripe Setup
                                </>
                            )}
                        </Button>

                        {status.requirements && status.requirements.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                                <p className="font-medium mb-1">Required information:</p>
                                <ul className="list-disc list-inside">
                                    {status.requirements.slice(0, 3).map((req, i) => (
                                        <li key={i}>{req.replace(/_/g, ' ')}</li>
                                    ))}
                                    {status.requirements.length > 3 && (
                                        <li>...and {status.requirements.length - 3} more</li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="text-center py-4">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 mb-4">
                                <CreditCard className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="font-semibold mb-2">Accept Patient Payments</h3>
                            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
                                Connect your Stripe account to receive patient payments directly to your bank account.
                                Caberu takes a small platform fee, the rest goes straight to you.
                            </p>
                        </div>

                        <Button onClick={handleConnect} disabled={connecting} className="w-full" size="lg">
                            {connecting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Setting up...
                                </>
                            ) : (
                                <>
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Connect Stripe Account
                                </>
                            )}
                        </Button>

                        <p className="text-xs text-center text-muted-foreground">
                            You'll be redirected to Stripe to complete secure onboarding
                        </p>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
