import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { DentistOnboardingFlow } from "./DentistOnboardingFlow";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";

interface OnboardingOrchestratorProps {
  user: User | null;
}

export const OnboardingOrchestrator = ({ user }: OnboardingOrchestratorProps) => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [profileData, setProfileData] = useState<{
    onboarding_completed: boolean | null;
    first_name: string | null;
    last_name: string | null;
    date_of_birth: string | null;
    role: string | null;
  } | null>(null);
  const location = useLocation();
  const { isDentist, loading: rolesLoading } = useUserRole();

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

        setProfileData(profile);
      } catch (error) {
        console.error("Error in onboarding orchestrator:", error);
      }
    };

    checkOnboardingStatus();
  }, [user]);

  useEffect(() => {
    // Wait for both profile data and roles to load
    if (!profileData || rolesLoading) return;

    const hasCompletedOnboarding = profileData.onboarding_completed === true;
    const hasMissingFields = !profileData.first_name || !profileData.last_name || !profileData.date_of_birth;
    const profileRole = profileData.role;

    // Check if on a dentist/portal route
    const isDentistRoute =
      location.pathname.includes("/dentist") ||
      location.pathname.includes("/portal");

    // Show onboarding for:
    // 1. Users with isDentist role (dentist, provider, owner, admin via business_members)
    //    who haven't completed onboarding OR have missing required fields
    // 2. Users with null role on dentist routes (new users who need to set up)
    const shouldShowOnboarding = isDentistRoute && (
      // Case 1: Known dentist/owner/admin with incomplete onboarding
      (isDentist && (!hasCompletedOnboarding || hasMissingFields)) ||
      // Case 2: Profile role is dentist with incomplete onboarding
      (profileRole === "dentist" && (!hasCompletedOnboarding || hasMissingFields)) ||
      // Case 3: New user with null role on dentist route
      (profileRole === null && (!hasCompletedOnboarding || hasMissingFields))
    );

    setShowOnboarding(shouldShowOnboarding);
  }, [profileData, isDentist, rolesLoading, location.pathname]);

  const handleOnboardingComplete = async () => {
    // Refetch profile data to get the updated onboarding status
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("onboarding_completed, role, first_name, last_name, date_of_birth")
        .eq("user_id", user.id)
        .single();

      if (!error && profile) {
        setProfileData(profile);
      }
    } catch (error) {
      console.error("Error refetching profile after onboarding:", error);
    }

    setShowOnboarding(false);
  };

  // Don't show onboarding on login/signup pages
  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/signup" ||
    location.pathname === "/";

  // Don't render if on auth page, no user, or still loading
  if (isAuthPage || !user || rolesLoading) {
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
