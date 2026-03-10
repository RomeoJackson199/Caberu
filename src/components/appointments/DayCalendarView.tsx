import { useState, useMemo, useEffect, useCallback } from "react";
import { format, addHours, isSameDay, parseISO, differenceInMinutes, setHours, setMinutes } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, CalendarX } from "lucide-react";
import { QuickAppointmentDialog } from "./QuickAppointmentDialog";
import {
  CALENDAR_DISPLAY,
  APPOINTMENT_STATUS_COLORS,
  MIN_APPOINTMENT_BLOCK_HEIGHT,
  CLINIC_TIMEZONE
} from "@/lib/appointmentConfig";
import { calculateEventPositions, type PositionedEvent } from "@/lib/appointmentUtils";
import type { DayCalendarViewProps, CalendarEvent } from "@/types/appointment";

// Use centralized configuration
const STATUS_COLORS = APPOINTMENT_STATUS_COLORS;
const HOUR_HEIGHT = 100; // Taller slots for day view (specific to day view)
const START_HOUR = CALENDAR_DISPLAY.startHour;
const END_HOUR = CALENDAR_DISPLAY.endHour;
const TOTAL_HOURS = END_HOUR - START_HOUR;

export function DayCalendarView({
  dentistId,
  businessId,
  currentDate,
  onAppointmentClick,
  selectedAppointmentId,
  googleCalendarEvents = [],
  showAllDentists = false
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
    queryKey: ["appointments-day", dentistId, businessId, format(currentDate, "yyyy-MM-dd")],
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      let query = supabase
        .from("appointments_decrypted")
        .select("*")
        .gte("appointment_date", dayStart.toISOString())
        .lte("appointment_date", dayEnd.toISOString())
        .neq("status", "cancelled")
        .order("appointment_date", { ascending: true });

      // Filter by specific dentist unless showing all
      if (!showAllDentists) {
        query = query.eq("dentist_id", dentistId);
      }

      // Filter by business if provided
      if (businessId) {
        query = query.eq("business_id", businessId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const appointments = data || [];
      const patientIds = Array.from(new Set(appointments.map((a: any) => a.patient_id).filter(Boolean)));

      if (patientIds.length) {
        const { data: profiles } = await supabase
          .from("secure_profiles_view")
          .select("id, first_name, last_name, email, profile_picture_url")
          .in("id", patientIds);
        const map = new Map((profiles || []).map((p: any) => [p.id, p]));
        return appointments.map((a: any) => ({ ...a, patient: map.get(a.patient_id) || null }));
      }
      return appointments;
    }
  });

  // Combine regular appointments with Google Calendar events and calculate positions
  const positionedEvents = useMemo(() => {
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
    // Calculate positions for overlapping appointments
    return calculateEventPositions(uniqueEvents);
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


  // Convert UTC date to clinic timezone for accurate display
  const toClinicTime = useCallback((dateStr: string) => {
    return toZonedTime(parseISO(dateStr), CLINIC_TIMEZONE);
  }, []);

  // Memoized event style calculation for overlapping appointments
  const getEventStyle = useCallback((event: PositionedEvent) => {
    // Convert to clinic timezone for accurate hour calculation (handles DST)
    const startDate = toClinicTime(event.appointment_date);
    const startHour = startDate.getHours() + (startDate.getMinutes() / 60);
    const durationHours = (event.duration_minutes || 30) / 60;

    const top = (startHour - START_HOUR) * HOUR_HEIGHT;
    const height = durationHours * HOUR_HEIGHT;

    // Calculate width and position for overlapping appointments
    const totalColumns = event.totalColumns || 1;
    const column = event.column || 0;
    const horizontalPadding = 4; // px from edges
    const gapBetweenColumns = 2; // px between overlapping events

    // Calculate percentage-based width for better responsiveness
    const availableWidth = 100;
    const columnWidth = availableWidth / totalColumns;
    const leftPosition = column * columnWidth;

    return {
      top: `${Math.max(0, top)}px`,
      height: `${Math.max(MIN_APPOINTMENT_BLOCK_HEIGHT, height)}px`,
      left: `calc(${leftPosition}% + ${horizontalPadding}px)`,
      width: `calc(${columnWidth}% - ${horizontalPadding * 2 / totalColumns}px - ${gapBetweenColumns}px)`,
      zIndex: 10 + column,
    };
  }, [toClinicTime]);

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
              {positionedEvents.length} appointment{positionedEvents.length !== 1 ? 's' : ''}
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

              {/* Current Time Indicator - only show within calendar hours */}
              {isSameDay(currentDate, currentTime) &&
               currentTime.getHours() >= START_HOUR &&
               currentTime.getHours() < END_HOUR && (
                <div
                  className="absolute left-0 right-0 border-t-2 border-red-500 z-30 pointer-events-none flex items-center"
                  style={{
                    top: `${((currentTime.getHours() + currentTime.getMinutes() / 60) - START_HOUR) * HOUR_HEIGHT}px`
                  }}
                >
                  <div className="absolute -left-1.5 w-3 h-3 bg-red-500 rounded-full shadow-lg shadow-red-500/30" />
                  <div className="absolute left-3 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-medium rounded">
                    {format(currentTime, "h:mm a")}
                  </div>
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

              {/* Empty State */}
              {positionedEvents.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center p-8 bg-white/80 dark:bg-gray-900/80 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                    <CalendarX className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No appointments scheduled</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Click any time slot to create one</p>
                  </div>
                </div>
              )}

              {/* Events */}
              {positionedEvents.map((event) => {
                const style = getEventStyle(event);
                const isSelected = event.id === selectedAppointmentId;
                const isOverlapping = event.totalColumns > 1;

                return (
                  <Tooltip key={event.id}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "absolute rounded-lg border p-3 cursor-pointer transition-all hover:brightness-95 hover:shadow-md overflow-hidden flex flex-col justify-center",
                          STATUS_COLORS[event.status] || "bg-gray-100 border-l-gray-500",
                          isSelected && "ring-2 ring-primary ring-offset-1 shadow-xl scale-[1.01]",
                          isOverlapping && "border-l-2"
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
                          {!isOverlapping && (
                            <Badge variant="outline" className="text-[10px] h-5 bg-white/50 dark:bg-black/20 border-0 backdrop-blur-sm flex-shrink-0">
                              {event.status}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs opacity-80 truncate flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          {format(parseISO(event.appointment_date), "h:mm a")} - {format(addHours(parseISO(event.appointment_date), (event.duration_minutes || 30) / 60), "h:mm a")}
                        </div>
                        {event.reason && !isOverlapping && (
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
                              <AvatarImage src={event.patient?.profile_picture_url || undefined} className="object-cover" />
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
