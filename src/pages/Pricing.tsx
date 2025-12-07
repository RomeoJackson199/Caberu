import { useState } from "react";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/homepage/Header";
import { Footer } from "@/components/homepage/Footer";

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

export default function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const navigate = useNavigate();

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

  const handleSubscribe = async (planId: string) => {
    setLoading(planId);
    try {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please sign in to subscribe");
        navigate("/sign-in?redirect=/pricing");
        setLoading(null);
        return;
      }

      // Create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: {
          planId,
          billingCycle,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error(error.message || "Failed to start checkout");
      setLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <Header user={null} minimal={false} />

      <div className="container mx-auto px-4 py-16 pt-24">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-7xl md:text-9xl font-bold mb-4 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
            PRICING
          </h1>
          <p className="text-muted-foreground text-lg">Choose the perfect plan for your practice</p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center gap-2 p-1 bg-muted/50 rounded-xl max-w-xs mx-auto border mb-12">
          <Button
            variant={billingCycle === 'monthly' ? 'default' : 'ghost'}
            onClick={() => setBillingCycle('monthly')}
            className="flex-1 rounded-lg"
          >
            Monthly
          </Button>
          <Button
            variant={billingCycle === 'yearly' ? 'default' : 'ghost'}
            onClick={() => setBillingCycle('yearly')}
            className="flex-1 rounded-lg"
          >
            Yearly <span className="ml-1 text-xs">(Save 17%)</span>
          </Button>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans?.map((plan) => {
            const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
            const isPro = plan.isPopular;
            
            return (
              <Card
                key={plan.id}
                className={`relative p-8 transition-all duration-500 ${
                  isPro
                    ? "bg-gradient-to-b from-primary/20 via-primary/10 to-background border-primary/50 shadow-[0_0_50px_rgba(139,92,246,0.3)]"
                    : "bg-card/50 border-border/50 hover:border-border"
                }`}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1 bg-gradient-to-r from-primary to-primary-glow px-4 py-1 rounded-full text-primary-foreground text-sm font-semibold">
                      <Sparkles className="w-3 h-3" />
                      Popular
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-semibold mb-2">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold">€{price}</span>
                      <span className="text-muted-foreground">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className={`mt-0.5 rounded-full p-0.5 ${
                          isPro ? 'bg-primary/20' : 'bg-muted'
                        }`}>
                          <Check className={`w-4 h-4 ${
                            isPro ? 'text-primary' : 'text-muted-foreground'
                          }`} />
                        </div>
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={loading === plan.id}
                    className={`w-full ${
                      isPro
                        ? "bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-primary-foreground shadow-lg"
                        : "bg-background border-2 border-border hover:bg-muted text-foreground"
                    }`}
                  >
                    {loading === plan.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Get Started'
                    )}
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

      <Footer />
    </div>
  );
}
