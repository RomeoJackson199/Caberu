/**
 * In-App Purchase Components
 *
 * Components for handling Apple In-App Purchases via RevenueCat.
 * Includes purchase buttons, subscription cards, and restore functionality.
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, RefreshCw, Check, Crown, Sparkles, AlertCircle } from 'lucide-react';
import { useInAppPurchases, useDespiaNative, useHaptics } from '@/hooks/useDespia';
import { cn } from '@/lib/utils';

// ============================================
// PURCHASE BUTTON
// ============================================

interface PurchaseButtonProps {
  productId: string;
  userId: string;
  label?: string;
  price?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
}

export function PurchaseButton({
  productId,
  userId,
  label = 'Purchase',
  price,
  onSuccess,
  onError,
  className,
  variant = 'default',
  size = 'default',
}: PurchaseButtonProps) {
  const isNative = useDespiaNative();
  const haptics = useHaptics();
  const { purchase, isPurchasing } = useInAppPurchases({
    userId,
    onPurchaseComplete: (result) => {
      if (result.status === 'success') {
        haptics.success();
        onSuccess?.();
      } else if (result.status === 'failed') {
        haptics.error();
        onError?.('Purchase failed');
      }
    },
  });

  const handlePurchase = async () => {
    haptics.impact();
    await purchase(productId);
  };

  if (!isNative) {
    return (
      <Button
        variant="outline"
        size={size}
        className={cn('opacity-50', className)}
        disabled
      >
        <CreditCard className="h-4 w-4 mr-2" />
        In-App Purchase unavailable
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handlePurchase}
      disabled={isPurchasing}
      className={className}
    >
      {isPurchasing ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <CreditCard className="h-4 w-4 mr-2" />
      )}
      {isPurchasing ? 'Processing...' : label}
      {price && !isPurchasing && <span className="ml-1 font-semibold">{price}</span>}
    </Button>
  );
}

// ============================================
// RESTORE PURCHASES BUTTON
// ============================================

interface RestorePurchasesButtonProps {
  userId: string;
  onRestored?: (productIds: string[]) => void;
  onError?: () => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
}

export function RestorePurchasesButton({
  userId,
  onRestored,
  onError,
  className,
  variant = 'ghost',
}: RestorePurchasesButtonProps) {
  const isNative = useDespiaNative();
  const haptics = useHaptics();
  const { restore, isRestoring } = useInAppPurchases({
    userId,
    onRestoreComplete: (products) => {
      if (products.length > 0) {
        haptics.success();
        onRestored?.(products);
      } else {
        haptics.warning();
        onError?.();
      }
    },
  });

  if (!isNative) {
    return null;
  }

  return (
    <Button
      variant={variant}
      onClick={() => restore()}
      disabled={isRestoring}
      className={className}
    >
      {isRestoring ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4 mr-2" />
      )}
      {isRestoring ? 'Restoring...' : 'Restore Purchases'}
    </Button>
  );
}

// ============================================
// SUBSCRIPTION CARD
// ============================================

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: string;
  period: 'monthly' | 'yearly' | 'lifetime';
  features: string[];
  popular?: boolean;
  savings?: string;
}

interface SubscriptionCardProps {
  plan: SubscriptionPlan;
  userId: string;
  isCurrentPlan?: boolean;
  onPurchaseSuccess?: () => void;
  onPurchaseError?: (error: string) => void;
}

export function SubscriptionCard({
  plan,
  userId,
  isCurrentPlan = false,
  onPurchaseSuccess,
  onPurchaseError,
}: SubscriptionCardProps) {
  const isNative = useDespiaNative();
  const haptics = useHaptics();
  const { purchase, isPurchasing } = useInAppPurchases({
    userId,
    onPurchaseComplete: (result) => {
      if (result.status === 'success') {
        haptics.success();
        onPurchaseSuccess?.();
      } else if (result.status === 'failed') {
        haptics.error();
        onPurchaseError?.('Subscription failed');
      }
    },
  });

  const periodLabels = {
    monthly: '/month',
    yearly: '/year',
    lifetime: 'one-time',
  };

  return (
    <Card className={cn(
      'relative overflow-hidden transition-all',
      plan.popular && 'border-primary shadow-lg scale-105',
      isCurrentPlan && 'border-green-500 bg-green-50/50'
    )}>
      {plan.popular && (
        <div className="absolute top-0 right-0">
          <Badge className="rounded-none rounded-bl-lg">
            <Sparkles className="h-3 w-3 mr-1" />
            Most Popular
          </Badge>
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute top-0 left-0">
          <Badge variant="secondary" className="rounded-none rounded-br-lg bg-green-100 text-green-700">
            <Check className="h-3 w-3 mr-1" />
            Current Plan
          </Badge>
        </div>
      )}

      <CardHeader className={cn(plan.popular && 'pt-8')}>
        <div className="flex items-center gap-2">
          <Crown className={cn(
            'h-5 w-5',
            plan.popular ? 'text-yellow-500' : 'text-muted-foreground'
          )} />
          <CardTitle>{plan.name}</CardTitle>
        </div>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">{plan.price}</span>
          <span className="text-muted-foreground">{periodLabels[plan.period]}</span>
        </div>

        {plan.savings && (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            Save {plan.savings}
          </Badge>
        )}

        <ul className="space-y-2">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        {isCurrentPlan ? (
          <Button variant="outline" className="w-full" disabled>
            <Check className="h-4 w-4 mr-2" />
            Current Plan
          </Button>
        ) : isNative ? (
          <Button
            className="w-full"
            variant={plan.popular ? 'default' : 'outline'}
            onClick={() => {
              haptics.impact();
              purchase(plan.id);
            }}
            disabled={isPurchasing}
          >
            {isPurchasing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            {isPurchasing ? 'Processing...' : 'Subscribe'}
          </Button>
        ) : (
          <Button variant="outline" className="w-full opacity-50" disabled>
            Open in app to subscribe
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

// ============================================
// SUBSCRIPTION STATUS BANNER
// ============================================

interface SubscriptionStatusBannerProps {
  isSubscribed: boolean;
  planName?: string;
  expiresAt?: Date;
  onUpgrade?: () => void;
  onManage?: () => void;
}

export function SubscriptionStatusBanner({
  isSubscribed,
  planName,
  expiresAt,
  onUpgrade,
  onManage,
}: SubscriptionStatusBannerProps) {
  if (isSubscribed) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <Crown className="h-4 w-4 text-green-600" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <span className="font-medium text-green-800">
              {planName || 'Premium'} Subscription Active
            </span>
            {expiresAt && (
              <span className="text-green-600 text-sm ml-2">
                Renews {expiresAt.toLocaleDateString()}
              </span>
            )}
          </div>
          {onManage && (
            <Button variant="ghost" size="sm" onClick={onManage}>
              Manage
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-yellow-200 bg-yellow-50">
      <AlertCircle className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-yellow-800">
          Upgrade to Premium for full access
        </span>
        {onUpgrade && (
          <Button variant="default" size="sm" onClick={onUpgrade}>
            <Sparkles className="h-4 w-4 mr-2" />
            Upgrade
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export default {
  PurchaseButton,
  RestorePurchasesButton,
  SubscriptionCard,
  SubscriptionStatusBanner,
};
