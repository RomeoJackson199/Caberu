import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { DentistPatient, PatientAppointment } from './types';
import { DentistAppointmentDetail } from '@/components/appointments/DentistAppointmentDetail';
import { AppointmentCompletionDialog } from '@/components/appointment/AppointmentCompletionDialog';
import { ConsultationModeBanner } from './ConsultationModeEntry';

interface ConsultationModeViewProps {
  patient: DentistPatient;
  appointment: PatientAppointment;
  dentistId: string;
  businessId: string;
  onExit: () => void;
  onAppointmentUpdated: () => void;
}

export function ConsultationModeView({
  patient,
  appointment,
  dentistId,
  businessId,
  onExit,
  onAppointmentUpdated
}: ConsultationModeViewProps) {
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);

  const handleStatusChange = (appointmentId: string, newStatus: string) => {
    onAppointmentUpdated();
    if (newStatus === 'completed') {
      // Exit consultation mode after completing
      onExit();
    }
  };

  // Build the appointment object with patient info for DentistAppointmentDetail
  const enrichedAppointment = {
    ...appointment,
    patient: {
      first_name: patient.first_name,
      last_name: patient.last_name,
      email: patient.email,
      phone: patient.phone
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Consultation Mode Banner */}
      <ConsultationModeBanner
        patient={patient}
        appointment={appointment}
        onExit={onExit}
      />

      {/* Appointment Detail - with full editing capabilities */}
      <div className="flex-1 overflow-hidden">
        <DentistAppointmentDetail
          appointment={enrichedAppointment}
          onClose={onExit}
          onStatusChange={handleStatusChange}
        />
      </div>

      {/* Completion Dialog */}
      {showCompletionDialog && (
        <AppointmentCompletionDialog
          open={showCompletionDialog}
          onOpenChange={setShowCompletionDialog}
          appointment={{
            id: appointment.id,
            patient_id: patient.id,
            dentist_id: dentistId,
            appointment_date: appointment.appointment_date,
            reason: appointment.reason,
            patient: {
              first_name: patient.first_name,
              last_name: patient.last_name,
              email: patient.email
            }
          }}
          onCompleted={() => {
            setShowCompletionDialog(false);
            onAppointmentUpdated();
            onExit();
          }}
        />
      )}
    </div>
  );
}
