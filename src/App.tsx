import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "./hooks/useLanguage";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BusinessProvider, useBusinessContext } from "./hooks/useBusinessContext";
import { BusinessPickerDialog } from "./components/BusinessPickerDialog";
import { BusinessSelectionForPatients } from "./components/BusinessSelectionForPatients";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./components/ui/dialog";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import ProfileCompletionDialog from "./components/ProfileCompletionDialog";
import { ChangelogPopup } from "./components/ChangelogPopup";
import { useState, useEffect, lazy, Suspense } from "react";
import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { SeoManager } from "./lib/seo";
import { LazyLoadingWrapper } from "./components/optimized/LazyLoadingWrapper";
import AuthCallbackHandler from "./components/AuthCallbackHandler";
import { ModernLoadingSpinner } from "@/components/enhanced/ModernLoadingSpinner";
import { AppShell } from "@/components/layout/AppShell";
import { DentistPortal } from "@/pages/DentistPortal";
import { PatientPortalNav } from "@/components/patient/PatientPortalNav";
import { RoleBasedRouter } from "@/components/RoleBasedRouter";
import { DentistInvitationDialog } from "@/components/DentistInvitationDialog";
import { CommandPalette } from "@/components/CommandPalette";
import { CookieConsent } from "@/components/CookieConsent";
import { OnboardingOrchestrator } from "@/components/onboarding/OnboardingOrchestrator";
import { initializeErrorReporting } from "@/lib/errorReporting";

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
const DataProcessingAgreement = lazy(() => import("./pages/DataProcessingAgreement"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCancelled = lazy(() => import("./pages/PaymentCancelled"));
const Chat = lazy(() => import("./pages/Chat"));
const Messages = lazy(() => import("./pages/Messages"));
const DemoDentistDashboard = lazy(() => import("./pages/demo/DemoDentistDashboard"));
const Schedule = lazy(() => import("./pages/Schedule"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Support = lazy(() => import("./pages/Support"));
const FeatureDetail = lazy(() => import("./pages/FeatureDetail"));
const FAQ = lazy(() => import("./pages/FAQ"));
const AIInfo = lazy(() => import("./pages/AIInfo"));
const UnifiedDashboard = lazy(() => import("./components/UnifiedDashboard"));
const LanguageTest = lazy(() => import("./components/LanguageTest").then(module => ({ default: module.LanguageTest })));
const About = lazy(() => import("./pages/About"));
const Claim = lazy(() => import("./pages/Claim"));
const PublicBooking = lazy(() => import("./pages/PublicBooking"));
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
const SmartBookAppointment = lazy(() => import("./pages/SmartBookAppointment"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const AuthRedirect = lazy(() => import("./pages/AuthRedirect"));
const Onboarding = lazy(() => import("./pages/Onboarding"));

// Dashboard component that handles authentication with lazy loading
// Business gate component that shows appropriate picker
const BusinessGate = ({ showBusinessPicker, setShowBusinessPicker }: { showBusinessPicker: boolean, setShowBusinessPicker: (show: boolean) => void }) => {
  const { memberships, switchBusiness, loading, businessId } = useBusinessContext();

  useEffect(() => {
    if (!loading && memberships.length === 1 && !businessId) {
      switchBusiness(memberships[0].business_id);
    }
  }, [loading, memberships, businessId, switchBusiness]);

  if (loading) return null;

  // Don't show business selection for patients - removed that flow
  if (memberships.length === 0) {
    return null;
  }

  if (memberships.length === 1) {
    return null;
  }

  return (
    <BusinessPickerDialog
      open={showBusinessPicker}
      onOpenChange={setShowBusinessPicker}
    />
  );
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
    return <ModernLoadingSpinner variant="overlay" message="Loading dashboard..." />;
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
      retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 5000), // Faster retries
    },
    mutations: {
      // Optimistic updates - UI updates immediately
      networkMode: 'offlineFirst',
      retry: 1,
    },
  },
});

const App = () => {
  const [showBusinessPicker, setShowBusinessPicker] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Initialize error reporting on mount
  useEffect(() => {
    initializeErrorReporting();
  }, []);

  useEffect(() => {
    // Check auth and show business picker if multi-business user or no business selected
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          const { data: memberships } = await supabase
            .from('business_members')
            .select('business_id')
            .eq('profile_id', profile.id);

          // Check if they have a current business selection
          const { data: sessionBusiness } = await supabase
            .from('session_business')
            .select('business_id')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Show business picker on login
          if (memberships && memberships.length > 0) {
            if (memberships.length > 1 && !sessionBusiness?.business_id) {
              // Providers with multiple clinics need to choose
              setTimeout(() => setShowBusinessPicker(true), 500);
            }
          } else if (!sessionBusiness?.business_id) {
            // Patient/guest: no clinic selected yet, show patient picker
            setTimeout(() => setShowBusinessPicker(true), 500);
          }

        }
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN') {
        checkAuth();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
                <PWAInstallPrompt />
                <ProfileCompletionDialog />
                <BrowserRouter>
                  <DentistInvitationDialog />
                  <CommandPalette />
                  <CookieConsent isAuthenticated={!!user} />
                  <OnboardingOrchestrator user={user} />
                  <SeoManager />
                  <Suspense fallback={<ModernLoadingSpinner variant="overlay" message="Loading..." />}>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      {/* Demo routes */}
                      <Route path="/demo/dentist" element={<DemoDentistDashboard />} />
                      {/* Auth routes */}
                      <Route path="/login" element={<Login />} />
                      <Route path="/signup" element={<Signup />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/create-business" element={<CreateBusiness />} />
                      <Route path="/onboarding" element={<Onboarding />} />
                      {/* Post-auth redirect handler */}
                      <Route path="/auth-redirect" element={<AuthRedirect />} />
                      {/* Role-based dashboard routing */}
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/patient/*" element={<Dashboard />} />
                      {/* Dentist routes with tab-based navigation */}
                      <Route path="/dentist/*" element={<RoleBasedRouter requiredRole='dentist'><DentistPortal /></RoleBasedRouter>} />
                      <Route path="/dentist-services" element={<RoleBasedRouter requiredRole='dentist'><DentistServices /></RoleBasedRouter>} />
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
                      <Route path="/support" element={<Support />} />
                      <Route path="/features/:id" element={<FeatureDetail />} />
                      <Route path="/language-test" element={<LanguageTest />} />
                      <Route path="/chat" element={<Chat />} />
                      <Route path="/messages" element={<Messages />} />
                      <Route path="/invite" element={<Invite />} />
                      <Route path="/claim" element={<Claim />} />
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/faq" element={<FAQ />} />
                      <Route path="/ai-info" element={<AIInfo />} />
                      <Route path="/google-calendar-callback" element={<GoogleCalendarCallback />} />
                      {/* Super Admin Dashboard */}
                      <Route path="/super-admin" element={<SuperAdminDashboard />} />
                      {/* Main booking route */}
                      <Route path="/book-appointment" element={<BookingRouteHandler><BookAppointmentAI /></BookingRouteHandler>} />
                      {/* Redirect old routes to main booking */}
                      <Route path="/book-appointment-legacy" element={<Navigate to="/book-appointment" replace />} />
                      <Route path="/book-appointment-ai" element={<Navigate to="/book-appointment" replace />} />
                      <Route path="/smart-book-appointment" element={<Navigate to="/book-appointment" replace />} />
                      {/* Business portal route - must come before catch-all */}
                      <Route path="/:slug" element={<BusinessPortal />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>

                  {/* Business Picker Dialog */}
                  <BusinessGate
                    showBusinessPicker={showBusinessPicker}
                    setShowBusinessPicker={setShowBusinessPicker}
                  />
                </BrowserRouter>
              </TooltipProvider>
            </BusinessProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
