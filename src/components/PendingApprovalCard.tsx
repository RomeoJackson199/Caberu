import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  User,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatClinicTime } from "@/lib/timezone";
import { useLanguage } from "@/hooks/useLanguage";
import { useNavigate } from "react-router-dom";
import { useBusinessContext } from "@/hooks/useBusinessContext";

interface PendingAppointment {
  id: string;
  appointment_date: string;
  reason: string | null;
  patient_name: string | null;
  patient_id: string;
  profiles: {
    first_name: string;
    last_name: string;
  } | null;
}

interface PendingApprovalCardProps {
  dentistId: string;
  onAction?: () => void;
  onNavigateToPatient?: (patientId: string) => void;
}

export function PendingApprovalCard({ dentistId, onAction, onNavigateToPatient }: PendingApprovalCardProps) {
  const [pendingAppointments, setPendingAppointments] = useState<PendingAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { businessId } = useBusinessContext();

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

        // Fetch pending appointments scoped to current business
        let query = supabase
          .from('appointments_decrypted')
          .select('id, appointment_date, reason, patient_name, patient_id')
          .eq('dentist_id', dentistId)
          .eq('status', 'pending')
          .gte('appointment_date', new Date().toISOString())
          .order('appointment_date', { ascending: true });

        if (businessId) {
          query = query.eq('business_id', businessId);
        }

        const { data: appointments, error } = await query;

        if (error) throw error;

        // Fetch patient profiles separately (views don't support PostgREST joins)
        const patientIds = [...new Set((appointments || []).map(a => a.patient_id).filter(Boolean))];
        const { data: profiles } = patientIds.length > 0
          ? await supabase.from('profiles').select('id, first_name, last_name').in('id', patientIds)
          : { data: [] };
        const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

        const validAppointments = (appointments || []).map(apt => ({
          ...apt,
          profiles: profilesMap.get(apt.patient_id) || undefined,
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
  }, [dentistId, businessId]);

  const getPatientName = (apt: PendingAppointment) => {
    if (apt.profiles) {
      return `${apt.profiles.first_name} ${apt.profiles.last_name}`;
    }
    return apt.patient_name || 'Unknown Patient';
  };

  const handlePatientClick = (apt: PendingAppointment) => {
    if (onNavigateToPatient) {
      onNavigateToPatient(apt.patient_id);
    } else {
      navigate(`/dentist/dashboard?tab=patients&patientId=${apt.patient_id}`);
    }
  };

  const sendDecisionEmail = async (appointmentId: string, decision: 'approved' | 'declined') => {
    try {
      const { error } = await supabase.functions.invoke('send-appointment-decision', {
        body: { appointment_id: appointmentId, decision }
      });
      
      if (error) {
        console.error('Error sending decision email:', error);
      }
    } catch (err) {
      console.error('Failed to send decision email:', err);
    }
  };

  const handleApprove = async (appointmentId: string) => {
    const appointmentToApprove = pendingAppointments.find(apt => apt.id === appointmentId);
    const previousAppointments = [...pendingAppointments];
    
    // Optimistic UI - remove immediately
    setPendingAppointments(prev => {
      const newList = prev.filter(apt => apt.id !== appointmentId);
      if (currentIndex >= newList.length && newList.length > 0) {
        setCurrentIndex(newList.length - 1);
      }
      return newList;
    });
    
    toast({
      title: "Confirming...",
      description: appointmentToApprove 
        ? `Approving appointment for ${getPatientName(appointmentToApprove)}`
        : "Approving appointment",
    });

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', appointmentId);

      if (error) throw error;

      // Send approval email (don't await to keep UI snappy)
      sendDecisionEmail(appointmentId, 'approved');

      toast({
        title: "Success",
        description: "Appointment confirmed and patient notified",
      });
      onAction?.();
    } catch (error) {
      // Rollback on error
      setPendingAppointments(previousAppointments);
      toast({
        title: "Error",
        description: "Failed to confirm appointment",
        variant: "destructive",
      });
    }
  };

  const handleDecline = async (appointmentId: string) => {
    const appointmentToDecline = pendingAppointments.find(apt => apt.id === appointmentId);
    const previousAppointments = [...pendingAppointments];
    
    // Optimistic UI - remove immediately
    setPendingAppointments(prev => {
      const newList = prev.filter(apt => apt.id !== appointmentId);
      if (currentIndex >= newList.length && newList.length > 0) {
        setCurrentIndex(newList.length - 1);
      }
      return newList;
    });
    
    toast({
      title: "Declining...",
      description: appointmentToDecline 
        ? `Declining appointment for ${getPatientName(appointmentToDecline)}`
        : "Declining appointment",
    });

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) throw error;

      // Send decline email (don't await to keep UI snappy)
      sendDecisionEmail(appointmentId, 'declined');

      toast({
        title: "Success",
        description: "Appointment declined and patient notified",
      });
      onAction?.();
    } catch (error) {
      // Rollback on error
      setPendingAppointments(previousAppointments);
      toast({
        title: "Error",
        description: "Failed to decline appointment",
        variant: "destructive",
      });
    }
  };

  const goToPrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex(prev => Math.min(pendingAppointments.length - 1, prev + 1));
  };

  // Don't render if dentist doesn't require approval or still loading
  if (loading || !requiresApproval) {
    return null;
  }

  const currentAppointment = pendingAppointments[currentIndex];

  return (
    <Card className="relative overflow-hidden border-none shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-500 opacity-10" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-sm font-medium">
          Pending Approvals
        </CardTitle>
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
          <Clock className="h-5 w-5 text-white" />
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        {pendingAppointments.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No pending approvals</p>
          </div>
        ) : currentAppointment ? (
          <div className="space-y-3">
            {/* Navigation */}
            {pendingAppointments.length > 1 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={goToPrevious}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span>{currentIndex + 1} / {pendingAppointments.length}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={goToNext}
                  disabled={currentIndex === pendingAppointments.length - 1}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Current appointment */}
            <div className="p-3 bg-background/80 rounded-lg border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => handlePatientClick(currentAppointment)}
                  className="flex items-center gap-2 min-w-0 hover:text-primary transition-colors"
                >
                  <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium truncate underline underline-offset-2">
                    {getPatientName(currentAppointment)}
                  </span>
                </button>
              </div>
              
              <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20 mb-3">
                {formatClinicTime(currentAppointment.appointment_date, 'MMM d, HH:mm')}
              </Badge>

              {currentAppointment.reason && (
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {currentAppointment.reason}
                </p>
              )}
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-xs flex-1 bg-success/10 text-success border-success/20 hover:bg-success/20"
                  onClick={() => handleApprove(currentAppointment.id)}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {t.confirm || "Approve"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-xs flex-1 bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                  onClick={() => handleDecline(currentAppointment.id)}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  {t.cancel || "Decline"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
