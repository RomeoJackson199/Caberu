import { useState, useEffect } from "react";
import { Check, Sparkles, Loader2, Tag, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/homepage/Header";
import { Footer } from "@/components/homepage/Footer";
import { useBusinessContext } from "@/hooks/useBusinessContext";

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
  const [promoCode, setPromoCode] = useState('');
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [validPromo, setValidPromo] = useState<any>(null);
  const [applyingPromo, setApplyingPromo] = useState(false);
  const navigate = useNavigate();

  // Get business ID from context (try hook first, fall back to sessionStorage)
  const businessContext = useBusinessContext();
  const businessId = businessContext?.businessId || sessionStorage.getItem('currentBusinessId');

  // Track current subscription to offer plan change scheduling
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

  // Fetch current subscription status when businessId is available
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
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please sign in to subscribe");
        navigate("/sign-in?redirect=/pricing");
        setLoading(null);
        return;
      }

      // Check user has a business selected
      if (!businessId) {
        toast.error("Please select a business first");
        navigate("/select-business");
        setLoading(null);
        return;
      }

      // If user already has an active subscription and selecting a different plan, schedule the change
      if (currentPlan && currentPlan.status === 'active' && currentPlan.name.toLowerCase() !== planName.toLowerCase()) {
        console.log('Scheduling plan change from', currentPlan.name, 'to', planName);
        const { data, error } = await supabase.functions.invoke('schedule-plan-change', {
          body: {
            business_id: businessId,
            new_plan_name: planName,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast.success(data.message || `Your plan will change to ${planName} at the end of your billing period.`);
        setPendingChange({
          planName: planName,
          changeDate: data.change_date || currentPlan.endsAt || '',
        });
        setLoading(null);
        return;
      }

      // If any promo code is validated, apply it via the edge function
      if (validPromo) {
        console.log('Applying promo code:', validPromo);
        const { data, error } = await supabase.functions.invoke('apply-promo-code', {
          body: {
            promo_code: promoCode.trim(),
            business_id: businessId,
            plan_name: planName,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast.success(`${planName} activated with promo code!`);
        setPromoCode('');
        setValidPromo(null);
        navigate('/dentist');
        return;
      }

      // If promo code with percentage discount, include in checkout
      const promoCodeToSend = validPromo ? promoCode.trim() : undefined;

      // Create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: {
          planId,
          billingCycle,
          promoCode: promoCodeToSend,
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

  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      toast.error('Please enter a promo code');
      return;
    }

    setValidatingPromo(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-promo-code', {
        body: { code: promoCode.trim().toUpperCase() },
      });

      if (error) throw error;

      if (data?.valid) {
        setValidPromo(data.promoCode);
        toast.success('Promo code applied successfully!');
      } else {
        toast.error('Invalid or expired promo code');
        setValidPromo(null);
      }
    } catch (error: any) {
      console.error('Promo validation error:', error);
      toast.error(error.message || 'Failed to validate promo code');
      setValidPromo(null);
    } finally {
      setValidatingPromo(false);
    }
  };

  const applyPromoCode = async () => {
    if (!validPromo) return;

    setApplyingPromo(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to apply promo code");
        navigate("/sign-in?redirect=/pricing");
        return;
      }

      // Get user's business
      const businessId = sessionStorage.getItem('currentBusinessId');
      if (!businessId) {
        toast.error("Please select a business first");
        navigate("/select-business");
        return;
      }

      const { data, error } = await supabase.functions.invoke('apply-promo-code', {
        body: {
          promo_code: promoCode.trim(),
          business_id: businessId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(data.message || 'Promo code applied successfully!');
      setPromoCode('');
      setValidPromo(null);

      // Redirect to dashboard
      navigate('/dentist');
    } catch (error: any) {
      console.error('Apply promo error:', error);
      toast.error(error.message || 'Failed to apply promo code');
    } finally {
      setApplyingPromo(false);
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
                className={`relative p-8 transition-all duration-500 ${isPro
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
                        <div className={`mt-0.5 rounded-full p-0.5 ${isPro ? 'bg-primary/20' : 'bg-muted'
                          }`}>
                          <Check className={`w-4 h-4 ${isPro ? 'text-primary' : 'text-muted-foreground'
                            }`} />
                        </div>
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => handleSubscribe(plan.id, plan.name)}
                    disabled={loading === plan.id}
                    className={`w-full ${isPro
                      ? "bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-primary-foreground shadow-lg"
                      : "bg-background border-2 border-border hover:bg-muted text-foreground"
                      }`}
                  >
                    {loading === plan.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : pendingChange?.planName.toLowerCase() === plan.name.toLowerCase() ? (
                      'Pending Change ✓'
                    ) : currentPlan?.name.toLowerCase() === plan.name.toLowerCase() ? (
                      'Current Plan ✓'
                    ) : validPromo ? (
                      'Apply Promo & Activate'
                    ) : currentPlan?.status === 'active' ? (
                      'Schedule Change'
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

        {/* Promo Code Section - Same as BusinessPaymentStep */}
        <Card className="max-w-md mx-auto mt-12 p-6 border-2 border-primary/20">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Tag className="w-8 h-8 text-primary" />
            </div>

            <div>
              <h3 className="text-xl font-semibold">Have a Promo Code?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Redeem your promo code for free access
              </p>
            </div>

            {/* Promo Code Input */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="w-4 h-4" />
                <span>Enter your promo code below</span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  disabled={validatingPromo || !!validPromo}
                  className="flex-1"
                />
                <Button
                  onClick={validatePromoCode}
                  disabled={validatingPromo || !promoCode.trim() || !!validPromo}
                  variant="outline"
                >
                  {validatingPromo && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {validPromo && <Check className="w-4 h-4 mr-2" />}
                  {validPromo ? 'Applied' : 'Apply'}
                </Button>
              </div>
              {validPromo && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-700 dark:text-green-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-medium">
                      {validPromo.discount_type === 'free' ? 'FREE!' : `Discount applied: ${validPromo.discount_value}%`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {validPromo && (
              <p className="text-sm font-medium text-primary">
                ✓ Now click on a plan above to activate with your promo code
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              Promo codes are applied when you select a plan
            </p>
          </div>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
