import { useState, useMemo, useEffect } from "react";
import { format, parseISO, differenceInYears } from "date-fns";
import { 
  Calendar, Clock, User, MapPin, Phone, Mail,
  CheckCircle, AlertCircle, ClipboardCheck, 
  Eye, Sparkles, XCircle, Loader2, ExternalLink, 
  Stethoscope, Timer, FileText, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { AppointmentCompletionDialog } from "@/components/appointment/AppointmentCompletionDialog";
import { RescheduleAssistant } from "@/components/RescheduleAssistant";
import { AppointmentImagingTab } from "@/components/imaging";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";

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
  /** When true, skips SheetHeader/SheetTitle (use when not inside a Sheet) */
  standalone?: boolean;
}

const STATE_CONFIG: Record<DentistAppointmentState, { 
  label: string; 
  badgeClassName: string;
  icon: typeof CheckCircle;
}> = {
  PENDING: {
    label: 'Pending Approval',
    badgeClassName: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    icon: Clock
  },
  UPCOMING: {
    label: 'Upcoming',
    badgeClassName: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    icon: Calendar
  },
  NEEDS_COMPLETION: {
    label: 'Needs Completion',
    badgeClassName: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
    icon: AlertCircle
  },
  FINALIZED: {
    label: 'Finalized',
    badgeClassName: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    icon: CheckCircle
  },
  CANCELLED: {
    label: 'Cancelled',
    badgeClassName: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
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
  onStatusChange,
  standalone = false
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
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="p-6 border-b bg-muted/30 flex-shrink-0">
        {standalone ? (
          <div className="flex items-center gap-2 text-base font-medium text-muted-foreground mb-4">
            <Calendar className="h-4 w-4" />
            Appointment Details
          </div>
        ) : (
          <SheetHeader className="space-y-0 mb-4">
            <SheetTitle className="flex items-center gap-2 text-base font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Appointment Details
            </SheetTitle>
          </SheetHeader>
        )}

        {/* Status Badge */}
        <Badge 
          variant="outline" 
          className={cn("gap-1.5 font-medium text-sm px-3 py-1 mb-4", stateConfig.badgeClassName)}
        >
          <StateIcon className="h-3.5 w-3.5" />
          {stateConfig.label}
        </Badge>

        {/* Date & Time */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-foreground">
            {format(appointmentDate, 'EEEE, MMMM d, yyyy')}
          </h2>
          <p className="text-base text-muted-foreground mt-0.5">
            {format(appointmentDate, 'h:mm a')}
            {appointment.duration_minutes && ` (${appointment.duration_minutes} min)`}
          </p>
        </div>

        {/* Dentist & Clinic Info */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <User className="h-4 w-4 flex-shrink-0" />
            <span>{dentistName}</span>
          </div>
          {dentist?.specialization && (
            <div className="flex items-center gap-1.5">
              <Stethoscope className="h-4 w-4 flex-shrink-0" />
              <span>{dentist.specialization}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span>{business?.address || business?.name || 'Clinic'}</span>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-5">
          
          {/* Patient Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 ring-2 ring-primary/10">
                  <AvatarFallback className="bg-primary/5 text-primary font-semibold">
                    {appointment.patient?.first_name?.[0]}{appointment.patient?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{patientName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {patientAge ? `${patientAge} years` : 'Patient'}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate(`/dentist/patients?patient=${appointment.patient_id}`)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Contact Info */}
              <div className="mt-4 pt-4 border-t space-y-2">
                {appointment.patient?.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{appointment.patient.email}</span>
                  </div>
                )}
                {appointment.patient?.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{appointment.patient.phone}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Reason for Visit Card */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-foreground flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Reason for Visit
              </h4>
              {loadingSummaries && !hasPatientSymptoms ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : hasPatientSymptoms ? (
                <div className="bg-blue-50/80 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-100 dark:border-blue-900">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">From AI Chat</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {appointment.notes}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {summaries?.short || appointment.reason || "No treatments listed"}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Service Card */}
          {appointment.reason && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-foreground flex items-center gap-2 mb-3">
                  <Stethoscope className="h-4 w-4 text-muted-foreground" />
                  Service
                </h4>
                <p className="text-sm">{appointment.reason}</p>
                {appointment.urgency && appointment.urgency !== 'normal' && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "mt-2 capitalize",
                      appointment.urgency === "high" && "border-red-300 text-red-700 bg-red-50",
                      appointment.urgency === "medium" && "border-orange-300 text-orange-700 bg-orange-50"
                    )}
                  >
                    {appointment.urgency} priority
                  </Badge>
                )}
              </CardContent>
            </Card>
          )}

          {/* Finalized Treatment Summary */}
          {state === 'FINALIZED' && appointment.consultation_notes && (
            <Card className="border-emerald-200/50 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-950/20">
              <CardContent className="p-4">
                <h4 className="font-medium text-foreground flex items-center gap-2 mb-3">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  Treatment Summary
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {appointment.consultation_notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Imaging */}
          <Card>
            <CardContent className="p-4">
              <AppointmentImagingTab
                patientId={appointment.patient_id}
                appointmentId={appointment.id}
              />
            </CardContent>
          </Card>

          {/* Next Appointment */}
          {nextAppointment && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-foreground flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Next Appointment
                </h4>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {format(parseISO(nextAppointment.appointment_date), "MMM d 'at' h:mm a")}
                  </p>
                  <Badge variant="outline" className="text-xs capitalize">
                    {nextAppointment.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{nextAppointment.reason}</p>
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {/* Actions Footer */}
      <div className="border-t p-4 space-y-2 bg-background flex-shrink-0">
        {state === 'PENDING' && (
          <>
            <Button className="w-full" size="lg" onClick={() => onStatusChange?.(appointment.id, "confirmed")}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Appointment
            </Button>
            <Button 
              variant="outline" 
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" 
              onClick={() => onStatusChange?.(appointment.id, "cancelled")}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject Appointment
            </Button>
          </>
        )}

        {state === 'UPCOMING' && (
          <>
            <Button variant="outline" className="w-full" onClick={() => setShowReschedule(true)}>
              <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
              Reschedule
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="ghost" 
                className="text-destructive hover:text-destructive hover:bg-destructive/10" 
                onClick={() => onStatusChange?.(appointment.id, "cancelled")}
              >
                Cancel
              </Button>
              <Button 
                variant="ghost" 
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
