import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, ArrowLeft, ArrowRight, Sparkles, Building2, CreditCard, UserPlus } from 'lucide-react';
import { BusinessCreationAuth } from '@/components/business-creation/BusinessCreationAuth';
import { BusinessDetailsStep } from '@/components/business-creation/BusinessDetailsStep';
import { BusinessSubscriptionStep } from '@/components/business-creation/BusinessSubscriptionStep';
import { BusinessCreationTour } from '@/components/business-creation/BusinessCreationTour';
import { FloatingChatBubble } from '@/components/chat/FloatingChatBubble';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BusinessData {
  name?: string;
  tagline?: string;
  bio?: string;
  slug?: string;
}

const STEPS = [
  { id: 1, name: 'Sign Up', description: 'Create your account', icon: UserPlus },
  { id: 2, name: 'Business Details', description: 'Tell us about your practice', icon: Building2 },
  { id: 3, name: 'Choose Plan', description: 'Select your subscription', icon: CreditCard },
];

export default function CreateBusiness() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [businessData, setBusinessData] = useState<BusinessData>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const hasProcessedSubscriptionRef = useRef(false);

  // Handle successful subscription return
  useEffect(() => {
    const handleSubscriptionSuccess = async () => {
      const sessionId = searchParams.get('session_id');
      const subscriptionSuccess = searchParams.get('subscription');

      if (subscriptionSuccess === 'success' && sessionId) {
        if (hasProcessedSubscriptionRef.current) return;
        hasProcessedSubscriptionRef.current = true;

        toast.loading('Creating your business...');

        // Restore business data from sessionStorage (persisted before Stripe redirect)
        let savedBusinessData = {};
        try {
          const stored = sessionStorage.getItem('pending_business_data');
          if (stored) {
            savedBusinessData = JSON.parse(stored);
            sessionStorage.removeItem('pending_business_data');
          }
        } catch {
          console.error('Failed to restore business data from sessionStorage');
        }

        try {
          const { data, error } = await supabase.functions.invoke('complete-business-setup', {
            body: { session_id: sessionId, business_data: savedBusinessData },
          });

          if (error) throw error;

          // Set flag to auto-start the dashboard tour for new business owners
          localStorage.setItem('should-start-tour', 'true');
          localStorage.removeItem('dentist-tour-completed');
          localStorage.removeItem('tour_completed_dentist');

          toast.success('Business created successfully!');
          navigate('/auth-redirect');
        } catch (error: unknown) {
          console.error('Error completing business:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to complete business setup');
        }
      }
    };

    handleSubscriptionSuccess();
  }, [searchParams, navigate]);

  // Check for demo data on mount
  useEffect(() => {
    const demoBusinessName = sessionStorage.getItem('demo_business_name');

    if (demoBusinessName) {
      setBusinessData({ name: demoBusinessName });
      sessionStorage.removeItem('demo_business_name');
      sessionStorage.removeItem('demo_template');
    }
  }, []);

  const progress = (currentStep / STEPS.length) * 100;

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateBusinessData = (data: Partial<BusinessData>) => {
    setBusinessData({ ...businessData, ...data });
  };

  const handleAuthComplete = () => {
    setIsAuthenticated(true);
    handleNext();
  };

  const handlePaymentComplete = () => {
    // Payment complete - user will be redirected by Stripe, then edge function handles the rest
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-background dark:via-background dark:to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white mb-4 shadow-lg">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Create Your Business
          </h1>
          <p className="text-muted-foreground">Set up your dental practice in just 3 simple steps</p>
        </div>

        {/* Progress Steps */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: currentStep === step.id ? 1.1 : 1 }}
                      transition={{ duration: 0.3 }}
                      className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold transition-all shadow-md ${currentStep > step.id
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
                        : currentStep === step.id
                          ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white ring-4 ring-blue-200 dark:ring-blue-900'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}
                    >
                      {currentStep > step.id ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <StepIcon className="w-5 h-5" />
                      )}
                    </motion.div>
                    <div className="mt-2 text-center hidden md:block">
                      <p className={`text-xs font-semibold ${currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {step.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                    </div>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className="flex-1 h-1 mx-3 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: currentStep > step.id ? '100%' : '0%' }}
                        transition={{ duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Inline contextual tips */}
              <BusinessCreationTour currentStep={currentStep} />

              <Card className="p-6 md:p-8">
                {currentStep === 1 && (
                  <BusinessCreationAuth onComplete={handleAuthComplete} />
                )}

                {currentStep === 2 && (
                  <BusinessDetailsStep
                    businessData={businessData}
                    onUpdate={updateBusinessData}
                  />
                )}

                {currentStep === 3 && (
                  <BusinessSubscriptionStep
                    businessData={businessData}
                    onComplete={handlePaymentComplete}
                  />
                )}

                {/* Navigation Buttons */}
                {currentStep > 1 && (
                  <div className="flex items-center justify-between mt-8 pt-6 border-t">
                    <Button
                      variant="outline"
                      onClick={handleBack}
                      disabled={currentStep === 1}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>

                    {currentStep === 2 && (
                      <Button
                        onClick={handleNext}
                        disabled={!businessData.name}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      >
                        Continue to Plans
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Floating Chat Bubble for Onboarding Help */}
      <FloatingChatBubble context="onboarding" />
    </div>
  );
}
