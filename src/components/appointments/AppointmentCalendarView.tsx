import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentCard } from "./AppointmentCard";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { Palmtree } from "lucide-react";

interface AppointmentCalendarViewProps {
  dentistId: string;
  view: "day" | "week" | "month";
  currentDate: Date;
  filters: any;
}

export function AppointmentCalendarView({
  dentistId,
  view,
  currentDate,
  filters
}: AppointmentCalendarViewProps) {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ["appointments", dentistId, view, currentDate, filters],
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select(`
          *,
          profiles(first_name, last_name, email)
        `)
        .eq("dentist_id", dentistId)
        .order("appointment_date", { ascending: true });

      // Apply date range filter
      if (view === "day") {
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);
        query = query.gte("appointment_date", dayStart.toISOString())
                    .lte("appointment_date", dayEnd.toISOString());
      } else if (view === "week") {
        const weekStart = startOfWeek(currentDate);
        const weekEnd = endOfWeek(currentDate);
        query = query.gte("appointment_date", weekStart.toISOString())
                    .lte("appointment_date", weekEnd.toISOString());
      } else if (view === "month") {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        query = query.gte("appointment_date", monthStart.toISOString())
                    .lte("appointment_date", monthEnd.toISOString());
      }

      // Apply status filter
      if (filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      // Apply type filter
      if (filters.type !== "all") {
        query = query.eq("reason", filters.type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  // Fetch vacation days for the dentist
  const { data: vacationDays } = useQuery({
    queryKey: ["vacation-days", dentistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dentist_vacation_days")
        .select("start_date, end_date, reason, vacation_type")
        .eq("dentist_id", dentistId)
        .eq("is_approved", true);
      
      if (error) throw error;
      return data;
    }
  });

  const isVacationDay = (date: Date) => {
    if (!vacationDays) return false;
    return vacationDays.some(vacation => {
      const start = parseISO(vacation.start_date);
      const end = parseISO(vacation.end_date);
      return isWithinInterval(date, { start, end });
    });
  };

  const getVacationInfo = (date: Date) => {
    if (!vacationDays) return null;
    return vacationDays.find(vacation => {
      const start = parseISO(vacation.start_date);
      const end = parseISO(vacation.end_date);
      return isWithinInterval(date, { start, end });
    });
  };

  if (isLoading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  const getDaysToDisplay = () => {
    if (view === "day") return [currentDate];
    if (view === "week") return eachDayOfInterval({
      start: startOfWeek(currentDate),
      end: endOfWeek(currentDate)
    });
    return eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate)
    });
  };

  const days = getDaysToDisplay();

  return (
    <div className={`grid ${view === "month" ? "grid-cols-7" : view === "week" ? "grid-cols-7" : "grid-cols-1"} gap-4`}>
      {days.map((day) => {
        const dayAppointments = appointments?.filter((apt) =>
          isSameDay(new Date(apt.appointment_date), day)
        ) || [];
        const vacation = isVacationDay(day);
        const vacationInfo = getVacationInfo(day);

        return (
          <div 
            key={day.toISOString()} 
            className={`border rounded-lg p-4 min-h-[150px] ${
              vacation ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" : ""
            }`}
          >
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              {format(day, view === "month" ? "d" : "EEE, MMM d")}
              {vacation && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                  <Palmtree className="h-3 w-3" />
                  {vacationInfo?.vacation_type || "Vacation"}
                </span>
              )}
            </h3>
            <div className="space-y-2">
              {vacation && dayAppointments.length === 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400 italic">
                  {vacationInfo?.reason || "On vacation"}
                </p>
              )}
              {dayAppointments.map((apt) => (
                <AppointmentCard key={apt.id} appointment={apt} compact={view === "month"} />
              ))}
              {!vacation && dayAppointments.length === 0 && (
                <p className="text-sm text-muted-foreground">No appointments</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
