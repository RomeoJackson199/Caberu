import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarDays, Clock, User as UserIcon, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import { ReviewDialog } from "@/components/ReviewDialog";
import { logger } from '@/lib/logger';
import { formatClinicTime } from "@/lib/timezone";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";

interface Appointment {
  id: string;
  appointment_date: string;
  reason: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  notes?: string;
  dentist: {
    id: string;
    specialization?: string;
    profile: {
      id: string;
      first_name: string;
      last_name: string;
      phone?: string;
      profile_picture_url?: string;
    };
  };
}

interface AppointmentsListProps {
  user: User;
}

export const AppointmentsList = ({ user }: AppointmentsListProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, language } = useLanguage();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [reviewedAppointments, setReviewedAppointments] = useState<Set<string>>(new Set());
  const [filterTab, setFilterTab] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const [showAll, setShowAll] = useState(false);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);

      // Get user profile first
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        return;
      }

      setProfileId(profile.id);

      // Fetch existing reviews for this patient
      const { data: reviewData } = await supabase
        .from("dentist_ratings")
        .select("appointment_id")
        .eq("patient_id", profile.id);
      if (reviewData) {
        setReviewedAppointments(new Set(reviewData.map(r => r.appointment_id)));
      }

      // Fetch appointments with dentist information
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          reason,
          status,
          urgency,
          notes,
          dentists:dentist_id (
            id,
            specialty,
            profiles:profile_id (
              id,
              first_name,
              last_name,
              phone,
              profile_picture_url
            )
          )
        `)
        .eq("patient_id", profile.id)
        .order("appointment_date", { ascending: false });

      if (error) {
        console.error("Error fetching appointments:", error);
        toast.error("Failed to load appointments");
        return;
      }

      // Transform the data to match our interface
      const transformedAppointments = data?.map((apt: any) => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        reason: apt.reason,
        status: apt.status,
        urgency: apt.urgency,
        notes: apt.notes,
        dentist: {
          id: apt.dentists.id,
          specialty: apt.dentists.specialty,
          profile: {
            id: apt.dentists.profiles.id,
            first_name: apt.dentists.profiles.first_name,
            last_name: apt.dentists.profiles.last_name,
            phone: apt.dentists.profiles.phone
          }
        }
      })) || [];

      setAppointments(transformedAppointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const cancelAppointment = async (appointmentId: string) => {
    try {
      // First release the appointment slot
      const { error: slotError } = await supabase.rpc('release_appointment_slot', {
        p_appointment_id: appointmentId
      });

      if (slotError) {
        console.error("Error releasing slot:", slotError);
        // Continue with cancellation even if slot release fails
      }

      // Cancel the appointment
      const { data, error } = await supabase.rpc('cancel_appointment', {
        appointment_id: appointmentId,
        user_id: user.id
      });

      if (error) throw error;

      if (data) {
        toast.success(t.appointmentCancelled);
        fetchAppointments(); // Refresh the list
      } else {
        toast.error(t.failedToCancelAppointment);
      }
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast.error(t.failedToCancelAppointment);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDateTime = (dateString: string) => {
    // Use clinic timezone formatting for correct display
    const dateFormat = language === 'en' ? 'EEEE, MMMM d, yyyy' : 'EEEE d MMMM yyyy';
    const timeFormat = language === 'en' ? 'h:mm a' : 'HH:mm';
    
    return {
      date: formatClinicTime(dateString, dateFormat),
      time: formatClinicTime(dateString, timeFormat)
    };
  };

  const isUpcoming = (dateString: string) => {
    return new Date(dateString) > new Date();
  };

  // Filter appointments based on selected tab
  const getFilteredAppointments = () => {
    let filtered = appointments;

    switch (filterTab) {
      case 'upcoming':
        filtered = appointments.filter(apt => isUpcoming(apt.appointment_date) && apt.status !== 'cancelled');
        break;
      case 'completed':
        filtered = appointments.filter(apt => apt.status === 'completed');
        break;
      case 'cancelled':
        filtered = appointments.filter(apt => apt.status === 'cancelled');
        break;
      default:
        filtered = appointments;
    }

    return filtered;
  };

  const filteredAppointments = getFilteredAppointments();
  const displayedAppointments = showAll ? filteredAppointments : filteredAppointments.slice(0, 10);

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/30 border-t-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header with Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl font-bold">{t.myAppointments}</CardTitle>
              </div>
              <Badge variant="secondary" className="rounded-full">
                {appointments.length}
              </Badge>
            </div>
            <Button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t.newAppointment}
            </Button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mt-4 flex-wrap">
            <Button
              variant={filterTab === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterTab('all')}
              className="rounded-full"
            >
              {t.all || 'All'}
            </Button>
            <Button
              variant={filterTab === 'upcoming' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterTab('upcoming')}
              className="rounded-full"
            >
              {t.upcoming}
            </Button>
            <Button
              variant={filterTab === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterTab('completed')}
              className="rounded-full"
            >
              {t.completed}
            </Button>
            <Button
              variant={filterTab === 'cancelled' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterTab('cancelled')}
              className="rounded-full"
            >
              {t.cancelled}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Appointments List */}
      {displayedAppointments.length > 0 ? (
        <div className="space-y-3">
          {displayedAppointments.map((appointment, index) => {
            const { date, time } = formatDateTime(appointment.appointment_date);
            const isUpcomingAppt = isUpcoming(appointment.appointment_date);

            return (
              <Card
                key={appointment.id}
                className="hover:shadow-md transition-shadow border-l-4 border-l-primary/50"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Left Section - Date, Time, Patient */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-baseline gap-2">
                        <h3 className="font-semibold text-lg">{date}</h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{time} • 60 minutes</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={appointment.dentist.profile.profile_picture_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {appointment.dentist.profile.first_name?.[0]}{appointment.dentist.profile.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          Dr. {appointment.dentist.profile.first_name} {appointment.dentist.profile.last_name}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {appointment.reason || t.generalConsultation}
                      </p>
                    </div>

                    {/* Right Section - Status & Actions */}
                    <div className="flex flex-col sm:items-end gap-3">
                      <Badge
                        className={`${getStatusColor(appointment.status)} w-fit`}
                      >
                        {appointment.status}
                      </Badge>

                      {isUpcomingAppt && appointment.status !== 'cancelled' && (
                        <div className="flex gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-destructive text-destructive hover:bg-destructive/10"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t.cancelAppointmentTitle || 'Cancel Appointment'}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t.cancelAppointmentConfirm || 'Are you sure you want to cancel this appointment? This action cannot be undone.'}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t.goBack || 'Go Back'}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => cancelAppointment(appointment.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  {t.confirmCancellation}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}

                      {appointment.status === 'completed' && profileId && !reviewedAppointments.has(appointment.id) && (
                        <ReviewDialog
                          appointmentId={appointment.id}
                          dentistId={appointment.dentist.id}
                          patientId={profileId}
                          onSubmitted={() => {
                            setReviewedAppointments(prev => new Set([...prev, appointment.id]));
                            fetchAppointments();
                          }}
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      {/* View More Button */}
      {!showAll && filteredAppointments.length > 10 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setShowAll(true)}
            className="w-full sm:w-auto"
          >
            View More ({filteredAppointments.length - 10} more)
          </Button>
        </div>
      )}

      {showAll && filteredAppointments.length > 10 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setShowAll(false)}
            className="w-full sm:w-auto"
          >
            Show Less
          </Button>
        </div>
      )}

      {/* Empty State */}
      {displayedAppointments.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <CalendarDays className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">{t.noAppointmentsFound}</h3>
            <p className="text-muted-foreground mb-6">
              {t.noAppointmentsYet || "You don't have any appointments yet."}
            </p>
            <Button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <Plus className="h-4 w-4 mr-2" />
              {t.bookFirstAppointment || 'Book Your First Appointment'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AppointmentsList;
