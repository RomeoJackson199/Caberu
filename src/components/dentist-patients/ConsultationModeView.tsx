import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

  // Sync local state when appointment prop changes
  useEffect(() => {
    setLocalAppointment(appointment);
  }, [appointment]);

  // Fetch appointment type and service info for banner
  const { data: appointmentExtras } = useQuery({
    queryKey: ['appointment-extras-banner', appointment.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('appointments')
        .select(`
          duration_minutes,
          appointment_types (
            id,
            name,
            category,
            color
          ),
          business_services (
            name,
            price_cents
          )
        `)
        .eq('id', appointment.id)
        .single();
      return data;
    },
    enabled: !!appointment.id,
  });

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
      phone: patient.phone
    }
  };

  // Enrich appointment with type info for banner
  const enrichedBannerAppointment = {
    ...localAppointment,
    duration_minutes: appointmentExtras?.duration_minutes,
    appointment_type: appointmentExtras?.appointment_types || null,
    service: appointmentExtras?.business_services || null,
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Consultation Mode Banner */}
      <ConsultationModeBanner
        patient={patient}
        appointment={enrichedBannerAppointment}
        onExit={onExit}
      />

      {/* Appointment Detail - with full editing capabilities */}
      <div className="flex-1 overflow-auto">
        <DentistAppointmentDetail
          appointment={enrichedAppointment}
          onClose={onExit}
          onStatusChange={handleStatusChange}
          onOptimisticUpdate={handleOptimisticUpdate}
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
