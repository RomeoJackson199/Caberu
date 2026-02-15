import { useState, useEffect, useMemo, useCallback } from "react";
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
import { format, addDays, subDays, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, isToday, addHours } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Grid3x3,
  CalendarDays,
  BarChart3,
  Clock,
  AlertTriangle,
  RefreshCw,
  WifiOff,
  Users,
  List,
  Stethoscope,
  CircleDot,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, EmptyState, CalendarSyncStatusCompact, AppointmentErrorBoundary, OfflineBanner } from "@/components/stability";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type ViewMode = "week" | "day" | "agenda" | "team";
type StatusFilter = "all" | "pending" | "confirmed" | "completed" | "cancelled";

const STATUS_FILTER_CONFIG: Record<StatusFilter, { label: string; color: string; activeColor: string }> = {
  all: { label: "All", color: "text-muted-foreground", activeColor: "bg-foreground text-background" },
  pending: { label: "Pending", color: "text-amber-600", activeColor: "bg-amber-500 text-white" },
  confirmed: { label: "Confirmed", color: "text-blue-600", activeColor: "bg-blue-500 text-white" },
  completed: { label: "Completed", color: "text-emerald-600", activeColor: "bg-emerald-500 text-white" },
  cancelled: { label: "Cancelled", color: "text-gray-500", activeColor: "bg-gray-500 text-white" },
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400 border-gray-200 dark:border-gray-700",
};

function DentistAppointmentsManagementContent() {
  const { businessId } = useBusinessContext();
  const {
    dentistId,
    loading: dentistLoading
  } = useCurrentDentist(businessId);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showStats, setShowStats] = useState(false);
  const [selectedTeamDentistId, setSelectedTeamDentistId] = useState<string | null>(null);
  const [calendarSyncError, setCalendarSyncError] = useState<Error | null>(null);
  const [lastCalendarSync, setLastCalendarSync] = useState<Date | null>(null);
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

  // Fetch all appointments for stats and agenda view
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
        .from("appointments_decrypted")
        .select("*")
        .eq("dentist_id", dentistId)
        .eq("business_id", businessId)
        .gte("appointment_date", weekStart.toISOString())
        .lt("appointment_date", weekEnd.toISOString())
        .order("appointment_date", { ascending: true });

      if (error) throw error;

      // Fetch patient profiles
      const patientIds = [...new Set((data || []).map(a => a.patient_id).filter(Boolean))];
      const { data: profiles } = patientIds.length > 0
        ? await supabase.from('profiles').select('id, first_name, last_name, email').in('id', patientIds)
        : { data: [] };

      const profilesMap = new Map((profiles || []).map(p => [p.id, p]));
      return (data || []).map(apt => ({
        ...apt,
        patient: profilesMap.get(apt.patient_id) || undefined,
      }));
    },
    enabled: !!dentistId && !!businessId,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 5000),
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
        .from("appointments_decrypted")
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
    refetchInterval: 300000,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Compute agenda items (for agenda view) - filtered by status and sorted by time
  const agendaAppointments = useMemo(() => {
    let filtered = allAppointments;

    // In agenda view, show appointments for the selected day
    if (viewMode === "agenda") {
      filtered = filtered.filter(apt =>
        isSameDay(parseISO(apt.appointment_date), currentDate)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }

    return filtered.sort((a, b) =>
      new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
    );
  }, [allAppointments, statusFilter, viewMode, currentDate]);

  // Compute "next up" appointment - the nearest upcoming confirmed/pending appointment
  const nextUpAppointment = useMemo(() => {
    const now = new Date();
    return allAppointments.find(apt => {
      const aptDate = new Date(apt.appointment_date);
      return aptDate > now && (apt.status === 'confirmed' || apt.status === 'pending');
    });
  }, [allAppointments]);

  // Status counts for filter badges
  const statusCounts = useMemo(() => {
    const todayAppts = allAppointments.filter(apt =>
      isSameDay(parseISO(apt.appointment_date), currentDate)
    );
    const source = viewMode === "agenda" ? todayAppts : allAppointments;
    return {
      all: source.length,
      pending: source.filter(a => a.status === 'pending').length,
      confirmed: source.filter(a => a.status === 'confirmed').length,
      completed: source.filter(a => a.status === 'completed').length,
      cancelled: source.filter(a => a.status === 'cancelled').length,
    };
  }, [allAppointments, viewMode, currentDate]);

  const navigateDate = useCallback((direction: "prev" | "next") => {
    const daysToAdd = viewMode === "week" || viewMode === "team" ? 7 : 1;
    setCurrentDate(prev => direction === "next" ? addDays(prev, daysToAdd) : subDays(prev, daysToAdd));
  }, [viewMode]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Keyboard navigation for dates
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
        case 'a':
        case 'A':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            setViewMode('agenda');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateDate, goToToday]);

  const handleAppointmentClick = (calendarEvent: CalendarEvent) => {
    const appointment = calendarEvent as unknown as Appointment;

    const isPending = appointment.status === 'pending';
    const isCompleted = appointment.status === 'completed';
    const isCancelled = appointment.status === 'cancelled';

    const isActionable = !isPending && !isCompleted && !isCancelled && appointment.patient_id;

    if (isActionable) {
      navigate(`/dentist/patients?patientId=${appointment.patient_id}&appointmentId=${appointment.id}`);
      return;
    }

    setSelectedAppointment(appointment);
    if (viewMode === "week") {
      setViewMode("day");
      setCurrentDate(parseISO(appointment.appointment_date));
    }
  };

  const handleAgendaAppointmentClick = (apt: Appointment) => {
    const isPending = apt.status === 'pending';
    const isCompleted = apt.status === 'completed';
    const isCancelled = apt.status === 'cancelled';

    const isActionable = !isPending && !isCompleted && !isCancelled && apt.patient_id;

    if (isActionable) {
      navigate(`/dentist/patients?patientId=${apt.patient_id}&appointmentId=${apt.id}`);
      return;
    }

    setSelectedAppointment(apt);
  };

  const handleDayViewAppointmentClick = (calendarEvent: CalendarEvent) => {
    const appointment = calendarEvent as unknown as Appointment;
    setSelectedAppointment(appointment);
  };

  const handleCloseDetail = () => {
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

      if (selectedAppointment?.id === appointmentId) {
        setSelectedAppointment({
          ...selectedAppointment,
          status: newStatus as Appointment['status']
        });
      }

      await queryClient.invalidateQueries({
        queryKey: ["appointments-calendar"],
        exact: false
      });
      await queryClient.invalidateQueries({
        queryKey: ["all-appointments"],
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
    if (viewMode === "day" || viewMode === "agenda") {
      return format(currentDate, "EEEE, MMMM d, yyyy");
    }
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
  };

  if (dentistLoading) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-950 dark:via-blue-950/30 dark:to-purple-950/30">
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

  const hasError = !!appointmentsError;
  const isNetworkError = (error: unknown) => {
    const err = error as Error | null;
    return err?.message?.includes('fetch') || err?.message?.includes('network');
  };

  // Whether to show the status filter bar (agenda view always, others when useful)
  const showStatusFilter = viewMode === "agenda";

  return (
    <div className="h-screen flex flex-col bg-gray-50/80 dark:bg-gray-950/80">
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
                {isNetworkError(appointmentsError) ? (
                  <WifiOff className="h-5 w-5 text-red-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    {isNetworkError(appointmentsError)
                      ? "Connection issue"
                      : "Failed to load appointments"}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {isNetworkError(appointmentsError)
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

      {/* ===== TOOLBAR ===== */}
      <div className="border-b bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl sticky top-0 z-30 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-6 py-2.5">
          {/* Left: Date navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateDate("prev")}
              className="h-9 w-9 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <button
              onClick={goToToday}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors min-w-[200px] justify-center",
                isSameDay(currentDate, new Date())
                  ? "bg-gray-100 dark:bg-gray-800 text-foreground"
                  : "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50"
              )}
              title="Press 'T' to jump to today"
            >
              <Calendar className="h-3.5 w-3.5" />
              {getDateRangeLabel()}
            </button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateDate("next")}
              className="h-9 w-9 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {!isSameDay(currentDate, new Date()) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goToToday}
                className="h-8 px-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50"
              >
                Today
              </Button>
            )}
          </div>

          {/* Right: View controls */}
          <div className="flex items-center gap-2">
            {/* Calendar sync */}
            <CalendarSyncStatusCompact
              lastSyncTime={lastCalendarSync}
              isSyncing={isCalendarSyncing}
              syncError={calendarSyncError}
              onSync={() => refetchGoogleCalendar()}
            />

            {/* View Mode Toggle - clean segmented control */}
            <div className="flex items-center p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <button
                onClick={() => setViewMode("week")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  viewMode === "week"
                    ? "bg-white dark:bg-gray-900 shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Week view (W)"
              >
                <Grid3x3 className="h-3.5 w-3.5" />
                Week
              </button>
              <button
                onClick={() => setViewMode("day")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  viewMode === "day"
                    ? "bg-white dark:bg-gray-900 shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Day view (D)"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Day
              </button>
              <button
                onClick={() => setViewMode("agenda")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  viewMode === "agenda"
                    ? "bg-white dark:bg-gray-900 shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Agenda list (A)"
              >
                <List className="h-3.5 w-3.5" />
                Agenda
              </button>
            </div>

            {/* Team dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={viewMode === "team" ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-8 rounded-lg text-xs font-medium hidden lg:flex",
                    viewMode === "team" && "bg-foreground text-background"
                  )}
                >
                  <Users className="h-3.5 w-3.5 mr-1.5" />
                  Team
                  <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>View team schedule</DropdownMenuLabel>
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
                            <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">YOU</Badge>
                          )}
                        </DropdownMenuItem>
                      );
                    })
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Stats toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStats(!showStats)}
              className={cn(
                "h-8 rounded-lg text-xs font-medium",
                showStats && "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
              )}
            >
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
              Stats
            </Button>
          </div>
        </div>

        {/* ===== NEXT UP STRIP ===== */}
        {nextUpAppointment && isToday(currentDate) && !showStats && (
          <div className="px-4 sm:px-6 pb-2.5">
            <button
              onClick={() => handleAgendaAppointmentClick(nextUpAppointment as Appointment)}
              className="w-full flex items-center gap-3 px-3 py-2 bg-blue-50/80 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/50 hover:bg-blue-100/80 dark:hover:bg-blue-950/50 transition-colors text-left group"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex-shrink-0">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Next up</span>
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(nextUpAppointment.appointment_date), "h:mm a")}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground truncate">
                  {nextUpAppointment.patient
                    ? `${nextUpAppointment.patient.first_name || ''} ${nextUpAppointment.patient.last_name || ''}`.trim()
                    : 'Patient'}
                  {nextUpAppointment.reason && (
                    <span className="text-muted-foreground font-normal"> &middot; {nextUpAppointment.reason}</span>
                  )}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 transition-colors flex-shrink-0" />
            </button>
          </div>
        )}
      </div>

      {/* ===== STATUS FILTER BAR (Agenda view) ===== */}
      {showStatusFilter && (
        <div className="px-4 sm:px-6 py-2 border-b bg-white/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-1.5">
            {(Object.entries(STATUS_FILTER_CONFIG) as [StatusFilter, typeof STATUS_FILTER_CONFIG[StatusFilter]][]).map(([key, config]) => {
              const count = statusCounts[key];
              const isActive = statusFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                    isActive
                      ? cn(config.activeColor, "border-transparent shadow-sm")
                      : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-muted-foreground hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  {config.label}
                  {count > 0 && (
                    <span className={cn(
                      "text-[10px] px-1.5 py-0 rounded-full min-w-[18px] text-center",
                      isActive
                        ? "bg-white/20"
                        : "bg-gray-100 dark:bg-gray-800"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== STATS DASHBOARD ===== */}
      {showStats && (
        <div className="px-4 sm:px-6 pt-4 pb-4 border-b bg-white/50 dark:bg-gray-900/30 space-y-4">
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
              <Card className="border h-full">
                <CardHeader className="pb-3">
                  <h3 className="text-sm font-semibold">Week at a Glance</h3>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm">
                  {(() => {
                    const dayGroups: Record<string, number> = {};
                    allAppointments.forEach(apt => {
                      const day = format(new Date(apt.appointment_date), "EEEE");
                      dayGroups[day] = (dayGroups[day] || 0) + 1;
                    });
                    const busiestDay = Object.entries(dayGroups).sort((a, b) => b[1] - a[1])[0];
                    const confirmed = allAppointments.filter(a => a.status === 'confirmed').length;
                    const completed = allAppointments.filter(a => a.status === 'completed').length;
                    const pending = allAppointments.filter(a => a.status === 'pending').length;
                    const completionRate = (confirmed + completed) > 0
                      ? Math.round((completed / (confirmed + completed)) * 100)
                      : 0;

                    return (
                      <>
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                          <span className="text-muted-foreground text-xs">Busiest day</span>
                          <span className="font-semibold text-sm">
                            {busiestDay ? `${busiestDay[0]} (${busiestDay[1]})` : "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                          <span className="text-muted-foreground text-xs">Completion rate</span>
                          <span className="font-semibold text-sm">{completionRate}%</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="flex flex-col items-center p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{pending}</span>
                            <span className="text-[10px] text-muted-foreground">Pending</span>
                          </div>
                          <div className="flex flex-col items-center p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{confirmed}</span>
                            <span className="text-[10px] text-muted-foreground">Confirmed</span>
                          </div>
                          <div className="flex flex-col items-center p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{completed}</span>
                            <span className="text-[10px] text-muted-foreground">Done</span>
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

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex overflow-hidden">
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
            /* ===== AGENDA LIST VIEW ===== */
            <div className="max-w-3xl mx-auto space-y-1">
              {appointmentsLoading ? (
                <div className="space-y-3 pt-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              ) : agendaAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                    <Calendar className="h-7 w-7 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {statusFilter !== "all"
                      ? `No ${statusFilter} appointments for this day`
                      : "No appointments scheduled for this day"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Navigate to another day or change the filter
                  </p>
                </div>
              ) : (
                <>
                  {/* Day summary header */}
                  <div className="flex items-center justify-between py-3 mb-2">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      {format(currentDate, "EEEE, MMMM d")}
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      {agendaAppointments.length} appointment{agendaAppointments.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Appointment list */}
                  {agendaAppointments.map((apt, index) => {
                    const patientName = apt.patient
                      ? `${apt.patient.first_name || ''} ${apt.patient.last_name || ''}`.trim() || 'Unknown Patient'
                      : 'Unknown Patient';
                    const reason = apt.reason || null;
                    const aptTime = parseISO(apt.appointment_date);
                    const endTime = addHours(aptTime, (apt.duration_minutes || 30) / 60);
                    const isPast = aptTime < new Date();
                    const isNow = aptTime <= new Date() && endTime > new Date();

                    return (
                      <button
                        key={apt.id}
                        onClick={() => handleAgendaAppointmentClick(apt as Appointment)}
                        className={cn(
                          "w-full flex items-stretch gap-4 p-3 rounded-lg border text-left transition-all group",
                          "hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800",
                          selectedAppointment?.id === apt.id && "ring-2 ring-blue-500 border-blue-300 dark:border-blue-700",
                          isNow && "border-blue-300 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20",
                          !isNow && "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800",
                          apt.status === 'cancelled' && "opacity-60"
                        )}
                      >
                        {/* Time column */}
                        <div className="flex flex-col items-center justify-center w-16 flex-shrink-0">
                          <span className={cn(
                            "text-sm font-bold",
                            isNow ? "text-blue-600 dark:text-blue-400" : isPast ? "text-muted-foreground" : "text-foreground"
                          )}>
                            {format(aptTime, "h:mm")}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase">
                            {format(aptTime, "a")}
                          </span>
                          {isNow && (
                            <div className="flex items-center gap-1 mt-1">
                              <CircleDot className="h-2.5 w-2.5 text-blue-500 animate-pulse" />
                              <span className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 uppercase">Now</span>
                            </div>
                          )}
                        </div>

                        {/* Divider */}
                        <div className={cn(
                          "w-0.5 rounded-full flex-shrink-0",
                          apt.status === 'confirmed' && "bg-blue-400",
                          apt.status === 'pending' && "bg-amber-400",
                          apt.status === 'completed' && "bg-emerald-400",
                          apt.status === 'cancelled' && "bg-gray-300 dark:bg-gray-700",
                        )} />

                        {/* Content */}
                        <div className="flex-1 min-w-0 py-0.5">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm font-semibold truncate">{patientName}</span>
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] px-1.5 py-0 flex-shrink-0 border", STATUS_BADGE_STYLES[apt.status] || "")}
                            >
                              {apt.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(aptTime, "h:mm a")} - {format(endTime, "h:mm a")}
                            </span>
                            {apt.duration_minutes && (
                              <span>{apt.duration_minutes}min</span>
                            )}
                          </div>
                          {reason && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {reason}
                            </p>
                          )}
                          {apt.urgency === 'high' && (
                            <Badge variant="destructive" className="mt-1.5 text-[10px] h-4 px-1.5">Urgent</Badge>
                          )}
                        </div>

                        {/* Action hint */}
                        <div className="flex items-center flex-shrink-0">
                          {apt.status === 'confirmed' && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Stethoscope className="h-4 w-4 text-blue-500" />
                            </div>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground/50 ml-1" />
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== APPOINTMENT DETAIL SHEET ===== */}
      <Sheet open={!!selectedAppointment} onOpenChange={(open) => !open && handleCloseDetail()}>
        <SheetContent className="w-full sm:max-w-md p-0 overflow-y-auto" side="right">
          {selectedAppointment && (
            <DentistAppointmentDetail
              appointment={selectedAppointment}
              onClose={handleCloseDetail}
              onStatusChange={handleStatusChange}
              onOptimisticUpdate={(appointmentId, updates) => {
                setSelectedAppointment((prev) => prev?.id === appointmentId ? { ...prev, ...updates } : prev);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function DentistAppointmentsManagement() {
  return (
    <AppointmentErrorBoundary context="management">
      <OfflineBanner />
      <DentistAppointmentsManagementContent />
    </AppointmentErrorBoundary>
  );
}
