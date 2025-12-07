import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsSuperAdmin } from '@/hooks/useSuperAdmin';
import { useUserRole } from '@/hooks/useUserRole';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { ModernLoadingSpinner } from '@/components/enhanced/ModernLoadingSpinner';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

const REDIRECT_KEY = 'auth_redirect_attempt';
const MAX_REDIRECT_ATTEMPTS = 3;
const REDIRECT_TIMEOUT = 10000; // 10 seconds

export function AuthRedirectHandler() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: isSuperAdmin, isLoading: superAdminLoading } = useIsSuperAdmin();
  const { loading: roleLoading, isDentist } = useUserRole();
  const { loading: businessLoading, businessId, memberships } = useBusinessContext();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Check for circular redirect issues
  const checkRedirectLoops = (): boolean => {
    try {
      const redirectData = sessionStorage.getItem(REDIRECT_KEY);
      if (redirectData) {
        const { count, timestamp } = JSON.parse(redirectData);
        const now = Date.now();

        // Reset if more than 1 minute has passed
        if (now - timestamp > 60000) {
          sessionStorage.removeItem(REDIRECT_KEY);
          return true;
        }

        if (count >= MAX_REDIRECT_ATTEMPTS) {
          logger.error('Maximum redirect attempts exceeded', { count, timestamp });
          toast({
            title: "Navigation Error",
            description: "Unable to redirect to your portal. Please try logging in again.",
            variant: "destructive",
          });
          // Clear the loop and redirect to home as safe fallback
          sessionStorage.removeItem(REDIRECT_KEY);
          navigate('/', { replace: true });
          return false;
        }

        sessionStorage.setItem(REDIRECT_KEY, JSON.stringify({
          count: count + 1,
          timestamp: now
        }));
      } else {
        sessionStorage.setItem(REDIRECT_KEY, JSON.stringify({
          count: 1,
          timestamp: Date.now()
        }));
      }
      return true;
    } catch (error) {
      logger.error('Error checking redirect loops:', error);
      return true; // Continue on error
    }
  };

  useEffect(() => {
    // Set timeout to prevent infinite loading
    timeoutRef.current = setTimeout(() => {
      if (!isRedirecting) {
        logger.error('Redirect timeout - forcing fallback');
        toast({
          title: "Slow Connection",
          description: "Taking longer than expected. Redirecting to home.",
          variant: "default",
        });
        navigate('/', { replace: true });
      }
    }, REDIRECT_TIMEOUT);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isRedirecting, navigate, toast]);

  useEffect(() => {
    // Wait for all checks to complete
    if (superAdminLoading || roleLoading || businessLoading) {
      logger.info('AuthRedirectHandler: Waiting for loading to complete', {
        superAdminLoading,
        roleLoading,
        businessLoading
      });
      return;
    }

    if (isRedirecting) {
      logger.info('AuthRedirectHandler: Already redirecting, skipping');
      return;
    }

    // Check for redirect loops
    if (!checkRedirectLoops()) {
      return;
    }

    const performRedirect = async () => {
      setIsRedirecting(true);

      try {
        logger.info('AuthRedirectHandler: Starting redirect logic', {
          isSuperAdmin,
          isDentist,
          businessId,
          membershipsCount: memberships.length
        });

        // Priority 1: Super Admin -> /super-admin
        if (isSuperAdmin) {
          logger.info('AuthRedirectHandler: Redirecting super admin to /super-admin');
          sessionStorage.removeItem(REDIRECT_KEY);
          navigate('/super-admin', { replace: true });
          return;
        }

        // Priority 2: Provider/Dentist -> /dentist/dashboard
        if (isDentist) {
          if (businessId) {
            logger.info('AuthRedirectHandler: Redirecting dentist to /dentist/dashboard', { businessId });
            sessionStorage.removeItem(REDIRECT_KEY);
            navigate('/dentist/dashboard', { replace: true });
            return;
          } else if (memberships.length === 0) {
            logger.info('AuthRedirectHandler: Dentist with no memberships, redirecting to /dentist/dashboard');
            sessionStorage.removeItem(REDIRECT_KEY);
            navigate('/dentist/dashboard', { replace: true });
            return;
          } else {
            // Dentist with memberships but no business selected - wait for business picker
            logger.info('AuthRedirectHandler: Dentist waiting for business selection', {
              membershipsCount: memberships.length
            });
            return;
          }
        }

        // Priority 3: Check for email verification and profile completion for patients
        logger.info('AuthRedirectHandler: Checking patient status');
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          logger.warn('AuthRedirectHandler: No user found, redirecting to login');
          sessionStorage.removeItem(REDIRECT_KEY);
          navigate('/login', { replace: true });
          return;
        }

        logger.info('AuthRedirectHandler: User authenticated, checking profile', { userId: user.id });

        // Check profile completion
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name, date_of_birth')
          .eq('user_id', user.id)
          .single();

        if (profileError) {
          logger.error('AuthRedirectHandler: Error fetching profile', profileError);
          toast({
            title: "Profile Error",
            description: "Unable to load your profile. Please try again.",
            variant: "destructive",
          });
          sessionStorage.removeItem(REDIRECT_KEY);
          navigate('/onboarding', { replace: true });
          return;
        }

        if (!profile?.first_name || !profile?.last_name || !profile?.date_of_birth) {
          logger.info('AuthRedirectHandler: Incomplete profile, redirecting to onboarding');
          sessionStorage.removeItem(REDIRECT_KEY);
          navigate('/onboarding', { replace: true });
          return;
        }

        logger.info('AuthRedirectHandler: Profile complete, redirecting to patient dashboard');
        sessionStorage.removeItem(REDIRECT_KEY);
        navigate('/dashboard', { replace: true });
      } catch (error) {
        logger.error("Error in AuthRedirectHandler:", error);
        toast({
          title: "Navigation Error",
          description: "Something went wrong. Redirecting to dashboard.",
          variant: "destructive",
        });
        sessionStorage.removeItem(REDIRECT_KEY);
        navigate('/dashboard', { replace: true });
      }
    };

    performRedirect();
  }, [isSuperAdmin, isDentist, superAdminLoading, roleLoading, businessLoading, businessId, memberships, navigate, isRedirecting, toast]);

  if (superAdminLoading || roleLoading || businessLoading) {
    return (
      <ModernLoadingSpinner
        variant="overlay"
        size="lg"
        message="Redirecting..."
        description="Setting up your workspace..."
      />
    );
  }

  if (isRedirecting) {
    return (
      <ModernLoadingSpinner
        variant="overlay"
        size="lg"
        message="Almost there..."
        description="Loading your portal..."
      />
    );
  }

  return null;
}
