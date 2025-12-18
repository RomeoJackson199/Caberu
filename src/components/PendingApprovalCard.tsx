import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  CalendarClock,
  User
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatClinicTime, getClinicTimeSlots } from "@/lib/timezone";
import { useLanguage } from "@/hooks/useLanguage";

interface PendingAppointment {
  id: string;
  appointment_date: string;
  reason: string | null;
  patient_name: string | null;
  profiles: {
    first_name: string;
    last_name: string;
  } | null;
}

interface PendingApprovalCardProps {
  dentistId: string;
  onAction?: () => void;
}

export function PendingApprovalCard({ dentistId, onAction }: PendingApprovalCardProps) {
  const [pendingAppointments, setPendingAppointments] = useState<PendingAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<PendingAppointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);
  const [rescheduleTime, setRescheduleTime] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check if dentist requires approval
        const { data: dentistData } = await supabase
          .from('dentists')
          .select('require_appointment_approval')
          .eq('id', dentistId)
          .single();

        if (!dentistData?.require_appointment_approval) {
          setRequiresApproval(false);
          setLoading(false);
          return;
        }

        setRequiresApproval(true);

        // Fetch pending appointments
        const { data: appointments, error } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            reason,
            patient_name,
            profiles!appointments_patient_id_fkey (
              first_name,
              last_name
            )
          `)
          .eq('dentist_id', dentistId)
          .eq('status', 'pending')
          .gte('appointment_date', new Date().toISOString())
          .order('appointment_date', { ascending: true });

        if (error) throw error;

        const validAppointments = (appointments || []).map(apt => ({
          ...apt,
          profiles: Array.isArray(apt.profiles) ? apt.profiles[0] : apt.profiles
        })) as PendingAppointment[];

        setPendingAppointments(validAppointments);
      } catch (error) {
        console.error('Error fetching pending appointments:', error);
      } finally {
        setLoading(false);
      }
    };

    if (dentistId) {
      fetchData();
    }
  }, [dentistId]);

  const getPatientName = (apt: PendingAppointment) => {
    if (apt.profiles) {
      return `${apt.profiles.first_name} ${apt.profiles.last_name}`;
    }
    return apt.patient_name || 'Unknown Patient';
  };

  const handleApprove = async (appointmentId: string) => {
    setActionLoading(appointmentId);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', appointmentId);

      if (error) throw error;

      setPendingAppointments(prev => prev.filter(apt => apt.id !== appointmentId));
      toast({
        title: "Success",
        description: "Appointment confirmed successfully",
      });
      onAction?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to confirm appointment",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (appointmentId: string) => {
    setActionLoading(appointmentId);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) throw error;

      setPendingAppointments(prev => prev.filter(apt => apt.id !== appointmentId));
      toast({
        title: "Success",
        description: "Appointment declined",
      });
      onAction?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to decline appointment",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReschedule = async () => {
    if (!selectedAppointment || !rescheduleDate || !rescheduleTime) return;

    setActionLoading(selectedAppointment.id);
    try {
      const [hours, minutes] = rescheduleTime.split(':').map(Number);
      const newDate = new Date(rescheduleDate);
      newDate.setHours(hours, minutes, 0, 0);

      const { error } = await supabase
        .from('appointments')
        .update({ 
          appointment_date: newDate.toISOString(),
          status: 'confirmed' 
        })
        .eq('id', selectedAppointment.id);

      if (error) throw error;

      setPendingAppointments(prev => prev.filter(apt => apt.id !== selectedAppointment.id));
      setIsRescheduleOpen(false);
      setSelectedAppointment(null);
      setRescheduleDate(undefined);
      setRescheduleTime("");
      
      toast({
        title: "Success",
        description: "Appointment rescheduled and confirmed",
      });
      onAction?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reschedule appointment",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const openReschedule = (apt: PendingAppointment) => {
    setSelectedAppointment(apt);
    setRescheduleDate(new Date(apt.appointment_date));
    setRescheduleTime(format(new Date(apt.appointment_date), 'HH:mm'));
    setIsRescheduleOpen(true);
  };

  // Don't render if dentist doesn't require approval or still loading
  if (loading || !requiresApproval) {
    return null;
  }

  const timeSlots = rescheduleDate ? getClinicTimeSlots(rescheduleDate) : [];

  return (
    <>
      <Card className="relative overflow-hidden border-none shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-500 opacity-10" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium">
            Pending Approval
          </CardTitle>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
            <Clock className="h-5 w-5 text-white" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-2xl font-bold">{pendingAppointments.length}</div>
          <p className="text-xs text-muted-foreground">
            Appointments needing review
          </p>
          
          {pendingAppointments.length > 0 && (
            <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
              {pendingAppointments.slice(0, 3).map((apt) => (
                <div 
                  key={apt.id} 
                  className="p-2 bg-background/80 rounded-lg border border-border/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs font-medium truncate">
                        {getPatientName(apt)}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">
                      {formatClinicTime(apt.appointment_date, 'MMM d, HH:mm')}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs flex-1 bg-success/10 text-success border-success/20 hover:bg-success/20"
                      onClick={() => handleApprove(apt.id)}
                      disabled={actionLoading === apt.id}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t.confirm || "Approve"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs flex-1 bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                      onClick={() => handleDecline(apt.id)}
                      disabled={actionLoading === apt.id}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      {t.cancel || "Decline"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                      onClick={() => openReschedule(apt)}
                      disabled={actionLoading === apt.id}
                    >
                      <CalendarClock className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {pendingAppointments.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{pendingAppointments.length - 3} {t.more || "more"}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.reschedule || "Reschedule Appointment"}</DialogTitle>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">{getPatientName(selectedAppointment)}</p>
                <p className="text-xs text-muted-foreground">
                  Current: {formatClinicTime(selectedAppointment.appointment_date, 'PPP HH:mm')}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">New Date</label>
                <Calendar
                  mode="single"
                  selected={rescheduleDate}
                  onSelect={setRescheduleDate}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">New Time</label>
                <Select value={rescheduleTime} onValueChange={setRescheduleTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsRescheduleOpen(false)}>
                  {t.cancel || "Cancel"}
                </Button>
                <Button 
                  onClick={handleReschedule}
                  disabled={!rescheduleDate || !rescheduleTime || actionLoading !== null}
                >
                  Confirm & Reschedule
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
