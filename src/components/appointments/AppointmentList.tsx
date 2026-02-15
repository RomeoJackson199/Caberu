import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { formatClinicTime } from '@/lib/timezone';
import { AppointmentCard } from './AppointmentCard';
import { AppointmentConfirmationWidget } from '@/components/AppointmentConfirmationWidget';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import type { AppointmentListItem, OptimizedAppointmentListProps, DentistAppointmentListProps } from '@/types';

type StatusType = 'pending' | 'confirmed' | 'cancelled' | 'completed';

/**
 * Extended appointment with optional profile data
 */
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

/**
 * Props for the unified AppointmentList component
 */
interface AppointmentListProps {
  appointments: Appointment[];
  loading?: boolean;
  searchTerm?: string;
  selectedAppointments?: string[];
  isDentistView?: boolean;
  onSelectAppointment?: (id: string) => void;
  onSelectAll?: (selected: boolean) => void;
  onStatusChange?: (id: string, status: StatusType, reason?: string) => void;
  onViewDetails: (appointment: Appointment) => void;
  onConfirm?: (appointmentId: string) => Promise<void>;
  onCancel?: (appointmentId: string) => Promise<void>;
  onDelete?: (appointmentId: string) => Promise<void>;
  onComplete?: (appointment: Appointment) => void;
}

/**
 * Memoized filtering and sorting logic for today's appointments
 */
const useFilteredAppointments = (appointments: Appointment[], searchTerm?: string) => {
  return useMemo(() => {
    // If no search term, filter to today's appointments only
    if (!searchTerm) {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      return appointments
        .filter(apt => {
          const date = new Date(apt.appointment_date);
          return date >= startOfDay && date < endOfDay;
        })
        .sort((a, b) =>
          new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
        );
    }

    // With search term, search all appointments
    return appointments
      .filter(appointment =>
        appointment.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatClinicTime(appointment.appointment_date, 'PPP p')
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

/**
 * Unified AppointmentList component
 * Combines functionality from both the basic and optimized versions
 * 
 * @example Basic usage with selection
 * ```tsx
 * <AppointmentList
 *   appointments={appointments}
 *   loading={loading}
 *   selectedAppointments={selected}
 *   onSelectAppointment={handleSelect}
 *   onViewDetails={handleView}
 * />
 * ```
 * 
 * @example Optimized dentist view with actions
 * ```tsx
 * <AppointmentList
 *   appointments={appointments}
 *   searchTerm={searchTerm}
 *   isDentistView={true}
 *   onConfirm={handleConfirm}
 *   onCancel={handleCancel}
 *   onComplete={handleComplete}
 *   onViewDetails={handleView}
 * />
 * ```
 */
export const AppointmentList = React.memo<AppointmentListProps>(({
  appointments,
  loading = false,
  searchTerm,
  selectedAppointments = [],
  isDentistView = false,
  onSelectAppointment,
  onSelectAll,
  onStatusChange,
  onViewDetails,
  onConfirm,
  onCancel,
  onDelete,
  onComplete,
}) => {
  // Use filtered appointments only for optimized dentist view with search
  const displayAppointments = (isDentistView && onConfirm) 
    ? useFilteredAppointments(appointments, searchTerm)
    : appointments;

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  // Empty state
  if (displayAppointments.length === 0) {
    // Optimized view empty state
    if (isDentistView && onConfirm) {
      return (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {searchTerm ? "No appointments found matching your search." : "No appointments for today."}
          </CardContent>
        </Card>
      );
    }
    
    // Basic view empty state
    return (
      <div className="text-center py-8 text-muted-foreground">
        No appointments found
      </div>
    );
  }

  // Optimized dentist view with action buttons
  if (isDentistView && onConfirm && onCancel && onDelete && onComplete) {
    return (
      <div className="space-y-4">
        {displayAppointments.map((appointment) => (
          <AppointmentConfirmationWidget
            key={appointment.id}
            appointment={{
              id: appointment.id,
              patient_name: appointment.patient_name || appointment.profiles 
                ? `${appointment.profiles?.first_name || ''} ${appointment.profiles?.last_name || ''}`.trim() || 'Unknown Patient'
                : 'Unknown Patient',
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
  }

  // Basic view with selection checkboxes
  const allSelected = displayAppointments.length > 0 && 
    selectedAppointments.length === displayAppointments.length;

  return (
    <div className="space-y-4">
      {/* Select All Header - only show if selection is enabled */}
      {onSelectAppointment && onSelectAll && (
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
      )}

      {/* Appointment Cards */}
      <div className="space-y-3">
        {displayAppointments.map((appointment) => (
          <div key={appointment.id} className="flex items-start gap-3">
            {onSelectAppointment && (
              <Checkbox
                checked={selectedAppointments.includes(appointment.id)}
                onCheckedChange={() => onSelectAppointment(appointment.id)}
                className="mt-4"
              />
            )}
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
});

AppointmentList.displayName = 'AppointmentList';

export default AppointmentList;
