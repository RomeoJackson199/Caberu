import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { AppointmentCompletionDialog } from "@/components/appointment/AppointmentCompletionDialog";
import { DentistAppointmentDetail } from "@/components/appointments/DentistAppointmentDetail";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  AlertTriangle,
  FileText,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/hooks/useLanguage";
import { getAppointmentDate } from "@/lib/appointmentUtils";

interface NextAppointment {
  id: string;
  patient_id: string;
  dentist_id: string;
  business_id: string;
  appointment_date: string;
  duration_minutes: number | null;
  status: string;
  reason: string | null;
  urgency: string | null;
  consultation_notes: string | null;
  notes: string | null;
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
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const { toast } = useToast();
  const { businessId } = useBusinessContext();
  const { t } = useLanguage();

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
            dentist_id,
            business_id,
            appointment_date,
            duration_minutes,
            status,
            reason,
            urgency,
            consultation_notes,
            notes,
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
      <Card className="border rounded-2xl shadow-sm bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Your next appointment is:
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="flex gap-2">
              <div className="h-6 bg-muted rounded-full w-20"></div>
              <div className="h-6 bg-muted rounded-full w-16"></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted"></div>
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-muted rounded w-32"></div>
                <div className="h-4 bg-muted rounded w-48"></div>
              </div>
            </div>
            <div className="h-10 bg-muted rounded-full w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!nextAppointment) {
    return (
      <Card className="border rounded-2xl shadow-sm bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Your next appointment is:
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{t.noUpcomingAppointments || 'No upcoming appointments'}</p>
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
    <Card className="border rounded-2xl shadow-sm bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium text-muted-foreground">
          <Calendar className="h-4 w-4" />
          Your next appointment is:
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status badges */}
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-medium">
            {nextAppointment.status}
          </Badge>
          {nextAppointment.urgency && (
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-medium border-green-200 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-400 dark:bg-green-950">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {nextAppointment.urgency}
            </Badge>
          )}
        </div>

        {/* Patient Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-lg truncate">{patientName}</h3>
            {nextAppointment.profiles?.email && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground truncate">
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{nextAppointment.profiles.email}</span>
              </div>
            )}
            {nextAppointment.profiles?.phone && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Phone className="h-3 w-3 flex-shrink-0" />
                {nextAppointment.profiles.phone}
              </div>
            )}
          </div>
        </div>

        {/* Appointment Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span>{format(appointmentDate, 'MMM dd, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span>
              {format(appointmentDate, 'HH:mm')}
              {nextAppointment.duration_minutes && (
                <span className="text-muted-foreground"> ({nextAppointment.duration_minutes} min)</span>
              )}
            </span>
          </div>
        </div>

        {/* Reason */}
        <div className="flex items-start gap-2">
          <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">{t.reason || 'Reason'}:</p>
            <p className="text-sm text-muted-foreground">{nextAppointment.reason || 'No treatments listed'}</p>
          </div>
        </div>

        {/* Action Button */}
        <Button 
          className="w-full rounded-full" 
          onClick={() => setShowDetailsSheet(true)}
        >
          <Eye className="h-4 w-4 mr-2" />
          {t.viewDetails || 'View Details'}
        </Button>

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

        {/* Appointment Details Sheet */}
        <Sheet open={showDetailsSheet} onOpenChange={setShowDetailsSheet}>
          <SheetContent side="right" className="w-full sm:max-w-lg p-0">
            {nextAppointment && (
              <DentistAppointmentDetail
                appointment={{
                  ...nextAppointment,
                  patient: nextAppointment.profiles ? {
                    first_name: nextAppointment.profiles.first_name,
                    last_name: nextAppointment.profiles.last_name,
                    email: nextAppointment.profiles.email,
                    phone: nextAppointment.profiles.phone
                  } : undefined
                }}
                onClose={() => setShowDetailsSheet(false)}
                onStatusChange={(appointmentId, status) => {
                  handleCompletionSuccess();
                  setShowDetailsSheet(false);
                }}
              />
            )}
          </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
  );
}