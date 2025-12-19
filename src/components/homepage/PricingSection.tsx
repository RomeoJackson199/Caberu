import { useState } from "react";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_yearly: number;
  customer_limit: number;
  features: string[];
  isPopular?: boolean;
}

const FALLBACK_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter-fallback',
    name: 'Starter',
    slug: 'starter',
    price_monthly: 249,
    price_yearly: 2480,
    customer_limit: -1, // Unlimited
    features: [
      "Unlimited appointments",
      "Unlimited emails",
      "5 min AI phone/day + pay-as-you-go",
      "Patient management",
      "Basic appointment scheduling",
      "Email notifications",
      "Basic reports"
    ],
    isPopular: false
  },
  {
    id: 'pro-fallback',
    name: 'Professional',
    slug: 'professional',
    price_monthly: 499,
    price_yearly: 4970,
    customer_limit: -1, // Unlimited
    features: [
      "Unlimited appointments",
      "Unlimited emails",
      "10 min AI phone/day + pay-as-you-go",
      "Everything in Starter",
      "Advanced analytics",
      "SMS notifications",
      "Custom branding",
      "Priority support"
    ],
    isPopular: true
  },
  {
    id: 'enterprise-fallback',
    name: 'Enterprise',
    slug: 'enterprise',
    price_monthly: 999,
    price_yearly: 9950,
    customer_limit: -1, // Unlimited
    features: [
      "Unlimited appointments",
      "Unlimited emails",
      "20 min AI phone/day + pay-as-you-go",
      "Everything in Professional",
      "Unlimited staff accounts",
      "API access",
      "Dedicated support",
      "Custom integrations"
    ],
    isPopular: false
  }
];

export const PricingSection = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const navigate = useNavigate();

  const { data: fetchedPlans, isLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) {
        console.warn("Failed to fetch plans, using fallback:", error);
        return null;
      }

      return (data || []).map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : [],
        isPopular: plan.slug === 'professional'
      })) as SubscriptionPlan[];
    },
  });

  const plans = (fetchedPlans && fetchedPlans.length > 0) ? fetchedPlans : FALLBACK_PLANS;

  // Loading skeleton
  if (isLoading) {
    return (
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="h-10 w-80 bg-muted animate-pulse rounded-lg mx-auto mb-4" />
            <div className="h-6 w-64 bg-muted animate-pulse rounded-lg mx-auto" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-8 animate-pulse">
                <div className="space-y-6">
                  <div className="h-8 w-32 bg-muted rounded" />
                  <div className="h-12 w-24 bg-muted rounded" />
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="h-4 w-full bg-muted rounded" />
                    ))}
                  </div>
                  <div className="h-12 w-full bg-muted rounded-xl" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to run your practice efficiently
          </p>
        </div>

        <div>
          {/* Billing Cycle Toggle */}
          <div className="flex justify-center gap-2 p-1 bg-muted rounded-xl max-w-xs mx-auto border border-border mb-12">
            <Button
              variant={billingCycle === 'monthly' ? 'default' : 'ghost'}
              onClick={() => setBillingCycle('monthly')}
              className={`flex-1 rounded-lg ${billingCycle === 'monthly' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
            >
              Monthly
            </Button>
            <Button
              variant={billingCycle === 'yearly' ? 'default' : 'ghost'}
              onClick={() => setBillingCycle('yearly')}
              className={`flex-1 rounded-lg ${billingCycle === 'yearly' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
            >
              Yearly <span className="ml-1 text-xs text-green-600 dark:text-green-400 font-medium">(Save 17%)</span>
            </Button>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => {
              const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
              const isPro = plan.isPopular;

              return (
                <Card
                  key={plan.id}
                  className={`relative p-8 transition-all duration-300 ${isPro
                    ? "bg-gradient-to-b from-primary/5 via-background to-background border-primary/30 shadow-xl lg:scale-105 z-10"
                    : "bg-card border-border hover:border-primary/20 hover:shadow-lg"
                    }`}
                >
                  {isPro && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <div className="flex items-center gap-1 bg-primary px-4 py-1 rounded-full text-primary-foreground text-sm font-semibold shadow-md">
                        <Sparkles className="w-3 h-3" />
                        Popular
                      </div>
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-bold text-foreground">€{price}</span>
                        <span className="text-muted-foreground font-medium">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {plan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className={`mt-0.5 rounded-full p-1 ${isPro ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                            }`}>
                            <Check className="w-3 h-3" />
                          </div>
                          <span className="text-sm text-muted-foreground leading-tight pt-0.5">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={() => navigate('/signup')}
                      className={`w-full h-12 font-semibold rounded-xl transition-all duration-200 ${isPro
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-primary/25"
                        : "bg-background border-2 border-border hover:border-primary/30 text-foreground hover:bg-muted"
                        }`}
                    >
                      Get Started
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="text-center mt-12 text-sm text-muted-foreground">
            <p>All plans include free updates and can be cancelled anytime.</p>
          </div>
        </div>
      </div>
    </section>
  );
};
