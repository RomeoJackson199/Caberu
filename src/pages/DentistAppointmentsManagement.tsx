import { useState, useEffect, useRef } from "react";
import { useCurrentDentist } from "@/hooks/useCurrentDentist";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { WeeklyCalendarView } from "@/components/appointments/WeeklyCalendarView";
import { DayCalendarView } from "@/components/appointments/DayCalendarView";
import { DentistAppointmentDetail } from "@/components/appointments/DentistAppointmentDetail";
import { AppointmentStats } from "@/components/appointments/AppointmentStats";
import { MonthlyOverview } from "@/components/appointments/MonthlyOverview";
import { format, addDays, subDays, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, Grid3x3, CalendarDays, BarChart3, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedStatCard } from "@/components/ui/page-enhancements";

export default function DentistAppointmentsManagement() {
  const { businessId } = useBusinessContext();
  const {
    dentistId,
    loading: dentistLoading
  } = useCurrentDentist(businessId);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const [showStats, setShowStats] = useState(false);
  const lastScrollY = useRef(0);
  const {
    toast
  } = useToast();
  const {
    t
  } = useLanguage();
  const queryClient = useQueryClient();

  // Fetch all appointments for stats
  const {
    data: allAppointments = []
  } = useQuery({
    queryKey: ['all-appointments', dentistId, currentDate],
    queryFn: async () => {
      if (!dentistId) return [];
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(addDays(currentDate, 7));
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("dentist_id", dentistId)
        .gte("appointment_date", weekStart.toISOString())
        .lt("appointment_date", weekEnd.toISOString())
        .order("appointment_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!dentistId,
  });

  // Fetch monthly appointments for overview
  const {
    data: monthlyAppointments = []
  } = useQuery({
    queryKey: ['monthly-appointments', dentistId, format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      if (!dentistId) return [];
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("dentist_id", dentistId)
        .gte("appointment_date", monthStart.toISOString())
        .lte("appointment_date", monthEnd.toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!dentistId && showStats,
  });

  // Fetch Google Calendar events
  const {
    data: googleCalendarEvents
  } = useQuery({
    queryKey: ['google-calendar-events', dentistId, currentDate],
    queryFn: async () => {
      if (!dentistId) return [];
      const startDate = startOfWeek(currentDate);
      const endDate = endOfWeek(addDays(currentDate, 7));
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
        logger.error('Error fetching Google Calendar events:', error);
        return [];
      }
      return data?.events || [];
    },
    enabled: !!dentistId,
    refetchInterval: 300000 // Refresh every 5 minutes
  });

  const navigateDate = (direction: "prev" | "next") => {
    const daysToAdd = viewMode === "week" ? 7 : 1;
    setCurrentDate(direction === "next" ? addDays(currentDate, daysToAdd) : subDays(currentDate, daysToAdd));
  };

  const handleAppointmentClick = (appointment: any) => {
    setSelectedAppointment(appointment);
    setViewMode("day");
    setCurrentDate(parseISO(appointment.appointment_date));
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
          status: newStatus
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

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-950 dark:via-blue-950/30 dark:to-purple-950/30">
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
            </div>

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

            {/* Today Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="h-9 rounded-xl border-2 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-950 transition-all shadow-sm font-semibold"
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
          {dentistLoading ? (
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
              currentDate={currentDate}
              onAppointmentClick={handleAppointmentClick}
              selectedAppointmentId={selectedAppointment?.id}
              googleCalendarEvents={googleCalendarEvents}
            />
          ) : (
            <DayCalendarView
              dentistId={dentistId}
              currentDate={currentDate}
              onAppointmentClick={setSelectedAppointment}
              selectedAppointmentId={selectedAppointment?.id}
              googleCalendarEvents={googleCalendarEvents}
            />
          )}
        </div>

        {/* Sidebar */}
        {selectedAppointment && (
          <div className={cn(
            "w-full md:w-[35%] border-l bg-white dark:bg-gray-900 transition-all duration-300 shadow-lg"
          )}>
            <DentistAppointmentDetail
              appointment={selectedAppointment}
              onClose={handleBackToWeek}
              onStatusChange={handleStatusChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}