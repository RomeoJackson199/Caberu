import { useState } from "react";
import { Check, Sparkles, Zap, Crown, Building2, ArrowRight } from "lucide-react";
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
      "300 min AI phone/month",
      "WhatsApp integration",
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
      "600 min AI phone/month",
      "500 WhatsApp messages/month",
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
      "1200 min AI phone/month",
      "2000 WhatsApp messages/month",
      "Everything in Professional",
      "Unlimited staff accounts",
      "API access",
      "Dedicated support",
      "Custom integrations"
    ],
    isPopular: false
  }
];

const PLAN_META: Record<string, { icon: React.ElementType; description: string; color: string }> = {
  starter: {
    icon: Zap,
    description: "Perfect for solo practitioners getting started with AI",
    color: "text-blue-500",
  },
  professional: {
    icon: Crown,
    description: "The most popular choice for growing practices",
    color: "text-primary",
  },
  enterprise: {
    icon: Building2,
    description: "For large practices and multi-location clinics",
    color: "text-amber-500",
  },
};

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
          <div className="text-center mb-16">
            <div className="h-8 w-48 bg-muted animate-pulse rounded-full mx-auto mb-6" />
            <div className="h-10 w-80 bg-muted animate-pulse rounded-lg mx-auto mb-4" />
            <div className="h-6 w-64 bg-muted animate-pulse rounded-lg mx-auto" />
          </div>
          <div className="h-12 w-72 mx-auto bg-muted animate-pulse rounded-full mb-16" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-8 animate-pulse rounded-2xl">
                <div className="space-y-6">
                  <div className="h-10 w-10 bg-muted rounded-xl" />
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
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Simple, transparent pricing
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Choose the right plan
            <br />
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              for your practice
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Everything you need to run your practice efficiently
          </p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-16">
          <div className="relative inline-flex items-center gap-1 p-1 bg-muted/60 rounded-full border border-border/50">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`relative z-10 px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                billingCycle === 'monthly'
                  ? 'bg-background text-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`relative z-10 px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                billingCycle === 'yearly'
                  ? 'bg-background text-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yearly
            </button>
            {billingCycle === 'yearly' && (
              <span className="absolute -top-2.5 -right-2 px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full shadow-sm">
                2 months free
              </span>
            )}
            {billingCycle === 'monthly' && (
              <span className="ml-2 mr-1 px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium rounded-full">
                Get 2 months free yearly
              </span>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
            const monthlyEquivalent = billingCycle === 'yearly' ? Math.round(plan.price_yearly / 12) : null;
            const isPro = plan.isPopular;
            const meta = PLAN_META[plan.slug] || PLAN_META.starter;
            const PlanIcon = meta.icon;

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col p-0 overflow-hidden transition-all duration-300 rounded-2xl ${
                  isPro
                    ? "border-2 border-primary/40 shadow-[0_0_40px_rgba(139,92,246,0.15)] lg:scale-[1.03] z-10"
                    : "border border-border/60 hover:border-primary/20 hover:shadow-lg"
                }`}
              >
                {/* Popular banner */}
                {isPro && (
                  <div className="bg-gradient-to-r from-primary to-primary/80 px-4 py-2 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-primary-foreground text-sm font-semibold">
                      <Sparkles className="w-3.5 h-3.5" />
                      Most Popular
                    </div>
                  </div>
                )}

                <div className={`flex flex-col flex-1 p-8 ${isPro ? '' : 'pt-8'}`}>
                  <div className="space-y-5 flex-1">
                    {/* Plan icon and name */}
                    <div>
                      <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4 ${
                        isPro ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        <PlanIcon className={`w-5 h-5 ${isPro ? 'text-primary' : meta.color}`} />
                      </div>
                      <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{meta.description}</p>
                    </div>

                    {/* Price */}
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
                          €{price}
                        </span>
                        <span className="text-muted-foreground text-sm font-medium">
                          /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                        </span>
                      </div>
                      {monthlyEquivalent && (
                        <p className="text-sm text-muted-foreground mt-1">
                          €{monthlyEquivalent}/mo billed annually
                        </p>
                      )}
                    </div>

                    {/* CTA Button */}
                    <Button
                      onClick={() => navigate('/signup')}
                      size="lg"
                      className={`w-full h-12 font-semibold rounded-xl transition-all duration-200 ${
                        isPro
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30"
                          : "bg-foreground hover:bg-foreground/90 text-background"
                      }`}
                    >
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>

                    {/* Divider */}
                    <div className="border-t border-border/60" />

                    {/* Features */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                        What's included
                      </p>
                      <div className="space-y-3">
                        {plan.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <div className={`mt-0.5 rounded-full p-0.5 flex-shrink-0 ${
                              isPro ? 'text-primary' : 'text-muted-foreground'
                            }`}>
                              <Check className="w-4 h-4" strokeWidth={2.5} />
                            </div>
                            <span className="text-sm text-muted-foreground leading-snug">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>All plans include free updates and can be cancelled anytime.</p>
        </div>
      </div>
    </section>
  );
};
