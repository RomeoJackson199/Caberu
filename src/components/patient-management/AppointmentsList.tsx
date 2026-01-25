import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Eye, MoreVertical, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { format, isPast, isFuture, isToday } from "date-fns";
import { Appointment } from "./types";
import { getStatusColor } from "./utils";

interface AppointmentsListProps {
  appointments: Appointment[];
  onComplete?: (appointmentId: string) => void;
  onCancel?: (appointmentId: string) => void;
  onViewDetails?: (appointment: Appointment) => void;
}

export function AppointmentsList({ appointments, onComplete, onCancel, onViewDetails }: AppointmentsListProps) {
  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const appointmentsPerPage = 3;

  // Separate appointments into categories
  const now = new Date();
  const todayAppointments = appointments.filter(apt => {
    const date = new Date(apt.appointment_date);
    return isToday(date) && apt.status !== 'cancelled' && apt.status !== 'completed';
  });
  const upcomingAppointments = appointments.filter(apt => {
    const date = new Date(apt.appointment_date);
    return isFuture(date) && !isToday(date) && apt.status !== 'cancelled';
  });
  const needsCompletionAppointments = appointments.filter(apt => {
    const date = new Date(apt.appointment_date);
    return isPast(date) && apt.status !== 'cancelled' && apt.status !== 'completed';
  });

  const renderAppointment = (appointment: Appointment, showActions = true) => {
    const appointmentDate = new Date(appointment.appointment_date);
    const isUpcoming = isFuture(appointmentDate);
    const isAppointmentToday = isToday(appointmentDate);
    const needsCompletion = isPast(appointmentDate) && appointment.status !== 'completed' && appointment.status !== 'cancelled';

    return (
      <div
        key={appointment.id}
        className={`p-4 border rounded-lg hover:shadow-md transition-shadow ${
          isAppointmentToday ? 'border-dental-primary bg-dental-primary/5' : ''
        } ${needsCompletion ? 'border-orange-300 bg-orange-50' : ''}`}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {isAppointmentToday && (
                <Badge className="bg-dental-primary text-white text-xs">Today</Badge>
              )}
              {needsCompletion && (
                <Badge variant="outline" className="border-orange-400 text-orange-600 text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Needs Completion
                </Badge>
              )}
              <p className="font-medium">
                {format(appointmentDate, 'PPP')}
              </p>
              <Badge className={getStatusColor(appointment.status)}>
                {appointment.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              <Clock className="h-3 w-3 inline mr-1" />
              {format(appointmentDate, 'p')}
              {appointment.duration_minutes && ` • ${appointment.duration_minutes} min`}
            </p>
            {appointment.reason && (
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-medium">Reason:</span> {appointment.reason}
              </p>
            )}
            {appointment.consultation_notes && (
              <div className="mt-2 p-2 bg-muted rounded text-sm line-clamp-2">
                {appointment.consultation_notes}
              </div>
            )}
          </div>
          {showActions && (
            <div className="flex items-center gap-1">
              {needsCompletion && onComplete && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-green-300 text-green-700 hover:bg-green-50"
                  onClick={() => onComplete(appointment.id)}
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                  Complete
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onViewDetails && (
                    <DropdownMenuItem onClick={() => onViewDetails(appointment)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                  )}
                  {!needsCompletion && isUpcoming && appointment.status !== 'completed' && onComplete && (
                    <DropdownMenuItem onClick={() => onComplete(appointment.id)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Complete
                    </DropdownMenuItem>
                  )}
                  {isUpcoming && appointment.status !== 'cancelled' && onCancel && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onCancel(appointment.id)}
                        className="text-red-600"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Appointment
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-dental-primary" />
          <span>Appointments</span>
          <Badge variant="outline">{appointments.filter(a => a.status !== 'cancelled').length}</Badge>
          {needsCompletionAppointments.length > 0 && (
            <Badge variant="outline" className="border-orange-400 text-orange-600">
              {needsCompletionAppointments.length} needs attention
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {appointments.length > 0 ? (
          <div className="space-y-4">
            {/* Today's Appointments - Always show first */}
            {todayAppointments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-dental-primary animate-pulse" />
                  Today
                </h4>
                <div className="space-y-2">
                  {todayAppointments.map(apt => renderAppointment(apt))}
                </div>
              </div>
            )}

            {/* Needs Completion - Show prominently */}
            {needsCompletionAppointments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-orange-600 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Past - Needs Completion
                </h4>
                <div className="space-y-2">
                  {needsCompletionAppointments
                    .slice(0, 3)
                    .map(apt => renderAppointment(apt))}
                  {needsCompletionAppointments.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{needsCompletionAppointments.length - 3} more needing completion
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Upcoming Appointments */}
            {upcomingAppointments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Upcoming</h4>
                <div className="space-y-2">
                  {upcomingAppointments
                    .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())
                    .slice(0, appointmentsPage === 1 ? 3 : 10)
                    .map(apt => renderAppointment(apt))}
                </div>
              </div>
            )}

            {appointments.filter(apt => apt.status !== 'cancelled').length > 3 && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAppointmentsPage(appointmentsPage === 1 ? 2 : 1)}
                >
                  {appointmentsPage === 1 ? 'View All' : 'Show Less'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No appointments found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
