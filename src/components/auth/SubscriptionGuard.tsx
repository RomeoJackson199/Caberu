import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useBusinessSubscription } from '@/hooks/useBusinessSubscription';
import { PremiumLoadingScreen } from '@/components/ui/premium-loading-screen';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CreditCard } from 'lucide-react';

interface SubscriptionGuardProps {
    children: React.ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
    const location = useLocation();
    const { isActive, loading, status } = useBusinessSubscription();

    // Allow access to billing/settings pages even without subscription
    const allowedPaths = [
        '/dentist/settings',
        '/dentist/billing',
        '/pricing',
    ];

    const isAllowedPath = allowedPaths.some(path =>
        location.pathname.startsWith(path)
    );

    // Debug logging
    console.log('🛡️ SubscriptionGuard:', {
        pathname: location.pathname,
        isActive,
        loading,
        status,
        isAllowedPath,
        shouldRedirect: !loading && !isActive && !isAllowedPath
    });

    // Show loading while checking subscription
    if (loading) {
        return (
            <PremiumLoadingScreen
                message="Checking subscription..."
                description="Verifying your account status"
            />
        );
    }

    // If subscription is active or user is on allowed path, render children
    if (isActive || isAllowedPath) {
        console.log('🛡️ SubscriptionGuard: Allowing access');
        return <>{children}</>;
    }

    // No active subscription - redirect to billing page with message
    console.log('🛡️ SubscriptionGuard: REDIRECTING to billing!');
    return (
        <Navigate
            to="/dentist/settings?tab=billing"
            state={{
                from: location.pathname,
                message: 'Please activate your subscription to continue using the platform.'
            }}
            replace
        />
    );
}

// Inline banner component for subscription warnings
export function SubscriptionBanner() {
    const { isActive, status, endsAt, loading } = useBusinessSubscription();

    if (loading || isActive) return null;

    // Show warning banner
    return (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <div className="text-sm">
                        <span className="font-medium text-destructive">
                            {status === 'expired' ? 'Your subscription has expired.' :
                                status === 'cancelled' ? 'Your subscription has been cancelled.' :
                                    'No active subscription found.'}
                        </span>
                        <span className="text-muted-foreground ml-2">
                            Please renew to continue using all features.
                        </span>
                    </div>
                </div>
                <Button size="sm" variant="destructive" asChild>
                    <a href="/dentist/settings?tab=billing">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Manage Billing
                    </a>
                </Button>
            </div>
        </div>
    );
}
