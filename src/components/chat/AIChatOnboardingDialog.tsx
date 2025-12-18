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
    title: 'Meet your AI dental guide',
    description: 'Available 24/7 to help you book appointments, answer questions, and keep your care on track.',
    highlight: 'I can book visits for you or family members and share how long each appointment will take.',
    examples: [
      'Show my appointments',
      'Book an appointment',
      'I have a toothache'
    ]
  },
  {
    icon: Calendar,
    title: 'Smart appointment booking',
    description: 'Book, reschedule, or cancel with clear duration and end-time guidance.',
    highlight: 'Tell me what you need—emergency or routine—and I will find the best slot for you.',
    examples: [
      'Find earliest available slot',
      'Reschedule my appointment',
      'Emergency booking'
    ]
  },
  {
    icon: Settings,
    title: 'Personalized preferences',
    description: 'Change language, theme, and reminders so the experience fits you.',
    highlight: "Just say 'switch to dark mode' or 'remind me about cleanings' and I will adjust.",
    examples: [
      'Change language to French',
      'Switch to dark mode',
      'Update my information'
    ]
  },
  {
    icon: Image,
    title: 'Share photos when needed',
    description: 'Upload dental photos or X-rays for faster triage and guidance.',
    highlight: "I will never share them without permission and I will use them only to assist you.",
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
        tour_key: TOUR_KEY,
        completed_at: new Date().toISOString()
      }, { onConflict: 'user_id,tour_key' });
      
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
      <DialogContent className="sm:max-w-[640px] border-primary/10">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl">One-minute AI guide</DialogTitle>
          <DialogDescription className="text-base">
            Learn how the assistant can book appointments, answer questions, and keep you updated.
          </DialogDescription>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">Step {currentStep + 1} of {ONBOARDING_STEPS.length}</Badge>
            <Badge className="bg-gradient-to-r from-primary to-primary/60 text-primary-foreground text-xs">
              Built for dental care
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary text-primary-foreground rounded-xl shadow-sm">
                <StepIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-semibold leading-tight">{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 text-sm bg-white/60 dark:bg-black/30 rounded-xl p-3 shadow-sm">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
              <p className="text-muted-foreground">{step.highlight}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              Try asking for these:
            </div>

            <div className="space-y-2">
              {step.examples.map((example, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                >
                  <ChevronRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium">{example}</span>
                </div>
              ))}
            </div>
          </div>

          {currentStep === ONBOARDING_STEPS.length - 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-green-900 dark:text-green-100">
                  You're all set! I can book, reschedule, and keep you informed without long forms.
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  Ask for a visit time and I’ll confirm how long it takes and when you’ll be done.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-center mb-4">
          {ONBOARDING_STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'w-10 bg-primary'
                  : index < currentStep
                  ? 'w-3 bg-primary/60'
                  : 'w-2 bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="flex justify-between gap-2">
          <Button variant="ghost" onClick={handleSkip}>
            Skip
          </Button>
          <Button onClick={handleNext} className="bg-primary text-primary-foreground shadow-lg">
            {currentStep < ONBOARDING_STEPS.length - 1 ? 'Next' : 'Start chatting'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
