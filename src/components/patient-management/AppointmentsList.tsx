import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Eye } from "lucide-react";
import { format } from "date-fns";
import { Appointment } from "./types";
import { getStatusColor } from "./utils";

interface AppointmentsListProps {
  appointments: Appointment[];
}

export function AppointmentsList({ appointments }: AppointmentsListProps) {
  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const appointmentsPerPage = 3;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-dental-primary" />
          <span>Appointments</span>
          <Badge variant="outline">{appointments.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {appointments.length > 0 ? (
          <div className="space-y-3">
            {appointments
              .filter(apt => apt.status !== 'cancelled')
              .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())
              .slice(0, appointmentsPage === 1 ? 3 : 10)
              .map((appointment) => (
                <div key={appointment.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium">
                          {format(new Date(appointment.appointment_date), 'PPP')}
                        </p>
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(appointment.appointment_date), 'p')}
                        {appointment.duration_minutes && ` • ${appointment.duration_minutes} minutes`}
                      </p>
                      {appointment.reason && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Reason: {appointment.reason}
                        </p>
                      )}
                      {appointment.consultation_notes && (
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          {appointment.consultation_notes}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

            {appointments.filter(apt => apt.status !== 'cancelled').length > 3 && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
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
