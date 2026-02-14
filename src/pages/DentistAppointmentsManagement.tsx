import { useState, useEffect, useRef, useCallback } from "react";
import type { Appointment } from "@/types/shared";
import type { CalendarEvent } from "@/types/appointment";
import { useNavigate } from "react-router-dom";
import { useCurrentDentist } from "@/hooks/useCurrentDentist";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { WeeklyCalendarView } from "@/components/appointments/WeeklyCalendarView";
import { DayCalendarView } from "@/components/appointments/DayCalendarView";
import { DentistAppointmentDetail } from "@/components/appointments/DentistAppointmentDetail";
import { AppointmentStats } from "@/components/appointments/AppointmentStats";
import { MonthlyOverview } from "@/components/appointments/MonthlyOverview";
import { format, addDays, subDays, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ChevronLeft, ChevronRight, Calendar, Grid3x3, CalendarDays, BarChart3, CheckCircle, Clock, AlertTriangle, RefreshCw, WifiOff, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedStatCard } from "@/components/ui/page-enhancements";
import { ErrorState, EmptyState, CalendarSyncStatusCompact, AppointmentErrorBoundary, OfflineBanner } from "@/components/stability";
import { motion, AnimatePresence } from "framer-motion";
import { getFriendlyErrorMessage } from "@/lib/userFriendlyErrors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

function DentistAppointmentsManagementContent() {
  const { businessId } = useBusinessContext();
  const {
    dentistId,
    loading: dentistLoading
  } = useCurrentDentist(businessId);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [viewMode, setViewMode] = useState<"week" | "day" | "completed" | "team">("week");
  const [showStats, setShowStats] = useState(false);
  const [selectedTeamDentistId, setSelectedTeamDentistId] = useState<string | null>(null);
  const [calendarSyncError, setCalendarSyncError] = useState<Error | null>(null);
  const [lastCalendarSync, setLastCalendarSync] = useState<Date | null>(null);
  const lastScrollY = useRef(0);
  const {
    toast
  } = useToast();
  const {
    t
  } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  type TeamDentist = {
    id: string;
    first_name: string | null;
    last_name: string | null;
  };

  const {
    data: teamDentists = []
  } = useQuery<TeamDentist[]>({
    queryKey: ['team-dentists', businessId],
    queryFn: async () => {
      if (!businessId) return [];

      const { data: members, error: membersError } = await supabase
        .from('business_members')
        .select('profile_id')
        .eq('business_id', businessId)
        .in('role', ['dentist', 'admin', 'owner']);

      if (membersError) throw membersError;

      const profileIds = (members || []).map(member => member.profile_id).filter(Boolean);
      if (!profileIds.length) return [];

      const { data: dentistsData, error: dentistsError } = await supabase
        .from('dentists')
        .select('id, first_name, last_name')
        .in('profile_id', profileIds)
        .eq('is_active', true);

      if (dentistsError) throw dentistsError;

      return dentistsData || [];
    },
    enabled: !!businessId,
  });

  useEffect(() => {
    if (!teamDentists.length) return;

    setSelectedTeamDentistId(prevSelected => {
      if (prevSelected && teamDentists.some(dentist => dentist.id === prevSelected)) {
        return prevSelected;
      }

      if (dentistId && teamDentists.some(dentist => dentist.id === dentistId)) {
        return dentistId;
      }

      return teamDentists[0].id;
    });
  }, [teamDentists, dentistId]);

  // Fetch all appointments for stats
  const {
    data: allAppointments = [],
    isLoading: appointmentsLoading,
    error: appointmentsError,
    refetch: refetchAppointments,
    isRefetching
  } = useQuery({
    queryKey: ['all-appointments', dentistId, businessId, currentDate],
    queryFn: async () => {
      if (!dentistId || !businessId) return [];
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(addDays(currentDate, 7));
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("dentist_id", dentistId)
        .eq("business_id", businessId)
        .gte("appointment_date", weekStart.toISOString())
        .lt("appointment_date", weekEnd.toISOString())
        .order("appointment_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!dentistId && !!businessId,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Fetch completed appointments (for "Completed" view)
  const {
    data: completedAppointments = [],
    isLoading: completedLoading,
    error: completedError
  } = useQuery({
    queryKey: ['completed-appointments', dentistId, businessId],
    queryFn: async () => {
      if (!dentistId || !businessId) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          patient:secure_profiles_view!appointments_patient_id_fkey(id, first_name, last_name, email)
        `)
        .eq("dentist_id", dentistId)
        .eq("business_id", businessId)
        .eq("status", "completed")
        .order("appointment_date", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!dentistId && !!businessId && viewMode === 'completed',
    retry: 2,
  });

  // Fetch monthly appointments for overview
  const {
    data: monthlyAppointments = []
  } = useQuery({
    queryKey: ['monthly-appointments', dentistId, businessId, format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      if (!dentistId || !businessId) return [];
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("dentist_id", dentistId)
        .eq("business_id", businessId)
        .gte("appointment_date", monthStart.toISOString())
        .lte("appointment_date", monthEnd.toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!dentistId && !!businessId && showStats,
  });

  // Fetch Google Calendar events
  const {
    data: googleCalendarEvents,
    isLoading: isCalendarSyncing,
    error: googleCalendarError,
    refetch: refetchGoogleCalendar
  } = useQuery({
    queryKey: ['google-calendar-events', dentistId, currentDate],
    queryFn: async () => {
      if (!dentistId) return [];
      const startDate = startOfWeek(currentDate);
      const endDate = endOfWeek(addDays(currentDate, 7));

      try {
        setCalendarSyncError(null);
        const {
          data,
          error
        } = await supabase.functions.invoke('google-calendar-sync', {
          body: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          }
        });

        if (error) {
          const syncError = new Error(error.message || 'Failed to sync calendar');
          setCalendarSyncError(syncError);
          logger.error('Error fetching Google Calendar events:', error);
          return [];
        }

        setLastCalendarSync(new Date());
        return data?.events || [];
      } catch (err) {
        const syncError = err instanceof Error ? err : new Error('Calendar sync failed');
        setCalendarSyncError(syncError);
        logger.error('Calendar sync exception:', err);
        return [];
      }
    },
    enabled: !!dentistId,
    refetchInterval: 300000, // Refresh every 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  const navigateDate = useCallback((direction: "prev" | "next") => {
    const daysToAdd = viewMode === "week" ? 7 : 1;
    setCurrentDate(prev => direction === "next" ? addDays(prev, daysToAdd) : subDays(prev, daysToAdd));
  }, [viewMode]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Keyboard navigation for dates
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            navigateDate('prev');
          }
          break;
        case 'ArrowRight':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            navigateDate('next');
          }
          break;
        case 't':
        case 'T':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            goToToday();
          }
          break;
        case 'w':
        case 'W':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            setViewMode('week');
          }
          break;
        case 'd':
        case 'D':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            setViewMode('day');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateDate, goToToday]);

  const handleAppointmentClick = (calendarEvent: CalendarEvent) => {
    // Cast calendar event to Appointment-like object for handling
    const appointment = calendarEvent as unknown as Appointment;
    
    // Determine if appointment is actionable (can enter consultation)
    const isPending = appointment.status === 'pending';
    const isCompleted = appointment.status === 'completed';
    const isCancelled = appointment.status === 'cancelled';

    // Actionable = not pending, not completed, not cancelled
    const isActionable = !isPending && !isCompleted && !isCancelled && appointment.patient_id;

    if (isActionable) {
      // Navigate directly to consultation mode
      navigate(`/dentist/patients?patientId=${appointment.patient_id}&appointmentId=${appointment.id}`);
      return;
    }

    // For non-actionable (pending/completed/cancelled), show the appointment details sidebar
    setSelectedAppointment(appointment);
    setViewMode("day");
    setCurrentDate(parseISO(appointment.appointment_date));
  };

  const handleDayViewAppointmentClick = (calendarEvent: CalendarEvent) => {
    // For day view, we just select the appointment (the full data is fetched by the calendar)
    const appointment = calendarEvent as unknown as Appointment;
    setSelectedAppointment(appointment);
  };

  const handleBackToWeek = () => {
    setViewMode("week");
    setSelectedAppointment(null);
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      const {
        error
      } = await supabase.from("appointments").update({
        status: newStatus,
        updated_at: new Date().toISOString()
      }).eq("id", appointmentId);
      if (error) throw error;

      // Sync to Google Calendar - delete if cancelled, otherwise update
      try {
        const action = newStatus === 'cancelled' ? 'delete' : 'update';
        await supabase.functions.invoke('google-calendar-create-event', {
          body: {
            appointmentId,
            action
          }
        });
      } catch (calendarError) {
        logger.error('Failed to sync status change to Google Calendar:', calendarError);
      }
      toast({
        title: "Success",
        description: "Appointment status updated successfully"
      });

      // Refresh the selected appointment if it's the one being updated
      if (selectedAppointment?.id === appointmentId) {
        setSelectedAppointment({
          ...selectedAppointment,
          status: newStatus as Appointment['status']
        });
      }

      // Invalidate calendar queries to refresh agenda colors/status
      await queryClient.invalidateQueries({
        queryKey: ["appointments-calendar"],
        exact: false
      });
    } catch (error) {
      logger.error('Failed to update appointment status:', error);
      toast({
        title: "Error",
        description: "Failed to update appointment status",
        variant: "destructive"
      });
    }
  };

  const getDateRangeLabel = () => {
    if (viewMode === "day") {
      return format(currentDate, "EEEE, MMMM d, yyyy");
    }
    const weekEnd = addDays(currentDate, 6);
    return `${format(currentDate, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
  };

  if (dentistLoading) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-950 dark:via-blue-950/30 dark:to-purple-950/30">
        {/* Header skeleton */}
        <div className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl sticky top-0 z-30 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-10 w-[200px] rounded-xl" />
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-[100px] rounded-xl" />
              <Skeleton className="h-9 w-[80px] rounded-xl" />
              <Skeleton className="h-9 w-[80px] rounded-xl" />
            </div>
          </div>
        </div>
        {/* Calendar skeleton */}
        <div className="flex-1 p-4 sm:p-6">
          <div className="grid grid-cols-7 gap-4">
            {Array.from({ length: 7 }).map((_, dayIndex) => (
              <div key={dayIndex} className="space-y-3">
                <Skeleton className="h-8 w-full rounded-lg" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!dentistId) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {t.notRegisteredDentist}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine if there's an error to show
  const hasError = appointmentsError || completedError;
  const isNetworkError = (error: unknown) => {
    const err = error as Error | null;
    return err?.message?.includes('fetch') || err?.message?.includes('network');
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-950 dark:via-blue-950/30 dark:to-purple-950/30">
      {/* Error Banner */}
      <AnimatePresence>
        {hasError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800 px-4 py-3"
          >
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center gap-3">
                {isNetworkError(appointmentsError || completedError) ? (
                  <WifiOff className="h-5 w-5 text-red-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    {isNetworkError(appointmentsError || completedError)
                      ? "Connection issue"
                      : "Failed to load appointments"}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {isNetworkError(appointmentsError || completedError)
                      ? "Please check your internet connection"
                      : "Please try again in a moment"}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchAppointments()}
                disabled={isRefetching}
                className="border-red-200 hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900"
              >
                {isRefetching ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Retry
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Controls Only - Header Removed */}
      <div className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl sticky top-0 z-30 transition-all duration-300 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-6 py-3">
          {/* Date Navigation */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateDate("prev")}
              className="h-10 w-10 rounded-xl border-2 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-950 transition-all shadow-sm"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 rounded-xl border border-blue-100 dark:border-blue-900">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-base font-semibold text-foreground min-w-[180px] text-center">
                {getDateRangeLabel()}
              </span>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateDate("next")}
              className="h-10 w-10 rounded-xl border-2 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-950 transition-all shadow-sm"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* View Mode & Today Button */}
          <div className="flex items-center gap-2">
            {/* Google Calendar Sync Status */}
            <CalendarSyncStatusCompact
              lastSyncTime={lastCalendarSync}
              isSyncing={isCalendarSyncing}
              syncError={calendarSyncError}
              onSync={() => refetchGoogleCalendar()}
            />

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
              <Button
                variant={viewMode === "week" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("week")}
                className={cn(
                  "h-9 px-3 rounded-lg transition-all",
                  viewMode === "week"
                    ? "bg-white dark:bg-gray-900 shadow-sm"
                    : "hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                <Grid3x3 className="h-4 w-4 mr-2" />
                Week
              </Button>
              <Button
                variant={viewMode === "day" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("day")}
                className={cn(
                  "h-9 px-3 rounded-lg transition-all",
                  viewMode === "day"
                    ? "bg-white dark:bg-gray-900 shadow-sm"
                    : "hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                Day
              </Button>
              <Button
                variant={viewMode === "completed" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("completed")}
                className={cn(
                  "h-9 px-3 rounded-lg transition-all",
                  viewMode === "completed"
                    ? "bg-white dark:bg-gray-900 shadow-sm"
                    : "hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Completed
              </Button>
            </div>

            {/* Team Schedule Dropdown - Desktop only */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={viewMode === "team" ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-9 rounded-xl border-2 transition-all shadow-sm font-semibold hidden lg:flex",
                    viewMode === "team"
                      ? "bg-foreground text-background"
                      : "hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-950"
                  )}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Team
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Select dentist</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {teamDentists.length === 0 ? (
                  <DropdownMenuItem disabled>No dentists available</DropdownMenuItem>
                ) : (
                  [...teamDentists]
                    .sort((a, b) => {
                      if (a.id === dentistId) return -1;
                      if (b.id === dentistId) return 1;
                      return 0;
                    })
                    .map((teamDentist) => {
                      const fullName = [teamDentist.first_name, teamDentist.last_name].filter(Boolean).join(' ').trim() || 'Unnamed dentist';
                      const isSelected = selectedTeamDentistId === teamDentist.id;
                      const isCurrentUser = teamDentist.id === dentistId;

                      return (
                        <DropdownMenuItem
                          key={teamDentist.id}
                          onSelect={() => {
                            setSelectedTeamDentistId(teamDentist.id);
                            setViewMode('team');
                          }}
                          className={cn(isSelected && 'bg-muted')}
                        >
                          {fullName}
                          {isCurrentUser && (
                            <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">YOU</Badge>
                          )}
                        </DropdownMenuItem>
                      );
                    })
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Stats Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStats(!showStats)}
              className={cn(
                "h-9 rounded-xl border-2 transition-all shadow-sm font-semibold",
                showStats
                  ? "bg-blue-50 border-blue-200 dark:bg-blue-950"
                  : "hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-950"
              )}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Stats
            </Button>

            {/* Today Button - more prominent when not viewing today */}
            <Button
              variant={isSameDay(currentDate, new Date()) ? "outline" : "default"}
              size="sm"
              onClick={goToToday}
              className={cn(
                "h-9 rounded-xl border-2 transition-all shadow-sm font-semibold",
                isSameDay(currentDate, new Date())
                  ? "hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-950"
                  : "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 animate-pulse"
              )}
              title="Press 'T' to jump to today"
            >
              Today
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      {showStats && (
        <div className="px-4 sm:px-6 pt-4 pb-4 border-b bg-gradient-to-br from-gray-50/50 via-blue-50/30 to-purple-50/30 dark:from-gray-950/50 dark:via-blue-950/30 dark:to-purple-950/30 space-y-4">
          <AppointmentStats appointments={allAppointments} dentistId={dentistId || ""} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <MonthlyOverview
                appointments={monthlyAppointments}
                currentDate={currentDate}
                onDateClick={(date) => {
                  setCurrentDate(date);
                  setViewMode("day");
                }}
              />
            </div>
            <div className="lg:col-span-2">
              <Card className="border-2 h-full bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
                <CardHeader>
                  <h3 className="text-base font-semibold">Quick Insights</h3>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {(() => {
                    // Calculate busiest day properly
                    const dayGroups: Record<string, number> = {};
                    allAppointments.forEach(apt => {
                      const day = format(new Date(apt.appointment_date), "EEEE");
                      dayGroups[day] = (dayGroups[day] || 0) + 1;
                    });
                    const busiestDay = Object.entries(dayGroups).sort((a, b) => b[1] - a[1])[0];

                    // Calculate week stats
                    const confirmed = allAppointments.filter(a => a.status === 'confirmed').length;
                    const completed = allAppointments.filter(a => a.status === 'completed').length;
                    const pending = allAppointments.filter(a => a.status === 'pending').length;
                    const completionRate = (confirmed + completed) > 0
                      ? Math.round((completed / (confirmed + completed)) * 100)
                      : 0;

                    return (
                      <>
                        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                          <span className="text-muted-foreground font-medium">Busiest Day This Week</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {busiestDay ? `${busiestDay[0]} (${busiestDay[1]})` : "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/30 rounded-lg border border-green-200/50 dark:border-green-800/50">
                          <span className="text-muted-foreground font-medium">Week Completion Rate</span>
                          <span className="font-bold text-green-600 dark:text-green-400">
                            {completionRate}%
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col p-3 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/30 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
                            <span className="text-xs text-muted-foreground font-medium mb-1">This Month</span>
                            <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                              {monthlyAppointments.length}
                            </span>
                          </div>
                          <div className="flex flex-col p-3 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30 rounded-lg border border-amber-200/50 dark:border-amber-800/50">
                            <span className="text-xs text-muted-foreground font-medium mb-1">Pending</span>
                            <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                              {pending}
                            </span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Calendar View */}
        <div className={cn(
          "px-4 sm:px-6 pt-4 pb-4 overflow-auto transition-all duration-300",
          selectedAppointment ? "hidden md:block md:w-[65%]" : "flex-1"
        )}>
          {viewMode === "team" ? (
            <WeeklyCalendarView
              dentistId={dentistId}
              businessId={businessId || undefined}
              currentDate={currentDate}
              onAppointmentClick={handleAppointmentClick}
              selectedAppointmentId={selectedAppointment?.id}
              googleCalendarEvents={googleCalendarEvents}
              showAllDentists={true}
              dentistFilterId={selectedTeamDentistId || undefined}
            />
          ) : dentistLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                <p className="text-sm text-muted-foreground">Loading your schedule...</p>
              </div>
            </div>
          ) : !dentistId ? (
            <div className="flex justify-center items-center h-full">
              <Card className="max-w-md">
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-full flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-muted-foreground">{t.notRegisteredDentist}</p>
                </CardContent>
              </Card>
            </div>
          ) : viewMode === "week" ? (
            <WeeklyCalendarView
              dentistId={dentistId}
              businessId={businessId || undefined}
              currentDate={currentDate}
              onAppointmentClick={handleAppointmentClick}
              selectedAppointmentId={selectedAppointment?.id}
              googleCalendarEvents={googleCalendarEvents}
            />
          ) : viewMode === "day" ? (
            <DayCalendarView
              dentistId={dentistId}
              businessId={businessId || undefined}
              currentDate={currentDate}
              onAppointmentClick={handleDayViewAppointmentClick}
              selectedAppointmentId={selectedAppointment?.id}
              googleCalendarEvents={googleCalendarEvents}
            />
          ) : (
            // Completed appointments list view
            <div className="space-y-4 max-w-4xl">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                Completed Appointments
              </h2>
              {completedAppointments.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No completed appointments found.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {completedAppointments.map((apt) => {
                    // Null safety checks
                    const patientName = apt.patient
                      ? `${apt.patient.first_name || 'Unknown'} ${apt.patient.last_name || 'Patient'}`
                      : 'Unknown Patient';
                    const reason = apt.reason || 'No reason specified';

                    return (
                      <Card
                        key={apt.id}
                        className={cn(
                          "cursor-pointer hover:border-emerald-300 transition-colors",
                          selectedAppointment?.id === apt.id && "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                        )}
                        onClick={() => setSelectedAppointment(apt)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="font-medium">{patientName}</p>
                              <p className="text-sm text-muted-foreground">{reason}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(parseISO(apt.appointment_date), "EEEE, MMM d, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                                Completed
                              </Badge>
                              {apt.completed_at && (
                                <span className="text-xs text-muted-foreground">Finalized</span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Appointment Detail Sheet */}
      <Sheet open={!!selectedAppointment} onOpenChange={(open) => !open && handleBackToWeek()}>
        <SheetContent className="w-full sm:max-w-md p-0 overflow-y-auto" side="right">
          {selectedAppointment && (
            <DentistAppointmentDetail
              appointment={selectedAppointment}
              onClose={handleBackToWeek}
              onStatusChange={handleStatusChange}
              onOptimisticUpdate={(appointmentId, updates) => {
                // Update local state immediately for instant UI feedback
                setSelectedAppointment((prev) => prev?.id === appointmentId ? { ...prev, ...updates } : prev);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Wrap with error boundary and offline detection for better stability
export default function DentistAppointmentsManagement() {
  return (
    <AppointmentErrorBoundary context="management">
      <OfflineBanner />
      <DentistAppointmentsManagementContent />
    </AppointmentErrorBoundary>
  );
}
