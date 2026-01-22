import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOptimisticMutation } from "@/hooks/useOptimisticMutation";
import { format } from "date-fns";

interface AppointmentEditDialogProps {
  appointment: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppointmentEditDialog({ appointment, open, onOpenChange }: AppointmentEditDialogProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(appointment.status);
  const [notes, setNotes] = useState(appointment.consultation_notes || "");
  const [treatmentNotes, setTreatmentNotes] = useState(appointment.notes || "");

  // Optimistic mutation - updates UI instantly before server confirms
  const updateMutation = useOptimisticMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from("appointments")
        .update(data)
        .eq("id", appointment.id);

      if (error) throw error;
      return data;
    },
    queryKey: ["appointments"],
    updateCache: (oldData: any[] | undefined, newData: any) => {
      if (!oldData) return [];
      return oldData.map(apt =>
        apt.id === appointment.id ? { ...apt, ...newData } : apt
      );
    },
    successMessage: "Appointment updated",
    errorMessage: "Failed to update appointment",
    onSuccess: () => {
      onOpenChange(false);
    }
  });

  const handleComplete = () => {
    updateMutation.mutate({
      status: "completed",
      consultation_notes: notes,
      notes: treatmentNotes
    });
  };

  const handleUpdate = () => {
    updateMutation.mutate({
      status,
      consultation_notes: notes,
      notes: treatmentNotes
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
          <DialogDescription>View and edit appointment information.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Patient</Label>
              <p className="font-medium">
                {appointment.patient?.first_name} {appointment.patient?.last_name}
              </p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Date & Time</Label>
              <p className="font-medium">
                {format(new Date(appointment.appointment_date), "PPp")}
              </p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Service/Reason</Label>
              <p className="font-medium">{appointment.reason || "Not specified"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Urgency</Label>
              <p className="font-medium capitalize">{appointment.urgency || "Normal"}</p>
            </div>
          </div>

          {/* AI-generated patient symptoms summary */}
          {appointment.notes && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Label className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Patient Symptoms (AI Summary)
              </Label>
              <p className="mt-2 text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
                {appointment.notes}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Consultation Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add consultation notes..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Treatment Notes</Label>
            <Textarea
              value={treatmentNotes}
              onChange={(e) => setTreatmentNotes(e.target.value)}
              placeholder="Add treatment notes..."
              rows={4}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              Save Changes
            </Button>
            {appointment.status !== "completed" && (
              <Button onClick={handleComplete} disabled={updateMutation.isPending}>
                Mark as Completed
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
