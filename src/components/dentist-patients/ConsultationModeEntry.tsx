import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Stethoscope,
  Calendar,
  Plus,
  X
} from 'lucide-react';
import { DentistPatient, PatientAppointment, getAppointmentGroup } from './types';
import { cn } from '@/lib/utils';

interface ConsultationModeEntryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: DentistPatient;
  appointments: PatientAppointment[];
  dentistId: string;
  businessId: string;
  onEnterConsultation: (appointmentId: string) => void;
}

export function ConsultationModeEntry({
  open,
  onOpenChange,
  patient,
  appointments,
  dentistId,
  businessId,
  onEnterConsultation
}: ConsultationModeEntryProps) {
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  // Get eligible appointments (upcoming or needs completion)
  const eligibleAppointments = appointments.filter(apt => {
    const group = getAppointmentGroup(apt);
    return group === 'upcoming' || group === 'needs_completion';
  }).sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());

  const handleConfirm = () => {
    if (selectedAppointmentId) {
      onEnterConsultation(selectedAppointmentId);
      onOpenChange(false);
    }
  };

  const getAppointmentGroupLocal = (apt: PatientAppointment) => {
    const now = new Date();
    const date = new Date(apt.appointment_date);
    if (apt.status === 'completed') return 'completed';
    if (date < now) return 'needs_completion';
    return 'upcoming';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Start Consultation
          </DialogTitle>
          <DialogDescription>
            Select an appointment to begin the consultation for {patient.first_name} {patient.last_name}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {eligibleAppointments.length === 0 ? (
            <div className="text-center py-6">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground mb-4">
                No active appointments found. Create one from the appointments section first.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <RadioGroup 
                value={selectedAppointmentId || ''} 
                onValueChange={setSelectedAppointmentId}
                className="space-y-2"
              >
                {eligibleAppointments.map(apt => {
                  const group = getAppointmentGroupLocal(apt);
                  const isNeedsCompletion = group === 'needs_completion';
                  
                  return (
                    <div key={apt.id}>
                      <Label
                        htmlFor={apt.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                          selectedAppointmentId === apt.id 
                            ? "border-primary bg-primary/5" 
                            : "hover:bg-muted/50",
                          isNeedsCompletion && "border-amber-300"
                        )}
                      >
                        <RadioGroupItem value={apt.id} id={apt.id} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {apt.reason || 'General consultation'}
                            </span>
                            {isNeedsCompletion && (
                              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                                Needs completion
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(apt.appointment_date), 'MMM d, yyyy')} at {format(new Date(apt.appointment_date), 'h:mm a')}
                          </p>
                        </div>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          )}
        </div>

        {eligibleAppointments.length > 0 && (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={!selectedAppointmentId}
              className="gap-2"
            >
              <Stethoscope className="h-4 w-4" />
              Enter Consultation
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Consultation Mode Banner - shown when in consultation
interface ConsultationModeBannerProps {
  patient: DentistPatient;
  appointment: PatientAppointment;
  onExit: () => void;
}

export function ConsultationModeBanner({
  patient,
  appointment,
  onExit
}: ConsultationModeBannerProps) {
  return (
    <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Stethoscope className="h-5 w-5" />
        <div>
          <p className="text-sm font-medium">
            Consultation Mode: {patient.first_name} {patient.last_name}
          </p>
          <p className="text-xs opacity-80">
            Appointment: {format(new Date(appointment.appointment_date), 'MMM d, yyyy')} - {appointment.reason || 'General'}
          </p>
        </div>
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onExit}
        className="text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/10"
      >
        <X className="h-4 w-4 mr-1" />
        Exit
      </Button>
    </div>
  );
}
