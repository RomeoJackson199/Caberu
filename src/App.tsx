import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
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
import { RoleBasedRouter } from "@/components/RoleBasedRouter";
import { DentistInvitationDialog } from "@/components/DentistInvitationDialog";
import { SubscriptionGuard } from "@/components/auth/SubscriptionGuard";
import { CommandPalette } from "@/components/CommandPalette";
import { CookieConsent } from "@/components/CookieConsent";
import { OnboardingOrchestrator } from "@/components/onboarding/OnboardingOrchestrator";
import { PhoneVerificationGate } from "@/components/auth/PhoneVerificationGate";
import { initializeErrorReporting } from "@/lib/error-handling/reporting";
import { GlobalDashboardErrorListener } from "@/components/dashboard/GlobalDashboardErrorListener";
import { getUserFriendlyErrorMessage } from "@/lib/error-handling/formatting";
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
import { offlineManager } from "@/lib/offlineManager";
import { StatusBanner } from "@/components/StatusBanner";

// Bridge React Query's onlineManager with our custom offlineManager.
// This ensures React Query pauses mutations when offline and auto-resumes them on reconnect.
onlineManager.setEventListener((setOnline) => {
  const unsubscribe = offlineManager.subscribe((status) => {
    setOnline(status !== 'offline');
  });
  // Set initial state
  setOnline(offlineManager.isOnline());
  return unsubscribe;
});

// Force resync: 2025-12-07T19:03

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
const PrivacyPolicyFr = lazy(() => import("./pages/PrivacyPolicyFr"));
const PrivacyPolicyNl = lazy(() => import("./pages/PrivacyPolicyNl"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const CookiePolicyFr = lazy(() => import("./pages/CookiePolicyFr"));
const CookiePolicyNl = lazy(() => import("./pages/CookiePolicyNl"));
const DataProcessingAgreement = lazy(() => import("./pages/DataProcessingAgreement"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCancelled = lazy(() => import("./pages/PaymentCancelled"));
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
const WatchDemo = lazy(() => import("./pages/WatchDemo"));
const Claim = lazy(() => import("./pages/Claim"));
// PublicBooking removed - unused
const BookAppointmentAI = lazy(() => import("./pages/BookAppointmentAI"));
const BusinessPortal = lazy(() => import("./pages/BusinessPortal"));
import { BookingRouteHandler } from "./components/booking/BookingRouteHandler";
import { logger } from '@/lib/logger';
// SmartBookAppointment removed - unused
// SuperAdminDashboard removed - unused (lazy import existed but was never rendered in a Route)
const AuthRedirect = lazy(() => import("./pages/AuthRedirect"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const SelectBusiness = lazy(() => import("./pages/SelectBusiness"));
const Welcome = lazy(() => import("./pages/Welcome"));
const MobileAuthScreen = lazy(() => import("./pages/MobileAuthScreen"));
const StatusPage = lazy(() => import("./pages/StatusPage"));
const BusinessProfilePage = lazy(() => import("./pages/BusinessProfilePage"));

// Admin Dashboard pages
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminPractices = lazy(() => import("./pages/admin/AdminPractices"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminAppointments = lazy(() => import("./pages/admin/AdminAppointments"));
const AdminCommunications = lazy(() => import("./pages/admin/AdminCommunications"));
const AdminSystemHealth = lazy(() => import("./pages/admin/AdminSystemHealth"));
const AdminCompliance = lazy(() => import("./pages/admin/AdminCompliance"));
const AdminFeatureFlags = lazy(() => import("./pages/admin/AdminFeatureFlags"));
const AdminRevenue = lazy(() => import("./pages/admin/AdminRevenue"));
const AdminAuditLog = lazy(() => import("./pages/admin/AdminAuditLog"));
const AdminAIPrompts = lazy(() => import("./pages/admin/AdminAIPrompts"));
const AdminAIPlayground = lazy(() => import("./pages/admin/AdminAIPlayground"));
const AdminBusinessDetail = lazy(() => import("./pages/admin/AdminBusinessDetail"));
const AdminUserDetail = lazy(() => import("./pages/admin/AdminUserDetail"));
const AdminSmsManagement = lazy(() => import("./pages/admin/AdminSmsManagement"));
const AdminReminders = lazy(() => import("./pages/admin/AdminReminders"));


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
        // Don't show generic error toast for network errors when offline —
        // the useOptimisticMutation hook handles those with "Saved offline" toast
        if (!onlineManager.isOnline()) return;

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
    // Track auth state for user-dependent features (notifications, cookies, etc.)
    // Business selection is handled exclusively by AuthRedirectHandler after login
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) setUser(session?.user ?? null);
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) setUser(session?.user ?? null);
    }).catch(error => {
      logger.error('Error getting session:', error);
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
                  <StatusBanner />
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
                        <Route path="/" element={<Index />} />
                        {/* Demo routes */}
                        <Route path="/demo/dentist" element={<DemoDentistDashboard />} />
                        <Route path="/demo/undo" element={<UndoDemo />} />
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
                        {/* Legacy patient portal routes removed; keep backward-compatible redirects */}
                        <Route path="/patient/*" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/billing" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/docs" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/account/profile" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/account/insurance" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/account/privacy" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/account/help" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/account/settings" element={<Navigate to="/dashboard" replace />} />
                        {/* Public routes */}
                        <Route path="/dentists" element={<DentistProfiles />} />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/privacy" element={<PrivacyPolicy />} />
                        <Route path="/fr/privacy" element={<PrivacyPolicyFr />} />
                        <Route path="/nl/privacy" element={<PrivacyPolicyNl />} />
                        <Route path="/cookies" element={<CookiePolicy />} />
                        <Route path="/fr/cookies" element={<CookiePolicyFr />} />
                        <Route path="/nl/cookies" element={<CookiePolicyNl />} />
                        <Route path="/dpa" element={<DataProcessingAgreement />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/watch-demo" element={<WatchDemo />} />
                        <Route path="/payment-success" element={<PaymentSuccess />} />
                        <Route path="/payment-cancelled" element={<PaymentCancelled />} />
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
                        {/* Super Admin Dashboard (new routed version) */}
                        <Route path="/admin" element={<RoleBasedRouter requiredRole='admin'><AdminLayout /></RoleBasedRouter>}>
                          <Route index element={<AdminOverview />} />
                          <Route path="practices" element={<AdminPractices />} />
                          <Route path="practices/:businessId" element={<AdminBusinessDetail />} />
                          <Route path="users" element={<AdminUsers />} />
                          <Route path="users/:profileId" element={<AdminUserDetail />} />
                          <Route path="appointments" element={<AdminAppointments />} />
                          <Route path="communications" element={<AdminCommunications />} />
                          <Route path="system" element={<AdminSystemHealth />} />
                          <Route path="compliance" element={<AdminCompliance />} />
                          <Route path="ai-prompts" element={<AdminAIPrompts />} />
                          <Route path="features" element={<AdminFeatureFlags />} />
                          <Route path="revenue" element={<AdminRevenue />} />
                          <Route path="audit" element={<AdminAuditLog />} />
                          <Route path="sms" element={<AdminSmsManagement />} />
                          <Route path="reminders" element={<AdminReminders />} />
                        </Route>
                        {/* Main booking route */}
                        <Route path="/book-appointment" element={<BookingRouteHandler><BookAppointmentAI /></BookingRouteHandler>} />
                        {/* Redirect old routes to main booking */}
                        <Route path="/book-appointment-legacy" element={<Navigate to="/book-appointment" replace />} />
                        <Route path="/book-appointment-ai" element={<Navigate to="/book-appointment" replace />} />
                        <Route path="/smart-book-appointment" element={<Navigate to="/book-appointment" replace />} />
                        {/* Business portal route - must come before catch-all */}
                        <Route path="/clinic/:slug" element={<BusinessPortal />} />
                        {/* Public status page */}
                        <Route path="/status" element={<StatusPage />} />
                        {/* Public business profile page (caberu.be/business-slug) - must be last before catch-all */}
                        <Route path="/:slug" element={<BusinessProfilePage />} />
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>

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
