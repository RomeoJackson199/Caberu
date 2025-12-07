import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { Calendar, Clock, FileText, Heart, Activity, MessageSquare, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { showEnhancedErrorToast } from "@/lib/enhancedErrorHandling";
import { useTemplate } from "@/contexts/TemplateContext";

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
  const [user, setUser] = useState<any>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<PatientStats>({
    upcomingAppointments: 0,
    totalAppointments: 0,
    activePrescriptions: 0,
  });

  useEffect(() => {
    fetchPatientData();
  }, []);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUser(user);

      // Get patient profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

      // Fetch data in parallel after getting profile
      const [appointmentsResult, totalCountResult, prescriptionCountResult] = await Promise.allSettled([
        supabase
          .from('appointments')
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
          .from('appointments')
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

    } catch (error) {
      showEnhancedErrorToast(error, {
        component: 'PatientCareHome',
        action: 'fetchPatientData',
      });
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {user ? `Welcome back, ${user.user_metadata?.first_name || 'Patient'}!` : 'Welcome'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here's your dental care overview
          </p>
        </div>
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

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
                  <p className="text-3xl font-bold mt-1">{stats.upcomingAppointments}</p>
                  <p className="text-xs text-muted-foreground mt-1">Appointments</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Visits</p>
                  <p className="text-3xl font-bold mt-1">{stats.totalAppointments}</p>
                  <p className="text-xs text-muted-foreground mt-1">All time</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active</p>
                  <p className="text-3xl font-bold mt-1">{stats.activePrescriptions}</p>
                  <p className="text-xs text-muted-foreground mt-1">Prescriptions</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Heart className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Card
              key={index}
              className={`cursor-pointer transition-all ${action.bgColor} border-0`}
              onClick={action.onClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  action.onClick();
                }
              }}
              aria-label={action.label}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className={`h-12 w-12 rounded-full bg-white flex items-center justify-center`}>
                    <action.icon className={`h-6 w-6 ${action.color}`} />
                  </div>
                  <h3 className="font-semibold">{action.label}</h3>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
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
                      {appointment.dentists?.profiles && (
                        <p className="text-sm mt-2">
                          with Dr. {appointment.dentists.profiles.first_name} {appointment.dentists.profiles.last_name}
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

