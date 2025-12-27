import { useState, useMemo, useEffect } from "react";
import { format, parseISO, differenceInYears } from "date-fns";
import { 
  X, Calendar, Clock, User, MapPin, Phone, Mail,
  CheckCircle, AlertCircle, ClipboardCheck, 
  Eye, Sparkles, XCircle, Loader2, ExternalLink, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { AppointmentCompletionDialog } from "@/components/appointment/AppointmentCompletionDialog";
import { RescheduleAssistant } from "@/components/RescheduleAssistant";
import { AppointmentImagingTab } from "@/components/imaging";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Dentist-specific state derivation
type DentistAppointmentState = 
  | 'PENDING'
  | 'UPCOMING' 
  | 'NEEDS_COMPLETION' 
  | 'FINALIZED' 
  | 'CANCELLED';

interface DentistAppointmentDetailProps {
  appointment: any;
  onClose: () => void;
  onStatusChange?: (appointmentId: string, status: string) => void;
}

const STATE_CONFIG: Record<DentistAppointmentState, { 
  label: string; 
  description: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  icon: typeof CheckCircle;
}> = {
  PENDING: {
    label: 'Pending Approval',
    description: 'This appointment is awaiting your approval.',
    bgClass: 'bg-amber-50 dark:bg-amber-950/40',
    textClass: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-200 dark:border-amber-800',
    icon: Clock
  },
  UPCOMING: {
    label: 'Upcoming',
    description: 'This appointment has not happened yet.',
    bgClass: 'bg-blue-50 dark:bg-blue-950/40',
    textClass: 'text-blue-700 dark:text-blue-300',
    borderClass: 'border-blue-200 dark:border-blue-800',
    icon: Calendar
  },
  NEEDS_COMPLETION: {
    label: 'Needs Completion',
    description: 'This appointment has been completed but not finalized.',
    bgClass: 'bg-orange-50 dark:bg-orange-950/40',
    textClass: 'text-orange-700 dark:text-orange-300',
    borderClass: 'border-orange-200 dark:border-orange-800',
    icon: AlertCircle
  },
  FINALIZED: {
    label: 'Finalized',
    description: 'This appointment has been finalized.',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    icon: CheckCircle
  },
  CANCELLED: {
    label: 'Cancelled',
    description: 'This appointment was cancelled.',
    bgClass: 'bg-muted/50',
    textClass: 'text-muted-foreground',
    borderClass: 'border-border',
    icon: XCircle
  }
};

function deriveDentistAppointmentState(appointment: any): DentistAppointmentState {
  const status = appointment?.status;
  
  if (status === 'cancelled') return 'CANCELLED';
  if (status === 'pending') return 'PENDING';
  
  const appointmentTime = new Date(appointment?.appointment_date).getTime();
  const now = Date.now();
  const isPast = appointmentTime < now;
  
  if (status === 'completed' && appointment?.completed_at) {
    return 'FINALIZED';
  }
  
  if (status === 'completed' || (isPast && status === 'confirmed')) {
    return 'NEEDS_COMPLETION';
  }
  
  return 'UPCOMING';
}

export function DentistAppointmentDetail({
  appointment,
  onClose,
  onStatusChange
}: DentistAppointmentDetailProps) {
  const navigate = useNavigate();
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [summaries, setSummaries] = useState<{ short: string; long: string } | null>(null);
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  
  const hasPatientSymptoms = !!appointment.notes;
  
  const state = useMemo(() => deriveDentistAppointmentState(appointment), [appointment]);
  const stateConfig = STATE_CONFIG[state];
  const StateIcon = stateConfig.icon;
  
  const patientName = `${appointment.patient?.first_name || ""} ${appointment.patient?.last_name || ""}`.trim() || appointment.patient_name || "Unknown Patient";
  const appointmentDate = parseISO(appointment.appointment_date);
  const patientAge = appointment.patient?.date_of_birth 
    ? differenceInYears(new Date(), new Date(appointment.patient.date_of_birth))
    : null;

  const { data: business } = useQuery({
    queryKey: ['business', appointment.business_id],
    queryFn: async () => {
      if (!appointment.business_id) return null;
      const { data } = await supabase
        .from('businesses')
        .select('name, address')
        .eq('id', appointment.business_id)
        .single();
      return data;
    },
    enabled: !!appointment.business_id
  });

  const { data: dentist } = useQuery({
    queryKey: ['dentist', appointment.dentist_id],
    queryFn: async () => {
      if (!appointment.dentist_id) return null;
      const { data } = await supabase
        .from('dentists')
        .select('first_name, last_name, specialization')
        .eq('id', appointment.dentist_id)
        .single();
      return data;
    },
    enabled: !!appointment.dentist_id
  });

  const { data: nextAppointment } = useQuery({
    queryKey: ['next-appointment', appointment.patient_id, appointment.appointment_date],
    queryFn: async () => {
      const { data } = await supabase
        .from('appointments')
        .select('appointment_date, reason, status')
        .eq('patient_id', appointment.patient_id)
        .gt('appointment_date', appointment.appointment_date)
        .order('appointment_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!appointment.patient_id
  });

  const dentistName = dentist 
    ? `Dr. ${dentist.first_name || ''} ${dentist.last_name || ''}`.trim()
    : 'Assigned Dentist';

  useEffect(() => {
    const generateSummaries = async () => {
      if (hasPatientSymptoms) {
        setSummaries({ short: appointment.notes, long: appointment.notes });
        return;
      }
      
      setLoadingSummaries(true);
      try {
        const { data, error } = await supabase.functions.invoke('generate-appointment-summary', {
          body: {
            appointmentData: {
              patientName,
              reason: appointment.reason,
              urgency: appointment.urgency,
              notes: appointment.notes,
              date: format(appointmentDate, "MMMM d, yyyy"),
              time: format(appointmentDate, "h:mm a"),
            }
          }
        });

        if (error) throw error;
        setSummaries({ short: data.shortSummary, long: data.longSummary });
      } catch (error) {
        console.error("Error generating summaries:", error);
        setSummaries({ short: "Unable to generate summary", long: "" });
      } finally {
        setLoadingSummaries(false);
      }
    };

    generateSummaries();
  }, [appointment.id, appointment.notes, hasPatientSymptoms]);

  const handleCompletionFinished = () => {
    setShowCompletionDialog(false);
    onStatusChange?.(appointment.id, 'completed');
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Compact Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
        <span className="text-sm font-medium text-muted-foreground">Appointment Details</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-5">
          
          {/* Patient Card */}
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 ring-2 ring-primary/10">
              <AvatarFallback className="bg-primary/5 text-primary font-semibold text-lg">
                {appointment.patient?.first_name?.[0]}{appointment.patient?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-foreground truncate">{patientName}</h2>
              <p className="text-sm text-muted-foreground">
                {patientAge ? `${patientAge} years` : ''}{patientAge && appointment.reason ? ' • ' : ''}
                {appointment.reason || 'General consultation'}
              </p>
            </div>
          </div>

          {/* Status Banner */}
          <div className={cn(
            "rounded-xl p-4 border flex items-start gap-3",
            stateConfig.bgClass,
            stateConfig.borderClass
          )}>
            <StateIcon className={cn("h-5 w-5 mt-0.5 shrink-0", stateConfig.textClass)} />
            <div>
              <p className={cn("font-medium text-sm", stateConfig.textClass)}>
                {stateConfig.label}
              </p>
              <p className={cn("text-xs mt-0.5 opacity-80", stateConfig.textClass)}>
                {stateConfig.description}
              </p>
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <InfoCard 
              icon={Calendar} 
              label="Date" 
              value={format(appointmentDate, "EEE, MMM d")} 
            />
            <InfoCard 
              icon={Clock} 
              label="Time" 
              value={format(appointmentDate, "h:mm a")} 
            />
            <InfoCard 
              icon={User} 
              label="Provider" 
              value={dentistName} 
            />
            <InfoCard 
              icon={MapPin} 
              label="Clinic" 
              value={business?.name || 'Clinic'} 
            />
          </div>

          {/* Duration & Urgency */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-normal">
              {appointment.duration_minutes || 30} min
            </Badge>
            {appointment.urgency && appointment.urgency !== 'normal' && (
              <Badge 
                variant="outline" 
                className={cn(
                  "font-normal capitalize",
                  appointment.urgency === "high" && "border-red-300 text-red-700 bg-red-50",
                  appointment.urgency === "medium" && "border-orange-300 text-orange-700 bg-orange-50"
                )}
              >
                {appointment.urgency} priority
              </Badge>
            )}
          </div>

          <Separator />

          {/* Summary / Notes */}
          <Section title={hasPatientSymptoms ? "Patient Notes" : "Summary"}>
            {loadingSummaries && !hasPatientSymptoms ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : hasPatientSymptoms ? (
              <div className="bg-blue-50/80 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">AI Chat Booking</span>
                </div>
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {appointment.notes}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {summaries?.short || "No additional notes"}
              </p>
            )}
          </Section>

          {/* Contact Info */}
          <Section title="Contact">
            <div className="space-y-2">
              {appointment.patient?.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{appointment.patient.phone}</span>
                </div>
              )}
              {appointment.patient?.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{appointment.patient.email}</span>
                </div>
              )}
              {!appointment.patient?.phone && !appointment.patient?.email && (
                <p className="text-sm text-muted-foreground">No contact info available</p>
              )}
            </div>
          </Section>

          {/* Finalized Treatment Summary */}
          {state === 'FINALIZED' && appointment.consultation_notes && (
            <Section title="Treatment Summary">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap">{appointment.consultation_notes}</p>
              </div>
            </Section>
          )}

          {/* Imaging */}
          <Section title="Imaging">
            <AppointmentImagingTab
              patientId={appointment.patient_id}
              appointmentId={appointment.id}
            />
          </Section>

          {/* Next Appointment */}
          {nextAppointment && (
            <Section title="Next Appointment">
              <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">
                    {format(parseISO(nextAppointment.appointment_date), "MMM d 'at' h:mm a")}
                  </p>
                  <Badge variant="outline" className="text-xs capitalize">
                    {nextAppointment.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{nextAppointment.reason}</p>
              </div>
            </Section>
          )}

        </div>
      </ScrollArea>

      {/* Actions Footer */}
      <div className="border-t p-4 space-y-2 bg-muted/20">
        {state === 'PENDING' && (
          <>
            <Button className="w-full" size="lg" onClick={() => onStatusChange?.(appointment.id, "confirmed")}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button 
              variant="outline" 
              className="w-full text-destructive hover:text-destructive" 
              onClick={() => onStatusChange?.(appointment.id, "cancelled")}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </>
        )}

        {state === 'UPCOMING' && (
          <>
            <Button variant="outline" className="w-full" onClick={() => setShowReschedule(true)}>
              <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
              Reschedule
            </Button>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                className="flex-1 text-destructive hover:text-destructive" 
                onClick={() => onStatusChange?.(appointment.id, "cancelled")}
              >
                Cancel
              </Button>
              <Button 
                variant="ghost" 
                className="flex-1" 
                onClick={() => navigate(`/dentist/patients?patient=${appointment.patient_id}`)}
              >
                <Eye className="h-4 w-4 mr-1" />
                Profile
              </Button>
            </div>
          </>
        )}
        
        {state === 'NEEDS_COMPLETION' && (
          <>
            <Button className="w-full" size="lg" onClick={() => setShowCompletionDialog(true)}>
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Complete Appointment
            </Button>
            <Button 
              variant="ghost" 
              className="w-full" 
              onClick={() => navigate(`/dentist/patients?patient=${appointment.patient_id}`)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Patient Profile
            </Button>
          </>
        )}
        
        {(state === 'FINALIZED' || state === 'CANCELLED') && (
          <Button 
            variant="secondary" 
            className="w-full" 
            onClick={() => navigate(`/dentist/patients?patient=${appointment.patient_id}`)}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Patient Profile
            <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-50" />
          </Button>
        )}
      </div>

      {/* Dialogs */}
      <AppointmentCompletionDialog
        open={showCompletionDialog}
        onOpenChange={setShowCompletionDialog}
        appointment={appointment}
        onCompleted={handleCompletionFinished}
      />

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

// Helper Components
function InfoCard({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h3>
      {children}
    </div>
  );
}
