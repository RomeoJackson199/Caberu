/**
 * Hero Appointment Card - Featured next appointment with countdown
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, 
  User, 
  Stethoscope, 
  AlertTriangle,
  Calendar,
  ArrowRight,
  Timer
} from "lucide-react";
import { format, differenceInMinutes, differenceInHours, differenceInSeconds, isToday, isTomorrow } from "date-fns";
import { getAppointmentDate } from "@/lib/appointmentUtils";
import { useLanguage } from "@/hooks/useLanguage";
import { Skeleton } from "@/components/ui/skeleton";

interface HeroAppointment {
  id: string;
  patient_id: string | null;
  appointment_date: string;
  duration_minutes?: number | null;
  status: string;
  reason: string | null;
  urgency: string | null;
  profiles: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string | null;
    profile_picture_url?: string | null;
  } | null;
  patient_name: string | null;
}

interface HeroAppointmentCardProps {
  appointment: HeroAppointment | null;
  loading?: boolean;
  className?: string;
}

function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, isNow: false, isPast: false });

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isNow: true, isPast: diff < -30 * 60 * 1000 });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, isNow: false, isPast: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft.isPast) {
    return (
      <div className="flex items-center gap-1.5 text-warning">
        <Timer className="h-4 w-4" />
        <span className="text-sm font-medium">In progress</span>
      </div>
    );
  }

  if (timeLeft.isNow) {
    return (
      <motion.div 
        className="flex items-center gap-1.5 text-success"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
        </span>
        <span className="text-sm font-semibold">Starting now</span>
      </motion.div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Timer className="h-4 w-4 text-muted-foreground" />
      <div className="flex items-center gap-1 font-mono text-sm">
        {timeLeft.hours > 0 && (
          <>
            <span className="bg-muted px-2 py-0.5 rounded font-semibold">{timeLeft.hours.toString().padStart(2, '0')}</span>
            <span className="text-muted-foreground">h</span>
          </>
        )}
        <span className="bg-muted px-2 py-0.5 rounded font-semibold">{timeLeft.minutes.toString().padStart(2, '0')}</span>
        <span className="text-muted-foreground">m</span>
        {timeLeft.hours === 0 && (
          <>
            <span className="bg-muted px-2 py-0.5 rounded font-semibold">{timeLeft.seconds.toString().padStart(2, '0')}</span>
            <span className="text-muted-foreground">s</span>
          </>
        )}
      </div>
    </div>
  );
}

export function HeroAppointmentCard({ appointment, loading, className }: HeroAppointmentCardProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  if (loading) {
    return (
      <Card className={cn("overflow-hidden border-2 border-primary/20", className)}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-4">
              <Skeleton className="h-5 w-32" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!appointment) {
    return (
      <Card className={cn("overflow-hidden bg-muted/30", className)}>
        <CardContent className="p-6 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">{t.noUpcomingAppointments || "No upcoming appointments"}</p>
        </CardContent>
      </Card>
    );
  }

  const appointmentDate = getAppointmentDate(appointment.appointment_date);
  const patientName = appointment.profiles?.first_name && appointment.profiles?.last_name
    ? `${appointment.profiles.first_name} ${appointment.profiles.last_name}`
    : appointment.patient_name || 'Unknown Patient';

  const getDateLabel = () => {
    if (isToday(appointmentDate)) return "Today";
    if (isTomorrow(appointmentDate)) return "Tomorrow";
    return format(appointmentDate, 'EEEE, MMM d');
  };

  const handleStartConsultation = () => {
    if (appointment.status === 'pending') {
      navigate(`/dentist/patients?patientId=${appointment.patient_id}`);
    } else {
      navigate(`/dentist/patients?patientId=${appointment.patient_id}&appointmentId=${appointment.id}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        "overflow-hidden relative",
        "border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background",
        className
      )}>
        {/* Subtle decorative element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <CardContent className="p-4 sm:p-6 relative">
          {/* Header with date and countdown */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-medium">
                {getDateLabel()} • {format(appointmentDate, 'HH:mm')}
              </Badge>
              {appointment.urgency === 'high' && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Urgent
                </Badge>
              )}
            </div>
            <CountdownTimer targetDate={appointmentDate} />
          </div>

          {/* Patient info */}
          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-semibold text-lg shrink-0">
              {patientName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-lg truncate">{patientName}</h3>
              <p className="text-sm text-muted-foreground truncate">
                {appointment.reason || t.noReasonSpecified || 'General consultation'}
              </p>
            </div>
          </div>

          {/* Duration if available */}
          {appointment.duration_minutes && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Clock className="h-4 w-4" />
              <span>{appointment.duration_minutes} min appointment</span>
            </div>
          )}

          {/* Action button */}
          <Button 
            className="w-full group"
            size="lg"
            onClick={handleStartConsultation}
          >
            <Stethoscope className="h-4 w-4 mr-2" />
            {appointment.status === 'pending' ? 'View Patient' : 'Start Consultation'}
            <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
