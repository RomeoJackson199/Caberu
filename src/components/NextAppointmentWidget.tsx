import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { AppointmentCompletionDialog } from "@/components/appointment/AppointmentCompletionDialog";
import { AppointmentDetailsDialog } from "@/components/AppointmentDetailsDialog";
import {
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  AlertTriangle,
  MapPin,
  FileText,
  CheckCircle2,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { utcToClinicTime, formatClinicTime } from "@/lib/timezone";
import { logger } from '@/lib/logger';
import { 
  getStatusClasses, 
  getUrgencyClasses, 
  canCompleteAppointment,
  formatAppointmentDate,
  getAppointmentDate
} from "@/lib/appointmentUtils";

interface NextAppointment {
  id: string;
  patient_id: string;
  appointment_date: string;
  duration_minutes: number | null;
  status: string;
  reason: string | null;
  urgency: string | null;
  consultation_notes: string | null;
  patient_name: string | null;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
  } | null;
}

interface NextAppointmentWidgetProps {
  dentistId: string;
}

export function NextAppointmentWidget({ dentistId }: NextAppointmentWidgetProps) {
  const [nextAppointment, setNextAppointment] = useState<NextAppointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const { toast } = useToast();
  const { businessId } = useBusinessContext();

  useEffect(() => {
    const fetchNextAppointment = async () => {
      try {
        if (!businessId) {
          setLoading(false);
          return;
        }
        
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            patient_id,
            appointment_date,
            duration_minutes,
            status,
            reason,
            urgency,
            consultation_notes,
            patient_name,
            profiles!appointments_patient_id_fkey (
              first_name,
              last_name,
              email,
              phone
            )
          `)
          .eq('dentist_id', dentistId)
          .eq('business_id', businessId)
          .gte('appointment_date', new Date().toISOString())
          .neq('status', 'cancelled')
          .order('appointment_date', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('❌ Error fetching next appointment:', { code: error.code, message: error.message, details: (error as any)?.details });
          return;
        }

        // Transform data - handle profiles being an array from Supabase join
        if (data) {
          const profiles = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
          setNextAppointment({ ...data, profiles } as any);
        } else {
          setNextAppointment(null);
        }
      } catch (error) {
        const err: any = error;
        console.error('❌ Caught error fetching next appointment:', { message: err?.message, stack: err?.stack });
      } finally {
        setLoading(false);
      }
    };

    fetchNextAppointment();

    // Set up real-time subscription for appointment changes
    const channel = supabase
      .channel('appointment-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `dentist_id=eq.${dentistId}`,
        },
        () => {
          fetchNextAppointment();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dentistId, businessId]);

  const handleCompletionSuccess = async () => {
    // Refresh the appointment data to get the next one
    if (!businessId) return;
    
    const { data } = await supabase
      .from('appointments')
      .select(`
        id,
        patient_id,
        appointment_date,
        duration_minutes,
        status,
        reason,
        urgency,
        consultation_notes,
        patient_name
      `)
      .eq('dentist_id', dentistId)
      .eq('business_id', businessId)
      .gte('appointment_date', new Date().toISOString())
      .neq('status', 'cancelled')
      .order('appointment_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    // Ensure profiles has a default value to match NextAppointment type
    if (data) {
      setNextAppointment({
        ...data,
        profiles: null
      } as NextAppointment);
    } else {
      setNextAppointment(null);
    }
    setShowCompleteDialog(false);
  };


  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-dental-primary" />
            Next Appointment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!nextAppointment) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-dental-primary" />
            Next Appointment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No upcoming appointments</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const appointmentDate = getAppointmentDate(nextAppointment.appointment_date);
  const patientName = nextAppointment.profiles?.first_name && nextAppointment.profiles?.last_name 
    ? `${nextAppointment.profiles.first_name} ${nextAppointment.profiles.last_name}`
    : nextAppointment.patient_name || 'Unknown Patient';

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-dental-primary flex-shrink-0" />
            Next Appointment
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Badge className={`${getStatusClasses(nextAppointment.status)} text-xs`}>
              {nextAppointment.status}
            </Badge>
            {nextAppointment.urgency && (
              <Badge className={`${getUrgencyClasses(nextAppointment.urgency)} text-xs`}>
                <AlertTriangle className="h-3 w-3 mr-1" />
                {nextAppointment.urgency}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {/* Patient Info */}
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-dental-primary/20 flex items-center justify-center">
              <User className="h-4 w-4 sm:h-5 sm:w-5 text-dental-primary" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base sm:text-lg truncate">{patientName}</h3>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
              {nextAppointment.profiles?.email && (
                <div className="flex items-center gap-1 truncate">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{nextAppointment.profiles.email}</span>
                </div>
              )}
              {nextAppointment.profiles?.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3 flex-shrink-0" />
                  {nextAppointment.profiles.phone}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Appointment Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-xs sm:text-sm">
              {format(appointmentDate, 'MMM dd, yyyy')}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-xs sm:text-sm">
              {format(appointmentDate, 'HH:mm')}
              {nextAppointment.duration_minutes && (
                <span className="text-muted-foreground">
                  {' '}({nextAppointment.duration_minutes} min)
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Reason */}
        {nextAppointment.reason && (
          <div className="flex items-start gap-2">
            <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium">Reason</p>
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{nextAppointment.reason}</p>
            </div>
          </div>
        )}

        {/* Notes */}
        {nextAppointment.consultation_notes && (
          <div className="flex items-start gap-2">
            <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium">Notes</p>
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{nextAppointment.consultation_notes}</p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button size="sm" className="flex-1 text-xs sm:text-sm" onClick={() => setShowDetailsDialog(true)}>
            <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            View Details
          </Button>
          {canCompleteAppointment(nextAppointment.status) && (
            <Button size="sm" variant="outline" className="flex-1 text-xs sm:text-sm" onClick={() => setShowCompleteDialog(true)}>
              <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Complete
            </Button>
          )}
        </div>

        {/* Complete Appointment Dialog */}
        {nextAppointment && (
          <AppointmentCompletionDialog
            open={showCompleteDialog}
            onOpenChange={setShowCompleteDialog}
            appointment={{
              id: nextAppointment.id,
              patient_id: nextAppointment.patient_id,
              dentist_id: dentistId,
              appointment_date: nextAppointment.appointment_date,
              reason: nextAppointment.reason ?? undefined,
              patient: nextAppointment.profiles ? {
                first_name: nextAppointment.profiles.first_name,
                last_name: nextAppointment.profiles.last_name,
                email: nextAppointment.profiles.email
              } : undefined
            }}
            onCompleted={handleCompletionSuccess}
          />
        )}

        {/* Details Dialog with AI */}
        {nextAppointment && (
          <AppointmentDetailsDialog
            appointmentId={nextAppointment.id}
            open={showDetailsDialog}
            onOpenChange={setShowDetailsDialog}
          />
        )}
      </CardContent>
    </Card>
  );
}