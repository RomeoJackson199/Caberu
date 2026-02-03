import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "./hooks/useLanguage";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BusinessProvider } from "./hooks/useBusinessContext";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { useState, useEffect, lazy, Suspense } from "react";
import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { SeoManager } from "./lib/seo";
import AuthCallbackHandler from "./components/AuthCallbackHandler";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { DentistPortal } from "@/pages/DentistPortal";
import { PatientPortalNav } from "@/components/patients/PatientPortalNav";
import { RoleBasedRouter } from "@/components/RoleBasedRouter";
import { DentistInvitationDialog } from "@/components/DentistInvitationDialog";
import { SubscriptionGuard } from "@/components/auth/SubscriptionGuard";
import { CommandPalette } from "@/components/CommandPalette";
import { CookieConsent } from "@/components/CookieConsent";
import { OnboardingOrchestrator } from "@/components/onboarding/OnboardingOrchestrator";
import { PhoneVerificationGate } from "@/components/auth/PhoneVerificationGate";
import { initializeErrorReporting } from "@/lib/errorReporting";
import { GlobalDashboardErrorListener } from "@/components/dashboard/GlobalDashboardErrorListener";
import { getUserFriendlyErrorMessage } from "@/lib/errorHandling";
import { toast } from "@/hooks/use-toast";
import { EmailLimitProvider } from "@/hooks/useEmailLimit";
import { NetworkStatus, SessionTimeoutWarning } from "@/components/stability";
import { ConfirmationProvider } from "@/components/stability/ConfirmationDialogs";
import { RouteProgressBar } from "@/components/RouteProgressBar";
import { KeyboardShortcutsGuide } from "@/components/KeyboardShortcutsGuide";
import { SmartNotificationBanner } from "@/components/notifications/SmartNotificationBanner";
import { NotificationPermissionPrompt } from "@/components/notifications/NotificationPermissionPrompt";
import { initializePushNotifications } from "@/lib/pushNotifications";
import { SkipNavigation } from "@/components/accessibility/SkipNavigation";

// Force resync: 2025-12-07T19:03

// MAINTENANCE MODE - Set to true to redirect all traffic to the downtime page
const MAINTENANCE_MODE = true;

const Invite = lazy(() => import("./pages/Invite"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const GoogleCalendarCallback = lazy(() => import("./pages/GoogleCalendarCallback"));
const DentistServices = lazy(() => import("./pages/DentistServices"));
const CreateBusiness = lazy(() => import("./pages/CreateBusiness"));

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const DentistProfiles = lazy(() => import("./pages/DentistProfiles"));
const Terms = lazy(() => import("./pages/Terms"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const DataProcessingAgreement = lazy(() => import("./pages/DataProcessingAgreement"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCancelled = lazy(() => import("./pages/PaymentCancelled"));
const Downtime = lazy(() => import("./pages/Downtime"));
const Chat = lazy(() => import("./pages/Chat"));
const Messages = lazy(() => import("./pages/Messages"));
const DemoDentistDashboard = lazy(() => import("./pages/demo/DemoDentistDashboard"));
const UndoDemo = lazy(() => import("./components/demo/UndoDemo").then(module => ({ default: module.UndoDemo })));
const Pricing = lazy(() => import("./pages/Pricing"));
const Support = lazy(() => import("./pages/Support"));
const FeatureDetail = lazy(() => import("./pages/FeatureDetail"));
const FAQ = lazy(() => import("./pages/FAQ"));
const AIInfo = lazy(() => import("./pages/AIInfo"));
const UnifiedDashboard = lazy(() => import("./components/UnifiedDashboard"));
const About = lazy(() => import("./pages/About"));
const Claim = lazy(() => import("./pages/Claim"));
// PublicBooking removed - unused
const BookAppointmentAI = lazy(() => import("./pages/BookAppointmentAI"));
const BusinessPortal = lazy(() => import("./pages/BusinessPortal"));
import { BookingRouteHandler } from "./components/booking/BookingRouteHandler";
import { logger } from '@/lib/logger';
const PatientCareHome = lazy(() => import("./pages/PatientCareHome"));
const PatientAppointmentsPage = lazy(() => import("./pages/PatientAppointmentsPage"));
const PatientPrescriptionsPage = lazy(() => import("./pages/PatientPrescriptionsPage"));
const PatientTreatmentHistoryPage = lazy(() => import("./pages/PatientTreatmentHistoryPage"));
const PatientBillingPage = lazy(() => import("./pages/PatientBillingPage"));
const PatientDocumentsPage = lazy(() => import("./pages/PatientDocumentsPage"));
const PatientAccountProfilePage = lazy(() => import("./pages/PatientAccountProfilePage"));
const PatientAccountInsurancePage = lazy(() => import("./pages/PatientAccountInsurancePage"));
const PatientAccountPrivacyPage = lazy(() => import("./pages/PatientAccountPrivacyPage"));
const PatientAccountHelpPage = lazy(() => import("./pages/PatientAccountHelpPage"));
const PatientSettingsPage = lazy(() => import("./pages/PatientSettingsPage"));
// SmartBookAppointment removed - unused
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const AuthRedirect = lazy(() => import("./pages/AuthRedirect"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const SelectBusiness = lazy(() => import("./pages/SelectBusiness"));
const Welcome = lazy(() => import("./pages/Welcome"));
const MobileAuthScreen = lazy(() => import("./pages/MobileAuthScreen"));
const TestPhoneVerification = lazy(() => import("./pages/TestPhoneVerification"));

// Business gate component - DISABLED: Now using dedicated /select-business page
const BusinessGate = () => {
  // Popup disabled - business selection is now handled by /select-business page
  return null;
};

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);
    }).catch(error => {
      logger.error('Error getting session:', error);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <LoadingSpinner variant="overlay" message="Loading dashboard..." />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <UnifiedDashboard user={user} />;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data longer - reduces refetch requests
      staleTime: 10 * 60 * 1000, // 10 minutes before data is considered stale
      gcTime: 30 * 60 * 1000, // 30 minutes cache retention

      // Smart refetch behavior
      refetchOnWindowFocus: false, // Don't refetch when switching tabs
      refetchOnReconnect: 'always', // Refetch when network reconnects
      refetchOnMount: false, // Use cached data on remount if fresh

      // Background updates - show cached data immediately, update in background
      networkMode: 'offlineFirst',

      // Only retry on network errors, not API errors
      retry: (failureCount, error) => {
        // Don't retry auth errors (401/403)
        if (error && typeof error === 'object') {
          if ('status' in error && (error.status === 401 || error.status === 403)) {
            return false;
          }
          // Don't retry Supabase permission errors
          if ('code' in error) {
            const supabaseError = error as { code?: string };
            if (supabaseError.code === 'PGRST301' || supabaseError.code === 'PGRST116') {
              return false;
            }
          }
        }
        return failureCount < 2; // Only 2 retries (faster failure)
      },
      retryDelay: (attemptIndex: number) => Math.min(500 * 2 ** attemptIndex, 5000), // Faster retries
    },
    mutations: {
      // Optimistic updates - UI updates immediately
      networkMode: 'offlineFirst',
      retry: 1,
      onError: (error) => {
        const description = getUserFriendlyErrorMessage(
          error,
          "We couldn't save your dashboard changes. Please try again."
        );

        toast({
          title: "Action failed",
          description,
          variant: "destructive",
        });
      },
    },
  },
});

const App = () => {
  const [showBusinessPicker, setShowBusinessPicker] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Initialize error reporting on mount - deferred to avoid blocking
  useEffect(() => {
    // Use requestIdleCallback to defer non-critical initialization
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        initializeErrorReporting();
        // Initialize push notifications after error reporting
        initializePushNotifications().catch(console.error);
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        initializeErrorReporting();
        initializePushNotifications().catch(console.error);
      }, 100);
    }
  }, []);

  useEffect(() => {
    // Check auth and show business picker if multi-business user or no business selected
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (!isMounted) return;
        setUser(user);

        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            // Ignore "no rows found" error, log others
            logger.error('Error fetching profile:', profileError);
          }

          if (profile && isMounted) {
            const { data: memberships, error: memberError } = await supabase
              .from('business_members')
              .select('business_id')
              .eq('profile_id', profile.id);

            if (memberError) logger.error('Error fetching memberships:', memberError);

            // Check if they have a current business selection
            const { data: sessionBusiness, error: sessionError } = await supabase
              .from('session_business')
              .select('business_id')
              .eq('user_id', user.id)
              .order('updated_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (sessionError) logger.error('Error fetching session business:', sessionError);

            if (!isMounted) return;

            // Show business picker on login
            if (memberships && memberships.length > 0) {
              if (memberships.length >= 1 && !sessionBusiness?.business_id) {
                // Providers with ANY clinics need to choose (to allow seeing public list)
                setTimeout(() => {
                  if (isMounted) setShowBusinessPicker(true);
                }, 500);
              }
            } else if (!sessionBusiness?.business_id) {
              // Patient/guest: no clinic selected yet, show patient picker
              setTimeout(() => {
                if (isMounted) setShowBusinessPicker(true);
              }, 500);
            }
          }
        }
      } catch (error) {
        // Handle expected auth errors gracefully (user not logged in)
        if (error && typeof error === 'object') {
          const authError = error as { name?: string; status?: number };
          
          // AuthSessionMissingError is expected when user isn't logged in
          if (authError.name === 'AuthSessionMissingError') {
            logger.debug('User not authenticated (expected)');
            return;
          }
          
          // 401/403 are also expected for unauthenticated users
          if (authError.status === 401 || authError.status === 403) {
            logger.debug('Auth check returned expected status:', authError.status);
            return;
          }
        }
        
        // Log unexpected errors at error level
        logger.error('Auth check failed:', error);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (isMounted) setUser(session?.user ?? null);
      if (event === 'SIGNED_IN') {
        checkAuth();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch notifications when user is logged in
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    let isMounted = true;

    const fetchNotifications = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!profile || !isMounted) return;

        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', profile.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          logger.error('Error fetching notifications:', error);
          return;
        }

        if (isMounted && data) {
          setNotifications(data);
        }
      } catch (error) {
        logger.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();

    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      channel.unsubscribe();
    };
  }, [user]);

  // Handle notification dismissal
  const handleNotificationDismiss = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) {
        logger.error('Error dismissing notification:', error);
        return;
      }

      // Optimistically update local state
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      logger.error('Error dismissing notification:', error);
    }
  };

  // Handle notification action
  const handleNotificationAction = (notification: any) => {
    // Mark as read
    handleNotificationDismiss(notification.id);

    // Handle navigation based on action_url
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={true}
          disableTransitionOnChange={false}
        >
          <LanguageProvider>
            <BusinessProvider>
              <AuthCallbackHandler />
              <TooltipProvider>
                <Sonner />
                <Toaster />
                <GlobalDashboardErrorListener />
                <PWAInstallPrompt />
                <NetworkStatus />
                <SessionTimeoutWarning />
                <SmartNotificationBanner
                  notifications={notifications}
                  onDismiss={handleNotificationDismiss}
                  onAction={handleNotificationAction}
                  maxVisible={3}
                  position="top"
                />
                <NotificationPermissionPrompt />
                <ConfirmationProvider>
                <BrowserRouter>
                  <SkipNavigation />
                  <RouteProgressBar />
                  <EmailLimitProvider>
                    <DentistInvitationDialog />
                    <CommandPalette />
                    <KeyboardShortcutsGuide />
                    <CookieConsent isAuthenticated={!!user} />
                    <OnboardingOrchestrator user={user} />
                    <PhoneVerificationGate user={user} />
                    <SeoManager />
                    <Suspense fallback={<LoadingSpinner variant="overlay" message="Loading..." />}>
                      <Routes>
                        {/* Maintenance Mode - Redirect all traffic to downtime page */}
                        {MAINTENANCE_MODE ? (
                          <>
                            <Route path="/downtime" element={<Downtime />} />
                            <Route path="*" element={<Navigate to="/downtime" replace />} />
                          </>
                        ) : (
                        <>
                        <Route path="/" element={<Index />} />
                        {/* Demo routes */}
                        <Route path="/demo/dentist" element={<DemoDentistDashboard />} />
                        <Route path="/demo/undo" element={<UndoDemo />} />
                        <Route path="/test-phone" element={<TestPhoneVerification />} />
                        {/* Auth routes */}
                        <Route path="/mobile-auth" element={<MobileAuthScreen />} />
                        <Route path="/welcome" element={<Welcome />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/create-business" element={<CreateBusiness />} />
                        <Route path="/onboarding" element={<Onboarding />} />
                        {/* Post-auth redirect handler */}
                        <Route path="/auth-redirect" element={<AuthRedirect />} />
                        {/* Business selection page (protected) */}
                        <Route path="/select-business" element={<SelectBusiness />} />
                        {/* Role-based dashboard routing */}
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/patient/*" element={<Dashboard />} />
                        {/* Dentist routes with tab-based navigation and subscription guard */}
                        <Route path="/dentist/*" element={
                          <RoleBasedRouter requiredRole='dentist'>
                            <SubscriptionGuard>
                              <DentistPortal />
                            </SubscriptionGuard>
                          </RoleBasedRouter>
                        } />
                        <Route path="/dentist-services" element={
                          <RoleBasedRouter requiredRole='dentist'>
                            <SubscriptionGuard>
                              <DentistServices />
                            </SubscriptionGuard>
                          </RoleBasedRouter>
                        } />
                        {/* Patient portal routes with patient nav */}
                        <Route element={<PatientPortalNav><></></PatientPortalNav>}>
                          <Route path="/care" element={<PatientCareHome />} />
                          <Route path="/care/appointments" element={<PatientAppointmentsPage />} />
                          <Route path="/care/prescriptions" element={<PatientPrescriptionsPage />} />
                          <Route path="/care/history" element={<PatientTreatmentHistoryPage />} />
                          <Route path="/billing" element={<PatientBillingPage />} />
                          <Route path="/docs" element={<PatientDocumentsPage />} />
                          <Route path="/account/profile" element={<PatientAccountProfilePage />} />
                          <Route path="/account/insurance" element={<PatientAccountInsurancePage />} />
                          <Route path="/account/privacy" element={<PatientAccountPrivacyPage />} />
                          <Route path="/account/help" element={<PatientAccountHelpPage />} />
                          <Route path="/account/settings" element={<PatientSettingsPage />} />
                        </Route>
                        {/* Public routes */}
                        <Route path="/dentists" element={<DentistProfiles />} />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/privacy" element={<PrivacyPolicy />} />
                        <Route path="/dpa" element={<DataProcessingAgreement />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/payment-success" element={<PaymentSuccess />} />
                        <Route path="/payment-cancelled" element={<PaymentCancelled />} />
                        <Route path="/downtime" element={<Downtime />} />
                        <Route path="/support" element={<Support />} />
                        <Route path="/features/:id" element={<FeatureDetail />} />
                        <Route path="/chat" element={<Chat />} />
                        <Route path="/messages" element={<Messages />} />
                        <Route path="/invite" element={<Invite />} />
                        <Route path="/claim" element={<Claim />} />
                        <Route path="/pricing" element={<Pricing />} />
                        <Route path="/faq" element={<FAQ />} />
                        <Route path="/ai-info" element={<AIInfo />} />
                        <Route path="/google-calendar-callback" element={<GoogleCalendarCallback />} />
                        {/* Super Admin Dashboard - Protected */}
                        <Route path="/super-admin" element={<RoleBasedRouter requiredRole='admin'><SuperAdminDashboard /></RoleBasedRouter>} />
                        {/* Main booking route */}
                        <Route path="/book-appointment" element={<BookingRouteHandler><BookAppointmentAI /></BookingRouteHandler>} />
                        {/* Redirect old routes to main booking */}
                        <Route path="/book-appointment-legacy" element={<Navigate to="/book-appointment" replace />} />
                        <Route path="/book-appointment-ai" element={<Navigate to="/book-appointment" replace />} />
                        <Route path="/smart-book-appointment" element={<Navigate to="/book-appointment" replace />} />
                        {/* Business portal route - must come before catch-all */}
                        <Route path="/clinic/:slug" element={<BusinessPortal />} />
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                        </>
                        )}
                      </Routes>
                    </Suspense>

                    {/* Business Picker Dialog */}
                    <BusinessGate />
                  </EmailLimitProvider>
                </BrowserRouter>
                </ConfirmationProvider>
              </TooltipProvider>
            </BusinessProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
