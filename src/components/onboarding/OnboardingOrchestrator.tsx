import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { DentistOnboardingFlow } from "./DentistOnboardingFlow";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface OnboardingOrchestratorProps {
  user: User | null;
}

export const OnboardingOrchestrator = ({ user }: OnboardingOrchestratorProps) => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    if (!user) return;

    const checkOnboardingStatus = async () => {
      try {
        // Fetch user profile to check onboarding status and required fields
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("onboarding_completed, role, first_name, last_name, date_of_birth")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          return;
        }

        // Check if onboarding has been completed AND all required fields are filled
        const hasCompletedOnboarding = profile?.onboarding_completed === true;
        const hasMissingFields = !profile?.first_name || !profile?.last_name || !profile?.date_of_birth;
        const role = profile?.role;

        setUserRole(role);

        // Only show onboarding for dentists/practitioners who haven't completed it
        // OR who have missing required fields
        const isDentistRoute =
          location.pathname.includes("/dentist") ||
          location.pathname.includes("/portal");

        if (isDentistRoute && role === "dentist" && (!hasCompletedOnboarding || hasMissingFields)) {
          // Show onboarding flow
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error("Error in onboarding orchestrator:", error);
      }
    };

    checkOnboardingStatus();
  }, [user, location.pathname]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  // Don't show onboarding on login/signup pages
  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/signup" ||
    location.pathname === "/";

  if (isAuthPage || !user || userRole !== "dentist") {
    return null;
  }

  return (
    <>
      {showOnboarding && (
        <DentistOnboardingFlow
          isOpen={showOnboarding}
          onClose={handleOnboardingComplete}
          userId={user.id}
        />
      )}
    </>
  );
};
