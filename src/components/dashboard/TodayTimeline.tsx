/**
 * Today Timeline - Visual timeline view of today's appointments
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, 
  Clock, 
  Plus, 
  AlertTriangle,
  CheckCircle,
  User,
  ChevronRight,
  Sunrise,
  Sunset
} from "lucide-react";
import { format, isAfter, isBefore, addMinutes } from "date-fns";
import { useLanguage } from "@/hooks/useLanguage";
import { hasMedicalRisk } from "@/lib/patient-utils";
import { EmptyState } from "@/components/ui/polished-components";

interface TimelineAppointment {
  id: string;
  appointment_date: string;
  patient_id: string | null;
  patient_name: string | null;
  reason: string | null;
  status: string;
  urgency: string | null;
  duration_minutes?: number | null;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

interface TodayTimelineProps {
  appointments: TimelineAppointment[];
  loading?: boolean;
  className?: string;
  onNewAppointment?: () => void;
  onViewAll?: () => void;
}

function TimeIndicator() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute left-0 right-0 flex items-center gap-2 z-10 pointer-events-none" 
         style={{ top: '0' }}>
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
        </span>
        <span className="text-xs font-medium text-destructive">
          {format(currentTime, 'HH:mm')}
        </span>
      </div>
      <div className="flex-1 h-px bg-destructive/50" />
    </div>
  );
}

function AppointmentCard({ 
  appointment, 
  isNext, 
  isPast 
}: { 
  appointment: TimelineAppointment; 
  isNext: boolean;
  isPast: boolean;
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const appointmentTime = new Date(appointment.appointment_date);
  const patientName = appointment.profiles 
    ? `${appointment.profiles.first_name} ${appointment.profiles.last_name}`
    : appointment.patient_name || 'Unknown Patient';
  
  const hasAlert = false; // allergies/medical_conditions not available on profiles

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'bg-success/10 text-success border-success/20';
      case 'confirmed': return 'bg-primary/10 text-primary border-primary/20';
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const handleClick = () => {
    if (appointment.patient_id) {
      if (appointment.status === 'confirmed') {
        navigate(`/dentist/patients?patientId=${appointment.patient_id}&appointmentId=${appointment.id}`);
      } else {
        navigate(`/dentist/patients?patientId=${appointment.patient_id}`);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "group flex items-stretch gap-3 cursor-pointer",
        "transition-all duration-200",
        isPast && "opacity-60"
      )}
      onClick={handleClick}
    >
      {/* Time column */}
      <div className="flex flex-col items-center w-14 shrink-0">
        <span className={cn(
          "text-sm font-semibold tabular-nums",
          isNext ? "text-primary" : "text-muted-foreground"
        )}>
          {format(appointmentTime, 'HH:mm')}
        </span>
        {appointment.duration_minutes && (
          <span className="text-xs text-muted-foreground">
            {appointment.duration_minutes}m
          </span>
        )}
      </div>

      {/* Timeline dot and line */}
      <div className="flex flex-col items-center">
        <div className={cn(
          "w-3 h-3 rounded-full border-2 shrink-0",
          isNext 
            ? "bg-primary border-primary" 
            : isPast 
              ? "bg-muted border-muted-foreground/30"
              : "bg-background border-primary/50",
          appointment.status === 'completed' && "bg-success border-success"
        )} />
        <div className="flex-1 w-0.5 bg-border" />
      </div>

      {/* Appointment content */}
      <div className={cn(
        "flex-1 p-3 rounded-lg border bg-card mb-2",
        "hover:shadow-md hover:border-primary/30 transition-all",
        isNext && "border-primary/30 shadow-sm"
      )}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium truncate">{patientName}</span>
              {hasAlert && (
                <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
              )}
              {appointment.urgency === 'high' && (
                <Badge variant="destructive" className="text-xs h-5">
                  {t.urgent || "Urgent"}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {appointment.reason || t.noReasonSpecified || 'No reason specified'}
            </p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className={cn("text-xs", getStatusColor(appointment.status))}>
              {appointment.status}
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function TodayTimeline({ 
  appointments, 
  loading, 
  className, 
  onNewAppointment,
  onViewAll 
}: TodayTimelineProps) {
  const { t } = useLanguage();
  const now = new Date();

  // Group appointments by time of day
  const { morning, afternoon, nextAppointmentId } = useMemo(() => {
    const noon = new Date();
    noon.setHours(12, 0, 0, 0);

    const sorted = [...appointments].sort(
      (a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
    );

    // Find the next upcoming appointment
    const nextIdx = sorted.findIndex(apt => 
      isAfter(new Date(apt.appointment_date), now) && apt.status !== 'completed'
    );
    const nextId = nextIdx >= 0 ? sorted[nextIdx].id : null;

    return {
      morning: sorted.filter(apt => isBefore(new Date(apt.appointment_date), noon)),
      afternoon: sorted.filter(apt => !isBefore(new Date(apt.appointment_date), noon)),
      nextAppointmentId: nextId,
    };
  }, [appointments, now]);

  if (loading) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-14 h-10 bg-muted rounded" />
                <div className="flex-1 h-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (appointments.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="pt-6">
          <EmptyState
            icon={Calendar}
            title={t.noAppointmentsToday || "No appointments today"}
            description={t.noAppointmentsTodayDesc || "You don't have any appointments scheduled for today."}
            action={onNewAppointment ? {
              label: t.scheduleNew || "Schedule New",
              onClick: onNewAppointment
            } : undefined}
          />
        </CardContent>
      </Card>
    );
  }

  const renderTimeBlock = (
    appointments: TimelineAppointment[], 
    icon: React.ElementType, 
    label: string
  ) => {
    if (appointments.length === 0) return null;

    const Icon = icon;
    return (
      <div className="mb-4 last:mb-0">
        <div className="flex items-center gap-2 mb-3 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="relative pl-0">
          {appointments.map((apt) => (
            <AppointmentCard
              key={apt.id}
              appointment={apt}
              isNext={apt.id === nextAppointmentId}
              isPast={isBefore(new Date(apt.appointment_date), now) && apt.status !== 'completed'}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {t.todaysSchedule || "Today's Schedule"}
        </CardTitle>
        <div className="flex items-center gap-2">
          {onNewAppointment && (
            <Button size="sm" variant="ghost" onClick={onNewAppointment}>
              <Plus className="h-4 w-4 mr-1" />
              {t.add || "Add"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {renderTimeBlock(morning, Sunrise, "Morning")}
        {renderTimeBlock(afternoon, Sunset, "Afternoon")}
        
        {onViewAll && (
          <Button 
            variant="ghost" 
            className="w-full mt-2" 
            onClick={onViewAll}
          >
            {t.viewAllAppointments || "View All Appointments"}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
