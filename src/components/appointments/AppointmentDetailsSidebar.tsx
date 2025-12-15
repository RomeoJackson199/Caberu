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
  const [summaries, setSummaries] = useState<{ short: string; long: string } | null>(null);
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const [nextAppointment, setNextAppointment] = useState<any>(null);
  const [serviceDetails, setServiceDetails] = useState<any>(null);

  const patientName = `${appointment.patient?.first_name || ""} ${appointment.patient?.last_name || ""}`.trim() || appointment.patient_name || "Unknown Patient";
  const appointmentDate = parseISO(appointment.appointment_date);
  const statusConfig = STATUS_CONFIG[appointment.status as keyof typeof STATUS_CONFIG];
  const StatusIcon = statusConfig?.icon || Clock;

  useEffect(() => {
    const generateSummaries = async () => {
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
  }, [appointment.id, appointment.patient_id, appointment.appointment_date, appointment.service_id]);

  return (
    <Card className="h-full border-none shadow-none bg-slate-50/50 flex flex-col">
      <CardHeader className="border-b px-6 py-5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-white">Appointment Details</CardTitle>
            <p className="text-xs text-indigo-100 mt-1 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              {format(appointmentDate, "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20 h-8 w-8 rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1">
        <CardContent className="px-6 py-6 space-y-6">
          {/* Patient Card */}
          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border-2 border-indigo-100 ring-2 ring-white shadow-sm">
                <AvatarFallback className="bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-600 font-bold text-lg">
                  {appointment.patient?.first_name?.[0]}{appointment.patient?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="font-bold text-lg text-slate-900">{patientName}</h2>
                <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                  <span className="bg-slate-100 px-2 py-0.5 rounded-full text-xs font-medium text-slate-600">
                    {appointment.patient?.date_of_birth ? `${new Date().getFullYear() - new Date(appointment.patient.date_of_birth).getFullYear()} yo` : 'N/A'}
                  </span>
                  <a href={`tel:${appointment.patient?.phone}`} className="hover:text-indigo-600 transition-colors flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {appointment.patient?.phone || 'No phone'}
                  </a>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 rounded-full p-0 border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50"
                onClick={() => navigate(`/dentist/patients?patient=${appointment.patient_id}`)}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* AI Summary Card */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider px-1">AI Overview</h3>
            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm space-y-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles className="h-12 w-12 text-indigo-500" />
              </div>

              {loadingSummaries ? (
                <div className="flex items-center gap-3 py-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                  Generating insights...
                </div>
              ) : (
                <>
                  <div className="bg-indigo-50/50 rounded-lg p-3 border border-indigo-100/50">
                    <p className="text-sm font-medium text-indigo-900 leading-relaxed">
                      {summaries?.short || "No summary available."}
                    </p>
                  </div>
                  {summaries?.long && (
                    <p className="text-sm text-slate-600 leading-relaxed pl-1 border-l-2 border-slate-100">
                      {summaries.long}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:border-indigo-200 transition-colors">
              <div className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Time</div>
              <div className="font-semibold text-slate-700 flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-500" />
                {format(appointmentDate, "h:mm a")}
              </div>
            </div>

            <div className={cn(
              "bg-white rounded-xl border p-4 shadow-sm transition-colors",
              statusConfig?.className ? `border-${statusConfig.className.split('-')[1]}-200 bg-${statusConfig.className.split('-')[1]}-50/30` : "border-slate-100"
            )}>
              <div className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Status</div>
              <div className="font-semibold text-slate-700 flex items-center gap-2">
                <StatusIcon className={cn("h-4 w-4", statusConfig?.className?.split(' ')[1])} />
                {statusConfig?.label}
              </div>
            </div>

            <div className="col-span-2 bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Reason</div>
              <div className="font-medium text-slate-700">{appointment.reason || "Check-up"}</div>
            </div>
          </div>

          {/* Notes */}
          {appointment.notes && (
            <div className="space-y-3">
              <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider px-1">Clinical Notes</h3>
              <div className="bg-amber-50/50 rounded-xl border border-amber-100 p-4 text-sm text-slate-700 leading-relaxed">
                {appointment.notes}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-4">
            {(appointment.status !== 'completed' && appointment.status !== 'cancelled') && (
              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200"
                size="lg"
                onClick={() => setShowCompletionDialog(true)}
              >
                Mark Completed
              </Button>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="w-full border-slate-200" onClick={() => setShowReschedule(true)}>
                Reschedule
              </Button>
              {appointment.status !== 'cancelled' && (
                <Button variant="ghost" className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => onStatusChange(appointment.id, 'cancelled')}>
                  Cancel
                </Button>
              )}
            </div>
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

      <RescheduleAssistant
        appointmentId={appointment.id}
        open={showReschedule}
        onOpenChange={setShowReschedule}
        onRescheduled={() => {
          setShowReschedule(false);
          onClose(); // Close details on reschedule
        }}
        reason="patient_requested"
      />
    </Card>
  );
}
