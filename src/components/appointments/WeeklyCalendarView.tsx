import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { format, startOfWeek, addDays, addHours, isSameDay, parseISO, differenceInMinutes, setHours, setMinutes, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Plus, Clock, CalendarX } from "lucide-react";
import { QuickAppointmentDialog } from "./QuickAppointmentDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/hooks/useLanguage";
import {
  CALENDAR_DISPLAY,
  APPOINTMENT_STATUS_COLORS,
  SCHEDULE_BLOCK_STYLES,
  MIN_APPOINTMENT_BLOCK_HEIGHT,
  CLINIC_TIMEZONE
} from "@/lib/appointmentConfig";
import { calculateEventPositions, type PositionedEvent } from "@/lib/appointmentUtils";
import type { WeeklyCalendarViewProps, CalendarEvent } from "@/types/appointment";

// Use centralized configuration for status colors and block styles
const STATUS_COLORS = APPOINTMENT_STATUS_COLORS;
const BLOCK_STYLES = SCHEDULE_BLOCK_STYLES;

// Calendar display constants from configuration
const HOUR_HEIGHT = CALENDAR_DISPLAY.hourHeight;
const START_HOUR = CALENDAR_DISPLAY.startHour;
const END_HOUR = CALENDAR_DISPLAY.endHour;
const TOTAL_HOURS = END_HOUR - START_HOUR;

export function WeeklyCalendarView({
  dentistId,
  businessId,
  currentDate,
  onAppointmentClick,
  onDayHeaderClick,
  selectedAppointmentId,
  googleCalendarEvents = [],
  showAllDentists = false,
  dentistFilterId
}: WeeklyCalendarViewProps) {
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const [mobileCurrentDay, setMobileCurrentDay] = useState(0);
  const [quickAppointmentOpen, setQuickAppointmentOpen] = useState(false);
  const [quickAppointmentDate, setQuickAppointmentDate] = useState<Date>(new Date());
  const [quickAppointmentTime, setQuickAppointmentTime] = useState<string>("");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time indicator every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Sync mobile day with current date prop
  useEffect(() => {
    if (isMobile) {
      const dayIndex = weekDays.findIndex(day => isSameDay(day, currentDate));
      if (dayIndex !== -1) setMobileCurrentDay(dayIndex);
    }
  }, [currentDate, isMobile, weekDays]);

  // Fetch appointments with patient profiles in a single query (eliminates N+1 pattern)
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments-calendar", dentistId, businessId, format(weekStart, "yyyy-MM-dd"), dentistFilterId ?? "all"],
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const weekEnd = addDays(weekStart, 7);

      let query = supabase
        .from("appointments_decrypted")
        .select("*")
        .gte("appointment_date", weekStart.toISOString())
        .lt("appointment_date", weekEnd.toISOString())
        .neq("status", "cancelled")
        .order("appointment_date", { ascending: true });

      // Filter by specific dentist unless showing all
      if (!showAllDentists) {
        query = query.eq("dentist_id", dentistId);
      }

      // Optional explicit dentist filter for team mode selection
      if (showAllDentists && dentistFilterId) {
        query = query.eq("dentist_id", dentistFilterId);
      }

      // Filter by business if provided
      if (businessId) {
        query = query.eq("business_id", businessId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch patient profiles separately (views don't support PostgREST joins)
      const patientIds = [...new Set((data || []).map(a => a.patient_id).filter(Boolean))];
      const { data: profiles } = patientIds.length > 0
        ? await supabase.from('profiles').select('id, first_name, last_name, email, profile_picture_url').in('id', patientIds)
        : { data: [] };
      const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

      return (data || []).map((appointment) => ({
        ...appointment,
        patient: profilesMap.get(appointment.patient_id) || null,
      }));
    }
  });

  const calendarDentistId = dentistFilterId || dentistId;

  // Fetch dentist availability for the week (break times, working hours, availability)
  const { data: availability = [] } = useQuery({
    queryKey: ["dentist-availability", calendarDentistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dentist_availability")
        .select("*")
        .eq("dentist_id", calendarDentistId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!calendarDentistId
  });

  // Fetch vacation/sick leave days for the current week
  const { data: vacationDays = [] } = useQuery({
    queryKey: ["dentist-vacation-days", calendarDentistId, format(weekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      const weekEnd = addDays(weekStart, 7);
      const { data, error } = await supabase
        .from("dentist_vacation_days")
        .select("*")
        .eq("dentist_id", calendarDentistId)
        .gte("end_date", format(weekStart, "yyyy-MM-dd"))
        .lte("start_date", format(weekEnd, "yyyy-MM-dd"));
      if (error) throw error;
      return data || [];
    },
    enabled: !!calendarDentistId
  });

  // Get availability info for a specific day
  const getDayAvailability = (day: Date) => {
    const dayOfWeek = day.getDay(); // 0 = Sunday, 1 = Monday, etc.
    return availability.find((a: any) => a.day_of_week === dayOfWeek);
  };

  // Check if a day has vacation/leave
  const getDayVacation = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return vacationDays.find((v: any) =>
      dateStr >= v.start_date && dateStr <= v.end_date
    );
  };

  // Get scheduled blocks (breaks, unavailable time) for a day
  const getScheduleBlocks = (day: Date) => {
    const blocks: Array<{ type: string; startHour: number; endHour: number; label: string }> = [];

    const dayAvail = getDayAvailability(day);
    const vacation = getDayVacation(day);

    // If there's vacation/sick leave for this day, mark entire day
    if (vacation) {
      const vacationType = vacation.vacation_type || 'vacation';
      const blockType = vacationType === 'sick' ? 'sick-leave' : 'vacation';
      blocks.push({
        type: blockType,
        startHour: START_HOUR,
        endHour: END_HOUR,
        label: vacation.reason || (blockType === 'sick-leave' ? t.sickLeaveLabel : t.vacationLabel) || 'Time Off'
      });
      return blocks;
    }

    if (!dayAvail) return blocks;

    // If day is not available, mark as unavailable
    if (!dayAvail.is_available) {
      blocks.push({
        type: 'unavailable',
        startHour: START_HOUR,
        endHour: END_HOUR,
        label: t.dayOff || 'Day Off'
      });
      return blocks;
    }

    // Add unavailable time before working hours
    const workStartHour = parseTimeToHours(dayAvail.start_time);
    const workEndHour = parseTimeToHours(dayAvail.end_time);

    if (workStartHour > START_HOUR) {
      blocks.push({
        type: 'unavailable',
        startHour: START_HOUR,
        endHour: workStartHour,
        label: t.beforeHours || 'Before Hours'
      });
    }

    // Add break time if exists
    if (dayAvail.break_start_time && dayAvail.break_end_time) {
      const breakStart = parseTimeToHours(dayAvail.break_start_time);
      const breakEnd = parseTimeToHours(dayAvail.break_end_time);
      blocks.push({
        type: 'break',
        startHour: breakStart,
        endHour: breakEnd,
        label: t.lunchBreak || 'Lunch Break'
      });
    }

    // Add unavailable time after working hours
    if (workEndHour < END_HOUR) {
      blocks.push({
        type: 'unavailable',
        startHour: workEndHour,
        endHour: END_HOUR,
        label: t.afterHours || 'After Hours'
      });
    }

    return blocks;
  };

  // Helper to parse time string (HH:MM) to decimal hours
  const parseTimeToHours = (timeStr: string): number => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + (minutes || 0) / 60;
  };

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
    return [...appointments, ...googleEvents];
  }, [appointments, googleCalendarEvents]);

  // Pre-calculate positioned events for each day (for overlapping detection)
  const positionedEventsByDay = useMemo(() => {
    const byDay = new Map<string, PositionedEvent[]>();

    weekDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const dayEvents = allEvents.filter(e => isSameDay(parseISO(e.appointment_date), day));
      byDay.set(dayKey, calculateEventPositions(dayEvents));
    });

    return byDay;
  }, [allEvents, weekDays]);

  const getPatientInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  const handleEmptySlotClick = (day: Date, hour: number) => {
    const dateWithTime = setMinutes(setHours(day, hour), 0);
    setQuickAppointmentDate(dateWithTime);
    setQuickAppointmentTime(`${hour.toString().padStart(2, '0')}:00`);
    setQuickAppointmentOpen(true);
  };


  // Convert UTC date to clinic timezone for accurate display (DST safe)
  const toClinicTime = useCallback((dateStr: string) => {
    return toZonedTime(parseISO(dateStr), CLINIC_TIMEZONE);
  }, []);

  // Helper to calculate position styles with overlap handling
  const getEventStyle = useCallback((event: PositionedEvent) => {
    // Convert to clinic timezone for accurate hour calculation (handles DST)
    const startDate = toClinicTime(event.appointment_date);
    const startHour = startDate.getHours() + (startDate.getMinutes() / 60);
    const durationHours = (event.duration_minutes || 30) / 60;

    // Calculate top offset relative to START_HOUR
    const top = (startHour - START_HOUR) * HOUR_HEIGHT;
    const height = durationHours * HOUR_HEIGHT;

    // Calculate width and position for overlapping appointments
    const totalColumns = event.totalColumns || 1;
    const column = event.column || 0;
    const horizontalPadding = 2; // px from edges
    const gapBetweenColumns = 1; // px between overlapping events

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

  const displayDays = isMobile ? [weekDays[mobileCurrentDay]] : weekDays;

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
        {/* Mobile Navigation */}
        {isMobile && (
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <Button variant="ghost" size="icon" onClick={() => setMobileCurrentDay(Math.max(0, mobileCurrentDay - 1))} disabled={mobileCurrentDay === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <div className="text-sm font-semibold">{format(displayDays[0], "EEEE, MMM d")}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setMobileCurrentDay(Math.min(6, mobileCurrentDay + 1))} disabled={mobileCurrentDay === 6}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Calendar Header (Days) with density indicators */}
        <div className="flex border-b bg-muted/5">
          <div className="w-16 flex-shrink-0 border-r bg-background/50" /> {/* Time axis spacer */}
          <div
            className="flex-1 grid divide-x"
            style={{ gridTemplateColumns: `repeat(${displayDays.length}, minmax(0, 1fr))` }}
          >
            {displayDays.map((day) => {
              const isToday = isSameDay(day, new Date());
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayEventCount = positionedEventsByDay.get(dayKey)?.length || 0;
              const hasVacation = getScheduleBlocks(day).some(b => b.type === 'vacation' || b.type === 'sick-leave');

              // Calculate density level for visual indicator
              const getDensityColor = (count: number) => {
                if (count === 0) return null;
                if (count <= 2) return "bg-green-400";
                if (count <= 4) return "bg-yellow-400";
                if (count <= 6) return "bg-orange-400";
                return "bg-red-400";
              };
              const densityColor = getDensityColor(dayEventCount);

              return (
                <button
                  key={day.toISOString()}
                  className={cn(
                    "py-3 text-center relative transition-colors",
                    isToday && "bg-blue-50/50 dark:bg-blue-900/10",
                    onDayHeaderClick && "hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                  )}
                  onClick={() => onDayHeaderClick?.(day)}
                  type="button"
                >
                  <div className={cn("text-xs font-medium uppercase mb-1", isToday ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground")}>
                    {format(day, "EEE")}
                  </div>
                  <div className="relative inline-flex flex-col items-center">
                    <div className={cn(
                      "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                      isToday ? "bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/20" : "text-foreground",
                      hasVacation && !isToday && "bg-teal-100 dark:bg-teal-900/40"
                    )}>
                      {format(day, "d")}
                    </div>
                    {/* Density indicator dots */}
                    {dayEventCount > 0 && (
                      <div className="flex gap-0.5 mt-1">
                        <div className={cn("w-1.5 h-1.5 rounded-full", densityColor)} title={`${dayEventCount} appointments`} />
                        {dayEventCount > 3 && <div className={cn("w-1.5 h-1.5 rounded-full", densityColor)} />}
                        {dayEventCount > 6 && <div className={cn("w-1.5 h-1.5 rounded-full", densityColor)} />}
                      </div>
                    )}
                    {hasVacation && (
                      <span className="text-[10px] text-teal-600 dark:text-teal-400 mt-0.5">Off</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Grid Area */}
        <div className="flex-1 overflow-y-auto relative custom-scrollbar">
          <div className="flex min-h-[800px]" style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}>

            {/* Time Axis */}
            <div className="w-16 flex-shrink-0 border-r bg-background/50 sticky left-0 z-20">
              {Array.from({ length: TOTAL_HOURS }).map((_, i) => {
                const hour = START_HOUR + i;
                return (
                  <div key={hour} className="relative border-b border-transparent" style={{ height: `${HOUR_HEIGHT}px` }}>
                    <span className="absolute -top-3 right-2 text-xs text-muted-foreground font-medium">
                      {format(setHours(new Date(), hour), "h a")}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Day Columns */}
            <div
              className="flex-1 grid divide-x relative"
              style={{ gridTemplateColumns: `repeat(${displayDays.length}, minmax(0, 1fr))` }}
            >
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
              {weekDays.some(day => isSameDay(day, currentTime)) &&
               currentTime.getHours() >= START_HOUR &&
               currentTime.getHours() < END_HOUR && (
                <div
                  className="absolute left-0 right-0 border-t-2 border-red-500 z-30 pointer-events-none flex items-center"
                  style={{
                    top: `${((currentTime.getHours() + currentTime.getMinutes() / 60) - START_HOUR) * HOUR_HEIGHT}px`
                  }}
                >
                  <div className="absolute -left-1.5 w-3 h-3 bg-red-500 rounded-full shadow-lg shadow-red-500/30" />
                </div>
              )}

              {displayDays.map((day) => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const dayEvents = positionedEventsByDay.get(dayKey) || [];
                const isToday = isSameDay(day, new Date());

                return (
                  <div key={day.toISOString()} className={cn("relative h-full group", isToday && "bg-blue-50/10")}>
                    {/* Clickable Background Slots */}
                    {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-full hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer z-0"
                        style={{ top: `${i * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                        onClick={() => handleEmptySlotClick(day, START_HOUR + i)}
                      />
                    ))}

                    {/* Schedule Blocks (breaks, unavailable, vacation) */}
                    {getScheduleBlocks(day).map((block, blockIndex) => {
                      const blockStyle = BLOCK_STYLES[block.type];
                      const topOffset = (block.startHour - START_HOUR) * HOUR_HEIGHT;
                      const height = (block.endHour - block.startHour) * HOUR_HEIGHT;

                      return (
                        <Tooltip key={`block-${blockIndex}`}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "absolute left-0 right-0 z-5 flex items-center justify-center border-y border-dashed pointer-events-none",
                                blockStyle?.bg,
                                blockStyle?.pattern,
                                "border-gray-300 dark:border-gray-600"
                              )}
                              style={{
                                top: `${Math.max(0, topOffset)}px`,
                                height: `${Math.max(20, height)}px`,
                              }}
                            >
                              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/80 dark:bg-gray-900/80 shadow-sm">
                                <span className="text-sm">{blockStyle?.icon}</span>
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                  {block.label}
                                </span>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{blockStyle?.label}</p>
                            <p className="text-xs text-muted-foreground">{block.label}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}

                    {/* Empty State for Day */}
                    {dayEvents.length === 0 && !getScheduleBlocks(day).some(b => b.type === 'vacation' || b.type === 'sick-leave') && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                        <CalendarX className="h-6 w-6 text-gray-400" />
                      </div>
                    )}

                    {/* Events */}
                    {dayEvents.map((event) => {
                      const style = getEventStyle(event);
                      const isSelected = event.id === selectedAppointmentId;
                      const isOverlapping = event.totalColumns > 1;

                      return (
                        <Tooltip key={event.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "absolute rounded-md border text-xs p-2 cursor-pointer transition-all hover:brightness-95 hover:shadow-md overflow-hidden",
                                STATUS_COLORS[event.status] || "bg-gray-100 border-l-gray-500",
                                isSelected && "ring-2 ring-primary ring-offset-1 shadow-lg",
                                isOverlapping && "border-l-2"
                              )}
                              style={style}
                              onClick={(e) => {
                                e.stopPropagation();
                                onAppointmentClick(event);
                              }}
                            >
                              <div className="font-semibold truncate flex items-center gap-1">
                                {event.urgency === 'high' && <Badge variant="destructive" className="h-3 px-1 text-[8px]">!</Badge>}
                                {event.patient?.first_name} {event.patient?.last_name}
                              </div>
                              <div className="text-[10px] opacity-80 truncate flex items-center gap-1">
                                <Clock className="h-3 w-3 flex-shrink-0" />
                                {format(parseISO(event.appointment_date), "h:mm a")}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="p-0 border-none shadow-xl">
                            <Card className="w-72 border-0">
                              <div className={cn("h-2 w-full", STATUS_COLORS[event.status]?.split(' ')[0])} />
                              <div className="p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                      <AvatarImage src={event.patient?.profile_picture_url || undefined} className="object-cover" />
                                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                        {getPatientInitials(event.patient?.first_name, event.patient?.last_name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-semibold text-sm">{event.patient?.first_name} {event.patient?.last_name}</p>
                                      <p className="text-xs text-muted-foreground">{format(parseISO(event.appointment_date), "EEEE, MMMM d")}</p>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="capitalize text-[10px]">{event.status}</Badge>
                                </div>

                                <div className="text-xs space-y-1 bg-muted/50 p-2 rounded-md">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Time:</span>
                                    <span className="font-medium">
                                      {format(parseISO(event.appointment_date), "h:mm a")} - {format(addHours(parseISO(event.appointment_date), (event.duration_minutes || 30) / 60), "h:mm a")}
                                    </span>
                                  </div>
                                  {event.reason && (
                                    <div className="pt-1 border-t border-dashed mt-1">
                                      <span className="text-muted-foreground block mb-0.5">Reason:</span>
                                      <p className="font-medium">{event.reason}</p>
                                    </div>
                                  )}
                                </div>

                                {!['google-calendar'].includes(event.status) && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="w-full h-8 text-xs" 
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
