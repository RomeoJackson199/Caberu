import { useMemo } from "react";
import { format, differenceInDays, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { Calendar, CheckCircle2, Clock, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  reason?: string;
  duration_minutes?: number;
}

interface PatientTimelineProps {
  appointments: Appointment[];
  onAppointmentClick?: (appointment: Appointment) => void;
}

const statusConfig = {
  completed: { color: 'bg-emerald-500', icon: CheckCircle2, label: 'Completed' },
  confirmed: { color: 'bg-indigo-500', icon: CheckCircle2, label: 'Confirmed' },
  scheduled: { color: 'bg-blue-500', icon: Clock, label: 'Scheduled' },
  pending: { color: 'bg-amber-500', icon: Clock, label: 'Pending' },
  cancelled: { color: 'bg-red-400', icon: X, label: 'Cancelled' },
  'no-show': { color: 'bg-slate-400', icon: AlertTriangle, label: 'No Show' },
};

export function PatientTimeline({ appointments, onAppointmentClick }: PatientTimelineProps) {
  // Get last 12 months
  const months = useMemo(() => {
    const end = new Date();
    const start = subMonths(end, 11);
    return eachMonthOfInterval({ start, end });
  }, []);

  // Group appointments by month
  const appointmentsByMonth = useMemo(() => {
    const grouped: Record<string, Appointment[]> = {};
    
    appointments.forEach(apt => {
      const date = new Date(apt.appointment_date);
      const monthKey = format(date, 'yyyy-MM');
      if (!grouped[monthKey]) grouped[monthKey] = [];
      grouped[monthKey].push(apt);
    });
    
    return grouped;
  }, [appointments]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = appointments.length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const cancelled = appointments.filter(a => a.status === 'cancelled').length;
    const upcoming = appointments.filter(a => new Date(a.appointment_date) > new Date() && a.status !== 'cancelled').length;
    
    return { total, completed, cancelled, upcoming };
  }, [appointments]);

  if (appointments.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-400">
        <Calendar className="h-8 w-8 mr-3 opacity-50" />
        <p>No appointment history</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
          <p className="text-xs text-slate-500">Total</p>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
          <p className="text-xs text-emerald-600">Completed</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.upcoming}</p>
          <p className="text-xs text-blue-600">Upcoming</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-500">{stats.cancelled}</p>
          <p className="text-xs text-red-500">Cancelled</p>
        </div>
      </div>

      {/* Timeline visualization */}
      <div className="bg-slate-50 rounded-xl p-4">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          12-Month Activity
        </h4>
        
        <div className="flex gap-1">
          <TooltipProvider>
            {months.map((month) => {
              const monthKey = format(month, 'yyyy-MM');
              const monthAppts = appointmentsByMonth[monthKey] || [];
              const completedCount = monthAppts.filter(a => a.status === 'completed').length;
              const hasActivity = monthAppts.length > 0;
              
              // Calculate intensity based on appointments
              const intensity = Math.min(monthAppts.length * 25, 100);
              
              return (
                <Tooltip key={monthKey}>
                  <TooltipTrigger asChild>
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={cn(
                          "w-full h-8 rounded transition-colors cursor-pointer",
                          hasActivity 
                            ? completedCount > 0 
                              ? "bg-emerald-500" 
                              : "bg-amber-400"
                            : "bg-slate-200"
                        )}
                        style={{
                          opacity: hasActivity ? 0.3 + (intensity / 100) * 0.7 : 0.3
                        }}
                      />
                      <span className="text-[10px] text-slate-400">
                        {format(month, 'MMM')}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <p className="font-semibold">{format(month, 'MMMM yyyy')}</p>
                      {monthAppts.length === 0 ? (
                        <p className="text-slate-400">No appointments</p>
                      ) : (
                        <div className="space-y-1 mt-1">
                          {monthAppts.slice(0, 3).map(apt => (
                            <p key={apt.id} className="flex items-center gap-1">
                              <span className={cn(
                                "w-2 h-2 rounded-full",
                                statusConfig[apt.status as keyof typeof statusConfig]?.color || 'bg-slate-400'
                              )} />
                              {apt.reason || 'Appointment'} - {format(new Date(apt.appointment_date), 'd MMM')}
                            </p>
                          ))}
                          {monthAppts.length > 3 && (
                            <p className="text-slate-400">+{monthAppts.length - 3} more</p>
                          )}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>
      </div>

      {/* Recent appointments list */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Recent Activity
        </h4>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-200" />
          
          <div className="space-y-3">
            {appointments.slice(0, 5).map((apt, idx) => {
              const config = statusConfig[apt.status as keyof typeof statusConfig] || statusConfig.scheduled;
              const Icon = config.icon;
              const date = new Date(apt.appointment_date);
              const isFuture = date > new Date();
              
              return (
                <div
                  key={apt.id}
                  className={cn(
                    "relative pl-8 cursor-pointer group",
                    onAppointmentClick && "hover:bg-slate-50 rounded-lg -ml-2 pl-10 py-2"
                  )}
                  onClick={() => onAppointmentClick?.(apt)}
                >
                  {/* Timeline dot */}
                  <div className={cn(
                    "absolute left-1.5 w-4 h-4 rounded-full border-2 border-white shadow flex items-center justify-center",
                    config.color
                  )}>
                    <Icon className="h-2 w-2 text-white" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {apt.reason || 'Appointment'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {format(date, 'MMM d, yyyy')} at {format(date, 'h:mm a')}
                        {apt.duration_minutes && ` • ${apt.duration_minutes} min`}
                      </p>
                    </div>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full capitalize",
                      apt.status === 'completed' && "bg-emerald-100 text-emerald-700",
                      apt.status === 'confirmed' && "bg-indigo-100 text-indigo-700",
                      apt.status === 'pending' && "bg-amber-100 text-amber-700",
                      apt.status === 'cancelled' && "bg-red-100 text-red-600",
                      apt.status === 'scheduled' && "bg-blue-100 text-blue-700",
                    )}>
                      {isFuture && apt.status !== 'cancelled' ? 'upcoming' : apt.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
