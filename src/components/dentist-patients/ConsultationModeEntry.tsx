import { useState } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Stethoscope,
  Calendar,
  Plus,
  X,
  Clock,
  Video,
  Heart,
  Zap,
  Scissors,
  Crown,
  AlertCircle,
  ClipboardList,
  Sparkles,
  User,
} from 'lucide-react';
import { DentistPatient, PatientAppointment, getAppointmentGroup } from './types';
import { cn } from '@/lib/utils';
import { formatClinicTime } from '@/lib/timezone';

// Appointment type category configuration for banner
const APPOINTMENT_TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string }> = {
  checkup: { icon: Stethoscope, label: 'Check-up' },
  cleaning: { icon: Sparkles, label: 'Cleaning' },
  filling: { icon: Heart, label: 'Filling' },
  extraction: { icon: Scissors, label: 'Extraction' },
  root_canal: { icon: Zap, label: 'Root Canal' },
  crown: { icon: Crown, label: 'Crown' },
  whitening: { icon: Sparkles, label: 'Whitening' },
  orthodontics: { icon: Stethoscope, label: 'Orthodontics' },
  emergency: { icon: AlertCircle, label: 'Emergency' },
  consultation: { icon: Video, label: 'Consultation' },
  other: { icon: ClipboardList, label: 'Appointment' },
};

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
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Start Consultation
          </DialogTitle>
          <DialogDescription>
            Select an appointment to begin the consultation for {patient.first_name} {patient.last_name}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 py-4">
          {eligibleAppointments.length === 0 ? (
            <div className="text-center py-6">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground mb-4">
                No active appointments found. Create one from the appointments section first.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[250px]">
              <RadioGroup 
                value={selectedAppointmentId || ''} 
                onValueChange={(value) => {
                  console.log('[ConsultationModeEntry] Selected appointment:', value);
                  setSelectedAppointmentId(value);
                }}
                className="space-y-2 pr-3"
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
                            {formatClinicTime(apt.appointment_date, 'MMM d, yyyy')} at {formatClinicTime(apt.appointment_date, 'h:mm a')}
                          </p>
                        </div>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </ScrollArea>
          )}
        </div>

        {eligibleAppointments.length > 0 && (
          <div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t">
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
  appointment: PatientAppointment & {
    appointment_type?: {
      id: string;
      name: string;
      category: string;
      color?: string | null;
    } | null;
    service?: {
      name: string;
      price_cents?: number;
    } | null;
    duration_minutes?: number;
  };
  onExit: () => void;
}

export function ConsultationModeBanner({
  patient,
  appointment,
  onExit
}: ConsultationModeBannerProps) {
  // Get appointment type config
  const appointmentType = appointment.appointment_type;
  const typeConfig = appointmentType
    ? APPOINTMENT_TYPE_CONFIG[appointmentType.category.toLowerCase()] || APPOINTMENT_TYPE_CONFIG.other
    : null;
  const TypeIcon = typeConfig?.icon || Stethoscope;

  return (
    <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Mode Icon */}
        <div className="p-2 bg-primary-foreground/10 rounded-lg">
          <TypeIcon className="h-5 w-5" />
        </div>

        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold">
              {patient.first_name} {patient.last_name}
            </p>
            {appointmentType && (
              <Badge
                variant="outline"
                className="text-[10px] bg-primary-foreground/10 text-primary-foreground border-primary-foreground/30"
              >
                {appointmentType.name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-primary-foreground/80 mt-0.5">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatClinicTime(appointment.appointment_date, 'MMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatClinicTime(appointment.appointment_date, 'h:mm a')}
              {appointment.duration_minutes && ` (${appointment.duration_minutes} min)`}
            </span>
            {appointment.reason && (
              <span className="hidden sm:inline truncate max-w-[150px]">
                {appointment.reason}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Exit Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onExit}
        className="text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/10 shrink-0"
      >
        <X className="h-4 w-4 mr-1" />
        Exit
      </Button>
    </div>
  );
}
