import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { PatientListView } from './PatientListView';
import { PatientProfileView } from './PatientProfileView';
import { ConsultationModeEntry } from './ConsultationModeEntry';
import { ConsultationModeView } from './ConsultationModeView';
import { DentistAppointmentDetail } from '@/components/appointments/DentistAppointmentDetail';
import { TreatmentPlanDetailSheet } from '@/components/treatment-plans/TreatmentPlanDetailSheet';
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
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showPlanDetail, setShowPlanDetail] = useState(false);

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

    fetchPatients();
  }, [fetchPatients]);

  // Track pending consultation to enter after appointments load
  const [pendingConsultationAppointmentId, setPendingConsultationAppointmentId] = useState<string | null>(null);

  // Handle URL params for patient selection and auto-consultation mode
  useEffect(() => {
    const patientId = searchParams.get('patientId');
    const appointmentId = searchParams.get('appointmentId');

    if (patientId && patients.length > 0) {
      const patient = patients.find(p => p.id === patientId);
      if (patient) {
        setSelectedPatient(patient);

        // If appointmentId is also provided, set pending consultation
        if (appointmentId) {
          // Clear URL params to avoid re-triggering
          setSearchParams({});
          // Set pending consultation to be processed once appointments load
          setPendingConsultationAppointmentId(appointmentId);
        }
      }
    }
  }, [searchParams, patients, setSearchParams]);

  // Effect to enter consultation mode once appointments are loaded
  useEffect(() => {
    if (pendingConsultationAppointmentId && selectedPatient && patientAppointments.length > 0 && !loadingAppointments) {
      const appointment = patientAppointments.find((a: PatientAppointment) => a.id === pendingConsultationAppointmentId);
      if (appointment) {
        // Enter consultation mode directly
        setConsultationContext({
          appointmentId: pendingConsultationAppointmentId,
          patientId: selectedPatient.id,
          dentistId,
          startedAt: new Date().toISOString()
        });
        setPendingConsultationAppointmentId(null);
      }
    }
  }, [pendingConsultationAppointmentId, selectedPatient, patientAppointments, loadingAppointments, dentistId]);

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

  const handleTreatmentPlanClick = (planId: string) => {
    setSelectedPlanId(planId);
    setShowPlanDetail(true);
  };

  // Enter consultation directly from treatment plan linked appointments
  const handleEnterConsultationFromPlan = (appointmentId: string) => {
    // Close the plan detail sheet
    setShowPlanDetail(false);
    setSelectedPlanId(null);

    // Enter consultation mode directly
    handleEnterConsultation(appointmentId);
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
            dentistId={dentistId}
            loadingAppointments={loadingAppointments}
            hasMoreAppointments={hasMoreAppointments}
            onLoadMoreAppointments={handleLoadMoreAppointments}
            onStartConsultation={handleStartConsultation}
            onAppointmentClick={handleAppointmentClick}
            onEnterConsultation={handleEnterConsultation}
            onTreatmentPlanClick={handleTreatmentPlanClick}
            onBack={() => setSelectedPatient(null)}
            onAppointmentUpdated={handleAppointmentUpdated}
            onBalanceUpdated={fetchPatients}
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
        onOpenChange={setShowAppointmentDetail}
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
                  phone: selectedPatient.phone,
                  profile_picture_url: selectedPatient.profile_picture_url,
                }
              }}
              onClose={() => setShowAppointmentDetail(false)}
              onStatusChange={handleOptimisticStatusChange}
              onOptimisticUpdate={(appointmentId, updates) => {
                updateAppointmentOptimistically(selectedPatient.id, appointmentId, updates as Partial<PatientAppointment>);
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Treatment Plan Detail Sheet */}
      <TreatmentPlanDetailSheet
        planId={selectedPlanId}
        open={showPlanDetail}
        onOpenChange={(open) => {
          setShowPlanDetail(open);
          if (!open) setSelectedPlanId(null);
        }}
        onEnterConsultation={handleEnterConsultationFromPlan}
      />
    </div>
  );
}
