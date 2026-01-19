import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { getProviderName } from "@/lib/dataValidation";

interface Appointment {
  id: string;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  reason?: string;
  dentists?: {
    profiles?: {
      first_name: string;
      last_name: string;
    };
  };
}

interface UpcomingAppointmentsCardProps {
  appointments: Appointment[];
  loading?: boolean;
  onViewDetails: (appointmentId: string) => void;
  onViewAll: () => void;
  onBookAppointment: () => void;
}

/**
 * Displays upcoming appointments for a patient
 */
export function UpcomingAppointmentsCard({
  appointments,
  loading = false,
  onViewDetails,
  onViewAll,
  onBookAppointment,
}: UpcomingAppointmentsCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-3"
      >
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-9 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>
    );
  }

  if (appointments.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have any upcoming appointments. Book one now to get started!
            </AlertDescription>
          </Alert>
          <Button
            className="mt-4 w-full"
            onClick={onBookAppointment}
            aria-label="Book your first appointment"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Book Your First Appointment
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((appointment) => (
        <Card key={appointment.id} className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={getStatusColor(appointment.status)}>
                    {appointment.status}
                  </Badge>
                  {appointment.reason && (
                    <span className="text-sm font-medium">{appointment.reason}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(appointment.appointment_date), 'MMMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{format(new Date(appointment.appointment_date), 'h:mm a')}</span>
                  </div>
                </div>
                {appointment.dentists && (
                  <p className="text-sm mt-2">
                    with Dr. {getProviderName(appointment.dentists)}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(appointment.id)}
                aria-label="View appointment details"
              >
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default UpcomingAppointmentsCard;
