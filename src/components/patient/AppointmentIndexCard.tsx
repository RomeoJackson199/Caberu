import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Building2, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AppointmentIndexCardProps {
  appointment: {
    id: string;
    appointment_date: string;
    status: string;
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
 * Normalize status to one of: upcoming, completed, action_required, cancelled
 */
function getDisplayStatus(status: string, appointmentDate: string): 'upcoming' | 'completed' | 'action_required' | 'cancelled' {
  const isPast = new Date(appointmentDate) < new Date();
  
  if (status === 'cancelled') return 'cancelled';
  if (status === 'completed') return 'completed';
  if (status === 'action_required' || status === 'pending_payment') return 'action_required';
  
  // For confirmed/pending appointments
  if (isPast) return 'completed'; // Past non-cancelled = completed
  return 'upcoming';
}

function getStatusBadge(displayStatus: 'upcoming' | 'completed' | 'action_required' | 'cancelled') {
  switch (displayStatus) {
    case 'upcoming':
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">
          Upcoming
        </Badge>
      );
    case 'completed':
      return (
        <Badge className="bg-sky-500/10 text-sky-600 border-sky-500/20 hover:bg-sky-500/20">
          Completed
        </Badge>
      );
    case 'action_required':
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20">
          Action required
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20">
          Cancelled
        </Badge>
      );
  }
}

export function AppointmentIndexCard({ appointment, onClick }: AppointmentIndexCardProps) {
  const displayStatus = getDisplayStatus(appointment.status, appointment.appointment_date);
  const appointmentDate = new Date(appointment.appointment_date);
  
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
                <span>{format(appointmentDate, 'EEE, MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{format(appointmentDate, 'h:mm a')}</span>
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
            {getStatusBadge(displayStatus)}
            <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
