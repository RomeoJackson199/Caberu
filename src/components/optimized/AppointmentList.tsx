import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { AppointmentConfirmationWidget } from '@/components/AppointmentConfirmationWidget';
import { Card, CardContent } from '@/components/ui/card';
import { STATUS_COLORS, URGENCY_COLORS } from '@/lib/constants';

interface Appointment {
  id: string;
  patient_id: string;
  dentist_id?: string;
  business_id?: string;
  patient_name?: string;
  appointment_date: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  reason?: string;
  consultation_notes?: string;
}

interface AppointmentListProps {
  appointments: Appointment[];
  searchTerm: string;
  onConfirm: (appointmentId: string) => Promise<void>;
  onCancel: (appointmentId: string) => Promise<void>;
  onDelete: (appointmentId: string) => Promise<void>;
  onViewDetails: (appointment: Appointment) => void;
  onComplete: (appointment: Appointment) => void;
  isDentistView?: boolean;
}

// Memoized filtering and sorting logic
const useFilteredAppointments = (appointments: Appointment[], searchTerm: string) => {
  return useMemo(() => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const todayAppointments = appointments
      .filter(apt => {
        const date = new Date(apt.appointment_date);
        return date >= startOfDay && date < endOfDay;
      })
      .sort((a, b) =>
        new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
      );

    if (!searchTerm) return todayAppointments;

    return appointments
      .filter(appointment =>
        appointment.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        format(new Date(appointment.appointment_date), 'PPP p')
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
      .sort(
        (a, b) =>
          new Date(a.appointment_date).getTime() -
          new Date(b.appointment_date).getTime()
      );
  }, [appointments, searchTerm]);
};

export const AppointmentList = React.memo<AppointmentListProps>(({
  appointments,
  searchTerm,
  onConfirm,
  onCancel,
  onDelete,
  onViewDetails,
  onComplete,
  isDentistView = false
}) => {
  const filteredAppointments = useFilteredAppointments(appointments, searchTerm);

  if (filteredAppointments.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          {searchTerm ? "No appointments found matching your search." : "No appointments for today."}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {filteredAppointments.map((appointment) => (
        <AppointmentConfirmationWidget
          key={appointment.id}
          appointment={{
            id: appointment.id,
            patient_name: appointment.patient_name || 'Unknown Patient',
            appointment_date: appointment.appointment_date,
            duration_minutes: appointment.duration_minutes,
            status: appointment.status,
            urgency: appointment.urgency,
            reason: appointment.reason,
            consultation_notes: appointment.consultation_notes
          }}
          isDentistView={isDentistView}
          onConfirm={() => onConfirm(appointment.id)}
          onCancel={() => onCancel(appointment.id)}
          onDelete={() => onDelete(appointment.id)}
          onViewDetails={() => onViewDetails(appointment)}
          onComplete={() => onComplete(appointment)}
          className="mb-4"
        />
      ))}
    </div>
  );
});

AppointmentList.displayName = 'AppointmentList';