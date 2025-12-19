import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { X, Calendar, Clock, User, FileText, Phone, Cake, Activity, Shield, ExternalLink, CheckCircle, XCircle, Loader2, ShoppingBag, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppointmentCompletionDialog } from "@/components/appointment/AppointmentCompletionDialog";
import { RescheduleAssistant } from "@/components/RescheduleAssistant";
import { logger } from '@/lib/logger';
import { AppointmentImagingTab } from "@/components/imaging";

interface AppointmentDetailsSidebarProps {
  appointment: any;
  onClose: () => void;
  onStatusChange: (appointmentId: string, status: string) => void;
}

const STATUS_CONFIG = {
  pending: { label: "Pending", icon: Clock, className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  confirmed: { label: "Confirmed", icon: CheckCircle, className: "bg-green-100 text-green-800 border-green-200" },
  in_progress: { label: "In Progress", icon: Activity, className: "bg-blue-100 text-blue-800 border-blue-200" },
  completed: { label: "Completed", icon: CheckCircle, className: "bg-blue-100 text-blue-800 border-blue-200" },
  cancelled: { label: "Cancelled", icon: XCircle, className: "bg-red-100 text-red-800 border-red-200" },
};

export function AppointmentDetailsSidebar({
  appointment,
  onClose,
  onStatusChange
}: AppointmentDetailsSidebarProps) {
  const navigate = useNavigate();
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [summaries, setSummaries] = useState<{ short: string; long: string } | null>(null);
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const hasPatientSymptoms = !!appointment.notes;
  const [nextAppointment, setNextAppointment] = useState<any>(null);
  const [serviceDetails, setServiceDetails] = useState<any>(null);

  const patientName = `${appointment.patient?.first_name || ""} ${appointment.patient?.last_name || ""}`.trim() || appointment.patient_name || "Unknown Patient";
  const appointmentDate = parseISO(appointment.appointment_date);
  const statusConfig = STATUS_CONFIG[appointment.status as keyof typeof STATUS_CONFIG];
  const StatusIcon = statusConfig?.icon || Clock;

  useEffect(() => {
    // Only generate AI summaries if there are no patient-provided symptoms
    const generateSummaries = async () => {
      if (hasPatientSymptoms) {
        // Use patient's own symptoms as the summary
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

    const fetchNextAppointment = async () => {
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('appointment_date, reason, status')
          .eq('patient_id', appointment.patient_id)
          .gt('appointment_date', appointment.appointment_date)
          .order('appointment_date', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setNextAppointment(data);
      } catch (error) {
        console.error("Error fetching next appointment:", error);
      }
    };

    generateSummaries();
    fetchNextAppointment();

    // Fetch service details if service_id exists
    const fetchServiceDetails = async () => {
      if (!appointment.service_id) return;

      try {
        const { data, error } = await supabase
          .from('business_services')
          .select('name, price_cents')
          .eq('id', appointment.service_id)
          .single();

        if (!error && data) {
          setServiceDetails(data);
        }
      } catch (error) {
        console.error("Error fetching service details:", error);
      }
    };

    fetchServiceDetails();
  }, [appointment.id, appointment.patient_id, appointment.appointment_date, appointment.service_id, appointment.notes, hasPatientSymptoms]);

  return (
    <Card className="h-full border-none shadow-none bg-background">
      <CardHeader className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">Patient Details</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <CardContent className="px-6 py-6 space-y-6">
          {/* Patient Header */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {appointment.patient?.first_name?.[0]}{appointment.patient?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="font-semibold text-2xl text-foreground">{patientName}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span>{appointment.patient?.date_of_birth ? `${new Date().getFullYear() - new Date(appointment.patient.date_of_birth).getFullYear()} yo` : 'Age N/A'}</span>
                <span>•</span>
                <span>Female</span>
                <span>•</span>
                <span>She/Her</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Patient Info Grid */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Contact Information</h3>
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

              <div className="col-span-2">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground">Insurance</p>
                </div>
                <p className="text-sm font-medium">Blue Cross Blue Shield</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Summary Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              {hasPatientSymptoms ? "Patient Symptoms" : "Summary"}
            </h3>

            {loadingSummaries && !hasPatientSymptoms ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : hasPatientSymptoms ? (
              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">From AI Chat Booking</span>
                </div>
                <p className="text-sm leading-relaxed text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
                  {appointment.notes}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                  <p className="text-sm leading-relaxed text-foreground font-medium">
                    {summaries?.short || "No symptoms provided"}
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Appointment Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Appointment Details</h3>

            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Date & Time</p>
                  <p className="font-medium text-sm">{format(appointmentDate, "EEEE, MMMM d, yyyy")}</p>
                  <p className="text-sm text-muted-foreground">{format(appointmentDate, "h:mm a")}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge className={cn("gap-1", statusConfig?.className)}>
                    <StatusIcon className="h-3 w-3" />
                    {statusConfig?.label}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Urgency</p>
                  <Badge variant="outline" className={cn(
                    "text-xs",
                    appointment.urgency === "high" && "bg-red-100 text-red-800 border-red-200",
                    appointment.urgency === "medium" && "bg-orange-100 text-orange-800 border-orange-200",
                    appointment.urgency === "low" && "bg-gray-100 text-gray-800 border-gray-200"
                  )}>
                    {appointment.urgency.toUpperCase()}
                  </Badge>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-1">Reason</p>
                  <p className="text-sm font-medium">{appointment.reason || "General consultation"}</p>
                </div>
              </div>
            </div>
          </div>


          {/* Imaging Section */}
          <Separator />
          <AppointmentImagingTab
            patientId={appointment.patient_id}
            appointmentId={appointment.id}
          />

          <Separator />

          {/* Next Appointment */}
          {nextAppointment && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Next Appointment</h3>
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
                      <Activity className="h-3 w-3" />
                      {nextAppointment.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{nextAppointment.reason}</p>
                </div>
              </div>
              <Separator />
            </>
          )}


          {/* Actions */}
          <div className="space-y-3 pt-2">
            {/* Show Checkout for in_progress appointments */}
            {appointment.status === "in_progress" && serviceDetails && (
              <Button
                className="w-full gap-2"
                size="lg"
                onClick={() => setShowCheckout(true)}
              >
                <ShoppingBag className="h-4 w-4" />
                Check Out & Complete
              </Button>
            )}

            {(appointment.status !== "completed" && appointment.status !== "cancelled" && appointment.status !== "in_progress") && (
              <>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => setShowCompletionDialog(true)}
                >
                  Mark as Completed
                </Button>

                {/* Smart Reschedule Button */}
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
                  onClick={() => onStatusChange(appointment.id, "cancelled")}
                >
                  Cancel Appointment
                </Button>
              </>
            )}

            <Button
              variant="secondary"
              className="w-full gap-2"
              size="lg"
              onClick={() => navigate(`/dentist/patients?patient=${appointment.patient_id}`)}
            >
              <User className="h-4 w-4" />
              View Full Profile
              <ExternalLink className="ml-auto h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </ScrollArea>

      <AppointmentCompletionDialog
        open={showCompletionDialog}
        onOpenChange={setShowCompletionDialog}
        appointment={appointment}
        onCompleted={() => {
          onStatusChange(appointment.id, "completed");
          setShowCompletionDialog(false);
        }}
      />


      {/* Smart Reschedule Assistant */}
      <RescheduleAssistant
        appointmentId={appointment.id}
        open={showReschedule}
        onOpenChange={setShowReschedule}
        onRescheduled={() => {
          setShowReschedule(false);
          // Refresh the appointment data
          onClose();
        }}
        reason="patient_requested"
      />
    </Card>
  );
}
