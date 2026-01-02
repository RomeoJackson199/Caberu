import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface AppointmentPatient {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}

interface AppointmentData {
  id: string;
  patient_id: string;
  dentist_id: string;
  appointment_date: string;
  reason?: string;
  patient?: AppointmentPatient;
}

interface CompletionDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  appointmentId?: string;
  appointment?: AppointmentData;
  onComplete?: () => void;
  onCompleted?: () => void | Promise<void>;
}

export function CompletionDialog({ 
  open = false, 
  onOpenChange, 
  appointmentId,
  appointment,
  onComplete,
  onCompleted,
}: CompletionDialogProps) {
  const [notes, setNotes] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      if (onComplete) {
        onComplete();
      }
      if (onCompleted) {
        await onCompleted();
      }
      onOpenChange?.(false);
    } finally {
      setIsLoading(false);
    }
  };

  const patientName = appointment?.patient 
    ? `${appointment.patient.first_name || ''} ${appointment.patient.last_name || ''}`.trim() || 'Patient'
    : 'Patient';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Appointment</DialogTitle>
          <DialogDescription>
            Mark the appointment for {patientName} as completed.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Completion Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this appointment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleComplete} disabled={isLoading}>
            {isLoading ? "Completing..." : "Complete Appointment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CompletionDialog;
