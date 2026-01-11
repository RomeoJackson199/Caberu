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

    // ONLY show onboarding for users who are CONFIRMED to be dentists/providers
    // Do NOT show onboarding for users with null role - they might be patients
    // visiting dentist routes. Onboarding should only trigger for:
    // 1. Users with isDentist flag (from user_roles or business_members with owner/admin/dentist role)
    // 2. Users with profile.role === "dentist"
    const shouldShowOnboarding = isDentistRoute && (
      // Case 1: Known dentist/owner/admin with incomplete onboarding or missing fields
      (isDentist && (!hasCompletedOnboarding || hasMissingFields)) ||
      // Case 2: Profile role is explicitly dentist with incomplete onboarding
      (profileRole === "dentist" && (!hasCompletedOnboarding || hasMissingFields))
    );

    setShowOnboarding(shouldShowOnboarding);
  }, [profileData, isDentist, rolesLoading, location.pathname]);

  const handleOnboardingComplete = async () => {
    // Refetch profile data to get the updated onboarding status
    if (!user) return;

    try {
      // Wait a moment to ensure all state updates are settled
      await new Promise(resolve => setTimeout(resolve, 300));

      // Force a fresh query by using maybeSingle() then single()
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("onboarding_completed, role, first_name, last_name, date_of_birth")
        .eq("user_id", user.id)
        .single();

      if (!error && profile) {
        console.log("Refetched profile after onboarding:", profile);
        setProfileData(profile);

        // Only hide onboarding if we confirmed the update was successful
        if (profile.onboarding_completed === true) {
          setShowOnboarding(false);
        } else {
          console.warn("Profile refetch shows onboarding not completed, keeping modal open");
        }
      } else {
        console.error("Error refetching profile:", error);
        // Don't hide onboarding if refetch failed
      }
    } catch (error) {
      console.error("Error refetching profile after onboarding:", error);
    }
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
