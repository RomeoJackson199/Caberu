import { useState, useMemo, useEffect } from "react";
import { format, addHours, isSameDay, parseISO, differenceInMinutes, setHours, setMinutes } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock } from "lucide-react";
import { QuickAppointmentDialog } from "./QuickAppointmentDialog";

interface DayCalendarViewProps {
  dentistId: string;
  currentDate: Date;
  onAppointmentClick: (appointment: any) => void;
  selectedAppointmentId?: string;
  googleCalendarEvents?: any[];
}

const STATUS_COLORS: Record<string, string> = {
  "completed": "bg-emerald-100 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 border-l-4 border-l-emerald-500",
  "cancelled": "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-l-4 border-l-gray-400 opacity-70",
  "confirmed": "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 border-l-4 border-l-blue-500",
  "pending": "bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100 border-l-4 border-l-amber-500",
  "google-calendar": "bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100 border-l-4 border-l-purple-500",
};

const HOUR_HEIGHT = 100; // Taller slots for day view
const START_HOUR = 7;
const END_HOUR = 20;
const TOTAL_HOURS = END_HOUR - START_HOUR;

export function DayCalendarView({
  dentistId,
  currentDate,
  onAppointmentClick,
  selectedAppointmentId,
  googleCalendarEvents = []
}: DayCalendarViewProps) {
  const [quickAppointmentOpen, setQuickAppointmentOpen] = useState(false);
  const [quickAppointmentDate, setQuickAppointmentDate] = useState<Date>(new Date());
  const [quickAppointmentTime, setQuickAppointmentTime] = useState<string>("");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch appointments for the day
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments-day", dentistId, format(currentDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("dentist_id", dentistId)
        .gte("appointment_date", dayStart.toISOString())
        .lte("appointment_date", dayEnd.toISOString())
        .order("appointment_date", { ascending: true });

      if (error) throw error;

      const appointments = data || [];
      const patientIds = Array.from(new Set(appointments.map((a: any) => a.patient_id).filter(Boolean)));

      if (patientIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", patientIds);
        const map = new Map((profiles || []).map((p: any) => [p.id, p]));
        return appointments.map((a: any) => ({ ...a, patient: map.get(a.patient_id) || null }));
      }
      return appointments;
    }
  });

  // Combine regular appointments with Google Calendar events
  const allEvents = useMemo(() => {
    const googleEvents = (googleCalendarEvents || []).map(event => ({
      ...event,
      id: event.id,
      patient: { first_name: 'Google', last_name: 'Calendar', email: '' },
      reason: event.summary,
      status: 'google-calendar',
      isGoogleCalendarEvent: true,
      appointment_date: event.start,
      duration_minutes: differenceInMinutes(parseISO(event.end), parseISO(event.start))
    }));
    const combined = [...appointments, ...googleEvents];
    // Deduplicate by ID
    const uniqueEvents = Array.from(new Map(combined.map(item => [item.id, item])).values());
    return uniqueEvents;
  }, [appointments, googleCalendarEvents]);

  const getPatientInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  const handleEmptySlotClick = (hour: number) => {
    const dateWithTime = setMinutes(setHours(currentDate, hour), 0);
    setQuickAppointmentDate(dateWithTime);
    setQuickAppointmentTime(`${hour.toString().padStart(2, '0')}:00`);
    setQuickAppointmentOpen(true);
  };


  const getEventStyle = (event: any) => {
    const startDate = parseISO(event.appointment_date);
    const startHour = startDate.getHours() + (startDate.getMinutes() / 60);
    const durationHours = (event.duration_minutes || 30) / 60;

    const top = (startHour - START_HOUR) * HOUR_HEIGHT;
    const height = durationHours * HOUR_HEIGHT;

    return {
      top: `${Math.max(0, top)}px`,
      height: `${Math.max(30, height)}px`,
      left: '4px',
      right: '4px',
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-background border rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-muted/5 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {format(currentDate, "EEEE")}
            </div>
            <div className="text-2xl font-bold">
              {format(currentDate, "MMMM d, yyyy")}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">
              {allEvents.length} appointments
            </div>
          </div>
        </div>

        {/* Scrollable Grid Area */}
        <div className="flex-1 overflow-y-auto relative custom-scrollbar">
          <div className="flex min-h-[800px]" style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}>

            {/* Time Axis */}
            <div className="w-20 flex-shrink-0 border-r bg-background/50 sticky left-0 z-20">
              {Array.from({ length: TOTAL_HOURS }).map((_, i) => {
                const hour = START_HOUR + i;
                return (
                  <div key={hour} className="relative border-b border-transparent" style={{ height: `${HOUR_HEIGHT}px` }}>
                    <span className="absolute -top-3 right-3 text-sm text-muted-foreground font-medium">
                      {format(setHours(new Date(), hour), "h a")}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Day Column */}
            <div className="flex-1 relative bg-white dark:bg-gray-950/50">
              {/* Horizontal Grid Lines */}
              <div className="absolute inset-0 z-0 pointer-events-none">
                {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                  <div
                    key={i}
                    className="border-b border-dashed border-gray-300 dark:border-gray-700 w-full"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  />
                ))}
              </div>

              {/* Current Time Indicator */}
              {isSameDay(currentDate, currentTime) && (
                <div
                  className="absolute left-0 right-0 border-t-2 border-red-500 z-10 pointer-events-none flex items-center"
                  style={{
                    top: `${((currentTime.getHours() + currentTime.getMinutes() / 60) - START_HOUR) * HOUR_HEIGHT}px`
                  }}
                >
                  <div className="absolute -left-1.5 w-3 h-3 bg-red-500 rounded-full" />
                </div>
              )}

              {/* Clickable Background Slots */}
              {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-full hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer z-0"
                  style={{ top: `${i * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                  onClick={() => handleEmptySlotClick(START_HOUR + i)}
                />
              ))}

              {/* Events */}
              {allEvents.map((event) => {
                const style = getEventStyle(event);
                const isSelected = event.id === selectedAppointmentId;

                return (
                  <Tooltip key={event.id}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "absolute rounded-lg border p-3 cursor-pointer transition-all hover:brightness-95 hover:shadow-md z-10 overflow-hidden flex flex-col justify-center",
                          STATUS_COLORS[event.status] || "bg-gray-100 border-l-gray-500",
                          isSelected && "ring-2 ring-primary ring-offset-1 z-20 shadow-xl scale-[1.01]"
                        )}
                        style={style}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAppointmentClick(event);
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold text-sm truncate flex items-center gap-2">
                            {event.urgency === 'high' && <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">URGENT</Badge>}
                            {event.patient?.first_name} {event.patient?.last_name}
                          </div>
                          <Badge variant="outline" className="text-[10px] h-5 bg-white/50 dark:bg-black/20 border-0 backdrop-blur-sm">
                            {event.status}
                          </Badge>
                        </div>
                        <div className="text-xs opacity-80 truncate flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(event.appointment_date), "h:mm a")} - {format(addHours(parseISO(event.appointment_date), (event.duration_minutes || 30) / 60), "h:mm a")}
                        </div>
                        {event.reason && (
                          <div className="text-xs opacity-70 truncate mt-1 italic">
                            "{event.reason}"
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="start" className="p-0 border-none shadow-xl">
                      <Card className="w-80 border-0">
                        <div className={cn("h-2 w-full", STATUS_COLORS[event.status]?.split(' ')[0])} />
                        <div className="p-4 space-y-3">
                          <div className="flex items-center gap-3 pb-3 border-b">
                            <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                              <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                                {getPatientInitials(event.patient?.first_name, event.patient?.last_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-base">{event.patient?.first_name} {event.patient?.last_name}</p>
                              <p className="text-xs text-muted-foreground">{event.patient?.email}</p>
                            </div>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between py-1 border-b border-dashed">
                              <span className="text-muted-foreground">Date</span>
                              <span className="font-medium">{format(parseISO(event.appointment_date), "MMM d, yyyy")}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-dashed">
                              <span className="text-muted-foreground">Time</span>
                              <span className="font-medium">{format(parseISO(event.appointment_date), "h:mm a")} - {format(addHours(parseISO(event.appointment_date), (event.duration_minutes || 30) / 60), "h:mm a")}</span>
                            </div>
                            <div className="pt-2">
                              <span className="text-muted-foreground text-xs block mb-1">Reason</span>
                              <p className="font-medium bg-muted/50 p-2 rounded-md text-xs">{event.reason || "No reason provided"}</p>
                            </div>
                          </div>

                          {!['google-calendar'].includes(event.status) && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="w-full" 
                              onClick={(e) => {
                                e.stopPropagation();
                                onAppointmentClick(event);
                              }}
                            >
                              View Details
                            </Button>
                          )}
                        </div>
                      </Card>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </div>
      </div>


      <QuickAppointmentDialog
        open={quickAppointmentOpen}
        onOpenChange={setQuickAppointmentOpen}
        dentistId={dentistId}
        selectedDate={quickAppointmentDate}
        selectedTime={quickAppointmentTime}
        showPatientSelector={true}
      />
    </TooltipProvider>
  );
}
