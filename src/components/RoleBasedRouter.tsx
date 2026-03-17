import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsSuperAdmin } from "@/hooks/useSuperAdmin";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/lib/logger';

interface RoleBasedRouterProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'dentist' | 'provider' | 'patient';
  redirectTo?: string;
}

export function RoleBasedRouter({ children, requiredRole, redirectTo = "/" }: RoleBasedRouterProps) {
  const { roles, loading, hasRole, isDentist, isAdmin, isPatient } = useUserRole();
  const { data: isSuperAdmin, isLoading: superAdminLoading } = useIsSuperAdmin();
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Wait for both role and super admin loading to complete
    if (loading || superAdminLoading) return;

    const checkAccess = async () => {
      if (requiredRole) {
        // For 'admin' role requirement, also accept super_admin
        const hasRequiredRole = requiredRole === 'dentist'
          ? isDentist
          : requiredRole === 'admin'
            ? (hasRole(requiredRole) || isSuperAdmin === true)
            : hasRole(requiredRole);
        if (!hasRequiredRole) {
          navigate(redirectTo, { replace: true });
          return;
        }

        // Extra verification for dentist: ensure dentist/provider record exists and is active
        if (requiredRole === 'dentist') {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('secure_profiles_view')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle();

            if (profile) {
              // Check if dentist record exists
              const { data: dentist } = await supabase
                .from('dentists')
                .select('id, is_active')
                .eq('profile_id', profile.id as string)
                .maybeSingle();

              if (!dentist) {
                // No dentist record - auto-create it
                logger.info('RoleBasedRouter: Auto-creating dentist record for user');
                const { error: insertError } = await supabase
                  .from('dentists')
                  .insert({
                    profile_id: profile.id,
                    is_active: true
                  });

                if (insertError) {
                  logger.error('Failed to create dentist record:', insertError);
                  // Don't redirect - allow access anyway since they have business_members role
                }
              } else if (!dentist.is_active) {
                logger.warn('Dentist record exists but is not active - activating it');
                // Activate the dentist record instead of denying access
                await supabase
                  .from('dentists')
                  .update({ is_active: true })
                  .eq('id', dentist.id);
              }
            }
          }
        }
      }

      setAuthorized(true);
    };

    checkAccess();
  }, [loading, superAdminLoading, requiredRole, hasRole, isDentist, isSuperAdmin, roles, navigate, redirectTo]);

  if (loading || superAdminLoading) {
    return <LoadingSpinner variant="overlay" message="Verifying access..." />;
  }

  if (!authorized) {
    return <LoadingSpinner variant="overlay" message="Redirecting..." />;
  }

  return <>{children}</>;
}
