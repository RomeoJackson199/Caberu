import { format, parseISO, differenceInYears } from "date-fns";
import { Calendar, Clock, User, MapPin, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { 
  DentistAppointmentState, 
  DENTIST_STATE_CONFIG 
} from "@/lib/dentistAppointmentState";

interface AppointmentHeaderProps {
  appointment: {
    appointment_date: string;
    duration_minutes?: number;
    reason?: string;
    patient?: {
      first_name?: string;
      last_name?: string;
      date_of_birth?: string;
    };
    patient_name?: string;
  };
  state: DentistAppointmentState;
  dentistName?: string;
  dentistSpecialization?: string;
  clinicName?: string;
}

/**
 * Appointment Header - Context & State (always visible)
 * Shows patient, date/time, status badge, clinic/dentist info
 * No actions in header - purely informational
 */
export function AppointmentHeader({
  appointment,
  state,
  dentistName,
  dentistSpecialization,
  clinicName,
}: AppointmentHeaderProps) {
  const stateConfig = DENTIST_STATE_CONFIG[state];
  
  const patientName = `${appointment.patient?.first_name || ""} ${appointment.patient?.last_name || ""}`.trim() 
    || appointment.patient_name 
    || "Unknown Patient";
  
  const patientInitials = (appointment.patient?.first_name?.[0] || '') + 
    (appointment.patient?.last_name?.[0] || '');
  
  const patientAge = appointment.patient?.date_of_birth 
    ? differenceInYears(new Date(), new Date(appointment.patient.date_of_birth))
    : null;
  
  const appointmentDate = parseISO(appointment.appointment_date);

  return (
    <div className="p-4 sm:p-6 border-b bg-muted/30 flex-shrink-0 space-y-4">
      {/* Status Badge - Visually dominant */}
      <Badge 
        variant="outline" 
        className={cn("gap-1.5 font-medium text-sm px-3 py-1.5", stateConfig.badgeClassName)}
      >
        {stateConfig.icon === 'calendar' && <Calendar className="h-3.5 w-3.5" />}
        {stateConfig.icon === 'edit' && <Clock className="h-3.5 w-3.5" />}
        {stateConfig.icon === 'check' && <Stethoscope className="h-3.5 w-3.5" />}
        {stateConfig.label}
      </Badge>

      {/* Patient Info */}
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 ring-2 ring-primary/10">
          <AvatarFallback className="bg-primary/5 text-primary font-semibold">
            {patientInitials || 'P'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-foreground truncate">
            {patientName}
          </h2>
          <p className="text-sm text-muted-foreground">
            {patientAge ? `${patientAge} years` : 'Patient'}
            {appointment.reason && ` • ${appointment.reason}`}
          </p>
        </div>
      </div>

      {/* Date & Time */}
      <div>
        <h3 className="text-base font-medium text-foreground">
          {format(appointmentDate, 'EEEE, MMMM d, yyyy')}
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          {format(appointmentDate, 'h:mm a')}
          {appointment.duration_minutes && ` (${appointment.duration_minutes} min)`}
        </p>
      </div>

      {/* Clinic & Dentist - Secondary info */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        {dentistName && (
          <div className="flex items-center gap-1.5">
            <User className="h-4 w-4 flex-shrink-0" />
            <span>{dentistName}</span>
          </div>
        )}
        {dentistSpecialization && (
          <div className="flex items-center gap-1.5">
            <Stethoscope className="h-4 w-4 flex-shrink-0" />
            <span>{dentistSpecialization}</span>
          </div>
        )}
        {clinicName && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span>{clinicName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
