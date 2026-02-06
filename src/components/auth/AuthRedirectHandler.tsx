import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsSuperAdmin } from '@/hooks/useSuperAdmin';
import { useUserRole } from '@/hooks/useUserRole';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { savePracticeConsent, hasPendingPracticeConsent } from '@/lib/consent-utils';

const REDIRECT_KEY = 'auth_redirect_attempt';
const MAX_REDIRECT_ATTEMPTS = 3;
const REDIRECT_TIMEOUT = 10000; // 10 seconds

export function AuthRedirectHandler() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: isSuperAdmin, isLoading: superAdminLoading } = useIsSuperAdmin();
  const { loading: roleLoading, isDentist } = useUserRole();
  const { loading: businessLoading, businessId, memberships, switchBusiness } = useBusinessContext();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'auth' | 'role' | 'business' | 'redirect'>('auth');
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
      // Update loading stage based on what's loading
      if (superAdminLoading) {
        setLoadingStage('auth');
      } else if (roleLoading) {
        setLoadingStage('role');
      } else if (businessLoading) {
        setLoadingStage('business');
      }

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
      setLoadingStage('redirect');

      try {
        logger.info('AuthRedirectHandler: Starting redirect logic', {
          isSuperAdmin,
          isDentist,
          businessId,
          membershipsCount: memberships.length
        });

        // Check for pending signup user type from OAuth flow
        // If user signed up as business owner via OAuth, we need to initialize their business owner data
        const pendingUserType = sessionStorage.getItem('pending_signup_user_type');
        if (pendingUserType === 'owner') {
          sessionStorage.removeItem('pending_signup_user_type');
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Call RPC to initialize business owner data (profile, business, dentist, business_members)
            const { data: result, error: rpcError } = await supabase.rpc('initialize_oauth_business_owner');

            if (rpcError) {
              logger.error('AuthRedirectHandler: Failed to initialize OAuth business owner', rpcError);

              // Check error type
              const errorMsg = rpcError.message?.toLowerCase() || '';
              const isNetworkError = errorMsg.includes('network') || errorMsg.includes('fetch');
              const isPermissionError = errorMsg.includes('permission') || errorMsg.includes('unauthorized');

              if (isNetworkError) {
                toast({
                  title: "Connection Error",
                  description: "Unable to complete setup due to network issues. Please try again.",
                  variant: "destructive",
                  duration: 6000,
                });
              } else if (isPermissionError) {
                toast({
                  title: "Permission Error",
                  description: "Your account doesn't have the necessary permissions. Please contact support.",
                  variant: "destructive",
                  duration: 6000,
                });
              } else {
                toast({
                  title: "Setup Error",
                  description: "Failed to initialize your business account. Please contact support if this persists.",
                  variant: "destructive",
                  duration: 6000,
                });
              }
            } else if (result?.success) {
              logger.info('AuthRedirectHandler: Successfully initialized OAuth business owner', result);
              toast({
                title: "Account Setup Complete",
                description: "Your business owner account is ready!",
                duration: 4000,
              });
            } else {
              logger.error('AuthRedirectHandler: RPC returned failure', result);
              toast({
                title: "Setup Warning",
                description: result?.error || "There was an issue setting up your account. You may need to complete setup manually.",
                variant: "destructive",
                duration: 6000,
              });
            }

            // Redirect to create-business for business owners
            sessionStorage.removeItem(REDIRECT_KEY);
            navigate('/create-business', { replace: true });
            return;
          }
        } else if (pendingUserType === 'patient') {
          sessionStorage.removeItem('pending_signup_user_type');
          // Patient signup via OAuth - profile is already set correctly, continue normal flow
        }

        // Priority 1: Super Admin -> /super-admin
        if (isSuperAdmin) {
          logger.info('AuthRedirectHandler: Redirecting super admin to /super-admin');
          sessionStorage.removeItem(REDIRECT_KEY);
          navigate('/super-admin', { replace: true });
          return;
        }

        // Priority 2: Provider/Dentist -> check if business selection needed
        if (isDentist) {
          // Try to save pending consent if exists
          if (hasPendingPracticeConsent()) {
            // Get the profile ID to save consent
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('user_id', user.id)
                .single();

              if (profile?.id) {
                await savePracticeConsent(profile.id);
                logger.info('AuthRedirectHandler: Saved practice consent', { profileId: profile.id });
              }
            }
          }

          if (memberships.length === 0) {
            // No memberships, go to dashboard (might show create business option)
            logger.info('AuthRedirectHandler: Dentist with no memberships, redirecting to /dentist/dashboard');
            sessionStorage.removeItem(REDIRECT_KEY);
            navigate('/dentist/dashboard', { replace: true });
            return;
          }

          // Check if user owns a business - auto-select it and skip business selection
          const ownerMembership = memberships.find(m => m.role === 'owner');
          if (ownerMembership) {
            logger.info('AuthRedirectHandler: Owner detected, auto-selecting owned business', {
              businessId: ownerMembership.business_id,
              businessName: ownerMembership.business?.name
            });

            // Auto-switch to the owner's business
            try {
              await switchBusiness(ownerMembership.business_id);
              sessionStorage.removeItem(REDIRECT_KEY);
              navigate('/dentist/dashboard', { replace: true });
              return;
            } catch (switchError) {
              logger.error('AuthRedirectHandler: Failed to auto-select owner business, falling back to selection', switchError);
              // Fall through to business selection
            }
          }

          // Non-owner dentists or fallback: show business selection
          logger.info('AuthRedirectHandler: Dentist with memberships, showing business selection', {
            membershipsCount: memberships.length,
            currentBusinessId: businessId
          });
          sessionStorage.removeItem(REDIRECT_KEY);
          navigate('/select-business', { replace: true });
          return;
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

          // Check if it's a network error
          const isNetworkError = profileError.message?.toLowerCase().includes('network') ||
                                 profileError.message?.toLowerCase().includes('fetch');

          if (isNetworkError) {
            toast({
              title: "Connection Error",
              description: "Unable to connect to the server. Please check your internet connection and try again.",
              variant: "destructive",
              duration: 5000,
            });
          } else {
            toast({
              title: "Profile Error",
              description: "Unable to load your profile. Redirecting to onboarding to complete your setup.",
              variant: "destructive",
            });
          }

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

        // For patients, always show business selection if there are businesses to choose from
        // This ensures patients explicitly pick which business they're interacting with
        logger.info('AuthRedirectHandler: Profile complete, checking if business selection needed', {
          hasMemberships: memberships.length > 0,
          hasBusinessId: !!businessId
        });
        
        // Always show business selection for patients on login
        // This ensures they choose which practice to interact with
        sessionStorage.removeItem(REDIRECT_KEY);
        navigate('/select-business', { replace: true });
      } catch (error) {
        logger.error("Error in AuthRedirectHandler:", error);

        // Determine error type and provide appropriate message
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isAuthError = errorMessage.toLowerCase().includes('auth') ||
                           errorMessage.toLowerCase().includes('unauthorized') ||
                           errorMessage.toLowerCase().includes('session');
        const isNetworkError = errorMessage.toLowerCase().includes('network') ||
                              errorMessage.toLowerCase().includes('fetch') ||
                              errorMessage.toLowerCase().includes('connection');

        if (isAuthError) {
          toast({
            title: "Authentication Error",
            description: "Your session may have expired. Please log in again.",
            variant: "destructive",
            duration: 6000,
          });
          sessionStorage.removeItem(REDIRECT_KEY);
          navigate('/login', { replace: true });
        } else if (isNetworkError) {
          toast({
            title: "Connection Error",
            description: "Unable to connect to the server. Please check your internet connection and try again.",
            variant: "destructive",
            duration: 6000,
          });
          // Don't redirect on network errors, user might want to retry
          sessionStorage.removeItem(REDIRECT_KEY);
          navigate('/', { replace: true });
        } else {
          toast({
            title: "Navigation Error",
            description: "Something unexpected happened. Taking you to the dashboard.",
            variant: "destructive",
            duration: 5000,
          });
          sessionStorage.removeItem(REDIRECT_KEY);
          navigate('/dashboard', { replace: true });
        }
      }
    };

    performRedirect();
  }, [isSuperAdmin, isDentist, superAdminLoading, roleLoading, businessLoading, businessId, memberships, switchBusiness, navigate, isRedirecting, toast]);

  // Determine loading message based on stage
  const getLoadingMessage = () => {
    switch (loadingStage) {
      case 'auth':
        return {
          message: "Verifying credentials...",
          description: "Authenticating your account"
        };
      case 'role':
        return {
          message: "Loading your profile...",
          description: "Checking your account permissions"
        };
      case 'business':
        return {
          message: "Loading workspace...",
          description: "Setting up your business context"
        };
      case 'redirect':
        return {
          message: "Almost there...",
          description: "Preparing your dashboard"
        };
      default:
        return {
          message: "Redirecting...",
          description: "Setting up your workspace"
        };
    }
  };

  if (superAdminLoading || roleLoading || businessLoading || isRedirecting) {
    const { message, description } = getLoadingMessage();
    return (
      <LoadingSpinner
        variant="overlay"
        size="lg"
        message={message}
        description={description}
      />
    );
  }

  return null;
}
