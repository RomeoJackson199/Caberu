import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/lib/logger';

export type AppRole = 'admin' | 'dentist' | 'provider' | 'patient' | 'staff';

export function useUserRole() {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          logger.info('useUserRole: No user found');
          setRoles([]);
          setLoading(false);
          return;
        }

        logger.info('useUserRole: Fetching roles for user', { userId: user.id, email: user.email });

        // First, check user_roles table (legacy system)
        const { data: userRolesData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (roleError) {
          logger.error('Error fetching user_roles:', roleError);
          throw roleError;
        }

        logger.info('useUserRole: Roles from user_roles table', { data: userRolesData, count: userRolesData?.length });

        // Second, check business_members table (multi-tenancy system)
        // Get profile_id first
        const { data: profileData, error: profileError } = await supabase
          .from('secure_profiles_view')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (profileError) {
          logger.error('Error fetching profile:', profileError);
        }

        let businessRoles: string[] = [];
        if (profileData) {
          const { data: membershipData, error: membershipError } = await supabase
            .from('business_members')
            .select('role')
            .eq('profile_id', profileData.id);

          if (membershipError) {
            logger.error('Error fetching business_members:', membershipError);
          } else {
            businessRoles = membershipData?.map((m: { role: string }) => m.role) || [];
            logger.info('useUserRole: Roles from business_members table', {
              businessRoles,
              count: businessRoles.length
            });
          }
        }

        // Combine roles from both tables
        const allRoles = new Set<AppRole>();

        // Add roles from user_roles table
        if (userRolesData && Array.isArray(userRolesData)) {
          userRolesData.forEach((r: { role: AppRole }) => {
            if (r.role) allRoles.add(r.role);
          });
        }

        // Add dentist/provider role if user has business membership with dentist-like roles
        if (businessRoles.length > 0) {
          if (businessRoles.includes('owner') ||
            businessRoles.includes('admin') ||
            businessRoles.includes('dentist')) {
            allRoles.add('dentist');
            logger.info('useUserRole: Added dentist role based on business membership');
          }
        }

        const finalRoles = Array.from(allRoles);
        logger.info('useUserRole: Final combined roles', { finalRoles });
        setRoles(finalRoles);

      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to fetch roles';
        setError(message);
        logger.error('Error in useUserRole:', e);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = hasRole('admin');
  const isDentist = hasRole('dentist') || hasRole('provider');
  // Handle legacy 'customer' role as 'patient' during transition
  const isPatient = hasRole('patient') || (roles as string[]).includes('customer');
  const isStaff = hasRole('staff');

  // Log computed flags for debugging
  logger.info('useUserRole: Computed role flags', {
    roles,
    isAdmin,
    isDentist,
    isPatient,
    isStaff
  });

  return {
    roles,
    hasRole,
    isAdmin,
    isDentist,
    isPatient,
    isStaff,
    loading,
    error
  };
}
