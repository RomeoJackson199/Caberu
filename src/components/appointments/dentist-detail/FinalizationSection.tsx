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
  /** Callback for optimistic UI updates */
  onOptimisticUpdate?: (updates: Record<string, unknown>) => void;
  /** Callback to close the parent modal/sheet */
  onClose?: () => void;
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
  onOptimisticUpdate,
  onClose,
}: FinalizationSectionProps) {
  const { toast } = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState<'confirm' | 'cancel' | null>(null);

  const totalCents = charges.reduce((sum, c) => sum + c.amount_cents, 0);

  // Send email notification to patient
  const sendFinalizationEmail = async () => {
    try {
      console.log('📧 Sending finalization email for patient:', patientId);
      
      // Get patient's user_id for notification
      const { data: patient, error: patientError } = await supabase
        .from('profiles')
        .select('user_id, first_name, email')
        .eq('id', patientId)
        .single();

      if (patientError) {
        console.error('Error fetching patient profile:', patientError);
        return;
      }

      if (!patient?.user_id) {
        console.error('No user_id found for patient:', patientId);
        return;
      }

      console.log('📧 Patient found:', { email: patient.email, firstName: patient.first_name });

      const formattedDate = appointmentDate 
        ? format(new Date(appointmentDate), 'MMMM d, yyyy')
        : 'your recent visit';
      
      // Call edge function directly - use 'system' type to avoid using confirmation template
      const invoiceText = totalCents > 0 
        ? `An invoice for $${(totalCents / 100).toFixed(2)} has been generated.` 
        : '';
      
      const { error: emailError } = await supabase.functions.invoke('send-email-notification', {
        body: {
          to: patient.email,
          subject: 'Your Appointment Has Been Completed',
          message: `Dear ${patient.first_name || 'Patient'},\n\nYour appointment on ${formattedDate} has been successfully completed and finalized. ${invoiceText}\n\nThank you for visiting us! If you have any questions about your visit, please don't hesitate to contact us.\n\nBest regards,\nYour Dental Team`,
          messageType: 'system', // Use system to avoid confirmation template
          patientId: patientId,
          dentistId: dentistId,
          appointmentDate: formattedDate,
        }
      });

      if (emailError) {
        console.error('❌ Email notification error:', emailError);
      }

      // Also create an in-app notification
      await NotificationService.createNotification(
        patient.user_id,
        'Appointment Completed',
        `Your appointment on ${formattedDate} has been finalized. ${totalCents > 0 ? `An invoice for $${(totalCents / 100).toFixed(2)} has been generated.` : ''} Thank you for your visit!`,
        'appointment',
        'info',
        `/patient/appointments`,
        { appointmentId, dentistId, appointmentDate: formattedDate },
        undefined,
        false // Don't send email again, we already did it directly
      );
      
      console.log('✅ Finalization notification sent successfully');
    } catch (error) {
      console.error('Error sending finalization email:', error);
      // Don't fail the finalization if email fails
    }
  };

  const handleFinalize = async () => {
    setIsLoading(true);
    
    console.log('🏁 Starting finalization...', { 
      appointmentId, 
      chargesCount: charges.length, 
      totalCents,
      notes: notes?.slice(0, 50) 
    });
    
    const completedAtTime = new Date().toISOString();
    
    // Optimistic update - update UI immediately
    onOptimisticUpdate?.({
      status: 'completed',
      completed_at: completedAtTime,
      consultation_notes: notes,
      amount_paid_cents: totalCents,
      payment_status: totalCents > 0 ? 'pending' : 'paid',
    });
    
    // Close modal immediately for snappy UX
    setShowConfirmDialog(false);
    onClose?.();
    
    try {
      // 1. Update appointment with completed_at timestamp
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          status: 'completed',
          completed_at: completedAtTime,
          consultation_notes: notes,
          amount_paid_cents: totalCents,
          payment_status: totalCents > 0 ? 'pending' : 'paid',
        })
        .eq('id', appointmentId);

      if (updateError) throw updateError;
      console.log('✅ Appointment updated to completed');

      // 2. Create payment request if there are charges
      if (totalCents > 0) {
        console.log('💰 Creating payment request for', totalCents, 'cents');
        
        // Get patient email for payment request
        const { data: patientData } = await supabase
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('id', patientId)
          .single();

        console.log('👤 Patient data:', patientData);

        if (patientData?.email) {
          const formattedDate = appointmentDate 
            ? format(new Date(appointmentDate), 'MMMM d, yyyy')
            : format(new Date(), 'MMMM d, yyyy');
          
          const description = `Appointment on ${formattedDate}${charges.length > 0 ? ' - ' + charges.map(c => c.description).join(', ') : ''}`;
          const patientName = [patientData.first_name, patientData.last_name].filter(Boolean).join(' ') || 'Patient';

          console.log('📧 Calling create-payment-request edge function...', {
            patient_id: patientId,
            amount: totalCents,
            patient_email: patientData.email,
            send_now: true,
            items: charges.map(c => ({
              description: c.description,
              unit_price_cents: c.amount_cents,
              quantity: 1,
            })),
          });

          // Create payment request via edge function (sends email automatically)
          const { data: paymentResult, error: paymentError } = await supabase.functions.invoke('create-payment-request', {
            body: {
              patient_id: patientId,
              dentist_id: dentistId,
              amount: totalCents,
              description,
              patient_email: patientData.email,
              patient_name: patientName,
              appointment_id: appointmentId,
              send_now: true, // This will send the payment email immediately
              items: charges.map(c => ({
                description: c.description,
                unit_price_cents: c.amount_cents,
                quantity: 1,
              })),
            }
          });

          if (paymentError) {
            console.error('❌ Payment request error:', paymentError);
            // Don't fail finalization if payment request fails
          } else {
            console.log('✅ Payment request created:', paymentResult);
          }
        } else {
          console.warn('⚠️ No patient email found, skipping payment request');
        }
      } else {
        console.log('ℹ️ No charges, skipping payment request');
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
        console.log('✅ Clinical notes saved');
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
    
    const newStatus = action === 'confirm' ? 'confirmed' : 'cancelled';
    
    // Optimistic update - update UI immediately
    onOptimisticUpdate?.({ 
      status: newStatus,
      updated_at: new Date().toISOString() 
    });
    
    // Close modal for snappy UX
    onClose?.();
    
    try {
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
