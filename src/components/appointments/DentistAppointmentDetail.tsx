import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatClinicTime } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar, Eye, XCircle, ExternalLink, Loader2, Stethoscope, AlertTriangle, Cloud, CloudOff } from "lucide-react";
import { RescheduleDialog } from "@/components/RescheduleDialog";
import { toast } from "sonner";

import {
  deriveDentistState,
  getDentistPermissions,
  DentistAppointmentState,
} from "@/lib/dentistAppointmentState";

import {
  AppointmentHeader,
  PatientSafetySnapshot,
  ConsultationWorkspace,
  FinalizationSection,
  FinalizedAddendum,
} from "./dentist-detail";

import { TreatmentPlanSection } from "@/components/treatment-plans";

interface ChargeItem {
  id: string;
  description: string;
  amount_cents: number;
}

// Flexible appointment type that works with various appointment sources
interface DetailAppointment {
  id: string;
  patient_id: string;
  dentist_id?: string;
  business_id?: string;
  appointment_date: string;
  duration_minutes?: number;
  status: string;
  notes?: string | null;
  reason?: string | null;
  consultation_notes?: string | null;
  completed_at?: string | null;
  treatment_plan_id?: string | null;
  service_id?: string | null;
  created_at?: string;
  updated_at?: string;
  patient?: { first_name?: string; last_name?: string; email?: string; phone?: string; profile_picture_url?: string | null };
}

interface DentistAppointmentDetailProps {
  appointment: DetailAppointment;
  /** Fallback dentist ID if not in appointment */
  dentistIdOverride?: string;
  /** Fallback business ID if not in appointment */
  businessIdOverride?: string;
  onClose: () => void;
  onStatusChange?: (appointmentId: string, status: string) => void;
  /** Callback for optimistic UI updates - updates parent state immediately */
  onOptimisticUpdate?: (appointmentId: string, updates: Record<string, unknown>) => void;
  /** When true, skips SheetHeader/SheetTitle (use when not inside a Sheet) */
  standalone?: boolean;
  /** Callback to report save status to parent (for banner display) */
  onSaveStatusChange?: (status: 'saved' | 'saving' | 'unsaved') => void;
}

/**
 * Dentist Appointment Detail - Canonical Implementation
 * 
 * This is the ONLY place where dentists may:
 * - Write notes
 * - Upload documents
 * - Add charges
 * - Schedule follow-ups
 * - Finalize appointments
 * 
 * No other screen may perform these actions.
 */
export function DentistAppointmentDetail({
  appointment,
  dentistIdOverride,
  businessIdOverride,
  onClose,
  onStatusChange,
  onOptimisticUpdate,
  standalone = false,
  onSaveStatusChange,
}: DentistAppointmentDetailProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Resolve dentist and business IDs from appointment or overrides
  const dentistId = appointment.dentist_id || dentistIdOverride || '';
  const businessId = appointment.business_id || businessIdOverride || '';

  const [showReschedule, setShowReschedule] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [notes, setNotes] = useState(appointment?.consultation_notes || "");
  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const [chargesKey, setChargesKey] = useState(0); // Force reload trigger
  const [isCancelling, setIsCancelling] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // Forward save status changes to parent (for banner display)
  useEffect(() => {
    onSaveStatusChange?.(saveStatus);
  }, [saveStatus, onSaveStatusChange]);

  // Sync notes when appointment changes or component mounts with fresh data
  useEffect(() => {

    setNotes(appointment?.consultation_notes || "");
    // Also trigger charges reload when appointment changes
    setChargesKey(prev => prev + 1);
  }, [appointment?.id, appointment?.consultation_notes]);

  // Load saved draft charges - now also triggers on chargesKey change
  useEffect(() => {
    const loadDraftCharges = async () => {
      if (!appointment?.id) return;



      const { data, error } = await supabase
        .from('notes_decrypted' as any)
        .select('content')
        .eq('appointment_id', appointment.id)
        .eq('note_type', 'draft_charges')
        .maybeSingle();

      if (error) {
        return;
      }



      if (data?.content) {
        try {
          const parsedCharges = JSON.parse(data.content);
          setCharges(parsedCharges);
        } catch {
          // Invalid JSON in draft charges, ignore
        }
      }
      // When no draft charges are found, leave charges as-is (initial [] state).
      // Calling setCharges([]) here creates a new array reference that propagates
      // to ConsultationWorkspace and disrupts the service-price auto-populate.
    };

    loadDraftCharges();
  }, [appointment?.id, chargesKey]);

  // Callback to reload draft data after save
  const handleDraftSaved = useCallback(() => {

    setChargesKey(prev => prev + 1);
  }, []);

  // Derive state from appointment data - must be before callbacks that use it
  const state = useMemo<DentistAppointmentState>(() =>
    deriveDentistState({
      status: appointment?.status || 'pending',
      appointment_date: appointment?.appointment_date,
      completed_at: appointment?.completed_at ?? null,
    }),
    [appointment?.status, appointment?.appointment_date, appointment?.completed_at]
  );

  const permissions = useMemo(() => getDentistPermissions(state), [state]);

  // Handle close with unsaved changes check
  const handleSafeClose = useCallback(() => {
    if (saveStatus === 'unsaved' && state === 'COMPLETED_DRAFT') {
      setShowExitDialog(true);
    } else {
      onClose();
    }
  }, [saveStatus, state, onClose]);

  // Force close without saving
  const handleForceClose = useCallback(() => {
    setShowExitDialog(false);
    onClose();
  }, [onClose]);

  // Wait for save then close
  const handleSaveAndClose = useCallback(() => {
    setShowExitDialog(false);
    // The auto-save will complete, just close after a brief delay
    setTimeout(() => {
      onClose();
    }, 1500);
  }, [onClose]);

  // Fetch business info
  const { data: business } = useQuery({
    queryKey: ['business', appointment?.business_id],
    queryFn: async () => {
      if (!appointment?.business_id) return null;
      const { data } = await supabase
        .from('businesses')
        .select('name, address')
        .eq('id', appointment.business_id)
        .single();
      return data;
    },
    enabled: !!appointment?.business_id,
  });

  // Fetch dentist info (including approval settings)
  const { data: dentist } = useQuery({
    queryKey: ['dentist', appointment?.dentist_id],
    queryFn: async () => {
      if (!appointment?.dentist_id) return null;
      const { data } = await supabase
        .from('dentists')
        .select('first_name, last_name, specialization, require_appointment_approval')
        .eq('id', appointment.dentist_id)
        .single();
      return data;
    },
    enabled: !!appointment?.dentist_id,
  });

  const dentistName = dentist
    ? `Dr. ${dentist.first_name || ''} ${dentist.last_name || ''}`.trim()
    : undefined;

  const handleFinalized = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    onStatusChange?.(appointment.id, 'completed');
  }, [queryClient, onStatusChange, appointment?.id]);

  const handleAppointmentStatusChange = useCallback((status: string) => {
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    onStatusChange?.(appointment.id, status);
  }, [queryClient, onStatusChange, appointment?.id]);

  const handleCancelClick = useCallback(() => {
    setShowCancelDialog(true);
  }, []);

  const confirmCancel = useCallback(async () => {
    if (!appointment?.id) return;

    setIsCancelling(true);
    setShowCancelDialog(false);

    // Optimistic update - update UI immediately
    onOptimisticUpdate?.(appointment.id, {
      status: 'cancelled',
      updated_at: new Date().toISOString()
    });

    // Close immediately for snappy UX
    onClose();
    toast.success('Appointment cancelled');

    try {
      // No slot release needed - dynamic availability automatically reflects cancellations

      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.id);

      if (error) throw error;

      // Refresh queries
      await queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false });
      onStatusChange?.(appointment.id, 'cancelled');
    } catch (error) {
      console.error('Failed to cancel appointment:', error);
      toast.error('Failed to cancel appointment', { description: 'Please try again' });
      // Note: We don't rollback here since onClose was called. User will see fresh data on reopen.
    } finally {
      setIsCancelling(false);
    }
  }, [appointment?.id, onClose, onOptimisticUpdate, onStatusChange, queryClient]);

  const handleViewProfile = useCallback(() => {
    navigate(`/dentist/patients?patientId=${appointment?.patient_id}`);
  }, [navigate, appointment?.patient_id]);

  if (!appointment) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No appointment selected
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Sheet Header (only when inside Sheet) */}
      {!standalone && (
        <div className="p-4 border-b">
          <SheetHeader className="space-y-0">
            <SheetTitle className="flex items-center gap-2 text-base font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Appointment Details
            </SheetTitle>
          </SheetHeader>
        </div>
      )}

      {/* Section 1: Header - Context & State (always visible) */}
      <AppointmentHeader
        appointment={{
          ...appointment,
          reason: appointment.reason ?? undefined,
          notes: appointment.notes ?? undefined,
        }}
        state={state}
        dentistName={dentistName}
        dentistSpecialization={dentist?.specialization}
        clinicName={business?.name || business?.address}
      />

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 space-y-4">

          {/* Section 2: Patient Safety Snapshot (read-only, always visible) */}
          <PatientSafetySnapshot patientId={appointment.patient_id} />

          {/* Section 3a: Consultation Workspace (UPCOMING & COMPLETED_DRAFT - editable) */}
          {(state === 'UPCOMING' || state === 'COMPLETED_DRAFT') && (
            <>
              <ConsultationWorkspace
                appointmentId={appointment.id}
                patientId={appointment.patient_id}
                dentistId={dentistId}
                businessId={businessId}
                isEditable={permissions.canEditNotes}
                existingNotes={notes}
                existingCharges={charges}
                existingServiceId={appointment.service_id}
                patientSymptoms={appointment.notes}
                onNotesChange={setNotes}
                onChargesChange={setCharges}
                onSaveStatusChange={setSaveStatus}
              />

              {/* Treatment Plan Section */}
              {state === 'COMPLETED_DRAFT' && (
                <TreatmentPlanSection
                  appointmentId={appointment.id}
                  patientId={appointment.patient_id}
                  dentistId={dentistId}
                  businessId={businessId}
                  existingPlanId={appointment.treatment_plan_id}
                  isEditable={true}
                  onPlanCreated={(planId) => {
                    onOptimisticUpdate?.(appointment.id, { treatment_plan_id: planId });
                    queryClient.invalidateQueries({ queryKey: ['appointments'] });
                  }}
                  onPlanUpdated={() => {
                    queryClient.invalidateQueries({ queryKey: ['appointments'] });
                  }}
                />
              )}
            </>
          )}

          {/* Section 3b: Finalized Addendum (FINALIZED - add-only) */}
          {state === 'FINALIZED' && (
            <FinalizedAddendum
              appointmentId={appointment.id}
              patientId={appointment.patient_id}
              dentistId={dentistId}
              businessId={businessId}
              originalNotes={appointment.consultation_notes ?? undefined}
              originalCompletedAt={appointment.completed_at ?? undefined}
            />
          )}

          {/* Section 4: Finalization Section (ONLY state transition point) */}
          <FinalizationSection
            appointmentId={appointment.id}
            patientId={appointment.patient_id}
            dentistId={dentistId}
            businessId={businessId}
            state={state}
            notes={notes}
            charges={charges}
            completedAt={appointment.completed_at}
            completedByName={dentistName}
            appointmentDate={appointment.appointment_date}
            requiresApproval={dentist?.require_appointment_approval ?? false}
            currentStatus={appointment.status}
            onFinalized={handleFinalized}
            onStatusChange={handleAppointmentStatusChange}
            onOptimisticUpdate={(updates) => onOptimisticUpdate?.(appointment.id, updates)}
            onClose={onClose}
          />
        </div>
      </ScrollArea>

      {/* Actions Footer - State-dependent */}
      {/* Hide navigation buttons when in standalone mode (already in consultation) */}
      <div className="border-t p-4 space-y-2 bg-background flex-shrink-0">
        {/* UPCOMING: Start Consultation (only when not standalone), Reschedule, Cancel, View Profile */}
        {state === 'UPCOMING' && (
          <>
            {/* Primary action: Start Consultation - only show when not in standalone mode */}
            {!standalone && (
              <Button
                className="w-full"
                onClick={() => navigate(`/dentist/patients?patientId=${appointment?.patient_id}&appointmentId=${appointment?.id}`)}
              >
                <Stethoscope className="h-4 w-4 mr-2" />
                Start Consultation
              </Button>
            )}
            {permissions.canReschedule && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowReschedule(true)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Reschedule
              </Button>
            )}
            <div className="grid grid-cols-2 gap-2">
              {permissions.canCancel && (
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleCancelClick}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-1" />
                  )}
                  Cancel
                </Button>
              )}
              {!standalone && (
                <Button variant="ghost" onClick={handleViewProfile}>
                  <Eye className="h-4 w-4 mr-1" />
                  Profile
                </Button>
              )}
            </div>
          </>
        )}

        {/* COMPLETED_DRAFT: Only show profile link when not standalone (already in consultation) */}
        {state === 'COMPLETED_DRAFT' && !standalone && (
          <Button variant="ghost" className="w-full" onClick={handleViewProfile}>
            <Eye className="h-4 w-4 mr-2" />
            View Patient Profile
          </Button>
        )}

        {/* FINALIZED: Profile link with external indicator */}
        {state === 'FINALIZED' && !standalone && (
          <Button variant="secondary" className="w-full" onClick={handleViewProfile}>
            <Eye className="h-4 w-4 mr-2" />
            View Patient Profile
            <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-50" />
          </Button>
        )}
      </div>

      {/* Reschedule Dialog */}
      <RescheduleDialog
        appointmentId={appointment.id}
        open={showReschedule}
        onOpenChange={setShowReschedule}
        onSuccess={() => {
          setShowReschedule(false);
          onClose();
        }}
      />

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancel this appointment?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the appointment with{' '}
              <span className="font-medium text-foreground">
                {appointment?.patient?.first_name} {appointment?.patient?.last_name}
              </span>
              {appointment?.appointment_date && (
                <span className="block mt-2">
                  Scheduled for: {formatClinicTime(appointment.appointment_date, 'PPp')}
                </span>
              )}
              <span className="block mt-3 font-medium">
                The patient will be notified of the cancellation.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel Appointment'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved Changes Exit Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CloudOff className="h-5 w-5 text-amber-500" />
              Unsaved changes
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have changes that are still being saved. Would you like to wait for them to save before leaving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel onClick={() => setShowExitDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <Button variant="outline" onClick={handleForceClose}>
              Leave without saving
            </Button>
            <AlertDialogAction onClick={handleSaveAndClose}>
              <Cloud className="h-4 w-4 mr-2" />
              Wait & save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
