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

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-gray-600">
            Everything you need to run your practice efficiently
          </p>
        </div>

        <div>
          {/* Billing Cycle Toggle */}
          <div className="flex justify-center gap-2 p-1 bg-gray-100 rounded-xl max-w-xs mx-auto border border-gray-200 mb-12">
            <Button
              variant={billingCycle === 'monthly' ? 'default' : 'ghost'}
              onClick={() => setBillingCycle('monthly')}
              className={`flex-1 rounded-lg ${billingCycle === 'monthly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
            >
              Monthly
            </Button>
            <Button
              variant={billingCycle === 'yearly' ? 'default' : 'ghost'}
              onClick={() => setBillingCycle('yearly')}
              className={`flex-1 rounded-lg ${billingCycle === 'yearly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
            >
              Yearly <span className="ml-1 text-xs text-green-600 font-medium">(Save 17%)</span>
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
                      ? "bg-gradient-to-b from-blue-50/50 via-white to-white border-blue-200 shadow-xl scale-105 z-10"
                      : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-lg"
                    }`}
                >
                  {isPro && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <div className="flex items-center gap-1 bg-blue-600 px-4 py-1 rounded-full text-white text-sm font-semibold shadow-md">
                        <Sparkles className="w-3 h-3" />
                        Popular
                      </div>
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-bold text-gray-900">€{price}</span>
                        <span className="text-gray-500 font-medium">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {plan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className={`mt-0.5 rounded-full p-1 ${isPro ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                            }`}>
                            <Check className="w-3 h-3" />
                          </div>
                          <span className="text-sm text-gray-600 leading-tight pt-0.5">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={() => navigate('/signup')}
                      className={`w-full h-12 font-semibold rounded-xl transition-all duration-200 ${isPro
                          ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/25"
                          : "bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-900 hover:bg-gray-50"
                        }`}
                    >
                      Get Started
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="text-center mt-12 text-sm text-gray-500">
            <p>All plans include free updates and can be cancelled anytime.</p>
          </div>
        </div>
      </div>
    </section>
  );
};
