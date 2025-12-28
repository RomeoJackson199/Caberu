import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { CheckCircle, Lock, Loader2, XCircle, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DentistAppointmentState } from "@/lib/dentistAppointmentState";
import { NotificationService } from "@/lib/notificationService";

interface ChargeItem {
  id: string;
  description: string;
  amount_cents: number;
}

interface FinalizationSectionProps {
  appointmentId: string;
  patientId: string;
  dentistId: string;
  businessId: string;
  state: DentistAppointmentState;
  notes: string;
  charges: ChargeItem[];
  completedAt?: string | null;
  completedByName?: string;
  appointmentDate?: string;
  requiresApproval?: boolean;
  currentStatus?: string;
  onFinalized: () => void;
  onStatusChange?: (status: string) => void;
}

/**
 * Finalization Section - The ONLY state transition point
 * Shows finalize CTA for COMPLETED_DRAFT
 * Shows read-only confirmation for FINALIZED
 */
export function FinalizationSection({
  appointmentId,
  patientId,
  dentistId,
  businessId,
  state,
  notes,
  charges,
  completedAt,
  completedByName,
  appointmentDate,
  requiresApproval,
  currentStatus,
  onFinalized,
  onStatusChange,
}: FinalizationSectionProps) {
  const { toast } = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState<'confirm' | 'cancel' | null>(null);

  const totalCents = charges.reduce((sum, c) => sum + c.amount_cents, 0);

  // Send email notification to patient
  const sendFinalizationEmail = async () => {
    try {
      // Get patient's user_id for notification
      const { data: patient } = await supabase
        .from('profiles')
        .select('user_id, first_name, email')
        .eq('id', patientId)
        .single();

      if (patient?.user_id) {
        const formattedDate = appointmentDate 
          ? format(new Date(appointmentDate), 'MMMM d, yyyy')
          : 'your recent visit';
        
        await NotificationService.createNotification(
          patient.user_id,
          'Appointment Completed',
          `Your appointment on ${formattedDate} has been finalized. ${totalCents > 0 ? `An invoice for $${(totalCents / 100).toFixed(2)} has been generated.` : ''} Thank you for your visit!`,
          'appointment',
          'info',
          `/patient/appointments`,
          { 
            appointmentId, 
            dentistId,
            appointmentDate: formattedDate,
          },
          undefined,
          true // sendEmail
        );
      }
    } catch (error) {
      console.error('Error sending finalization email:', error);
      // Don't fail the finalization if email fails
    }
  };

  const handleFinalize = async () => {
    setIsLoading(true);
    
    try {
      // 1. Update appointment with completed_at timestamp
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          consultation_notes: notes,
          amount_paid_cents: totalCents,
          payment_status: totalCents > 0 ? 'pending' : 'paid',
        })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      // 2. Create invoice if there are charges
      if (totalCents > 0) {
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            appointment_id: appointmentId,
            patient_id: patientId,
            dentist_id: dentistId,
            total_amount_cents: totalCents,
            patient_amount_cents: totalCents,
            mutuality_amount_cents: 0,
            vat_amount_cents: 0,
            status: 'pending',
            claim_status: 'to_be_submitted',
          })
          .select()
          .single();

        if (!invoiceError && invoice) {
          // Add invoice items
          const invoiceItems = charges.map(charge => ({
            invoice_id: invoice.id,
            code: `SERV-${Date.now()}`,
            description: charge.description,
            quantity: 1,
            tariff_cents: charge.amount_cents,
            mutuality_cents: 0,
            patient_cents: charge.amount_cents,
            vat_cents: 0,
          }));

          await supabase.from('invoice_items').insert(invoiceItems);
        }
      }

      // 3. Create clinical notes record
      if (notes.trim()) {
        await supabase.from('notes').insert({
          patient_id: patientId,
          appointment_id: appointmentId,
          title: `Consultation Notes - ${format(new Date(), 'PPP')}`,
          content: notes,
          note_type: 'consultation',
          created_by: dentistId,
        });
      }

      // 4. Send email notification to patient
      await sendFinalizationEmail();

      toast({
        title: "Appointment finalized",
        description: "All records have been locked and the patient has been notified.",
      });

      onFinalized();
    } catch (error) {
      console.error('Finalization error:', error);
      toast({
        title: "Error finalizing appointment",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(false);
    }
  };

  // Handle appointment confirmation (for dentists with approval required)
  const handleApprovalAction = async (action: 'confirm' | 'cancel') => {
    setApprovalLoading(action);
    
    try {
      const newStatus = action === 'confirm' ? 'confirmed' : 'cancelled';
      
      // Use business_id filter to satisfy RLS policy
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .eq('business_id', businessId);

      if (error) throw error;

      // Notify patient about the decision
      try {
        const { data: patient } = await supabase
          .from('profiles')
          .select('user_id, first_name')
          .eq('id', patientId)
          .single();

        if (patient?.user_id) {
          const formattedDate = appointmentDate 
            ? format(new Date(appointmentDate), 'MMMM d, yyyy \'at\' h:mm a')
            : 'your requested appointment';

          const title = action === 'confirm' 
            ? 'Appointment Confirmed' 
            : 'Appointment Cancelled';
          
          const message = action === 'confirm'
            ? `Your appointment on ${formattedDate} has been confirmed by your dentist.`
            : `Your appointment request for ${formattedDate} could not be accommodated. Please book a new appointment.`;

          await NotificationService.createNotification(
            patient.user_id,
            title,
            message,
            'appointment',
            action === 'confirm' ? 'info' : 'warning',
            `/patient/appointments`,
            { appointmentId, dentistId, appointmentDate: formattedDate },
            undefined,
            true // sendEmail
          );
        }
      } catch (notifyError) {
        console.error('Error notifying patient:', notifyError);
        // Don't fail the approval if notification fails
      }

      toast({
        title: action === 'confirm' ? 'Appointment confirmed' : 'Appointment cancelled',
        description: action === 'confirm' 
          ? 'The patient has been notified.' 
          : 'The patient has been notified of the cancellation.',
      });

      onStatusChange?.(newStatus);
    } catch (error) {
      console.error('Approval action error:', error);
      toast({
        title: "Error updating appointment",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setApprovalLoading(null);
    }
  };

  // FINALIZED state - show confirmation
  if (state === 'FINALIZED') {
    return (
      <Card className="border-emerald-200/50 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-950/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
              <Lock className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-foreground">Appointment Finalized</p>
              <p className="text-sm text-muted-foreground">
                {completedAt && `Finalized on ${format(new Date(completedAt), 'PPP')}`}
                {completedByName && ` by ${completedByName}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // COMPLETED_DRAFT state - show finalization CTA
  if (state === 'COMPLETED_DRAFT') {
    return (
      <>
        <div className="space-y-2">
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => setShowConfirmDialog(true)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Finalize Appointment
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            Finalizing will lock all edits and generate the invoice
          </p>
        </div>

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Finalize this appointment?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The following will happen:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Clinical notes will be locked</li>
                  <li>Documents will become patient-visible</li>
                  {totalCents > 0 && (
                    <li>Invoice for ${(totalCents / 100).toFixed(2)} will be generated</li>
                  )}
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleFinalize} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Confirm & Finalize
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // UPCOMING state - show approval actions if required
  if (state === 'UPCOMING' && requiresApproval && currentStatus === 'pending') {
    return (
      <Card className="border-amber-200/50 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-foreground">Awaiting Your Approval</p>
              <p className="text-sm text-muted-foreground">
                This appointment requires your confirmation
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => handleApprovalAction('cancel')}
              disabled={approvalLoading !== null}
            >
              {approvalLoading === 'cancel' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Decline
            </Button>
            <Button
              onClick={() => handleApprovalAction('confirm')}
              disabled={approvalLoading !== null}
            >
              {approvalLoading === 'confirm' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Confirm
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // UPCOMING state (no approval needed or already confirmed) - no finalization section
  return null;
}
