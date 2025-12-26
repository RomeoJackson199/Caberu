import React, { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import RealAppointmentsList from "@/components/RealAppointmentsList";
import { EnhancedAppointmentBooking } from "@/components/booking/EnhancedAppointmentBooking";
import { RescheduleDialog } from "@/components/RescheduleDialog";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, MapPin, User as UserIcon, Plus, ChevronLeft, ChevronRight, CalendarDays, Filter, Search, Phone, Mail, FileText, AlertCircle, CheckCircle, XCircle, RefreshCw, Video, Building, Star, TrendingUp, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, isPast, isFuture } from "date-fns";
import { RecallBanner } from "@/components/patient/RecallBanner";
import { getPatientActiveRecall, RecallRecord } from "@/lib/recalls";
import { PatientAppointmentDetail } from "@/components/patient/PatientAppointmentDetail";
import { useLanguage } from "@/hooks/useLanguage";
import { TimelineAppointmentCard } from "@/components/patient/TimelineAppointmentCard";
import { AppointmentStatusBadge } from "@/components/patient/AppointmentStatusBadge";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { logger } from '@/lib/logger';
import { useBusinessTemplate } from '@/hooks/useBusinessTemplate';

export interface AppointmentsTabProps {
  user: User;
  onOpenAssistant?: () => void;
}
interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  treatment_type?: string;
  dentist?: {
    first_name: string;
    last_name: string;
    specialization?: string;
  };
  notes?: string;
}
const CalendarView = ({
  selectedDate,
  onSelectDate,
  appointments
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  appointments: Appointment[];
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const {
    t
  } = useLanguage();
  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({
      start,
      end
    });
  }, [currentMonth]);
  const firstDayOfWeek = startOfMonth(currentMonth).getDay();
  const emptyDays = Array.from({
    length: firstDayOfWeek
  }, (_, i) => i);
  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(apt => isSameDay(new Date(apt.appointment_date), date));
  };
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base md:text-lg flex items-center">
            <CalendarDays className="h-4 w-4 md:h-5 md:w-5 mr-2" />
            {format(currentMonth, 'MMMM yyyy')}
          </CardTitle>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())} className="hidden md:inline-flex">
              {t.today}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 md:p-6">
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {/* Week day headers */}
          {weekDays.map(day => <div key={day} className="text-center text-xs md:text-sm font-medium text-muted-foreground py-1">
              <span className="hidden md:inline">{day}</span>
              <span className="md:hidden">{day[0]}</span>
            </div>)}
          
          {/* Empty days */}
          {emptyDays.map(day => <div key={`empty-${day}`} className="aspect-square" />)}
          
          {/* Calendar days */}
          {days.map(day => {
          const dayAppointments = getAppointmentsForDay(day);
          const hasAppointments = dayAppointments.length > 0;
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentDay = isToday(day);
          const isPastDay = isPast(day) && !isCurrentDay;
          return <motion.button key={day.toString()} whileHover={{
            scale: 1.05
          }} whileTap={{
            scale: 0.95
          }} onClick={() => onSelectDate(day)} className={cn("aspect-square rounded-lg border flex flex-col items-center justify-center relative transition-all", isSelected && "bg-primary text-primary-foreground border-primary", !isSelected && isCurrentDay && "bg-primary/10 border-primary/50", !isSelected && !isCurrentDay && "hover:bg-muted border-border", isPastDay && "opacity-50", hasAppointments && !isSelected && "border-orange-500/50")}>
                <span className={cn("text-xs md:text-sm font-medium", isSelected && "text-primary-foreground", !isSelected && isCurrentDay && "text-primary")}>
                  {format(day, 'd')}
                </span>
                {hasAppointments && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex space-x-0.5">
                    {dayAppointments.slice(0, 3).map((_, idx) => <div key={idx} className={cn("h-1 w-1 rounded-full", isSelected ? "bg-primary-foreground" : "bg-orange-500")} />)}
                  </div>}
              </motion.button>;
        })}
        </div>
      </CardContent>
    </Card>;
};
// Removed - using TimelineAppointmentCard instead
export const AppointmentsTab: React.FC<AppointmentsTabProps> = ({
  user,
  onOpenAssistant
}) => {
  const [tab, setTab] = useState<'calendar' | 'upcoming' | 'past'>('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [showAllPast, setShowAllPast] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    upcoming: 0,
    completed: 0,
    cancelled: 0
  });
  const [activeRecall, setActiveRecall] = useState<RecallRecord | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [rescheduleAppointmentId, setRescheduleAppointmentId] = useState<string | null>(null);
  const [cancelAppointmentId, setCancelAppointmentId] = useState<string | null>(null);
  const { t } = useLanguage();
  const { businessId } = useBusinessContext();
  const { hasFeature } = useBusinessTemplate();
  const hasAIChat = hasFeature('aiChat');
  useEffect(() => {
    if (businessId) {
      fetchAppointments();
      (async () => {
        const {
          data: session
        } = await supabase.auth.getUser();
        const uid = session.user?.id;
        if (uid) {
          const {
            data: profile
          } = await supabase.from('profiles').select('id').eq('user_id', uid).single();
          if (profile?.id) {
            const rec = await getPatientActiveRecall(profile.id);
            setActiveRecall(rec);
          }
        }
      })();
    }
  }, [user.id, businessId]);
  const fetchAppointments = async () => {
    try {
      setLoading(true);

      const {
        data: profile
      } = await supabase.from('profiles').select('id').eq('user_id', user.id).maybeSingle();

      if (!profile) {
        return;
      }

      if (!businessId) {
        return;
      }
          let appointmentsData: any[] | null = null;
          let appointmentsError: any = null;
          const { data: dataWithDentist, error: errWithDentist } = await supabase
            .from('appointments')
            .select(`
              *,
              dentists:dentists!appointments_dentist_id_fkey(
                specialization,
                profiles:profile_id(first_name, last_name)
              )
            `)
            .eq('patient_id', profile.id)
            .eq('business_id', businessId)
            .order('appointment_date', { ascending: false });

          if (errWithDentist) {
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('appointments')
              .select('*')
              .eq('patient_id', profile.id)
              .eq('business_id', businessId)
              .order('appointment_date', { ascending: false });
            appointmentsData = fallbackData as any[] | null;
            appointmentsError = fallbackError;
          } else {
            appointmentsData = dataWithDentist as any[] | null;
            appointmentsError = null;
          }
          
          if (appointmentsError) {
            console.error('❌ [AppointmentsTab] Appointments error:', appointmentsError);
            return;
          }

        if (appointmentsData) {
          // Transform the data to match the expected structure
          const transformedData = appointmentsData.map(apt => ({
            ...apt,
            dentist: apt.dentists ? {
              first_name: apt.dentists.profiles?.first_name,
              last_name: apt.dentists.profiles?.last_name,
              specialization: apt.dentists.specialization
            } : undefined
          }));
          setAppointments(transformedData as any);

          // Calculate stats
          const now = new Date();
          const upcoming = appointmentsData.filter(apt => new Date(apt.appointment_date) > now && apt.status === 'confirmed').length;
          const completed = appointmentsData.filter(apt => apt.status === 'completed').length;
          const cancelled = appointmentsData.filter(apt => apt.status === 'cancelled').length;

          setStats({
            total: appointmentsData.length,
            upcoming,
            completed,
            cancelled
          });
        }
    } catch (error) {
      console.error('💥 [AppointmentsTab] Exception:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleRescheduleAppointment = (appointmentId: string) => {
    setRescheduleAppointmentId(appointmentId);
  };

  const handleCancelAppointment = (appointmentId: string) => {
    setCancelAppointmentId(appointmentId);
  };

  const confirmCancelAppointment = async () => {
    if (!cancelAppointmentId) return;
    
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', cancelAppointmentId);
      
      if (error) throw error;
      
      // Refresh appointments
      await fetchAppointments();
      setCancelAppointmentId(null);
    } catch (error) {
      console.error('Error cancelling appointment:', error);
    }
  };

  const selectedDateAppointments = useMemo(() => {
    return appointments.filter(apt => isSameDay(new Date(apt.appointment_date), selectedDate));
  }, [appointments, selectedDate]);
  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    return appointments.filter(apt => new Date(apt.appointment_date) > now && apt.status !== 'cancelled').sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());
  }, [appointments]);
  
  const pastAppointments = useMemo(() => {
    const now = new Date();
    return appointments.filter(apt => new Date(apt.appointment_date) <= now || apt.status === 'completed').sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime());
  }, [appointments]);

  // Limit display to 10 appointments unless "View More" is clicked
  const displayedUpcoming = showAllUpcoming ? upcomingAppointments : upcomingAppointments.slice(0, 10);
  const displayedPast = showAllPast ? pastAppointments : pastAppointments.slice(0, 10);
  return <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="px-4 md:px-6 py-4 md:py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">{t.appointments}</h2>
            <p className="text-sm text-muted-foreground">{t.manageDentalVisits}</p>
          </div>
          
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t.total}</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t.upcoming}</p>
                  <p className="text-2xl font-bold text-green-600">{stats.upcoming}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t.completed}</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-600/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t.cancelled}</p>
                  <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={v => setTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calendar" className="flex items-center space-x-1">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden md:inline">Calendar</span>
              <span className="md:hidden">Cal</span>
            </TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="calendar" className="mt-0 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <CalendarView selectedDate={selectedDate} onSelectDate={setSelectedDate} appointments={appointments} />
                </div>
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        {format(selectedDate, 'EEEE, MMMM d')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]">
                        <AnimatePresence mode="wait">
                          {selectedDateAppointments.length > 0 ? <div className="space-y-3">
                              {selectedDateAppointments.map((apt, index) => <TimelineAppointmentCard 
                                key={apt.id} 
                                appointment={apt} 
                                index={index}
                                onReschedule={() => handleRescheduleAppointment(apt.id)} 
                                onCancel={() => handleCancelAppointment(apt.id)}
                                onClick={() => {
                                  setSelectedAppointmentId(apt.id);
                                  setDetailsDialogOpen(true);
                                }} 
                              />)}
                            </div> : <motion.div initial={{
                          opacity: 0
                        }} animate={{
                          opacity: 1
                        }} className="text-center py-8">
                              <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                              <p className="text-sm text-muted-foreground">
                                No appointments on this day
                              </p>
                              <Button variant="outline" size="default" className="mt-4 w-full h-11" onClick={onOpenAssistant || (() => setShowBooking(true))}>
                                {hasAIChat ? (
                                  <>
                                    <MessageSquare className="h-5 w-5 mr-2" />
                                    Book with AI Assistant
                                  </>
                                ) : (
                                  <>
                                    <Calendar className="h-5 w-5 mr-2" />
                                    Book Appointment
                                  </>
                                )}
                              </Button>
                            </motion.div>}
                        </AnimatePresence>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="upcoming" className="mt-0">
              <div className="space-y-3">
                <AnimatePresence>
                  {upcomingAppointments.length > 0 ? (
                    <>
                      {displayedUpcoming.map((apt, index) => (
                        <TimelineAppointmentCard 
                          key={apt.id} 
                          appointment={apt} 
                          index={index}
                          onReschedule={() => handleRescheduleAppointment(apt.id)} 
                          onCancel={() => handleCancelAppointment(apt.id)}
                          onClick={() => {
                            setSelectedAppointmentId(apt.id);
                            setDetailsDialogOpen(true);
                          }} 
                        />
                      ))}
                      
                      {/* View More / Show Less Button */}
                      {upcomingAppointments.length > 10 && (
                        <div className="flex justify-center pt-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setShowAllUpcoming(!showAllUpcoming)}
                            className="w-full sm:w-auto"
                          >
                            {showAllUpcoming 
                              ? 'Show Less' 
                              : `View More (${upcomingAppointments.length - 10} more)`
                            }
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Calendar className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No upcoming appointments</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Schedule your next dental visit
                        </p>
                        <Button size="lg" className="w-full sm:w-auto px-8 h-12" onClick={onOpenAssistant || (() => setShowBooking(true))}>
                          {hasAIChat ? (
                            <>
                              <MessageSquare className="h-5 w-5 mr-2" />
                              Book with AI Assistant
                            </>
                          ) : (
                            <>
                              <Calendar className="h-5 w-5 mr-2" />
                              Book Appointment
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </AnimatePresence>
              </div>
            </TabsContent>

            <TabsContent value="past" className="mt-0">
              <div className="space-y-3">
                <AnimatePresence>
                  {pastAppointments.length > 0 ? (
                    <>
                      {displayedPast.map((apt, index) => (
                        <TimelineAppointmentCard 
                          key={apt.id} 
                          appointment={apt} 
                          index={index}
                          onReschedule={() => {}} 
                          onCancel={() => {}} 
                          onClick={() => {
                            setSelectedAppointmentId(apt.id);
                            setDetailsDialogOpen(true);
                          }} 
                        />
                      ))}
                      
                      {/* View More / Show Less Button */}
                      {pastAppointments.length > 10 && (
                        <div className="flex justify-center pt-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setShowAllPast(!showAllPast)}
                            className="w-full sm:w-auto"
                          >
                            {showAllPast 
                              ? 'Show Less' 
                              : `View More (${pastAppointments.length - 10} more)`
                            }
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Clock className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No past appointments</h3>
                        <p className="text-sm text-muted-foreground">
                          Your appointment history will appear here
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </AnimatePresence>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Booking Dialog */}
      <Dialog open={showBooking} onOpenChange={setShowBooking}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-auto p-0">
          <EnhancedAppointmentBooking
            user={user}
            onCancel={() => setShowBooking(false)}
            onComplete={() => {
              setShowBooking(false);
              fetchAppointments();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <RescheduleDialog
        appointmentId={rescheduleAppointmentId}
        open={!!rescheduleAppointmentId}
        onOpenChange={(open) => {
          if (!open) setRescheduleAppointmentId(null);
        }}
        onSuccess={() => {
          setRescheduleAppointmentId(null);
          fetchAppointments();
        }}
      />

      {/* Appointment Details */}
      <PatientAppointmentDetail 
        appointmentId={selectedAppointmentId} 
        open={detailsDialogOpen} 
        onOpenChange={(open) => {
          setDetailsDialogOpen(open);
          if (!open) setSelectedAppointmentId(null);
        }}
        onReschedule={handleRescheduleAppointment}
        onCancel={handleCancelAppointment}
      />

      {/* Cancel Appointment Confirmation */}
      <AlertDialog open={!!cancelAppointmentId} onOpenChange={(open) => !open && setCancelAppointmentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep it</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelAppointment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, cancel appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recall Banner */}
      {activeRecall && <div className="mt-6">
          <RecallBanner recall={activeRecall} />
        </div>}
    </div>;
};