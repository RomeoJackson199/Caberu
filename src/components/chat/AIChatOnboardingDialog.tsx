import { useState, useEffect, type ElementType } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Calendar, 
  MessageSquare, 
  Settings, 
  Image, 
  AlertCircle,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AIChatOnboardingDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OnboardingStep {
  icon: ElementType;
  title: string;
  description: string;
  examples: string[];
  highlight: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    icon: Bot,
    title: 'Your scheduling assistant',
    description: 'I help you manage appointments, summarize symptoms for your dentist, and handle payments — not medical advice.',
    highlight: 'I collect what you tell me and pass a summary to your dentist. Any clinical decisions are made by them.',
    examples: [
      'Show my appointments',
      'Book an appointment',
      'I have a toothache'
    ]
  },
  {
    icon: Calendar,
    title: 'Manage your appointments',
    description: 'Book, reschedule, or cancel visits for yourself or family members.',
    highlight: 'Tell me what you need — emergency or routine — and I will find the best available slot.',
    examples: [
      'Find earliest available slot',
      'Reschedule my appointment',
      'Emergency booking'
    ]
  },
  {
    icon: Settings,
    title: 'Payments & prescriptions',
    description: 'View balances, handle payments, and request prescription refills from your dentist.',
    highlight: 'Say "show my balance" or "refill my prescription" and I will walk you through it.',
    examples: [
      'Show my balance',
      'Refill my prescription',
      'Make a payment'
    ]
  },
  {
    icon: Image,
    title: 'Share photos for triage',
    description: 'Upload dental photos so your dentist can review them. I do not analyze or diagnose.',
    highlight: "Photos are shared securely with your dental practice to help them prepare for your visit.",
    examples: [
      'Upload a photo',
      'Share my X-ray',
      'Take a picture'
    ]
  }
];

const TOUR_KEY = 'ai-chat-onboarding';

export const AIChatOnboardingDialog = ({ isOpen, onClose }: AIChatOnboardingDialogProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  const markTourComplete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Insert into database - ignore if already exists
      await supabase.from('tour_completions').upsert({
        user_id: user.id,
        tour_type: TOUR_KEY,
        completed_at: new Date().toISOString()
      }, { onConflict: 'user_id,tour_type' });
      
      // Also set localStorage as fallback
      localStorage.setItem('ai-chat-onboarding-seen', 'true');
    } catch (error) {
      console.error('Failed to save tour completion:', error);
      // Fallback to localStorage if DB fails
      localStorage.setItem('ai-chat-onboarding-seen', 'true');
    }
  };

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Mark as seen and close
      markTourComplete();
      onClose();
    }
  };

  const handleSkip = () => {
    markTourComplete();
    onClose();
  };

  const step = ONBOARDING_STEPS[currentStep];
  const StepIcon = step.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[640px] border-primary/10 max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-1 sm:space-y-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg sm:text-2xl">One-minute AI guide</DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleSkip} className="text-xs text-muted-foreground hover:text-foreground -mr-2 -mt-1">
              Skip
            </Button>
          </div>
          <DialogDescription className="text-sm sm:text-base">
            See how the assistant helps with scheduling, symptom summaries, and payments.
          </DialogDescription>
          <div className="flex items-center gap-2 mt-1 sm:mt-2">
            <Badge variant="secondary" className="text-xs">Step {currentStep + 1} of {ONBOARDING_STEPS.length}</Badge>
            <Badge className="bg-gradient-to-r from-primary to-primary/60 text-primary-foreground text-xs">
              Built for dental care
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
          <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-primary text-primary-foreground rounded-xl shadow-sm">
                <StepIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-semibold leading-tight">{step.title}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
            <div className="mt-2 sm:mt-3 flex items-start gap-2 text-xs sm:text-sm bg-white/60 dark:bg-black/30 rounded-xl p-2 sm:p-3 shadow-sm">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-muted-foreground">{step.highlight}</p>
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Try asking for these:
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              {step.examples.map((example, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                >
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium">{example}</span>
                </div>
              ))}
            </div>
          </div>

          {currentStep === ONBOARDING_STEPS.length - 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
              <div className="flex items-start gap-2 p-2 sm:p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs sm:text-sm text-green-900 dark:text-green-100">
                  You're all set! I handle scheduling and summaries — your dentist handles the rest.
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 sm:p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs sm:text-sm text-blue-900 dark:text-blue-100">
                  Ask for a visit time and I'll confirm how long it takes and when you'll be done.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-center mb-2 sm:mb-4">
          {ONBOARDING_STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 sm:h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'w-8 sm:w-10 bg-primary'
                  : index < currentStep
                  ? 'w-2.5 sm:w-3 bg-primary/60'
                  : 'w-1.5 sm:w-2 bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="flex justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={handleSkip} className="text-sm">
            Skip
          </Button>
          <Button onClick={handleNext} size="sm" className="bg-primary text-primary-foreground shadow-lg text-sm sm:text-base sm:h-10">
            {currentStep < ONBOARDING_STEPS.length - 1 ? 'Next' : 'Start chatting'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
