import React, { useState, useEffect, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useNavigate, useLocation } from "react-router-dom";
import { PatientDashboard } from "./PatientDashboard";
import { AiOptOutPrompt } from "./AiOptOutPrompt";
import { ModernLoadingSpinner } from "@/components/enhanced/ModernLoadingSpinner";
import { PremiumLoadingScreen } from "@/components/ui/premium-loading-screen";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsSuperAdmin } from "@/hooks/useSuperAdmin";

interface UnifiedDashboardProps {
  user: User;
}

export const UnifiedDashboard = memo(({ user }: UnifiedDashboardProps) => {
  const { loading: roleLoading, isDentist } = useUserRole();
  const navigate = useNavigate();
  const { data: isSuperAdmin, isLoading: superAdminLoading } = useIsSuperAdmin();

  React.useEffect(() => {
    if (!roleLoading && !superAdminLoading && isDentist && !isSuperAdmin) {
      // Redirect business owners/providers (who are not super admins) to their dashboard
      // Only redirect if we're not already at a dentist route to prevent loops
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/dentist')) {
        navigate('/dentist/dashboard', { replace: true });
      }
    }
  }, [roleLoading, superAdminLoading, isDentist, isSuperAdmin, navigate]);

  if (roleLoading || superAdminLoading) {
    return (
      <PremiumLoadingScreen
        message="Loading Dashboard"
        description="Setting up your personalized experience..."
      />
    );
  }

  // Show patient dashboard for patients and those without provider role
  return (
    <>
      <PatientDashboard user={user} />
      <AiOptOutPrompt user={user} />
    </>
  );
});

UnifiedDashboard.displayName = 'UnifiedDashboard';

export default UnifiedDashboard;
