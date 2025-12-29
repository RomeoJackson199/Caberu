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
    fetchPatientAppointments,
    getPatientAppointmentsCache,
    updateAppointmentOptimistically,
    rollbackAppointmentUpdate
  } = usePatientData({ dentistId, businessId: businessId || undefined });

  // Get current patient's appointments from cache
  const patientAppointmentsCache = selectedPatient 
    ? getPatientAppointmentsCache(selectedPatient.id)
    : { appointments: [], hasMore: false, loading: false };
  const patientAppointments = patientAppointmentsCache.appointments;
  const loadingAppointments = patientAppointmentsCache.loading;
  const hasMoreAppointments = patientAppointmentsCache.hasMore;

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
      fetchPatientAppointments(selectedPatient.id, false);
    }
  }, [selectedPatient?.id, fetchPatientAppointments]);

  const handleLoadMoreAppointments = useCallback(() => {
    if (selectedPatient && hasMoreAppointments && !loadingAppointments) {
      fetchPatientAppointments(selectedPatient.id, true);
    }
  }, [selectedPatient, hasMoreAppointments, loadingAppointments, fetchPatientAppointments]);

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
    
    const appointment = patientAppointments.find((a: PatientAppointment) => a.id === appointmentId);
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
      fetchPatientAppointments(selectedPatient.id, false);
    }
  };

  const handleAppointmentClick = (appointment: PatientAppointment) => {
    setSelectedAppointmentForView(appointment);
    setShowAppointmentDetail(true);
  };

  const handleAppointmentUpdated = useCallback(() => {
    if (selectedPatient) {
      fetchPatientAppointments(selectedPatient.id, false);
    }
    fetchPatients();
  }, [selectedPatient, fetchPatientAppointments, fetchPatients]);

  // Optimistic status change handler - updates UI immediately
  const handleOptimisticStatusChange = useCallback((appointmentId: string, newStatus: string) => {
    if (!selectedPatient) return;
    
    // Cast status to valid type
    const validStatus = newStatus as PatientAppointment['status'];
    
    // Find the current appointment to store original state
    const currentAppointment = patientAppointments.find((a: PatientAppointment) => a.id === appointmentId);
    if (!currentAppointment) return;
    
    // Optimistically update the UI
    updateAppointmentOptimistically(selectedPatient.id, appointmentId, { 
      status: validStatus,
      ...(validStatus === 'completed' ? { completed_at: new Date().toISOString() } : {})
    });
    
    // Update the selected appointment in view if it's the same one
    if (selectedAppointmentForView?.id === appointmentId) {
      setSelectedAppointmentForView(prev => prev ? { 
        ...prev, 
        status: validStatus,
        ...(validStatus === 'completed' ? { completed_at: new Date().toISOString() } : {})
      } : null);
    }
    
    // Close the detail sheet for cancelled/completed
    if (validStatus === 'cancelled' || validStatus === 'completed') {
      setShowAppointmentDetail(false);
    }
    
    // Background sync - refetch to ensure consistency
    setTimeout(() => {
      handleAppointmentUpdated();
    }, 500);
  }, [selectedPatient, patientAppointments, updateAppointmentOptimistically, selectedAppointmentForView, handleAppointmentUpdated]);

  // If in consultation mode, show full-screen consultation view
  if (consultationContext && selectedPatient) {
    const activeAppointment = patientAppointments.find(
      (a: PatientAppointment) => a.id === consultationContext.appointmentId
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
          businessId={businessId || undefined}
          dentistId={dentistId}
          onPatientAdded={fetchPatients}
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
            hasMoreAppointments={hasMoreAppointments}
            onLoadMoreAppointments={handleLoadMoreAppointments}
            onStartConsultation={handleStartConsultation}
            onAppointmentClick={handleAppointmentClick}
            onBack={() => setSelectedPatient(null)}
            onAppointmentUpdated={handleAppointmentUpdated}
            updateAppointmentOptimistically={(appointmentId: string, updates: Partial<PatientAppointment>) => 
              updateAppointmentOptimistically(selectedPatient.id, appointmentId, updates)
            }
            rollbackAppointmentUpdate={(appointmentId: string, original: PatientAppointment) =>
              rollbackAppointmentUpdate(selectedPatient.id, appointmentId, original)
            }
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
      <Sheet 
        open={showAppointmentDetail} 
        onOpenChange={(open) => {
          setShowAppointmentDetail(open);
          // Refresh appointment data when closing to show any saved drafts
          if (!open && selectedPatient) {
            fetchPatientAppointments(selectedPatient.id, false);
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 overflow-hidden">
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
              onStatusChange={handleOptimisticStatusChange}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
