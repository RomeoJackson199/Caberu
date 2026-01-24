import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth, getDay } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

interface MonthlyOverviewProps {
  appointments: any[];
  currentDate: Date;
  onDateClick?: (date: Date) => void;
}

export function MonthlyOverview({ appointments, currentDate, onDateClick }: MonthlyOverviewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calculate appointment density for each day
  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, number>();
    appointments.forEach(apt => {
      const dateKey = format(new Date(apt.appointment_date), "yyyy-MM-dd");
      map.set(dateKey, (map.get(dateKey) || 0) + 1);
    });
    return map;
  }, [appointments]);

  const maxAppointments = Math.max(...Array.from(appointmentsByDay.values()), 1);

  const getIntensityColor = (count: number) => {
    if (count === 0) return "bg-gray-100 dark:bg-gray-800";
    const intensity = count / maxAppointments;
    if (intensity > 0.75) return "bg-blue-600 dark:bg-blue-500";
    if (intensity > 0.5) return "bg-blue-500 dark:bg-blue-600";
    if (intensity > 0.25) return "bg-blue-300 dark:bg-blue-700";
    return "bg-blue-200 dark:bg-blue-800";
  };

  // Get day of week for first day to align calendar (Monday = 0, Sunday = 6)
  // Convert from getDay() (Sunday=0) to Monday-start (Monday=0)
  const dayOfWeek = getDay(monthStart);
  const firstDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const emptyDays = Array(firstDayOfWeek).fill(null);

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-blue-600" />
          {format(currentDate, "MMMM yyyy")} Overview
        </CardTitle>
        <p className="text-xs text-muted-foreground">Click a day to view appointments</p>
      </CardHeader>
      <CardContent>
        {/* Day labels - Monday start for consistency with week view */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-muted-foreground p-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty days before month starts */}
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Month days */}
          {days.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const appointmentCount = appointmentsByDay.get(dateKey) || 0;
            const today = isToday(day);

            return (
              <button
                key={dateKey}
                onClick={() => onDateClick?.(day)}
                className={cn(
                  "aspect-square rounded-lg transition-all duration-200 hover:scale-110 hover:shadow-md relative group",
                  getIntensityColor(appointmentCount),
                  today && "ring-2 ring-blue-600 ring-offset-2",
                  "flex flex-col items-center justify-center"
                )}
              >
                <span
                  className={cn(
                    "text-xs font-semibold",
                    appointmentCount > 0
                      ? "text-white"
                      : "text-gray-600 dark:text-gray-400"
                  )}
                >
                  {format(day, "d")}
                </span>
                {appointmentCount > 0 && (
                  <span className="text-[9px] font-bold text-white/90 mt-0.5">
                    {appointmentCount}
                  </span>
                )}

                {/* Tooltip on hover */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                  {format(day, "MMM d")}: {appointmentCount} appointment{appointmentCount !== 1 ? 's' : ''}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-800 border" />
            <div className="w-4 h-4 rounded bg-blue-200 dark:bg-blue-800" />
            <div className="w-4 h-4 rounded bg-blue-300 dark:bg-blue-700" />
            <div className="w-4 h-4 rounded bg-blue-500 dark:bg-blue-600" />
            <div className="w-4 h-4 rounded bg-blue-600 dark:bg-blue-500" />
          </div>
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}
