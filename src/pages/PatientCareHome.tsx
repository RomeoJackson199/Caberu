import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { Calendar, Clock, FileText, Heart, Activity, MessageSquare, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { showEnhancedErrorToast } from "@/lib/enhancedErrorHandling";
import { useTemplate } from "@/contexts/TemplateContext";
import { TimeGreeting, QuickActions, AnimatedStatCard } from "@/components/ui/page-enhancements";
import { motion, AnimatePresence } from "framer-motion";
import { ErrorState, EmptyState } from "@/components/stability";
import { getProviderName } from "@/lib/dataValidation";

interface Appointment {
  id: string;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  reason?: string;
  dentists?: {
    profiles?: {
      first_name: string;
      last_name: string;
    };
  };
}

interface PatientStats {
  upcomingAppointments: number;
  totalAppointments: number;
  activePrescriptions: number;
}

export default function PatientCareHome() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { hasFeature } = useTemplate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ type: "network" | "auth" | "generic"; message?: string } | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<PatientStats>({
    upcomingAppointments: 0,
    totalAppointments: 0,
    activePrescriptions: 0,
  });
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    fetchPatientData();
  }, []);

  const fetchPatientData = useCallback(async (isRetry = false) => {
    try {
      if (isRetry) {
        setRetrying(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        setError({ type: "auth", message: "Please log in again to continue." });
        setLoading(false);
        setRetrying(false);
        return;
      }

      if (!user) {
        setError({ type: "auth", message: "Please log in to view your dashboard." });
        setLoading(false);
        setRetrying(false);
        return;
      }

      setUser(user);

      // Get patient profile
      const { data: profile, error: profileError } = await supabase
        .from('secure_profiles_view')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        if (profileError.message?.includes('fetch') || profileError.message?.includes('network')) {
          setError({ type: "network", message: "Unable to connect. Please check your internet connection." });
        } else {
          setError({ type: "generic", message: "Unable to load your profile. Please try again." });
        }
        setLoading(false);
        setRetrying(false);
        return;
      }

      if (!profile) {
        setLoading(false);
        setRetrying(false);
        return;
      }

      // Fetch data in parallel after getting profile
      const [appointmentsResult, totalCountResult, prescriptionCountResult] = await Promise.allSettled([
        supabase
          .from('appointments_decrypted')
          .select(`
            id,
            appointment_date,
            duration_minutes,
            status,
            reason,
            dentists (
              profiles (
                first_name,
                last_name
              )
            )
          `)
          .eq('patient_id', profile.id)
          .gte('appointment_date', new Date().toISOString())
          .order('appointment_date', { ascending: true })
          .limit(3),
        supabase
          .from('appointments_decrypted')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', profile.id),
        supabase
          .from('prescriptions')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', profile.id)
          .eq('status', 'active')
      ]);

      // Extract results with graceful fallbacks
      const appointments = appointmentsResult.status === 'fulfilled' ? appointmentsResult.value.data : null;
      const totalCount = totalCountResult.status === 'fulfilled' ? totalCountResult.value.count : 0;
      const prescriptionCount = prescriptionCountResult.status === 'fulfilled' ? prescriptionCountResult.value.count : 0;

      // Transform appointments to match expected type
      const transformedAppointments = (appointments || []).map(apt => ({
        ...apt,
        dentists: Array.isArray(apt.dentists) && apt.dentists.length > 0
          ? {
            profiles: Array.isArray(apt.dentists[0].profiles)
              ? apt.dentists[0].profiles[0]
              : apt.dentists[0].profiles
          }
          : undefined
      }));

      setUpcomingAppointments(transformedAppointments);

      setStats({
        upcomingAppointments: appointments?.length || 0,
        totalAppointments: totalCount || 0,
        activePrescriptions: prescriptionCount || 0,
      });

      setLastRefresh(new Date());
      setError(null);

    } catch (error: any) {
      const isNetworkError = error?.message?.includes('fetch') ||
                            error?.message?.includes('network') ||
                            error?.message?.includes('Failed to fetch');

      if (isNetworkError) {
        setError({ type: "network", message: "Connection lost. Please check your internet and try again." });
      } else {
        setError({ type: "generic", message: "Something went wrong. Please try again." });
      }

      showEnhancedErrorToast(error, {
        component: 'PatientCareHome',
        action: 'fetchPatientData',
      });
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);

  const handleRetry = useCallback(() => {
    fetchPatientData(true);
  }, [fetchPatientData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const quickActions = [
    {
      icon: Calendar,
      label: t.bookAppointment || "Book Appointment",
      description: "Schedule a new appointment",
      onClick: () => { try { localStorage.setItem('pd_section', 'assistant'); } catch (e) { console.error('Failed to save section preference:', e); } window.dispatchEvent(new CustomEvent('dashboard:changeSection', { detail: { section: 'assistant' } })); navigate('/dashboard'); },
      color: "text-blue-600",
      bgColor: "bg-blue-50 hover:bg-blue-100",
    },
    ...(hasFeature('medicalRecords') || hasFeature('treatmentPlans') ? [{
      icon: FileText,
      label: "Medical Records",
      description: "View your health history",
      onClick: () => navigate('/care/history'),
      color: "text-purple-600",
      bgColor: "bg-purple-50 hover:bg-purple-100",
    }] : []),
    ...(hasFeature('aiChat') ? [{
      icon: MessageSquare,
      label: "AI Dental Assistant",
      description: "Get instant answers",
      onClick: () => navigate('/chat'),
      color: "text-green-600",
      bgColor: "bg-green-50 hover:bg-green-100",
    }] : []),
    {
      icon: AlertCircle,
      label: "Emergency Care",
      description: "Urgent dental issues",
      onClick: () => navigate('/book-appointment?emergency=true'),
      color: "text-red-600",
      bgColor: "bg-red-50 hover:bg-red-100",
    },
  ];

  // Show error state if there's an error and not loading
  if (error && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <TimeGreeting
            name={user?.user_metadata?.first_name}
            showDate={true}
          />
        </div>
        <ErrorState
          type={error.type}
          message={error.message}
          onRetry={handleRetry}
          retrying={retrying}
          onGoHome={() => navigate("/")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with TimeGreeting */}
      <div className="flex items-center justify-between">
        <TimeGreeting 
          name={user?.user_metadata?.first_name} 
          showDate={true} 
        />
        <Button
          size="lg"
          className="gap-2"
          onClick={() => { try { localStorage.setItem('pd_section', 'assistant'); } catch (e) { console.error('Failed to save section preference:', e); } window.dispatchEvent(new CustomEvent('dashboard:changeSection', { detail: { section: 'assistant' } })); navigate('/dashboard'); }}
          aria-label={t.bookAppointment}
        >
          <Calendar className="h-4 w-4" />
          {t.bookAppointment || "Book Appointment"}
        </Button>
      </div>

      {/* Stats Cards with AnimatedStatCard */}
      {loading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatedStatCard
            title="Upcoming"
            value={stats.upcomingAppointments}
            icon={Calendar}
            gradient="from-blue-500 to-cyan-500"
            suffix=" Appointments"
          />
          <AnimatedStatCard
            title="Total Visits"
            value={stats.totalAppointments}
            icon={Activity}
            gradient="from-purple-500 to-pink-500"
            suffix=" All time"
          />
          <AnimatedStatCard
            title="Active"
            value={stats.activePrescriptions}
            icon={Heart}
            gradient="from-green-500 to-emerald-500"
            suffix=" Prescriptions"
          />
        </div>
      )}

      {/* Quick Actions with QuickActions component */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <QuickActions 
          actions={quickActions.map(action => ({
            icon: action.icon,
            label: action.label,
            description: action.description,
            onClick: action.onClick,
            color: action.bgColor.includes('blue') ? 'bg-blue-500' : 
                   action.bgColor.includes('purple') ? 'bg-purple-500' :
                   action.bgColor.includes('green') ? 'bg-green-500' :
                   action.bgColor.includes('red') ? 'bg-red-500' : 'bg-primary'
          }))}
          columns={4}
        />
      </div>

      {/* Upcoming Appointments */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Upcoming Appointments</h2>
          {upcomingAppointments.length > 0 && (
            <Button
              variant="link"
              onClick={() => navigate('/care/appointments')}
              aria-label="View all appointments"
            >
              View all
            </Button>
          )}
        </div>

        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {[...Array(2)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-20 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <Skeleton className="h-9 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        ) : upcomingAppointments.length > 0 ? (
          <div className="space-y-3">
            {upcomingAppointments.map((appointment) => (
              <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                        {appointment.reason && (
                          <span className="text-sm font-medium">{appointment.reason}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(appointment.appointment_date), 'MMMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{format(new Date(appointment.appointment_date), 'h:mm a')}</span>
                        </div>
                      </div>
                      {appointment.dentists && (
                        <p className="text-sm mt-2">
                          with Dr. {getProviderName(appointment.dentists)}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/care/appointments`)}
                      aria-label="View appointment details"
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You don't have any upcoming appointments. Book one now to get started!
                </AlertDescription>
              </Alert>
              <Button
                className="mt-4 w-full"
                onClick={() => { try { localStorage.setItem('pd_section', 'assistant'); } catch (e) { console.error('Failed to save section preference:', e); } window.dispatchEvent(new CustomEvent('dashboard:changeSection', { detail: { section: 'assistant' } })); navigate('/dashboard'); }}
                aria-label="Book your first appointment"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Book Your First Appointment
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Health Tips */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-0">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-blue-600" />
            <CardTitle>Dental Health Tip</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Remember to brush twice daily and floss at least once a day. Regular dental check-ups every 6 months help prevent serious dental issues.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

