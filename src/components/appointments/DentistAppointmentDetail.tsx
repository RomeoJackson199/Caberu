import { useState, useMemo, useEffect } from "react";
import { format, parseISO, differenceInYears } from "date-fns";
import { 
  X, Calendar, Clock, User, MapPin, Phone, Cake, Shield,
  CheckCircle, AlertCircle, ClipboardCheck, 
  Eye, Sparkles, XCircle, Loader2, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
  icon: typeof CheckCircle;
}> = {
  PENDING: {
    label: 'Pending Approval',
    variant: 'default',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock
  },
  UPCOMING: {
    label: 'Upcoming',
    variant: 'secondary',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Calendar
  },
  NEEDS_COMPLETION: {
    label: 'Needs completion',
    variant: 'default',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: AlertCircle
  },
  FINALIZED: {
    label: 'Finalized',
    variant: 'outline',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: CheckCircle
  },
  CANCELLED: {
    label: 'Cancelled',
    variant: 'destructive',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: XCircle
  }
};

function deriveDentistAppointmentState(appointment: any): DentistAppointmentState {
  const status = appointment?.status;
  
  if (status === 'cancelled') return 'CANCELLED';
  if (status === 'pending') return 'PENDING';
  
  // Check if appointment is in the past
  const appointmentTime = new Date(appointment?.appointment_date).getTime();
  const now = Date.now();
  const isPast = appointmentTime < now;
  
  // If completed status AND has completed_at, it's finalized
  if (status === 'completed' && appointment?.completed_at) {
    return 'FINALIZED';
  }
  
  // If completed status but no completed_at, or if past and confirmed - needs completion
  if (status === 'completed' || (isPast && status === 'confirmed')) {
    return 'NEEDS_COMPLETION';
  }
  
  // Future appointments
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

  // Fetch business info for clinic name
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

  // Fetch dentist info
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

  // Fetch next appointment
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

  // Generate AI summaries
  useEffect(() => {
    const generateSummaries = async () => {
      if (hasPatientSymptoms) {
        setSummaries({
          short: appointment.notes,
          long: appointment.notes
        });
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
        setSummaries({
          short: data.shortSummary,
          long: data.longSummary
        });
      } catch (error) {
        console.error("Error generating summaries:", error);
        setSummaries({
          short: "Unable to generate summary",
          long: "Unable to generate detailed summary at this time."
        });
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
    <Card className="h-full border-none shadow-none bg-background flex flex-col">
      {/* Header - Always Visible */}
      <div className="border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-muted-foreground">Appointment Detail</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Patient Header */}
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {appointment.patient?.first_name?.[0]}{appointment.patient?.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xl text-foreground truncate">{patientName}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {patientAge && <span>{patientAge} years old</span>}
              <span>•</span>
              <span>{appointment.reason || 'General consultation'}</span>
            </div>
          </div>
        </div>

        {/* State Badge - Visually Dominant */}
        <div className="mt-4">
          <Badge className={cn("gap-1.5 px-3 py-1.5 text-sm font-medium", stateConfig.className)}>
            <StateIcon className="h-4 w-4" />
            {stateConfig.label}
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-6 py-6 space-y-6">
          
          {/* Contact Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Contact Information
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground">Phone</p>
                </div>
                <p className="text-sm font-medium">
                  {appointment.patient?.phone || 'Not provided'}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Cake className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground">Date of Birth</p>
                </div>
                <p className="text-sm font-medium">
                  {appointment.patient?.date_of_birth
                    ? format(new Date(appointment.patient.date_of_birth), "dd MMM yyyy")
                    : 'Not provided'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Summary Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {hasPatientSymptoms ? "Patient Symptoms" : "Summary"}
            </h4>

            {loadingSummaries && !hasPatientSymptoms ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : hasPatientSymptoms ? (
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">From AI Chat Booking</span>
                </div>
                <p className="text-sm leading-relaxed text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
                  {appointment.notes}
                </p>
              </div>
            ) : (
              <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                <p className="text-sm leading-relaxed text-foreground font-medium">
                  {summaries?.short || "No symptoms provided"}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Appointment Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Appointment Details
            </h4>
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">{format(appointmentDate, "EEEE, MMMM d, yyyy")}</p>
                  <p className="text-xs text-muted-foreground">{format(appointmentDate, "h:mm a")}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{appointment.duration_minutes || 30} minutes</span>
              </div>
              
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{dentistName}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{business?.name || 'Clinic'}</span>
              </div>

              {/* Urgency Badge */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground">Urgency</p>
                <Badge variant="outline" className={cn(
                  "text-xs",
                  appointment.urgency === "high" && "bg-red-100 text-red-800 border-red-200",
                  appointment.urgency === "medium" && "bg-orange-100 text-orange-800 border-orange-200",
                  appointment.urgency === "low" && "bg-gray-100 text-gray-800 border-gray-200"
                )}>
                  {appointment.urgency?.toUpperCase() || 'NORMAL'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Imaging Section */}
          <Separator />
          <AppointmentImagingTab
            patientId={appointment.patient_id}
            appointmentId={appointment.id}
          />

          {/* Next Appointment */}
          {nextAppointment && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Next Appointment
                </h4>
                <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">
                      {format(parseISO(nextAppointment.appointment_date), "dd MMM yyyy 'at' h:mm a")}
                    </p>
                    <Badge variant="outline" className={cn(
                      "gap-1",
                      nextAppointment.status === "confirmed" && "bg-green-100 text-green-800 border-green-200",
                      nextAppointment.status === "pending" && "bg-yellow-100 text-yellow-800 border-yellow-200"
                    )}>
                      {nextAppointment.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{nextAppointment.reason}</p>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Status Card */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Status
            </h4>
            
            {state === 'PENDING' && (
              <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <p className="text-sm text-yellow-900 dark:text-yellow-100 font-medium">
                    This appointment is awaiting your approval.
                  </p>
                </div>
              </div>
            )}
            
            {state === 'UPCOMING' && (
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                    This appointment has not happened yet.
                  </p>
                </div>
              </div>
            )}
            
            {state === 'NEEDS_COMPLETION' && (
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <p className="text-sm text-amber-900 dark:text-amber-100 font-medium">
                    This appointment has been completed but not finalized.
                  </p>
                </div>
              </div>
            )}
            
            {state === 'FINALIZED' && (
              <>
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                    <p className="text-sm text-emerald-900 dark:text-emerald-100 font-medium">
                      This appointment has been finalized.
                    </p>
                  </div>
                </div>
                
                {/* Treatment Summary for finalized */}
                {appointment.consultation_notes && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Treatment Summary
                    </h4>
                    <div className="bg-muted/30 rounded-lg p-4">
                      <p className="text-sm whitespace-pre-wrap">{appointment.consultation_notes}</p>
                    </div>
                  </div>
                )}
              </>
            )}
            
            {state === 'CANCELLED' && (
              <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-gray-500" />
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    This appointment was cancelled.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      </ScrollArea>

      {/* Actions - Only section with buttons */}
      <div className="border-t px-6 py-4 space-y-3 flex-shrink-0 bg-background">
        
        {/* PENDING: Approve/Reject buttons */}
        {state === 'PENDING' && (
          <>
            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
              onClick={() => onStatusChange?.(appointment.id, "confirmed")}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Appointment
            </Button>
            <Button
              variant="outline"
              className="w-full text-red-600 border-red-300 hover:bg-red-50"
              size="lg"
              onClick={() => onStatusChange?.(appointment.id, "cancelled")}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject Appointment
            </Button>
          </>
        )}

        {/* UPCOMING: Reschedule/Cancel + view profile */}
        {state === 'UPCOMING' && (
          <>
            <Button
              variant="outline"
              className="w-full gap-2 border-purple-300 hover:bg-purple-50"
              size="lg"
              onClick={() => setShowReschedule(true)}
            >
              <Sparkles className="h-4 w-4 text-purple-600" />
              Smart Reschedule
            </Button>
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => onStatusChange?.(appointment.id, "cancelled")}
            >
              Cancel Appointment
            </Button>
            <Button
              variant="secondary"
              className="w-full gap-2"
              size="lg"
              onClick={() => navigate(`/dentist/patients?patient=${appointment.patient_id}`)}
            >
              <Eye className="h-4 w-4" />
              View Patient Profile
            </Button>
          </>
        )}
        
        {/* NEEDS_COMPLETION: Primary Complete button */}
        {state === 'NEEDS_COMPLETION' && (
          <>
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={() => setShowCompletionDialog(true)}
            >
              <ClipboardCheck className="h-4 w-4" />
              Complete Appointment
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2"
              size="lg"
              onClick={() => navigate(`/dentist/patients?patient=${appointment.patient_id}`)}
            >
              <Eye className="h-4 w-4" />
              View Patient Profile
            </Button>
          </>
        )}
        
        {/* FINALIZED: Read-only, just view profile */}
        {state === 'FINALIZED' && (
          <Button
            variant="secondary"
            className="w-full gap-2"
            size="lg"
            onClick={() => navigate(`/dentist/patients?patient=${appointment.patient_id}`)}
          >
            <Eye className="h-4 w-4" />
            View Patient Profile
            <ExternalLink className="ml-auto h-4 w-4" />
          </Button>
        )}
        
        {/* CANCELLED: Option to view profile */}
        {state === 'CANCELLED' && (
          <Button
            variant="secondary"
            className="w-full gap-2"
            size="lg"
            onClick={() => navigate(`/dentist/patients?patient=${appointment.patient_id}`)}
          >
            <Eye className="h-4 w-4" />
            View Patient Profile
          </Button>
        )}
      </div>

      {/* Completion Wizard Dialog */}
      <AppointmentCompletionDialog
        open={showCompletionDialog}
        onOpenChange={setShowCompletionDialog}
        appointment={appointment}
        onCompleted={handleCompletionFinished}
      />

      {/* Smart Reschedule Assistant */}
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
    </Card>
  );
}
