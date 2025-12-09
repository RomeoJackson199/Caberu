import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Calendar,
  ClipboardList as ClipboardListIcon,
  Pill,
  CreditCard,
  User,
  Plus,
  CheckCircle,
  X,
  Eye as EyeIcon,
  AlertCircle,
  Pencil,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { EditPatientDialog } from "@/components/patient/EditPatientDialog";
import { PatientPaymentHistory } from "@/components/PatientPaymentHistory";
import { PrescriptionManager } from "@/components/PrescriptionManager";
import { TreatmentPlanManager } from "@/components/TreatmentPlanManager";
import { AppointmentCompletionDialog } from "@/components/appointment/AppointmentCompletionDialog";
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
import { useBusinessTemplate } from "@/hooks/useBusinessTemplate";
import { logger } from '@/lib/logger';

interface Appointment {
  id: string;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  urgency: string;
  reason?: string;
  consultation_notes?: string;
  patient_id: string;
  dentist_id: string;
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  medical_history?: string;
  emergency_contact?: string;
}

interface PatientDetailsTabsProps {
  selectedPatient: Patient;
  dentistId: string;
  appointments: Appointment[];
  onRefresh: () => void;
}

export function PatientDetailsTabs({ selectedPatient, dentistId, appointments, onRefresh }: PatientDetailsTabsProps) {
  const { toast } = useToast();
  const [completingAppointment, setCompletingAppointment] = useState<Appointment | null>(null);
  const [cancellingAppointment, setCancellingAppointment] = useState<Appointment | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Feature gating from business template
  const { hasFeature } = useBusinessTemplate();
  const canShowTreatments = hasFeature('treatmentPlans');
  const canShowPrescriptions = hasFeature('prescriptions');

  const handleCancelAppointment = async () => {
    if (!cancellingAppointment) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', cancellingAppointment.id);

      if (error) throw error;

      toast({
        title: "Appointment cancelled",
        description: "The appointment has been cancelled successfully.",
      });

      onRefresh();
      setCancellingAppointment(null);
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        title: "Error",
        description: "Failed to cancel appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAppointment = async (apt: Appointment) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', apt.id);

      if (error) throw error;

      // Send approval email notification (non-blocking)
      try {
        const { error: emailError } = await supabase.functions.invoke('send-appointment-decision', {
          body: {
            appointment_id: apt.id,
            decision: 'approved'
          }
        });
        if (emailError) {
          logger.warn('Email notification returned error:', emailError);
        }
      } catch (emailError: any) {
        // Don't fail the whole operation if email notification fails
        logger.warn('Failed to send approval email (will retry on next action):', emailError?.message || emailError);
      }

      toast({
        title: "Appointment approved",
        description: "The appointment has been confirmed and the patient has been notified.",
      });

      onRefresh();
    } catch (error) {
      console.error('Error approving appointment:', error);
      toast({
        title: "Error",
        description: "Failed to approve appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectAppointment = async (apt: Appointment) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', apt.id);

      if (error) throw error;

      // Send rejection email notification (non-blocking)
      try {
        const { error: emailError } = await supabase.functions.invoke('send-appointment-decision', {
          body: {
            appointment_id: apt.id,
            decision: 'rejected'
          }
        });
        if (emailError) {
          logger.warn('Email notification returned error:', emailError);
        }
      } catch (emailError: any) {
        // Don't fail the whole operation if email notification fails
        logger.warn('Failed to send rejection email (will retry on next action):', emailError?.message || emailError);
      }

      toast({
        title: "Appointment rejected",
        description: "The appointment has been cancelled and the patient has been notified.",
      });

      onRefresh();
    } catch (error) {
      console.error('Error rejecting appointment:', error);
      toast({
        title: "Error",
        description: "Failed to reject appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const upcomingAppointments = appointments
    .filter(a => a.status !== 'cancelled' && a.status !== 'completed')
    .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());

  const pastAppointments = appointments
    .filter(a => a.status === 'completed' || a.status === 'cancelled')
    .sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime());

  return (
    <>
      <Tabs defaultValue="appointments" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="appointments" className="text-xs sm:text-sm">
            <Calendar className="h-4 w-4 mr-1" />
            Appointments
          </TabsTrigger>
          {canShowTreatments && (
            <TabsTrigger value="treatments" className="text-xs sm:text-sm">
              <ClipboardListIcon className="h-4 w-4 mr-1" />
              Treatments
            </TabsTrigger>
          )}
          {canShowPrescriptions && (
            <TabsTrigger value="prescriptions" className="text-xs sm:text-sm">
              <Pill className="h-4 w-4 mr-1" />
              Prescriptions
            </TabsTrigger>
          )}
          <TabsTrigger value="payments" className="text-xs sm:text-sm">
            <CreditCard className="h-4 w-4 mr-1" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="info" className="text-xs sm:text-sm">
            <User className="h-4 w-4 mr-1" />
            Info
          </TabsTrigger>
        </TabsList>

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="space-y-4 sm:space-y-6">
          {/* Upcoming Appointments */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <span className="truncate">Upcoming Appointments</span>
                <Badge variant="secondary" className="rounded-full flex-shrink-0">{upcomingAppointments.length}</Badge>
              </h3>
              <Button variant="outline" size="sm" disabled title="Staff booking temporarily disabled - needs reimplementation with slot locking">
                <Calendar className="h-4 w-4 mr-1" />
                Book Appointment
              </Button>
            </div>

            {upcomingAppointments.length === 0 ? (
              <Card className="p-8 text-center bg-muted/30">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No upcoming appointments</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Schedule a new appointment above</p>
              </Card>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {upcomingAppointments.map((apt) => (
                  <Card key={apt.id} className="p-3 sm:p-4 hover:shadow-elegant transition-all duration-200 border-l-4 border-l-primary">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                      <div className="space-y-2 flex-1 w-full min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={cn(
                            "text-white text-xs",
                            apt.status === 'pending' ? 'bg-amber-500' : 'bg-blue-500'
                          )}>
                            {apt.status === 'pending' ? 'Awaiting Approval' : apt.status}
                          </Badge>
                          <Badge variant="outline" className={cn(
                            "text-xs",
                            apt.urgency === 'high' ? 'border-red-500 text-red-500' :
                              apt.urgency === 'medium' ? 'border-yellow-500 text-yellow-500' :
                                'border-green-500 text-green-500'
                          )}>
                            {apt.urgency} urgency
                          </Badge>
                          <span className="text-sm sm:text-base font-semibold">
                            {format(new Date(apt.appointment_date), 'EEE, MMM d')}
                          </span>
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            at {format(new Date(apt.appointment_date), 'h:mm a')}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium truncate">{apt.reason || 'General consultation'}</p>
                        {apt.consultation_notes && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-2 p-2 bg-muted/50 rounded">
                            {apt.consultation_notes}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        {apt.status === 'pending' ? (
                          <>
                            <Button
                              size="sm"
                              className="gap-2 flex-1 sm:flex-initial text-xs sm:text-sm bg-green-600 hover:bg-green-700"
                              onClick={() => handleApproveAppointment(apt)}
                              disabled={loading}
                            >
                              <ThumbsUp className="h-3 w-3 sm:h-4 sm:w-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1 sm:flex-initial text-xs sm:text-sm"
                              onClick={() => handleRejectAppointment(apt)}
                              disabled={loading}
                            >
                              <ThumbsDown className="h-3 w-3 sm:h-4 sm:w-4" />
                              Reject
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              className="gap-2 flex-1 sm:flex-initial text-xs sm:text-sm"
                              onClick={() => setCompletingAppointment(apt)}
                            >
                              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 sm:flex-initial"
                              onClick={() => setCancellingAppointment(apt)}
                            >
                              <X className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Past Appointments */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ClipboardListIcon className="h-5 w-5 text-muted-foreground" />
              Past Appointments
              <Badge variant="secondary" className="rounded-full">{pastAppointments.length}</Badge>
            </h3>

            {pastAppointments.length === 0 ? (
              <Card className="p-8 text-center bg-muted/30">
                <ClipboardListIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No past appointments</p>
              </Card>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {pastAppointments.map((apt) => (
                  <Card key={apt.id} className="p-4 hover:shadow-md transition-shadow bg-muted/30">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge className={
                            apt.status === 'completed' ? 'bg-green-500 text-white' :
                              apt.status === 'cancelled' ? 'bg-red-500 text-white' :
                                'bg-gray-500 text-white'
                          }>
                            {apt.status}
                          </Badge>
                          <span className="text-sm font-medium">
                            {format(new Date(apt.appointment_date), 'MMM d, yyyy')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(apt.appointment_date), 'h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm">{apt.reason || 'General consultation'}</p>
                        {apt.consultation_notes && (
                          <p className="text-xs text-muted-foreground line-clamp-2 p-2 bg-background/50 rounded">
                            {apt.consultation_notes}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Treatment Plans Tab */}
        {canShowTreatments && (
          <TabsContent value="treatments" className="space-y-4">
            <TreatmentPlanManager
              patientId={selectedPatient.id}
              dentistId={dentistId}
            />
          </TabsContent>
        )}

        {/* Prescriptions Tab */}
        {canShowPrescriptions && (
          <TabsContent value="prescriptions" className="space-y-4">
            <PrescriptionManager
              dentistId={dentistId}
            />
          </TabsContent>
        )}

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <PatientPaymentHistory
            patientId={selectedPatient.id}
            viewMode="dentist"
            dentistId={dentistId}
          />
        </TabsContent>

        {/* Patient Info Tab */}
        <TabsContent value="info" className="space-y-4">
          <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">Patient Information</h3>
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Details
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                  <p className="text-base mt-1">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-base mt-1">{selectedPatient.email}</p>
                </div>
                {selectedPatient.phone && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <p className="text-base mt-1">{selectedPatient.phone}</p>
                  </div>
                )}
                {selectedPatient.date_of_birth && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                    <p className="text-base mt-1">{format(new Date(selectedPatient.date_of_birth), 'PPP')}</p>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {selectedPatient.address && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Address</label>
                    <p className="text-base mt-1">{selectedPatient.address}</p>
                  </div>
                )}
                {selectedPatient.emergency_contact && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Emergency Contact</label>
                    <p className="text-base mt-1">{selectedPatient.emergency_contact}</p>
                  </div>
                )}
                {selectedPatient.medical_history && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Medical History</label>
                    <p className="text-base mt-1 whitespace-pre-wrap">{selectedPatient.medical_history}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Completion Dialog */}
      {completingAppointment && (
        <AppointmentCompletionDialog
          open={!!completingAppointment}
          onOpenChange={(open) => !open && setCompletingAppointment(null)}
          appointment={{
            ...completingAppointment,
            patient: {
              first_name: selectedPatient.first_name,
              last_name: selectedPatient.last_name,
              email: selectedPatient.email,
            }
          }}
          onCompleted={() => {
            onRefresh();
            setCompletingAppointment(null);
          }}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancellingAppointment} onOpenChange={(open) => !open && setCancellingAppointment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Cancel Appointment?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment for{' '}
              <span className="font-semibold">
                {format(new Date(cancellingAppointment?.appointment_date || new Date()), 'PPP p')}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelAppointment}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? 'Cancelling...' : 'Yes, Cancel Appointment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <EditPatientDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        patient={selectedPatient}
        onPatientUpdated={onRefresh}
      />
    </>
  );
}
