import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { PatientListView } from './PatientListView';
import { PatientProfileView } from './PatientProfileView';
import { ConsultationModeEntry } from './ConsultationModeEntry';
import { ConsultationModeView } from './ConsultationModeView';
import { DentistAppointmentDetail } from '@/components/appointments/DentistAppointmentDetail';
import { usePatientData } from './hooks/usePatientData';
import { DentistPatient, PatientAppointment, ConsultationContext } from './types';
import { cn } from '@/lib/utils';

interface DentistPatientManagementProps {
  dentistId: string;
}

export function DentistPatientManagement({ dentistId }: DentistPatientManagementProps) {
  const { businessId } = useBusinessContext();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<DentistPatient | null>(null);
  const [patientAppointments, setPatientAppointments] = useState<PatientAppointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  
  // Mode states
  const [showConsultationEntry, setShowConsultationEntry] = useState(false);
  const [consultationContext, setConsultationContext] = useState<ConsultationContext | null>(null);
  const [selectedAppointmentForView, setSelectedAppointmentForView] = useState<PatientAppointment | null>(null);
  const [showAppointmentDetail, setShowAppointmentDetail] = useState(false);

  // Data hook
  const {
    patients,
    loading,
    patientFlags,
    fetchPatients,
    fetchPatientAppointments
  } = usePatientData({ dentistId, businessId: businessId || undefined });

  // Initial fetch
  useEffect(() => {
    console.log('[DentistPatientManagement] Fetching patients, dentistId:', dentistId, 'businessId:', businessId);
    fetchPatients();
  }, [fetchPatients]);

  // Handle URL params for patient selection
  useEffect(() => {
    const patientId = searchParams.get('patientId');
    if (patientId && patients.length > 0) {
      const patient = patients.find(p => p.id === patientId);
      if (patient) {
        setSelectedPatient(patient);
      }
    }
  }, [searchParams, patients]);

  // Fetch appointments when patient changes
  useEffect(() => {
    if (selectedPatient) {
      loadPatientAppointments(selectedPatient.id);
    }
  }, [selectedPatient?.id]);

  const loadPatientAppointments = async (patientId: string) => {
    setLoadingAppointments(true);
    const appointments = await fetchPatientAppointments(patientId);
    setPatientAppointments(appointments);
    setLoadingAppointments(false);
  };

  const handleSelectPatient = (patient: DentistPatient) => {
    setSelectedPatient(patient);
    // Update URL
    setSearchParams({ patientId: patient.id });
  };

  const handleStartConsultation = () => {
    setShowConsultationEntry(true);
  };

  const handleEnterConsultation = (appointmentId: string) => {
    if (!selectedPatient) return;
    
    const appointment = patientAppointments.find(a => a.id === appointmentId);
    if (!appointment) return;

    setConsultationContext({
      appointmentId,
      patientId: selectedPatient.id,
      dentistId,
      startedAt: new Date().toISOString()
    });
    setShowConsultationEntry(false);
  };

  const handleExitConsultation = () => {
    setConsultationContext(null);
    // Refresh appointments
    if (selectedPatient) {
      loadPatientAppointments(selectedPatient.id);
    }
  };

  const handleAppointmentClick = (appointment: PatientAppointment) => {
    setSelectedAppointmentForView(appointment);
    setShowAppointmentDetail(true);
  };

  const handleAppointmentUpdated = () => {
    if (selectedPatient) {
      loadPatientAppointments(selectedPatient.id);
    }
    fetchPatients();
  };

  // If in consultation mode, show full-screen consultation view
  if (consultationContext && selectedPatient) {
    const activeAppointment = patientAppointments.find(
      a => a.id === consultationContext.appointmentId
    );

    if (activeAppointment) {
      return (
        <ConsultationModeView
          patient={selectedPatient}
          appointment={activeAppointment}
          dentistId={dentistId}
          businessId={businessId || ''}
          onExit={handleExitConsultation}
          onAppointmentUpdated={handleAppointmentUpdated}
        />
      );
    }
  }

  console.log('[DentistPatientManagement] Render - patients:', patients.length, 'selectedPatient:', selectedPatient?.id);

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col lg:flex-row gap-4 p-4">
      {/* Patient List - full width on mobile, sidebar on desktop */}
      <div className={cn(
        "lg:w-80 lg:flex-shrink-0 h-full",
        selectedPatient ? "hidden lg:block" : "block"
      )}>
        <PatientListView
          patients={patients}
          patientFlags={patientFlags}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedPatientId={selectedPatient?.id}
          onSelectPatient={handleSelectPatient}
          loading={loading}
        />
      </div>

      {/* Patient Profile - full width on mobile when selected */}
      <div className={cn(
        "flex-1 bg-card rounded-xl border overflow-hidden",
        selectedPatient ? "block" : "hidden lg:block"
      )}>
        {selectedPatient ? (
          <PatientProfileView
            patient={selectedPatient}
            patientFlags={patientFlags[selectedPatient.id]}
            appointments={patientAppointments}
            businessId={businessId || ''}
            loadingAppointments={loadingAppointments}
            onStartConsultation={handleStartConsultation}
            onAppointmentClick={handleAppointmentClick}
            onBack={() => setSelectedPatient(null)}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium">Select a patient</p>
              <p className="text-sm">Choose a patient from the list to view their profile</p>
            </div>
          </div>
        )}
      </div>

      {/* Consultation Entry Dialog */}
      {selectedPatient && (
        <ConsultationModeEntry
          open={showConsultationEntry}
          onOpenChange={setShowConsultationEntry}
          patient={selectedPatient}
          appointments={patientAppointments}
          dentistId={dentistId}
          businessId={businessId || ''}
          onEnterConsultation={handleEnterConsultation}
        />
      )}

      {/* Appointment Detail Sheet (read-only view from profile) */}
      <Sheet open={showAppointmentDetail} onOpenChange={setShowAppointmentDetail}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0">
          {selectedAppointmentForView && selectedPatient && (
            <DentistAppointmentDetail
              appointment={{
                ...selectedAppointmentForView,
                patient: {
                  first_name: selectedPatient.first_name,
                  last_name: selectedPatient.last_name,
                  email: selectedPatient.email,
                  phone: selectedPatient.phone
                }
              }}
              onClose={() => setShowAppointmentDetail(false)}
              onStatusChange={(id, status) => {
                handleAppointmentUpdated();
                setShowAppointmentDetail(false);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
