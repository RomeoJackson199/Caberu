import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { InteractiveDentalChat } from "@/components/chat/InteractiveDentalChat";
import { SettingsPage } from "@/components/patients/SettingsPage";
import RealAppointmentsList from "@/components/RealAppointmentsList";
import { HealthData } from "@/components/HealthData";
import { PatientPaymentHistory } from "@/components/PatientPaymentHistory";
import { PatientAnalytics } from "@/components/analytics/PatientAnalytics";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Calendar, Activity, AlertTriangle, Stethoscope, Clock, BarChart3, User as UserIcon, Shield, Heart, Bell, FileText, Pill, Target, TrendingUp, CheckCircle, XCircle, Loader2, RefreshCw, Plus, Eye, FileImage, ClipboardList as ClipboardListIcon, CreditCard, Settings as SettingsIcon, Home, ChevronRight, ArrowRight, Sparkles, Phone, Video, MessageCircle, CalendarDays, FileCheck, AlertCircle, Zap, Users, BookOpen, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { MobileOptimizations } from "@/components/mobile/MobileOptimizations";
import { Prescription, TreatmentPlan, MedicalRecord, PatientNote } from "@/types/dental";
import { Appointment, UserProfile } from "@/types/common";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { PatientAppShell, PatientSection } from "@/components/patients/PatientAppShell";
import { HomeTab } from "@/components/patients/HomeTab";
import { PatientRecordsTimeline } from "@/components/patients/PatientRecordsTimeline";
import { AppointmentsTab } from "@/components/patients/AppointmentsTab";
import { PaymentsTab } from "@/components/patients/PaymentsTab";
import { withErrorBoundary } from "@/components/ErrorBoundary";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { logger } from '@/lib/logger';
import { useBusinessTemplate } from '@/hooks/useBusinessTemplate';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { formatClinicTime } from "@/lib/timezone";

const Messages = lazy(() => import("@/pages/Messages"));

interface PatientDashboardProps {
  user: User;
}

interface PatientStats {
  upcomingAppointments: number;
  completedAppointments: number;
  lastVisit: string | null;
  totalNotes: number;
  activeTreatmentPlans: number;
  totalPrescriptions: number;
  activePrescriptions: number;
}

// Navigation items with better organization
const getNavigationItems = (hasAIChat: boolean) => [{
  group: "Overview",
  items: [
    {
      id: 'overview',
      label: 'Dashboard',
      icon: Home,
      badge: null
    },
    {
      id: 'chat',
      label: hasAIChat ? 'AI Assistant' : 'Classic Booking',
      icon: hasAIChat ? MessageSquare : Calendar,
      badge: hasAIChat ? 'AI' : null
    }
  ]
}, {
  group: "Appointments",
  items: [{
    id: 'appointments',
    label: 'My Appointments',
    icon: Calendar,
    badge: null
  }]
}, {
  group: "Health Records",
  items: [{
    id: 'prescriptions',
    label: 'Prescriptions',
    icon: Pill,
    badge: null
  }, {
    id: 'treatment',
    label: 'Treatment Plans',
    icon: ClipboardListIcon,
    badge: null
  }, {
    id: 'records',
    label: 'Medical Records',
    icon: FileText,
    badge: null
  }, {
    id: 'notes',
    label: 'Clinical Notes',
    icon: FileCheck,
    badge: null
  }]
}, {
  group: "Financial",
  items: [{
    id: 'payments',
    label: 'Payment History',
    icon: CreditCard,
    badge: null
  }, {
    id: 'analytics',
    label: 'Health Analytics',
    icon: BarChart3,
    badge: null
  }]
}];

const PatientDashboardComponent = ({
  user
}: PatientDashboardProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { hasFeature, template } = useBusinessTemplate();
  const hasAIChat = hasFeature('aiChat');
  const navigationItems = getNavigationItems(hasAIChat);
  const { businessId, businessSlug } = useBusinessContext();
  type Tab = 'overview' | 'chat' | 'appointments' | 'prescriptions' | 'treatment' | 'records' | 'notes' | 'payments' | 'analytics' | 'test';
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    try {
      return localStorage.getItem('pd_tab') as Tab || 'overview';
    } catch {
      return 'overview';
    }
  });
  const [triggerBooking, setTriggerBooking] = useState<'low' | 'medium' | 'high' | false>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [patientStats, setPatientStats] = useState<PatientStats>({
    upcomingAppointments: 0,
    completedAppointments: 0,
    lastVisit: null,
    totalNotes: 0,
    activeTreatmentPlans: 0,
    totalPrescriptions: 0,
    activePrescriptions: 0
  });
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [patientNotes, setPatientNotes] = useState<PatientNote[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [activeSection, setActiveSection] = useState<PatientSection>(() => {
    try {
      return localStorage.getItem('pd_section') as PatientSection || 'home';
    } catch {
      return 'home';
    }
  });

  // Watch for custom section change events
  useEffect(() => {
    const handleSectionChange = (e: CustomEvent) => {
      if (e.detail?.section) {
        setActiveSection(e.detail.section);
      }
    };

    window.addEventListener('dashboard:changeSection' as any, handleSectionChange);

    return () => window.removeEventListener('dashboard:changeSection' as any, handleSectionChange);
  }, []);

  // Subscribe to real-time updates for medical records
  useEffect(() => {
    if (!userProfile?.id) return;
    const channel = supabase.channel('medical-records-updates').on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'medical_records',
      filter: `patient_id=eq.${userProfile.id}`
    }, payload => {
      // Add the new medical record to the list
      const newRecord = {
        ...payload.new,
        visit_date: payload.new.record_date
      } as MedicalRecord;
      setMedicalRecords(prev => [newRecord, ...prev]);

      // Show a toast notification
      toast({
        title: "New Medical Record",
        description: "A new medical record has been added to your file."
      });
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile?.id, toast]);
  const [showAssistant, setShowAssistant] = useState(false);
  const [totalDueCents, setTotalDueCents] = useState(0);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('pd_tab', activeTab);
    } catch {
      // Handle localStorage errors silently
    }
  }, [activeTab, user.id]);
  useEffect(() => {
    try {
      localStorage.setItem('pd_section', activeSection);
    } catch {
      void 0;
    }
  }, [activeSection]);

  // Clear classic booking flag when navigating away from assistant section
  useEffect(() => {
    if (activeSection !== 'assistant') {
      try {
        if (localStorage.getItem('pd_forceClassic') === '1') {
          localStorage.removeItem('pd_forceClassic');
        }
      } catch { }
    }
  }, [activeSection]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const {
        data: profile,
        error
      } = await supabase.from('secure_profiles_view').select('*').eq('user_id', user.id).maybeSingle();
      if (error) {
        console.error('Error fetching user profile:', error);
        setError(`Database error: ${error.message}`);
        return;
      }
      if (!profile) {
        // No profile exists for this user - create a basic one or handle gracefully
        console.warn('No profile found for user, creating basic profile...');

        // Try to create a basic profile from user data
        const {
          data: newProfile,
          error: createError
        } = await supabase.from('profiles').insert({
          user_id: user.id,
          email: user.email || '',
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
          role: 'patient'
        }).select().single();
        if (createError) {
          console.error('Error creating profile:', createError);
          setError(`Failed to create user profile: ${createError.message}`);
          return;
        }
        const { data: reloadedProfile, error: reloadError } = await supabase
          .from('secure_profiles_view')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (reloadError) {
          console.error('Error reloading profile:', reloadError);
          setError(`Failed to reload user profile: ${reloadError.message}`);
          return;
        }
        setUserProfile(reloadedProfile || newProfile);
      } else {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      setError(`Profile loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  const fetchPatientStats = async (profileId: string) => {
    try {
      // Fetch appointments
      const {
        data: appointmentsData
      } = await supabase.from('secure_appointments_view').select('*').eq('patient_id', profileId);
      const upcomingAppointments = appointmentsData?.filter(apt => new Date(apt.appointment_date) > new Date() && apt.status === 'confirmed').length || 0;
      const completedAppointments = appointmentsData?.filter(apt => apt.status === 'completed').length || 0;
      const lastVisit = appointmentsData?.filter(apt => apt.status === 'completed').sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())[0]?.appointment_date || null;

      // Fetch prescriptions
      const {
        data: prescriptionsData
      } = await supabase.from('prescriptions').select('*').eq('patient_id', profileId);
      const activePrescriptions = prescriptionsData?.filter(p => p.status === 'active').length || 0;

      const {
        data: treatmentPlansData
      } = await supabase.from('secure_treatment_plans_view').select('*').eq('patient_id', profileId);
      const activeTreatmentPlans = treatmentPlansData?.filter(tp => tp.status === 'active').length || 0;

      // Fetch patient notes
      const {
        data: notesData
      } = await supabase.from('secure_notes_view').select('*').eq('patient_id', profileId);
      setPatientStats({
        upcomingAppointments,
        completedAppointments,
        lastVisit,
        totalNotes: notesData?.length || 0,
        activeTreatmentPlans,
        totalPrescriptions: prescriptionsData?.length || 0,
        activePrescriptions
      });
    } catch (error) {
      console.error('Error fetching patient stats:', error);
    }
  };
  const fetchRecentAppointments = async (profileId: string) => {
    try {
      const {
        data: appointmentsData,
        error
      } = await supabase.from('secure_appointments_view').select(`
          *,
          dentists:dentist_id(
            specialization,
            profiles:profile_id(first_name, last_name)
          )
        `).eq('patient_id', profileId).order('appointment_date', {
        ascending: false
      }).limit(5);
      if (error) {
        console.error('❌ Error fetching appointments:', error);
        return;
      }
      const transformed = (appointmentsData || []).map(apt => ({
        ...apt,
        duration: apt.duration_minutes || 60,
        urgency_level: apt.urgency === 'emergency' ? 'urgent' : apt.urgency || 'normal',
        status: apt.status === 'pending' ? 'scheduled' : apt.status,
        // Transform the dentist data to match expected structure
        dentists: apt.dentists ? {
          first_name: apt.dentists.profiles?.first_name,
          last_name: apt.dentists.profiles?.last_name,
          specialization: apt.dentists.specialization
        } : undefined
      }));
      setRecentAppointments(transformed);
    } catch (error) {
      console.error('💥 Exception fetching recent appointments:', error);
    }
  };
  const fetchPatientData = async (profileId: string) => {
    try {
      // Fetch prescriptions
      const {
        data: prescriptionsData
      } = await supabase.from('prescriptions').select('*').eq('patient_id', profileId).order('prescribed_date', {
        ascending: false
      });
      setPrescriptions((prescriptionsData || []).map(prescription => ({
        ...prescription,
        duration: prescription.duration_days?.toString() || "7 days"
      })));

      const {
        data: treatmentPlansData
      } = await supabase.from('secure_treatment_plans_view').select('*').eq('patient_id', profileId).order('created_at', {
        ascending: false
      });
      setTreatmentPlans((treatmentPlansData || []).map(plan => ({
        ...plan,
        title: plan.title || "Treatment Plan",
        estimated_duration: plan.estimated_duration_weeks ? `${plan.estimated_duration_weeks} weeks` : "2 weeks"
      })));

      // Fetch medical records
      const {
        data: medicalRecordsData
      } = await supabase.from('secure_medical_records_view').select('*').eq('patient_id', profileId).order('record_date', {
        ascending: false
      });
      setMedicalRecords((medicalRecordsData || []).map(record => ({
        ...record,
        visit_date: record.record_date
      })));

      // Fetch patient notes
      const {
        data: notesData
      } = await supabase.from('secure_notes_view').select('*').eq('patient_id', profileId).order('created_at', {
        ascending: false
      });
      setPatientNotes(notesData || []);
    } catch (error) {
      console.error('Error fetching patient data:', error);
    }
  };
  const fetchTotalDue = useCallback(async (profileId: string) => {
    try {
      const {
        data,
        error
      } = await supabase.from('payment_requests').select('amount,status').eq('patient_id', profileId);
      if (error) throw error;
      const openStatuses = new Set(['pending', 'overdue']);
      const total = (data || []).filter(r => openStatuses.has(r.status)).reduce((sum, r: any) => sum + (r.amount || 0), 0);
      setTotalDueCents(total);
    } catch (e) {
      console.error('Failed to load payment totals', e);
    }
  }, []);

  // Use useCallback to memoize functions to prevent infinite re-renders
  const fetchUserProfileCallback = useCallback(fetchUserProfile, [user.id]);
  const fetchPatientStatsCallback = useCallback(fetchPatientStats, []);
  const fetchRecentAppointmentsCallback = useCallback(fetchRecentAppointments, []);
  const fetchPatientDataCallback = useCallback(fetchPatientData, []);
  useEffect(() => {
    fetchUserProfileCallback();
  }, [fetchUserProfileCallback]);
  useEffect(() => {
    if (userProfile?.id) {
      fetchPatientStatsCallback(userProfile.id);
      fetchRecentAppointmentsCallback(userProfile.id);
      fetchPatientDataCallback(userProfile.id);
      fetchTotalDue(userProfile.id);
    }
  }, [userProfile?.id, fetchPatientStatsCallback, fetchRecentAppointmentsCallback, fetchPatientDataCallback, fetchTotalDue]);
  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'active':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };
  if (loading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your dashboard...</p>
      </div>
    </div>;
  }
  if (error) {
    return <div className="flex items-center justify-center h-screen">
      <GlassCard className="max-w-md w-full">
        <GlassCardContent className="pt-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Dashboard</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchUserProfile}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>;
  }
  const nextAppointment = (() => {
    const now = new Date();
    const filtered = [...recentAppointments].filter(a => {
      const aptDate = new Date(a.appointment_date);
      const isFuture = aptDate > now;
      const hasValidStatus = ['confirmed', 'scheduled', 'pending'].includes(a.status);
      return isFuture && hasValidStatus;
    }).sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());
    const next = filtered[0] || null;
    return next;
  })();
  // Care items no longer needed - using PatientRecordsTimeline directly
  const badges = {
    home: false,
    assistant: false,
    care: patientStats.activePrescriptions > 0 || patientStats.activeTreatmentPlans > 0,
    appointments: patientStats.upcomingAppointments > 0,
    payments: totalDueCents > 0,
    settings: !userProfile?.first_name || !userProfile?.last_name
  } as Record<PatientSection, boolean>;
  return <PatientAppShell
    activeSection={activeSection}
    onChangeSection={setActiveSection}
    badges={badges}
    userId={user.id}
    hasAIChat={hasAIChat}
    onBookAppointment={() => setActiveSection('assistant')}
  >
    {activeSection === 'home' && <HomeTab userId={user.id} firstName={userProfile?.first_name} nextAppointment={nextAppointment ? (() => {
      const appointmentDetails = nextAppointment as unknown as Record<string, any>;
      const joinUrl = appointmentDetails.meeting_url || appointmentDetails.join_url || appointmentDetails.telehealth_url || appointmentDetails.virtual_meeting_url || appointmentDetails.video_url || appointmentDetails.video_meeting_url || appointmentDetails.conference_url || null;
      const rawVisitType = appointmentDetails.visit_type || appointmentDetails.type || appointmentDetails.appointment_type || appointmentDetails.mode || appointmentDetails.format || appointmentDetails.channel || '';
      const normalizedVisitType = typeof rawVisitType === 'string' ? rawVisitType.toLowerCase() : '';
      const baseIsVirtual = appointmentDetails.is_virtual ?? appointmentDetails.virtual ?? appointmentDetails.is_online ?? appointmentDetails.telehealth;
      const derivedIsVirtual = normalizedVisitType ? normalizedVisitType.includes('virtual') || normalizedVisitType.includes('tele') || normalizedVisitType.includes('online') || normalizedVisitType.includes('remote') : false;
      const isVirtual = Boolean(baseIsVirtual ?? (derivedIsVirtual || joinUrl));
      const location = appointmentDetails.location || appointmentDetails.location_description || appointmentDetails.clinic_location || appointmentDetails.address || appointmentDetails.office || appointmentDetails.meeting_location || null;
      return {
        id: nextAppointment.id,
        date: formatClinicTime(nextAppointment.appointment_date, 'PPP'),
        time: formatClinicTime(nextAppointment.appointment_date, 'HH:mm'),
        dentistName: undefined,
        status: nextAppointment.status,
        isVirtual,
        joinUrl,
        location,
        visitType: typeof rawVisitType === 'string' ? rawVisitType : undefined
      };
    })() : null} activePrescriptions={patientStats.activePrescriptions} activeTreatmentPlans={patientStats.activeTreatmentPlans} totalDueCents={totalDueCents} onNavigateTo={s => setActiveSection(s)} onOpenAssistant={() => setActiveSection('assistant')} onBookAppointment={() => setActiveSection('assistant')} />}

    {activeSection === 'assistant' && (
      <div className="px-4 md:px-6 py-4">
        <GlassCard>
          <GlassCardContent>
            <div className="h-[70vh]">
              <InteractiveDentalChat user={user} triggerBooking={triggerBooking} />
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>
    )}


    {activeSection === 'messages' && (
      <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <Messages />
      </Suspense>
    )}

    {activeSection === 'care' && userProfile?.id && (
      <div className="px-4 md:px-6 py-4">
        <PatientRecordsTimeline patientId={userProfile.id} />
      </div>
    )}

    {activeSection === 'appointments' && <AppointmentsTab user={user} onOpenAssistant={() => setActiveSection('assistant')} />}

    {activeSection === 'payments' && userProfile?.id && <PaymentsTab patientId={userProfile.id} totalDueCents={totalDueCents} />}

    {activeSection === 'settings' && <SettingsPage user={user} />}

    <Dialog open={showAssistant} onOpenChange={setShowAssistant}>
      <DialogContent className="p-0 max-w-3xl w-full">
        <div className="h-[80vh]">
          {hasAIChat && <InteractiveDentalChat user={user} triggerBooking={triggerBooking} />}
        </div>
      </DialogContent>
    </Dialog>
  </PatientAppShell>;
};

// Export with error boundary for better stability
export const PatientDashboard = withErrorBoundary(PatientDashboardComponent);
