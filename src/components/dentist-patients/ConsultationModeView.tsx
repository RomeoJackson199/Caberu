import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { DentistPatient, PatientAppointment } from './types';
import { DentistAppointmentDetail } from '@/components/appointments/DentistAppointmentDetail';
import { CompletionDialog } from '@/components/appointments/completion-dialog';
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
  const [localAppointment, setLocalAppointment] = useState(appointment);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // Sync local state when appointment prop changes
  useEffect(() => {
    setLocalAppointment(appointment);
  }, [appointment]);

  // Handle save status changes from DentistAppointmentDetail
  const handleSaveStatusChange = useCallback((status: 'saved' | 'saving' | 'unsaved') => {
    setSaveStatus(status);
  }, []);

  const handleStatusChange = (appointmentId: string, newStatus: string) => {
    onAppointmentUpdated();
    if (newStatus === 'completed') {
      // Exit consultation mode after completing
      onExit();
    }
  };

  const handleOptimisticUpdate = (appointmentId: string, updates: Record<string, unknown>) => {
    setLocalAppointment(prev => ({ ...prev, ...updates }));
  };

  // Build the appointment object with patient info for DentistAppointmentDetail
  const enrichedAppointment = {
    ...localAppointment,
    patient: {
      first_name: patient.first_name,
      last_name: patient.last_name,
      email: patient.email,
      phone: patient.phone,
      profile_picture_url: patient.profile_picture_url,
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Consultation Mode Banner */}
      <ConsultationModeBanner
        patient={patient}
        appointment={localAppointment}
        onExit={onExit}
        saveStatus={saveStatus}
      />

      {/* Appointment Detail - with full editing capabilities */}
      <div className="flex-1 overflow-auto">
        <DentistAppointmentDetail
          appointment={enrichedAppointment}
          onClose={onExit}
          onStatusChange={handleStatusChange}
          onOptimisticUpdate={handleOptimisticUpdate}
          onSaveStatusChange={handleSaveStatusChange}
          standalone
        />
      </div>

      {/* Completion Dialog */}
      {showCompletionDialog && (
        <CompletionDialog
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
