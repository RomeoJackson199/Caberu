import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Calendar, Eye, XCircle, Sparkles, ExternalLink } from "lucide-react";
import { RescheduleAssistant } from "@/components/RescheduleAssistant";

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
  DraftSaveButton,
  FinalizedAddendum,
} from "./dentist-detail";

interface ChargeItem {
  id: string;
  description: string;
  amount_cents: number;
}

interface DentistAppointmentDetailProps {
  appointment: any;
  onClose: () => void;
  onStatusChange?: (appointmentId: string, status: string) => void;
  /** When true, skips SheetHeader/SheetTitle (use when not inside a Sheet) */
  standalone?: boolean;
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
  onClose,
  onStatusChange,
  standalone = false,
}: DentistAppointmentDetailProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [showReschedule, setShowReschedule] = useState(false);
  const [notes, setNotes] = useState(appointment?.consultation_notes || "");
  const [charges, setCharges] = useState<ChargeItem[]>([]);

  // Sync notes when appointment changes
  useEffect(() => {
    setNotes(appointment?.consultation_notes || "");
  }, [appointment?.consultation_notes]);

  // Load saved draft charges
  useEffect(() => {
    const loadDraftCharges = async () => {
      if (!appointment?.id) return;
      
      const { data } = await supabase
        .from('notes')
        .select('content')
        .eq('appointment_id', appointment.id)
        .eq('note_type', 'draft_charges')
        .single();
      
      if (data?.content) {
        try {
          const parsedCharges = JSON.parse(data.content);
          setCharges(parsedCharges);
        } catch (e) {
          console.error('Error parsing draft charges:', e);
        }
      }
    };
    
    loadDraftCharges();
  }, [appointment?.id]);

  // Derive state from appointment data
  const state = useMemo<DentistAppointmentState>(() => 
    deriveDentistState({
      status: appointment?.status || 'pending',
      appointment_date: appointment?.appointment_date,
      completed_at: appointment?.completed_at,
    }), 
    [appointment?.status, appointment?.appointment_date, appointment?.completed_at]
  );

  const permissions = useMemo(() => getDentistPermissions(state), [state]);

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

  const handleCancel = useCallback(() => {
    onStatusChange?.(appointment.id, 'cancelled');
  }, [onStatusChange, appointment?.id]);

  const handleViewProfile = useCallback(() => {
    navigate(`/dentist/patients?patient=${appointment?.patient_id}`);
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
        appointment={appointment}
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

          {/* Section 3a: Consultation Workspace (COMPLETED_DRAFT - editable) */}
          {state === 'COMPLETED_DRAFT' && (
            <>
              <ConsultationWorkspace
                appointmentId={appointment.id}
                patientId={appointment.patient_id}
                dentistId={appointment.dentist_id}
                businessId={appointment.business_id}
                isEditable={true}
                existingNotes={notes}
                existingCharges={charges}
                onNotesChange={setNotes}
                onChargesChange={setCharges}
              />
              
              {/* Draft Save Button - visible for dentist, does not notify patient */}
              <div className="flex justify-end">
                <DraftSaveButton
                  appointmentId={appointment.id}
                  dentistId={appointment.dentist_id}
                  notes={notes}
                  charges={charges}
                />
              </div>
            </>
          )}

          {/* Section 3b: Finalized Addendum (FINALIZED - add-only) */}
          {state === 'FINALIZED' && (
            <FinalizedAddendum
              appointmentId={appointment.id}
              patientId={appointment.patient_id}
              dentistId={appointment.dentist_id}
              businessId={appointment.business_id}
              originalNotes={appointment.consultation_notes}
              originalCompletedAt={appointment.completed_at}
            />
          )}

          {/* Section 4: Finalization Section (ONLY state transition point) */}
          <FinalizationSection
            appointmentId={appointment.id}
            patientId={appointment.patient_id}
            dentistId={appointment.dentist_id}
            businessId={appointment.business_id}
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
          />
        </div>
      </ScrollArea>

      {/* Actions Footer - State-dependent */}
      <div className="border-t p-4 space-y-2 bg-background flex-shrink-0">
        {/* UPCOMING: Reschedule, Cancel, View Profile */}
        {state === 'UPCOMING' && (
          <>
            {permissions.canReschedule && (
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => setShowReschedule(true)}
              >
                <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
                Reschedule
              </Button>
            )}
            <div className="grid grid-cols-2 gap-2">
              {permissions.canCancel && (
                <Button 
                  variant="ghost" 
                  className="text-destructive hover:text-destructive hover:bg-destructive/10" 
                  onClick={handleCancel}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}
              <Button variant="ghost" onClick={handleViewProfile}>
                <Eye className="h-4 w-4 mr-1" />
                Profile
              </Button>
            </div>
          </>
        )}
        
        {/* COMPLETED_DRAFT: Just profile link (finalization is in workspace) */}
        {state === 'COMPLETED_DRAFT' && (
          <Button variant="ghost" className="w-full" onClick={handleViewProfile}>
            <Eye className="h-4 w-4 mr-2" />
            View Patient Profile
          </Button>
        )}
        
        {/* FINALIZED: Profile link with external indicator */}
        {state === 'FINALIZED' && (
          <Button variant="secondary" className="w-full" onClick={handleViewProfile}>
            <Eye className="h-4 w-4 mr-2" />
            View Patient Profile
            <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-50" />
          </Button>
        )}
      </div>

      {/* Reschedule Dialog */}
      <RescheduleAssistant
        appointmentId={appointment.id}
        open={showReschedule}
        onOpenChange={setShowReschedule}
        onRescheduled={() => {
          setShowReschedule(false);
          onClose();
        }}
        reason="patient_requested"
      />
    </div>
  );
}
