import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RescheduleAssistant } from '@/components/RescheduleAssistant';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface PatientAppointmentActionsProps {
  appointmentId: string;
  appointmentDate: string;
  status: string;
  onUpdate?: () => void;
}

export function PatientAppointmentActions({
  appointmentId,
  appointmentDate,
  status,
  onUpdate,
}: PatientAppointmentActionsProps) {
  const { toast } = useToast();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const isPast = new Date(appointmentDate) < new Date();
  const canModify = !isPast && status !== 'cancelled' && status !== 'completed';

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          cancellation_reason: cancelReason || 'Patient requested cancellation',
          cancelled_by: profile.id,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Appointment Cancelled",
        description: "Your appointment has been cancelled successfully",
      });

      setShowCancelDialog(false);
      onUpdate?.();
    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to cancel appointment",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  if (!canModify) {
    return null;
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={() => setShowRescheduleDialog(true)}
        >
          <RefreshCw className="h-4 w-4" />
          Reschedule
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-2 text-destructive hover:text-destructive"
          onClick={() => setShowCancelDialog(true)}
        >
          <XCircle className="h-4 w-4" />
          Cancel
        </Button>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancel Appointment?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Are you sure you want to cancel this appointment? This action cannot be undone.
              </p>
              <div className="space-y-2">
                <Label htmlFor="cancel-reason">Reason for Cancellation (Optional)</Label>
                <Textarea
                  id="cancel-reason"
                  placeholder="Please let us know why you're cancelling..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="bg-muted p-3 rounded-md text-sm">
                <p className="font-semibold mb-1">Cancellation Policy:</p>
                <p className="text-muted-foreground">
                  Please cancel at least 24 hours in advance. Late cancellations may be subject to a fee.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelling}
              className="bg-destructive hover:bg-destructive/90"
            >
              {cancelling ? "Cancelling..." : "Cancel Appointment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule Dialog */}
      <RescheduleAssistant
        appointmentId={appointmentId}
        open={showRescheduleDialog}
        onOpenChange={setShowRescheduleDialog}
        onRescheduled={() => {
          onUpdate?.();
        }}
        reason="patient_requested"
      />
    </>
  );
}
