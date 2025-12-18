import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, MessageSquare, User, Settings, CreditCard, FileText, Heart, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface UserTourProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: "patient" | "dentist";
}

const patientSteps = [
  {
    title: "Welcome to Your Health Dashboard! 🎉",
    description: "Let's take a quick tour of your new health management platform.",
    icon: Heart,
    gradient: "from-pink-500 to-rose-500",
  },
  {
    title: "Book Appointments Instantly 📅",
    description: "Schedule appointments with ease. Choose your preferred time, dentist, and service - all in one place.",
    icon: Calendar,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    title: "Chat with AI Assistant 🤖",
    description: "Have questions? Our AI assistant is available 24/7 to help you with appointment questions, dental advice, and more.",
    icon: MessageSquare,
    gradient: "from-purple-500 to-indigo-500",
  },
  {
    title: "Track Your Health Records 📋",
    description: "Access your treatment history, prescriptions, and medical records anytime, anywhere.",
    icon: FileText,
    gradient: "from-green-500 to-emerald-500",
  },
  {
    title: "Manage Payments Easily 💳",
    description: "View billing history, pay invoices, and manage your payment methods securely.",
    icon: CreditCard,
    gradient: "from-orange-500 to-amber-500",
  },
  {
    title: "You're All Set! 🚀",
    description: "Ready to start your journey? Click 'Get Started' to explore your dashboard.",
    icon: Heart,
    gradient: "from-pink-500 to-rose-500",
  },
];

const dentistSteps = [
  {
    title: "Welcome to Your Practice Dashboard! 👋",
    description: "Let's explore the powerful tools to manage your practice efficiently.",
    icon: Heart,
    gradient: "from-blue-600 to-purple-600",
  },
  {
    title: "Appointment Management 📅",
    description: "View, schedule, and manage all your appointments in one place. Drag-and-drop scheduling makes it easy.",
    icon: Calendar,
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    title: "Patient Records 👥",
    description: "Access complete patient histories, treatment plans, notes, and medical records with just a click.",
    icon: User,
    gradient: "from-indigo-500 to-purple-500",
  },
  {
    title: "AI-Powered Tools 🤖",
    description: "Let AI help you with appointment summaries, patient communication, and administrative tasks.",
    icon: MessageSquare,
    gradient: "from-violet-500 to-fuchsia-500",
  },
  {
    title: "Practice Analytics 📊",
    description: "Track appointments, revenue, patient satisfaction, and practice growth with real-time insights.",
    icon: Settings,
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    title: "Ready to Transform Your Practice! 🎯",
    description: "Everything you need is at your fingertips. Let's get started!",
    icon: Heart,
    gradient: "from-blue-600 to-purple-600",
  },
];

export const UserTour = ({ isOpen, onClose, userRole }: UserTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = userRole === "patient" ? patientSteps : dentistSteps;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <Dialog open={isOpen} onOpenChange={handleSkip}>
      <DialogContent className="sm:max-w-[600px] overflow-hidden">
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">
              {userRole === "patient" ? "Patient" : "Practice"} Tour
            </DialogTitle>
            <span className="text-sm text-muted-foreground">
              {currentStep + 1} of {steps.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </DialogHeader>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="py-6 space-y-6"
          >
            {/* Icon with gradient background */}
            <div className="flex justify-center">
              <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${currentStepData.gradient} flex items-center justify-center shadow-lg`}>
                <Icon className="h-12 w-12 text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="text-center space-y-4">
              <h3 className="text-2xl font-bold">
                {currentStepData.title}
              </h3>
              <DialogDescription className="text-base leading-relaxed">
                {currentStepData.description}
              </DialogDescription>
            </div>

            {/* Step indicators */}
            <div className="flex justify-center gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentStep
                      ? "w-8 bg-primary"
                      : index < currentStep
                      ? "w-2 bg-primary/50"
                      : "w-2 bg-muted"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div>
            {currentStep > 0 && (
              <Button variant="ghost" onClick={handleBack}>
                Back
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            {currentStep < steps.length - 1 && (
              <Button variant="outline" onClick={handleSkip}>
                Skip Tour
              </Button>
            )}
            <Button 
              onClick={handleNext}
              className={`bg-gradient-to-r ${currentStepData.gradient} text-white hover:opacity-90`}
            >
              {currentStep === steps.length - 1 ? "Get Started" : "Next"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Hook to manage tour visibility using database
export const useUserTour = (userRole: "patient" | "dentist") => {
  const [showTour, setShowTour] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if tour is completed from database
  useEffect(() => {
    const checkTourCompletion = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data } = await supabase
          .from('tour_completions')
          .select('id')
          .eq('user_id', user.id)
          .eq('tour_type', userRole)
          .maybeSingle();

        // Tour not completed - could show it, but keeping disabled for now
        // setShowTour(!data);
        setLoading(false);
      } catch (error) {
        console.error('Error checking tour completion:', error);
        setLoading(false);
      }
    };

    checkTourCompletion();
  }, [userRole]);

  const closeTour = async () => {
    setShowTour(false);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('tour_completions')
        .upsert({
          user_id: user.id,
          tour_type: userRole,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,tour_type'
        });
    } catch (error) {
      console.error('Error saving tour completion:', error);
    }
  };

  const resetTour = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('tour_completions')
        .delete()
        .eq('user_id', user.id)
        .eq('tour_type', userRole);

      setShowTour(true);
    } catch (error) {
      console.error('Error resetting tour:', error);
    }
  };

  return { showTour, closeTour, resetTour, loading };
};
