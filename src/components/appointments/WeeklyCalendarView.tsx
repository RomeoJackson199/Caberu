import { useState, useMemo, useEffect, useRef } from "react";
import { format, startOfWeek, addDays, addHours, isSameDay, parseISO, differenceInMinutes, setHours, setMinutes, startOfDay } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Plus, Clock } from "lucide-react";
import { QuickAppointmentDialog } from "./QuickAppointmentDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/hooks/useLanguage";

interface WeeklyCalendarViewProps {
  dentistId: string;
  businessId?: string;
  currentDate: Date;
  onAppointmentClick: (appointment: any) => void;
  selectedAppointmentId?: string;
  googleCalendarEvents?: any[];
}

const STATUS_COLORS: Record<string, string> = {
  "completed": "bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-100 border-l-4 border-l-emerald-500",
  "cancelled": "bg-gray-100/80 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400 border-l-4 border-l-gray-400 opacity-70",
  "confirmed": "bg-blue-100/80 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 border-l-4 border-l-blue-500",
  "pending": "bg-amber-100/80 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 border-l-4 border-l-amber-500",
  "google-calendar": "bg-purple-100/80 dark:bg-purple-900/40 text-purple-900 dark:text-purple-100 border-l-4 border-l-purple-500",
};

// Visual block patterns for schedule indicators
const BLOCK_STYLES: Record<string, { bg: string; pattern: string; label: string; icon: string }> = {
  "break": {
    bg: "bg-orange-100/60 dark:bg-orange-900/30",
    pattern: "bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(251,146,60,0.3)_5px,rgba(251,146,60,0.3)_10px)]",
    label: "Break",
    icon: "☕"
  },
  "sick-leave": {
    bg: "bg-red-100/60 dark:bg-red-900/30",
    pattern: "bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(239,68,68,0.3)_5px,rgba(239,68,68,0.3)_10px)]",
    label: "Sick Leave",
    icon: "🏥"
  },
  "unavailable": {
    bg: "bg-gray-200/60 dark:bg-gray-800/60",
    pattern: "bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(156,163,175,0.2)_2px,rgba(156,163,175,0.2)_4px)]",
    label: "Unavailable",
    icon: "🚫"
  },
  "vacation": {
    bg: "bg-teal-100/60 dark:bg-teal-900/30",
    pattern: "bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(20,184,166,0.3)_5px,rgba(20,184,166,0.3)_10px)]",
    label: "Vacation",
    icon: "🌴"
  }
};

const HOUR_HEIGHT = 80; // Height of one hour in pixels
const START_HOUR = 7; // Calendar starts at 7 AM
const END_HOUR = 20; // Calendar ends at 8 PM
const TOTAL_HOURS = END_HOUR - START_HOUR;

export function WeeklyCalendarView({
  dentistId,
  businessId,
  currentDate,
  onAppointmentClick,
  selectedAppointmentId,
  googleCalendarEvents = []
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

  // Fetch appointments
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments-calendar", dentistId, businessId, format(weekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      const weekEnd = addDays(weekStart, 7);
      let query = supabase
        .from("appointments")
        .select("*")
        .eq("dentist_id", dentistId)
        .gte("appointment_date", weekStart.toISOString())
        .lt("appointment_date", weekEnd.toISOString())
        .order("appointment_date", { ascending: true });

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
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", patientIds);
        const map = new Map((profiles || []).map((p: any) => [p.id, p]));
        return appointments.map((a: any) => ({ ...a, patient: map.get(a.patient_id) || null }));
      }
      return appointments;
    }
  });

  // Fetch dentist availability for the week (break times, working hours, availability)
  const { data: availability = [] } = useQuery({
    queryKey: ["dentist-availability", dentistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dentist_availability")
        .select("*")
        .eq("dentist_id", dentistId);
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch vacation/sick leave days for the current week
  const { data: vacationDays = [] } = useQuery({
    queryKey: ["dentist-vacation-days", dentistId, format(weekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      const weekEnd = addDays(weekStart, 7);
      const { data, error } = await supabase
        .from("dentist_vacation_days")
        .select("*")
        .eq("dentist_id", dentistId)
        .gte("end_date", format(weekStart, "yyyy-MM-dd"))
        .lte("start_date", format(weekEnd, "yyyy-MM-dd"));
      if (error) throw error;
      return data || [];
    }
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


  // Helper to calculate position styles
  const getEventStyle = (event: any) => {
    const startDate = parseISO(event.appointment_date);
    const startHour = startDate.getHours() + (startDate.getMinutes() / 60);
    const durationHours = (event.duration_minutes || 30) / 60;

    // Calculate top offset relative to START_HOUR
    const top = (startHour - START_HOUR) * HOUR_HEIGHT;
    const height = durationHours * HOUR_HEIGHT;

    return {
      top: `${Math.max(0, top)}px`,
      height: `${Math.max(20, height)}px`, // Minimum height for visibility
      left: '2px',
      right: '2px',
    };
  };

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

        {/* Calendar Header (Days) */}
        <div className="flex border-b bg-muted/5">
          <div className="w-16 flex-shrink-0 border-r bg-background/50" /> {/* Time axis spacer */}
          <div
            className="flex-1 grid divide-x"
            style={{ gridTemplateColumns: `repeat(${displayDays.length}, minmax(0, 1fr))` }}
          >
            {displayDays.map((day) => {
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()} className={cn("py-3 text-center", isToday && "bg-blue-50/50 dark:bg-blue-900/10")}>
                  <div className={cn("text-xs font-medium uppercase mb-1", isToday ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground")}>
                    {format(day, "EEE")}
                  </div>
                  <div className={cn(
                    "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                    isToday ? "bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/20" : "text-foreground"
                  )}>
                    {format(day, "d")}
                  </div>
                </div>
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

              {/* Current Time Indicator */}
              {weekDays.some(day => isSameDay(day, currentTime)) && (
                <div
                  className="absolute left-0 right-0 border-t-2 border-red-500 z-10 pointer-events-none flex items-center"
                  style={{
                    top: `${((currentTime.getHours() + currentTime.getMinutes() / 60) - START_HOUR) * HOUR_HEIGHT}px`
                  }}
                >
                  <div className="absolute -left-1.5 w-3 h-3 bg-red-500 rounded-full" />
                </div>
              )}

              {displayDays.map((day) => {
                const dayEvents = allEvents.filter(e => isSameDay(parseISO(e.appointment_date), day));
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

                    {/* Events */}
                    {dayEvents.map((event) => {
                      const style = getEventStyle(event);
                      const isSelected = event.id === selectedAppointmentId;

                      return (
                        <Tooltip key={event.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "absolute rounded-md border text-xs p-2 cursor-pointer transition-all hover:brightness-95 hover:shadow-md z-10 overflow-hidden",
                                STATUS_COLORS[event.status] || "bg-gray-100 border-l-gray-500",
                                isSelected && "ring-2 ring-primary ring-offset-1 z-20 shadow-lg"
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
                                <Clock className="h-3 w-3" />
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
