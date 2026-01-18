import React from 'react';
import { AppointmentCard } from './AppointmentCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';

export interface Appointment {
  id: string;
  patient_id: string;
  dentist_id?: string;
  business_id?: string;
  appointment_date: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  reason?: string;
  patient_name?: string;
  notes?: string;
  consultation_notes?: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
}

type StatusType = 'pending' | 'confirmed' | 'cancelled' | 'completed';

interface AppointmentListProps {
  appointments: Appointment[];
  loading: boolean;
  selectedAppointments: string[];
  onSelectAppointment: (id: string) => void;
  onSelectAll: (selected: boolean) => void;
  onStatusChange: (id: string, status: StatusType, reason?: string) => void;
  onViewDetails: (appointment: Appointment) => void;
}

export function AppointmentList({
  appointments,
  loading,
  selectedAppointments,
  onSelectAppointment,
  onSelectAll,
  onStatusChange,
  onViewDetails,
}: AppointmentListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No appointments found
      </div>
    );
  }

  const allSelected = appointments.length > 0 && selectedAppointments.length === appointments.length;

  return (
    <div className="space-y-4">
      {/* Select All Header */}
      <div className="flex items-center gap-2 px-2">
        <Checkbox
          checked={allSelected}
          onCheckedChange={(checked) => onSelectAll(!!checked)}
        />
        <span className="text-sm text-muted-foreground">
          {selectedAppointments.length > 0
            ? `${selectedAppointments.length} selected`
            : 'Select all'}
        </span>
      </div>

      {/* Appointment Cards */}
      <div className="space-y-3">
        {appointments.map((appointment) => (
          <div key={appointment.id} className="flex items-start gap-3">
            <Checkbox
              checked={selectedAppointments.includes(appointment.id)}
              onCheckedChange={() => onSelectAppointment(appointment.id)}
              className="mt-4"
            />
            <div className="flex-1">
              <AppointmentCard
                appointment={appointment}
                onClick={() => onViewDetails(appointment)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
