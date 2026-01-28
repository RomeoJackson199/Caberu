import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  CalendarCheck,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths, 
  isToday, 
  isPast 
} from "date-fns";
import { PatientAppointmentDetail } from "@/components/patients/PatientAppointmentDetail";
import { useLanguage } from "@/hooks/useLanguage";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { AppointmentIndexCard, AppointmentIndexCardSkeleton } from "@/components/patients/AppointmentIndexCard";
import { 
  deriveAppointmentState, 
  getAppointmentGroup,
  AppointmentStateInput 
} from "@/lib/appointmentStateMachine";

export interface AppointmentsTabProps {
  user: User;
  onOpenAssistant?: () => void;
}

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  payment_status?: string | null;
  completed_at?: string | null;
  reason?: string;
  dentist?: {
    first_name: string;
    last_name: string;
  };
  clinicName?: string;
}

/**
 * Calendar view - navigation aid only, no actions
 */
const CalendarView = ({
  selectedDate,
  onSelectDate,
  appointments,
  onSelectAppointment
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  appointments: Appointment[];
  onSelectAppointment: (id: string) => void;
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { t } = useLanguage();
  
  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);
  
  const firstDayOfWeek = startOfMonth(currentMonth).getDay();
  const emptyDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);
  
  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(apt => isSameDay(new Date(apt.appointment_date), date));
  };
  
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const selectedDateAppointments = getAppointmentsForDay(selectedDate);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Calendar */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              {format(currentMonth, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} 
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setCurrentMonth(new Date());
                  onSelectDate(new Date());
                }} 
                className="hidden md:inline-flex"
              >
                {t.today}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} 
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {/* Week day headers */}
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs md:text-sm font-medium text-muted-foreground py-1">
                <span className="hidden md:inline">{day}</span>
                <span className="md:hidden">{day[0]}</span>
              </div>
            ))}
            
            {/* Empty days */}
            {emptyDays.map(day => (
              <div key={`empty-${day}`} className="aspect-square" />
            ))}
            
            {/* Calendar days */}
            {days.map(day => {
              const dayAppointments = getAppointmentsForDay(day);
              const hasAppointments = dayAppointments.length > 0;
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentDay = isToday(day);
              const isPastDay = isPast(day) && !isCurrentDay;
              
              return (
                <button
                  key={day.toString()}
                  onClick={() => onSelectDate(day)}
                  className={cn(
                    "aspect-square rounded-lg border flex flex-col items-center justify-center relative transition-all",
                    isSelected && "bg-primary text-primary-foreground border-primary",
                    !isSelected && isCurrentDay && "bg-primary/10 border-primary/50",
                    !isSelected && !isCurrentDay && "hover:bg-muted border-border",
                    isPastDay && !hasAppointments && "opacity-50",
                    hasAppointments && !isSelected && "border-primary/30 bg-primary/5"
                  )}
                >
                  <span className={cn(
                    "text-xs md:text-sm font-medium",
                    isSelected && "text-primary-foreground",
                    !isSelected && isCurrentDay && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {hasAppointments && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {dayAppointments.slice(0, 3).map((_, idx) => (
                        <div 
                          key={idx} 
                          className={cn(
                            "h-1 w-1 rounded-full",
                            isSelected ? "bg-primary-foreground" : "bg-primary"
                          )} 
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Selected date appointments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {format(selectedDate, 'EEEE, MMMM d')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <ScrollArea className="h-[400px]">
            {selectedDateAppointments.length > 0 ? (
              <div className="space-y-2">
                {selectedDateAppointments.map((apt) => (
                  <AppointmentIndexCard
                    key={apt.id}
                    appointment={apt}
                    onClick={() => onSelectAppointment(apt.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Calendar}
                title="No appointments"
                description="No appointments scheduled for this day"
                variant="compact"
              />
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Appointments Tab - Read-only index for finding appointments
 * All actions happen in Appointment Detail
 */
export const AppointmentsTab: React.FC<AppointmentsTabProps> = ({ user }) => {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  const { t } = useLanguage();
  const { businessId, businessName } = useBusinessContext();
  
  useEffect(() => {
    if (businessId) {
      fetchAppointments();
    }
  }, [user.id, businessId]);
  
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!profile || !businessId) {
        setAppointments([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          status,
          payment_status,
          completed_at,
          reason,
          dentists:dentists!appointments_dentist_id_fkey(
            profiles:profile_id(first_name, last_name)
          )
        `)
        .eq('patient_id', profile.id)
        .eq('business_id', businessId)
        .order('appointment_date', { ascending: false });
      
      if (error) throw error;
      
      const transformedData: Appointment[] = (data || []).map(apt => {
        // Handle dentist data - could be array or single object depending on query
        const dentistData = apt.dentists as any;
        const profile = dentistData?.profiles;
        
        return {
          id: apt.id,
          appointment_date: apt.appointment_date,
          status: apt.status,
          payment_status: apt.payment_status,
          completed_at: apt.completed_at,
          reason: apt.reason,
          dentist: profile ? {
            first_name: profile.first_name,
            last_name: profile.last_name
          } : undefined,
          clinicName: businessName || undefined
        };
      });
      
      setAppointments(transformedData);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Group appointments using state machine
  const groupedAppointments = useMemo(() => {
    const upcoming: Appointment[] = [];
    const completed: Appointment[] = [];
    const cancelled: Appointment[] = [];
    
    appointments.forEach(apt => {
      const stateInput: AppointmentStateInput = {
        status: apt.status,
        payment_status: apt.payment_status ?? null,
        appointment_date: apt.appointment_date,
        completed_at: apt.completed_at ?? null,
      };
      
      const state = deriveAppointmentState(stateInput);
      const group = getAppointmentGroup(state);
      
      switch (group) {
        case 'upcoming':
          upcoming.push(apt);
          break;
        case 'completed':
          completed.push(apt);
          break;
        case 'cancelled':
          cancelled.push(apt);
          break;
      }
    });
    
    // Sort upcoming by date ascending (soonest first)
    upcoming.sort((a, b) => 
      new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
    );
    
    // Sort completed and cancelled by date descending (most recent first)
    completed.sort((a, b) => 
      new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
    );
    cancelled.sort((a, b) => 
      new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
    );
    
    return { upcoming, completed, cancelled };
  }, [appointments]);
  
  const openAppointmentDetail = (id: string) => {
    setSelectedAppointmentId(id);
    setDetailsDialogOpen(true);
  };
  
  const renderListView = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-6 w-24 bg-muted rounded animate-pulse" />
            {[1, 2].map(i => <AppointmentIndexCardSkeleton key={i} />)}
          </div>
        </div>
      );
    }
    
    const hasAnyAppointments = appointments.length > 0;
    
    if (!hasAnyAppointments) {
      return (
        <EmptyState
          icon={CalendarCheck}
          title="No appointments yet"
          description="Your upcoming appointments will appear here once you book them. Get started by booking your first appointment."
          actionLabel="Book Appointment"
          onAction={onOpenAssistant}
          variant="illustrated"
          illustration="calendar"
        />
      );
    }
    
    return (
      <div className="space-y-8">
        {/* Upcoming */}
        {groupedAppointments.upcoming.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              Upcoming ({groupedAppointments.upcoming.length})
            </h3>
            <div className="space-y-2">
              {groupedAppointments.upcoming.map(apt => (
                <AppointmentIndexCard
                  key={apt.id}
                  appointment={apt}
                  onClick={() => openAppointmentDetail(apt.id)}
                />
              ))}
            </div>
          </section>
        )}
        
        {/* Completed */}
        {groupedAppointments.completed.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-sky-500" />
              Completed ({groupedAppointments.completed.length})
            </h3>
            <div className="space-y-2">
              {groupedAppointments.completed.map(apt => (
                <AppointmentIndexCard
                  key={apt.id}
                  appointment={apt}
                  onClick={() => openAppointmentDetail(apt.id)}
                />
              ))}
            </div>
          </section>
        )}
        
        {/* Cancelled */}
        {groupedAppointments.cancelled.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-rose-500" />
              Cancelled ({groupedAppointments.cancelled.length})
            </h3>
            <div className="space-y-2">
              {groupedAppointments.cancelled.map(apt => (
                <AppointmentIndexCard
                  key={apt.id}
                  appointment={apt}
                  onClick={() => openAppointmentDetail(apt.id)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="px-4 md:px-6 py-4 md:py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">{t.appointments}</h2>
            <p className="text-sm text-muted-foreground">
              {businessName ? `${businessName}` : 'Your appointments'}
            </p>
          </div>
          
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            <Button
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('list')}
              className="h-8 px-3"
            >
              <List className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">List</span>
            </Button>
            <Button
              variant={view === 'calendar' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('calendar')}
              className="h-8 px-3"
            >
              <CalendarDays className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Calendar</span>
            </Button>
          </div>
        </div>
        
        {/* Content */}
        {view === 'list' ? (
          renderListView()
        ) : (
          <CalendarView
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            appointments={appointments}
            onSelectAppointment={openAppointmentDetail}
          />
        )}
      </div>
      
      {/* Appointment Details Dialog */}
      <PatientAppointmentDetail 
        appointmentId={selectedAppointmentId} 
        open={detailsDialogOpen} 
        onOpenChange={(open) => {
          setDetailsDialogOpen(open);
          if (!open) {
            setSelectedAppointmentId(null);
          }
        }}
        onCancel={(appointmentId) => {
          // Optimistically update the cancelled appointment
          setAppointments(prev => 
            prev.map(apt => 
              apt.id === appointmentId 
                ? { ...apt, status: 'cancelled' } 
                : apt
            )
          );
          setDetailsDialogOpen(false);
          setSelectedAppointmentId(null);
        }}
      />
    </div>
  );
};
