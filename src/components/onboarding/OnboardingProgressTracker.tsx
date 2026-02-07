import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Circle,
  Users,
  Calendar,
  Settings,
  FileText,
  Sparkles,
  X,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
  action?: () => void;
  actionLabel?: string;
}

interface OnboardingProgressTrackerProps {
  userId: string;
  businessId?: string;
  onStartTour?: () => void;
}

export function OnboardingProgressTracker({
  userId,
  businessId,
  onStartTour,
}: OnboardingProgressTrackerProps) {
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [progress, setProgress] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has permanently dismissed the tracker
    const dismissed = localStorage.getItem("onboarding-tracker-dismissed");
    if (dismissed === "true") {
      setIsDismissed(true);
      return;
    }

    checkProgress();
  }, [userId, businessId]);

  const checkProgress = async () => {
    try {
      // Check various completion states
      const [
        { count: patientCount },
        { count: appointmentCount },
        { data: profile },
        { count: availabilityCount },
      ] = await Promise.all([
        supabase
          .from("patients")
          .select("*", { count: "exact", head: true })
          .eq("business_id", businessId || ""),
        supabase
          .from("appointments_decrypted")
          .select("*", { count: "exact", head: true })
          .eq("business_id", businessId || ""),
        supabase
          .from("profiles")
          .select("onboarding_data")
          .eq("user_id", userId)
          .single(),
        supabase
          .from("dentist_availability")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId),
      ]);

      const hasPatients = (patientCount || 0) > 0;
      const hasAppointments = (appointmentCount || 0) > 0;
      const hasCompletedProfile = profile?.onboarding_data !== null;
      const hasSetAvailability = (availabilityCount || 0) > 0;
      // Use localStorage since column doesn't exist in database
      const hasGeneratedDemo = localStorage.getItem("demo-data-generated") === "true";

      const newSteps: OnboardingStep[] = [
        {
          id: "profile",
          title: "Complete Your Profile",
          description: "Add your name, specialty, and practice info so patients can find you",
          icon: Settings,
          completed: hasCompletedProfile,
          action: () => navigate("/dentist/settings"),
          actionLabel: "Go to Settings",
        },
        {
          id: "availability",
          title: "Set Your Availability",
          description: "Define your working hours so patients can book appointments at the right times",
          icon: Calendar,
          completed: hasSetAvailability,
          action: () => navigate("/dentist/settings?tab=schedule"),
          actionLabel: "Set Hours",
        },
        {
          id: "demo-data",
          title: "Try with Demo Data",
          description: "Generate sample patients and appointments to explore the platform risk-free",
          icon: Sparkles,
          completed: hasGeneratedDemo,
          actionLabel: "Generate Data",
        },
        {
          id: "patients",
          title: "Add Your First Patient",
          description: "Add a real patient to start managing appointments and records",
          icon: Users,
          completed: hasPatients,
          action: () => navigate("/dentist/patients"),
          actionLabel: "Add Patient",
        },
        {
          id: "tour",
          title: "Take the Product Tour",
          description: "A quick interactive walkthrough of all features and where to find them",
          icon: FileText,
          completed: localStorage.getItem("dentist-tour-completed") === "true",
          action: onStartTour,
          actionLabel: "Start Tour",
        },
      ];

      setSteps(newSteps);

      // Calculate progress
      const completedSteps = newSteps.filter((step) => step.completed).length;
      const progressPercentage = (completedSteps / newSteps.length) * 100;
      setProgress(progressPercentage);

      // Auto-hide if everything is complete
      if (progressPercentage === 100) {
        setTimeout(() => {
          handleDismiss();
        }, 5000); // Auto-dismiss after 5 seconds when complete
      }
    } catch (error) {
      console.error("Error checking onboarding progress:", error);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("onboarding-tracker-dismissed", "true");
    setIsDismissed(true);
  };

  if (isDismissed || progress === 100) {
    return null;
  }

  return (
    <AnimatePresence>
      {!isMinimized ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 right-6 z-50 w-96"
        >
          <Card className="shadow-2xl border-2">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    Getting Started
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {Math.round(progress)}% Complete
                    {progress < 100 && steps.length > 0 && (
                      <span className="block text-xs mt-0.5">
                        Next: {steps.find(s => !s.completed)?.title}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setIsMinimized(true)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleDismiss}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Progress value={progress} className="h-2 mt-3" />
            </CardHeader>

            <CardContent className="space-y-2 max-h-80 overflow-y-auto">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${step.completed
                        ? "bg-green-50 dark:bg-green-900/20 border border-green-200"
                        : "bg-gray-50 dark:bg-gray-800/50 border border-gray-200 hover:border-blue-300"
                      }`}
                  >
                    <div className="flex-shrink-0">
                      {step.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400" />
                      )}
                    </div>

                    <Icon
                      className={`h-5 w-5 flex-shrink-0 ${step.completed ? "text-green-600" : "text-gray-600"
                        }`}
                    />

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${step.completed
                            ? "text-green-900 dark:text-green-100"
                            : ""
                          }`}
                      >
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {step.description}
                      </p>
                    </div>

                    {!step.completed && step.action && step.actionLabel && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={step.action}
                        className="flex-shrink-0 text-xs h-7 px-2"
                      >
                        {step.actionLabel}
                      </Button>
                    )}

                    {step.completed && (
                      <Badge variant="secondary" className="flex-shrink-0">
                        Done
                      </Badge>
                    )}
                  </div>
                );
              })}

              {progress === 100 && (
                <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg text-center border border-green-200">
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    🎉 You're all set up!
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You can now explore all the features
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Button
            onClick={() => setIsMinimized(false)}
            className="rounded-full h-14 w-14 shadow-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            size="icon"
          >
            <div className="relative">
              <Sparkles className="h-6 w-6" />
              {progress < 100 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {steps.filter((s) => !s.completed).length}
                </Badge>
              )}
            </div>
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
