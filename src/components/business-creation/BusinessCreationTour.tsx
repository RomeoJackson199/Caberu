import { Info, Lightbulb } from 'lucide-react';

interface BusinessCreationTourProps {
  currentStep: number;
  isOpen?: boolean;
  onClose?: () => void;
}

const TOUR_CONTENT: Record<number, { title: string; description: string; tips: string[] }> = {
  1: {
    title: 'Step 1: Sign In or Create Account',
    description: 'Create your business admin account or sign in if you already have one.',
    tips: [
      'Use a professional email address for your business',
      'Choose a strong password (12+ characters)',
      'Already have an account? Just sign in to continue',
    ],
  },
  2: {
    title: 'Step 2: Your Business Details',
    description: 'Tell us about your business. This information will be visible to your customers on your public page.',
    tips: [
      'Pick a clear, memorable business name',
      'Your URL slug is auto-generated from the name',
      'A good tagline helps patients find you',
      'You can update all of this later in Settings',
    ],
  },
  3: {
    title: 'Step 3: Choose a Plan',
    description: 'Select a subscription plan that fits your practice. You can upgrade or downgrade anytime.',
    tips: [
      'All plans include unlimited appointments',
      'Have a promo code? Apply it for a discount',
      'Yearly billing saves you 17%',
      'Your business goes live immediately after payment',
    ],
  },
};

export function BusinessCreationTour({ currentStep }: BusinessCreationTourProps) {
  const content = TOUR_CONTENT[currentStep];

  if (!content) return null;

  return (
    <div className="bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-1">
            {content.title}
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
            {content.description}
          </p>
          <ul className="space-y-1">
            {content.tips.map((tip, index) => (
              <li key={index} className="text-xs text-blue-600 dark:text-blue-400 flex items-start gap-2">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
