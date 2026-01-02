import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppointmentStatusBadge } from "./AppointmentStatusBadge";
import { PatientAppointmentActions } from "./PatientAppointmentActions";
import { Calendar, Clock, User, MapPin, Phone, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
interface TimelineAppointmentCardProps {
  appointment: {
    id: string;
    appointment_date: string;
    status: string;
    reason?: string;
    notes?: string;
    dentist?: {
      first_name: string;
      last_name: string;
      specialization?: string;
    };
  };
  onReschedule?: () => void;
  onCancel?: () => void;
  onClick?: () => void;
  index: number;
}
export function TimelineAppointmentCard({
  appointment,
  onReschedule,
  onCancel,
  onClick,
  index
}: TimelineAppointmentCardProps) {
  const isPast = new Date(appointment.appointment_date) < new Date();
  const canModify = !isPast && appointment.status !== 'cancelled' && appointment.status !== 'completed';
  return <motion.div initial={{
    opacity: 0,
    x: -20
  }} animate={{
    opacity: 1,
    x: 0
  }} transition={{
    delay: index * 0.1
  }} className="relative">
      {/* Timeline line */}
      <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-border -z-10" />
      
      {/* Timeline dot */}
      <div className={cn("absolute left-4 top-6 w-4 h-4 rounded-full border-2 bg-background", appointment.status === 'confirmed' && "border-success", appointment.status === 'pending' && "border-warning", appointment.status === 'cancelled' && "border-error", appointment.status === 'completed' && "border-info")}>
        <div className={cn("absolute inset-0.5 rounded-full animate-pulse", appointment.status === 'confirmed' && "bg-success", appointment.status === 'pending' && "bg-warning", appointment.status === 'cancelled' && "bg-error", appointment.status === 'completed' && "bg-info")} />
      </div>

      <Card className={cn("ml-12 hover:shadow-lg transition-all cursor-pointer", onClick && "hover:scale-[1.02]")} onClick={onClick}>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-heading font-semibold text-base md:text-lg">
                  {appointment.reason || 'General Checkup'}
                </h3>
                <AppointmentStatusBadge status={appointment.status} appointmentDate={appointment.appointment_date} />
              </div>
              
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">
                    {format(new Date(appointment.appointment_date), 'EEEE, MMMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{format(new Date(appointment.appointment_date), 'h:mm a')}</span>
                </div>
                {appointment.dentist && <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>
                      Dr. {appointment.dentist.first_name} {appointment.dentist.last_name}
                    </span>
                    {appointment.dentist.specialization && <Badge variant="outline" className="text-xs">
                        {appointment.dentist.specialization}
                      </Badge>}
                  </div>}
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>Main Clinic</span>
                </div>
              </div>
            </div>
          </div>

          {appointment.notes && <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Notes:</strong> {appointment.notes}
              </p>
            </div>}

          {canModify && (
            <div className="mt-4 pt-4 border-t">
              <PatientAppointmentActions
                appointmentId={appointment.id}
                appointmentDate={appointment.appointment_date}
                status={appointment.status}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>;
}