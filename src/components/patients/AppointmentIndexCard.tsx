import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Building2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatClinicTime } from "@/lib/timezone";
import { 
  deriveAppointmentState, 
  getStateConfig, 
  getAppointmentGroup,
  AppointmentState,
  AppointmentStateInput 
} from "@/lib/appointmentStateMachine";

interface AppointmentIndexCardProps {
  appointment: {
    id: string;
    appointment_date: string;
    status: string;
    payment_status?: string | null;
    completed_at?: string | null;
    reason?: string;
    dentist?: {
      first_name: string;
      last_name: string;
    };
    clinicName?: string;
  };
  onClick: () => void;
}

/**
 * Map AppointmentState to display badge using state machine
 */
function getStatusBadge(state: AppointmentState) {
  const config = getStateConfig(state);
  
  return (
    <Badge className={cn("border", config.badgeClassName)}>
      {config.label}
    </Badge>
  );
}

export const AppointmentIndexCard = memo(function AppointmentIndexCard({ 
  appointment, 
  onClick 
}: AppointmentIndexCardProps) {
  // Derive state using the centralized state machine
  const stateInput: AppointmentStateInput = {
    status: appointment.status,
    payment_status: appointment.payment_status ?? null,
    appointment_date: appointment.appointment_date,
    completed_at: appointment.completed_at ?? null,
  };
  const appointmentState = deriveAppointmentState(stateInput);
  
  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all duration-200",
        "hover:shadow-md hover:border-primary/20",
        "active:scale-[0.99]"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Date and time - primary info */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-foreground font-medium">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatClinicTime(appointment.appointment_date, 'EEE, MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formatClinicTime(appointment.appointment_date, 'h:mm a')}</span>
              </div>
            </div>
            
            {/* Dentist and clinic */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {appointment.dentist && (
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  <span>Dr. {appointment.dentist.first_name} {appointment.dentist.last_name}</span>
                </div>
              )}
              {appointment.clinicName && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="truncate">{appointment.clinicName}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Status and chevron */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {getStatusBadge(appointmentState)}
            <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

/**
 * Skeleton loader that matches the card shape
 */
export function AppointmentIndexCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-5 w-40 bg-muted rounded" />
              <div className="h-5 w-20 bg-muted rounded" />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-6 w-20 bg-muted rounded-full" />
            <div className="h-5 w-5 bg-muted rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
