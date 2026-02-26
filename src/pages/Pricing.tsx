import { useState, useEffect } from "react";
import { Check, Sparkles, Loader2, Zap, Building2, Crown, ArrowRight, Shield, Clock, HeadphonesIcon, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/homepage/Header";
import { Footer } from "@/components/homepage/Footer";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { logger } from "@/lib/logger";

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

export default function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const navigate = useNavigate();

  const businessContext = useBusinessContext();
  const businessId = businessContext?.businessId || sessionStorage.getItem('currentBusinessId');

  const [currentPlan, setCurrentPlan] = useState<{ name: string; status: string; endsAt: string | null } | null>(null);
  const [pendingChange, setPendingChange] = useState<{ planName: string; changeDate: string } | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) throw error;

      return (data || []).map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : [],
        isPopular: plan.slug === 'professional'
      })) as SubscriptionPlan[];
    },
  });

  useEffect(() => {
    const fetchCurrentSubscription = async () => {
      if (!businessId) return;

      const { data: business } = await supabase
        .from('businesses')
        .select('subscription_status, subscription_plan, subscription_ends_at, pending_plan_change, pending_plan_change_date')
        .eq('id', businessId)
        .single();

      if (business) {
        if (business.subscription_status === 'active' || business.subscription_status === 'cancelling') {
          setCurrentPlan({
            name: business.subscription_plan || 'Free',
            status: business.subscription_status,
            endsAt: business.subscription_ends_at,
          });
        }

        if (business.pending_plan_change) {
          setPendingChange({
            planName: business.pending_plan_change,
            changeDate: business.pending_plan_change_date || '',
          });
        } else {
          setPendingChange(null);
        }
      }
    };

    fetchCurrentSubscription();
  }, [businessId]);

  const handleSubscribe = async (planId: string, planName: string) => {
    setLoading(planId);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please sign in to subscribe");
        navigate("/sign-in?redirect=/pricing");
        setLoading(null);
        return;
      }

      if (!businessId) {
        toast.error("Please select a business first");
        navigate("/select-business");
        setLoading(null);
        return;
      }

      // If same plan, do nothing
      if (currentPlan?.name.toLowerCase() === planName.toLowerCase()) {
        toast.info("You're already on this plan");
        setLoading(null);
        return;
      }

      // Create Stripe checkout session — Stripe handles promo codes natively
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: { planId, billingCycle },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: unknown) {
      logger.error('Subscription error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to start checkout");
      setLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <Header user={null} minimal={false} />
        <div className="container mx-auto px-4 py-16 pt-32">
          <div className="text-center mb-16">
            <div className="h-8 w-32 mx-auto bg-muted animate-pulse rounded-full mb-6" />
            <div className="h-14 w-96 mx-auto bg-muted animate-pulse rounded-lg mb-4" />
            <div className="h-5 w-80 mx-auto bg-muted animate-pulse rounded" />
          </div>
          <div className="h-12 w-72 mx-auto bg-muted animate-pulse rounded-full mb-16" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-8 rounded-2xl border bg-card/50 space-y-6">
                <div className="space-y-3">
                  <div className="h-10 w-10 bg-muted animate-pulse rounded-xl" />
                  <div className="h-6 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                  <div className="h-12 w-32 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-px bg-muted" />
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <div key={j} className="flex items-center gap-3">
                      <div className="h-5 w-5 bg-muted animate-pulse rounded-full" />
                      <div className="h-4 flex-1 bg-muted animate-pulse rounded" />
                    </div>
                  ))}
                </div>
                <div className="h-12 w-full bg-muted animate-pulse rounded-xl" />
              </div>
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <Header user={null} minimal={false} />

      <div className="container mx-auto px-4 py-16 pt-32">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Simple, transparent pricing
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 text-foreground leading-tight">
            Choose the right plan
            <br />
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              for your practice
            </span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Start automating your patient communication today. All plans include free updates and can be cancelled anytime. Have a promo code? Enter it at checkout.
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
                -17%
              </span>
            )}
            {billingCycle === 'monthly' && (
              <span className="ml-2 mr-1 px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium rounded-full">
                Save 17% yearly
              </span>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {plans?.map((plan, index) => {
            const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
            const monthlyEquivalent = billingCycle === 'yearly' ? Math.round(plan.price_yearly / 12) : null;
            const isPro = plan.isPopular;
            const meta = PLAN_META[plan.slug] || PLAN_META.starter;
            const PlanIcon = meta.icon;

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col p-0 overflow-hidden transition-all duration-500 rounded-2xl ${
                  isPro
                    ? "border-2 border-primary/40 shadow-[0_0_40px_rgba(139,92,246,0.15)] lg:scale-[1.03] z-10"
                    : "border border-border/60 hover:border-primary/20 hover:shadow-lg"
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
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
                    <div>
                      <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4 ${
                        isPro ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        <PlanIcon className={`w-5 h-5 ${isPro ? 'text-primary' : meta.color}`} />
                      </div>
                      <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{meta.description}</p>
                    </div>

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

                    <Button
                      onClick={() => handleSubscribe(plan.id, plan.name)}
                      disabled={loading === plan.id || pendingChange?.planName.toLowerCase() === plan.name.toLowerCase() || currentPlan?.name.toLowerCase() === plan.name.toLowerCase()}
                      size="lg"
                      className={`w-full rounded-xl h-12 font-semibold transition-all duration-200 ${
                        isPro
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30"
                          : "bg-foreground hover:bg-foreground/90 text-background"
                      }`}
                    >
                      {loading === plan.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : pendingChange?.planName.toLowerCase() === plan.name.toLowerCase() ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Pending Change
                        </>
                      ) : currentPlan?.name.toLowerCase() === plan.name.toLowerCase() ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Current Plan
                        </>
                      ) : (
                        <>
                          Get Started
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>

                    <div className="border-t border-border/60" />

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

        {/* Trust indicators */}
        <div className="flex flex-wrap justify-center gap-8 mt-16 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>Secure payment via Stripe</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Cancel anytime, no lock-in</span>
          </div>
          <div className="flex items-center gap-2">
            <HeadphonesIcon className="w-4 h-4" />
            <span>Dedicated support included</span>
          </div>
        </div>

        {/* Promo code note */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Have a promo code? You can enter it during checkout on the Stripe payment page.
        </p>
      </div>

      <Footer />
    </div>
  );
}
