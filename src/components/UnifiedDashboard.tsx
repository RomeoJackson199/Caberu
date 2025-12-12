import React, { memo } from "react";
import { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { PatientDashboard } from "./PatientDashboard";
import { AiOptOutPrompt } from "./AiOptOutPrompt";
import { PremiumLoadingScreen } from "@/components/ui/premium-loading-screen";
import { useIsSuperAdmin } from "@/hooks/useSuperAdmin";
import { useBusinessContext } from "@/hooks/useBusinessContext";

interface UnifiedDashboardProps {
  user: User;
}

export const UnifiedDashboard = memo(({ user }: UnifiedDashboardProps) => {
  const navigate = useNavigate();
  const { data: isSuperAdmin, isLoading: superAdminLoading } = useIsSuperAdmin();
  const { loading: businessLoading, membershipRole } = useBusinessContext();

  React.useEffect(() => {
    if (!businessLoading && !superAdminLoading && !isSuperAdmin) {
      // Check if user is a provider/dentist in the CURRENT business context
      const isProviderInCurrentBusiness =
        membershipRole === 'dentist' ||
        membershipRole === 'admin' ||
        membershipRole === 'owner';

      if (isProviderInCurrentBusiness) {
        // Redirect providers to dentist dashboard
        // Only redirect if we're not already at a dentist route to prevent loops
        const currentPath = window.location.pathname;
        if (!currentPath.startsWith('/dentist')) {
          navigate('/dentist/dashboard', { replace: true });
        }
      }
      // If not a provider in current business, stay on patient dashboard
    }
  }, [businessLoading, superAdminLoading, membershipRole, isSuperAdmin, navigate]);

  if (businessLoading || superAdminLoading) {
    return (
      <PremiumLoadingScreen
        message="Loading Dashboard"
        description="Setting up your personalized experience..."
      />
    );
  }

  // Show patient dashboard for patients and those without provider role in current business
  return (
    <>
      <PatientDashboard user={user} />
      <AiOptOutPrompt user={user} />
    </>
  );
});

UnifiedDashboard.displayName = 'UnifiedDashboard';

export default UnifiedDashboard;

