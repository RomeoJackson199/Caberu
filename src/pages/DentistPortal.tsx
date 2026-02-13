import { useState, useEffect, lazy, Suspense } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { DentistAppShell, DentistSection } from "@/components/layout/DentistAppShell";
import { useBusinessTemplate } from "@/hooks/useBusinessTemplate";
import { useBusinessSubscription } from "@/hooks/useBusinessSubscription";
import { SubscriptionExpiredDialog } from "@/components/subscription/SubscriptionExpiredDialog";
import { DentistPortalSkeleton } from "@/components/dentist/DentistPortalSkeleton";
import { useLanguage } from "@/hooks/useLanguage";

// Import components
import { ClinicalToday } from "@/components/ClinicalToday";
import { DentistPatientManagement } from "@/components/dentist-patients";
import { AvailabilitySettings } from "@/components/AvailabilitySettings";
import { PaymentRequestManager } from "@/components/PaymentRequestManager";
// Lazy load analytics (includes heavy chart library ~400KB)
const DentistAnalytics = lazy(() => import("@/components/analytics/DentistAnalytics").then(m => ({ default: m.DentistAnalytics })));
// Inventory removed
import DataImportManager from "@/components/DataImportManager";
import DentistAdminBranding from "./DentistAdminBranding";
import DentistAdminSecurity from "./DentistAdminSecurity";
import DentistAdminUsers from "./DentistAdminUsers";
import DentistTeamManagement from "./DentistTeamManagement";
import DentistSettings from "./DentistSettings";
import DentistAdminAnalytics from "./DentistAdminAnalytics";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import DentistAppointmentsManagement from "./DentistAppointmentsManagement";
import { InviteDentistDialog } from "@/components/InviteDentistDialog";
import { useBusinessContext } from "@/hooks/useBusinessContext";
// Lazy load Messages component for better code splitting
const Messages = lazy(() => import("./Messages"));
import { ServiceManager } from "@/components/services/ServiceManager";
import { UserTour, useUserTour } from "@/components/UserTour";
import { DentistDemoTour } from "@/components/DentistDemoTour";
import { OnboardingProgressTracker } from "@/components/onboarding/OnboardingProgressTracker";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DentistPortalProps {
  user?: User | null;
}

export function DentistPortal({ user: userProp }: DentistPortalProps) {
  const [activeSection, setActiveSection] = useState<DentistSection>('dashboard');
  const [dentistId, setDentistId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(userProp || null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useLanguage();
  const [badges, setBadges] = useState<Partial<Record<DentistSection, number>>>({});
  const location = useLocation();
  const navigate = useNavigate();
  const [businessInfo, setBusinessInfo] = useState<{ id: string; name: string } | null>(null);
  const { template, hasFeature, loading: templateLoading } = useBusinessTemplate();
  const { isActive: hasActiveSubscription, loading: subscriptionLoading, status: subscriptionStatus, endsAt: subscriptionEndsAt } = useBusinessSubscription();
  const { showTour, closeTour } = useUserTour("dentist");
  const [showDemoTour, setShowDemoTour] = useState(false);
  const [tourCompleted, setTourCompleted] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  const isTourMarkedCompleted = () => {
    return (
      localStorage.getItem('dentist-tour-completed') === 'true' ||
      localStorage.getItem('tour_completed_dentist') === 'true'
    );
  };

  // Listen for onboarding completion event from OnboardingOrchestrator
  useEffect(() => {
    const handleOnboardingCompleted = () => {
      setOnboardingCompleted(true);
    };
    window.addEventListener('onboarding-completed', handleOnboardingCompleted);
    return () => window.removeEventListener('onboarding-completed', handleOnboardingCompleted);
  }, []);

  // Check if tour has been completed and if it should auto-start
  useEffect(() => {
    setTourCompleted(isTourMarkedCompleted());

    // Wait until onboarding has finished before auto-starting product tour
    if (onboardingCompleted !== true) return;

    const shouldStartTour = localStorage.getItem('should-start-tour') === 'true';
    if (shouldStartTour && !isTourMarkedCompleted()) {
      // Small delay to ensure the page is fully loaded
      setTimeout(() => {
        setShowDemoTour(true);
        localStorage.removeItem('should-start-tour'); // Clear the flag
      }, 1500);
    }
  }, [onboardingCompleted]);

  // Handle URL-based section navigation
  useEffect(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      const sectionFromUrl = pathParts[1]; // Gets 'patients' from '/dentist/patients'

      const validSections: DentistSection[] = [
        'dashboard', 'patients', 'appointments', 'employees', 'messages', 'clinical',
        'schedule', 'payments', 'analytics', 'reports',
        'imports', 'users', 'team', 'branding', 'security', 'settings', 'services',
        'admin-analytics'
      ];

      if (validSections.includes(sectionFromUrl as DentistSection)) {
        setActiveSection(sectionFromUrl as DentistSection);
      }
    }
  }, [location.pathname]);

  // Helper function to navigate to a section with URL update
  const navigateToSection = (section: DentistSection) => {
    navigate(`/dentist/${section}`);
  };

  useEffect(() => {
    const getUser = async () => {
      if (userProp) {
        setUser(userProp);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [userProp]);

  useEffect(() => {
    if (user) {
      fetchDentistProfile();
      fetchBusinessInfo();
    }
  }, [user]);

  const fetchBusinessInfo = async () => {
    const businessId = sessionStorage.getItem('selected_business_id');
    if (!businessId) return;

    const { data } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('id', businessId)
      .single();

    if (data) setBusinessInfo(data);
  };

  const fetchDentistProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, onboarding_completed')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        logger.error('❌ Profile error:', profileError);
        throw profileError;
      }
      setOnboardingCompleted(profile?.onboarding_completed === true);

      if (!profile) {
        logger.error('❌ No profile found for user:', user.id);
        throw new Error('Profile not found');
      }

      let { data: dentist, error: dentistError } = await supabase
        .from('dentists')
        .select('id, is_active')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (dentistError) {
        logger.error('❌ Dentist error:', dentistError);
        throw dentistError;
      }

      if (!dentist) {
        logger.info('DentistPortal: No dentist record found, creating...');
        const { data: newDentist, error: insertError } = await supabase
          .from('dentists')
          .insert({ profile_id: profile.id, is_active: true })
          .select('id, is_active')
          .single();

        if (insertError) {
          logger.error('❌ Failed to create dentist record:', insertError);
          throw new Error('Failed to create dentist record. Please contact support.');
        }
        dentist = newDentist;
        logger.info('✅ Dentist record created');
      } else if (!dentist.is_active) {
        logger.warn('⚠️ Dentist inactive - activating');
        await supabase
          .from('dentists')
          .update({ is_active: true })
          .eq('id', dentist.id);
      }

      setDentistId(dentist.id);

      // Fetch badge counts
      const { data: payments } = await supabase
        .from('payment_requests')
        .select('id')
        .eq('dentist_id', dentist.id)
        .eq('status', 'overdue');

      setBadges({
        payments: (payments || []).length,
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || templateLoading || subscriptionLoading) {
    return <DentistPortalSkeleton />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!dentistId) {
    return <LoadingSpinner variant="card" message={t.accessDenied || "Access Denied"} description={t.notRegisteredAsDentist} />;
  }

  const renderContent = () => {
    // If no active subscription and not on settings, show popup
    if (!hasActiveSubscription && activeSection !== 'settings') {
      return (
        <SubscriptionExpiredDialog
          planName={subscriptionStatus === 'cancelling' ? 'subscription' : 'subscription'}
          onReactivate={() => {
            // Navigate to settings with billing tab
            navigate('/dentist/settings?tab=billing');
          }}
          onLogout={async () => {
            await supabase.auth.signOut();
            window.location.href = '/';
          }}
        />
      );
    }

    // If trying to access clinical section without medical features, redirect to dashboard
    if (activeSection === 'clinical' && !hasFeature('medicalRecords') && !hasFeature('prescriptions') && !hasFeature('treatmentPlans')) {
      navigateToSection('dashboard');
      return <LoadingSpinner variant="card" message={t.loading} />;
    }

    switch (activeSection) {
      case 'dashboard':
        return <ClinicalToday dentistId={dentistId} user={user} onOpenPatientsTab={() => navigateToSection('patients')} onOpenAppointmentsTab={() => navigateToSection('appointments')} />;
      case 'patients':
        return <DentistPatientManagement dentistId={dentistId} />;
      case 'appointments':
        return <DentistAppointmentsManagement />;
      case 'employees':
        return <DentistAdminUsers />;
      case 'messages':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <Messages />
          </Suspense>
        );
      case 'clinical':
        // Only render clinical if medical features are enabled
        if (hasFeature('medicalRecords') || hasFeature('prescriptions') || hasFeature('treatmentPlans')) {
          return <ClinicalToday dentistId={dentistId} user={user} onOpenPatientsTab={() => navigateToSection('patients')} onOpenAppointmentsTab={() => navigateToSection('appointments')} />;
        }
        return <div className="p-4">{t.clinicalNotAvailable || "Clinical features not available for this business type"}</div>;
      case 'schedule':
        return <AvailabilitySettings dentistId={dentistId} />;
      case 'payments':
        return hasFeature('paymentRequests') ? <PaymentRequestManager dentistId={dentistId} /> : <div className="p-4">{t.paymentNotAvailable || "Payment features not available"}</div>;
      case 'analytics':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <DentistAnalytics
              dentistId={dentistId}
              onOpenPatientsTab={() => navigateToSection('patients')}
              onOpenClinicalTab={() => navigateToSection('clinical')}
              onOpenPaymentsTab={() => navigateToSection('payments')}
            />
          </Suspense>
        );
      case 'reports':
        return <div className="p-4">{t.reportsComingSoon || "Reports (Coming Soon)"}</div>;
      case 'imports':
        return <DataImportManager />;
      case 'users':
        return <DentistAdminUsers />;
      case 'team':
        return <DentistTeamManagement />;
      case 'branding':
        return <DentistAdminBranding />;
      case 'security':
        return <DentistAdminSecurity />;
      case 'settings':
        return <DentistSettings />;
      case 'services':
        return <ServiceManager />;
      case 'admin-analytics':
        return <DentistAdminAnalytics />;
      default:
        return <div className="p-4">{t.sectionNotFound || "Section not found"}</div>;
    }
  };

  return (
    <DentistAppShell
      activeSection={activeSection}
      onChangeSection={navigateToSection}
      badges={badges}
      dentistId={dentistId}
    >
      <div className="space-y-4">
        {/* Demo Tour Trigger Button - Hide after completion */}
        {!tourCompleted && (
          <div className="flex justify-end px-6 pt-4">
            <Button
              onClick={() => setShowDemoTour(true)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <HelpCircle className="h-4 w-4" />
              {t.startTour || "Start Tour"}
            </Button>
          </div>
        )}
        {activeSection === 'users' && businessInfo && (
          <div className="flex justify-end mb-4">
            <InviteDentistDialog
              businessId={businessInfo.id}
              businessName={businessInfo.name}
            />
          </div>
        )}
        {activeSection === 'team' && businessInfo && (
          <div className="flex justify-end mb-4">
            <InviteDentistDialog
              businessId={businessInfo.id}
              businessName={businessInfo.name}
            />
          </div>
        )}
        {renderContent()}
      </div>

      {/* User Tour */}
      <UserTour
        isOpen={showTour}
        onClose={() => {
          closeTour();
          setTourCompleted(isTourMarkedCompleted());
        }}
        userRole="dentist"
      />

      {/* Demo Tour */}
      <DentistDemoTour
        run={showDemoTour}
        onClose={() => {
          setShowDemoTour(false);
          // Refresh tour completed state
          setTourCompleted(isTourMarkedCompleted());
        }}
        onChangeSection={(section) => navigateToSection(section as DentistSection)}
      />

      {/* Onboarding Progress Tracker - only show after onboarding flow is complete */}
      {user && businessInfo && onboardingCompleted === true && (
        <OnboardingProgressTracker
          userId={user.id}
          businessId={businessInfo.id}
          onStartTour={() => setShowDemoTour(true)}
        />
      )}
    </DentistAppShell>
  );
}

export default DentistPortal;