import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarCheck,
  FileText
} from "lucide-react";
import { PatientRecordsTimeline } from "@/components/patients/PatientRecordsTimeline";
import { cn } from "@/lib/utils";
import { PatientAppointmentDetail } from "@/components/patients/PatientAppointmentDetail";
import { useLanguage } from "@/hooks/useLanguage";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { AppointmentIndexCard, AppointmentIndexCardSkeleton } from "@/components/patients/AppointmentIndexCard";
import { 
  deriveAppointmentState, 
  getAppointmentGroup,
  AppointmentStateInput 
} from "@/lib/appointmentStateMachine";

export interface AppointmentsTabProps {
  user: User;
  onOpenAssistant?: () => void;
}

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  payment_status?: string | null;
  completed_at?: string | null;
  reason?: string;
  dentist?: {
    first_name: string;
    last_name: string;
  };
  clinicName?: string;
}

/**
 * Appointments Tab - Read-only index for finding appointments
 * All actions happen in Appointment Detail
 */
const INITIAL_SHOW = 3;

export const AppointmentsTab: React.FC<AppointmentsTabProps> = ({ user, onOpenAssistant }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [shownCounts, setShownCounts] = useState({ upcoming: INITIAL_SHOW, completed: INITIAL_SHOW, cancelled: INITIAL_SHOW });

  const showMore = (group: keyof typeof shownCounts, total: number) =>
    setShownCounts(prev => ({ ...prev, [group]: total }));
  
  const { t } = useLanguage();
  const { businessId, businessName, loading: businessLoading } = useBusinessContext();
  const { toast } = useToast();

  useEffect(() => {
    if (businessId) {
      fetchAppointments();
    } else if (!businessLoading) {
      // Business context loaded but no businessId - stop loading
      setLoading(false);
    }
  }, [user.id, businessId, businessLoading]);
  
  const fetchAppointments = async () => {
    try {
      setLoading(true);

      if (!businessId) {
        setAppointments([]);
        return;
      }

      const { data: profile } = await supabase
        .from('secure_profiles_view')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) {
        setAppointments([]);
        return;
      }

      setProfileId(profile.id);

      const { data, error } = await supabase
        .from('appointments_decrypted')
        .select('id, appointment_date, status, payment_status, completed_at, reason, dentist_id')
        .eq('patient_id', profile.id)
        .eq('business_id', businessId)
        .order('appointment_date', { ascending: false });

      if (error) throw error;

      // Fetch dentist profiles separately (views don't support PostgREST joins)
      const dentistIds = [...new Set((data || []).map(a => a.dentist_id).filter(Boolean))];
      const { data: dentists } = dentistIds.length > 0
        ? await supabase.from('dentists').select('id, profiles:profile_id(first_name, last_name)').in('id', dentistIds)
        : { data: [] };
      const dentistsMap = new Map((dentists || []).map(d => [d.id, d]));

      const transformedData: Appointment[] = (data || []).map(apt => {
        const dentistData = dentistsMap.get(apt.dentist_id) as any;
        const dentistProfile = dentistData?.profiles;

        return {
          id: apt.id,
          appointment_date: apt.appointment_date,
          status: apt.status,
          payment_status: apt.payment_status,
          completed_at: apt.completed_at,
          reason: apt.reason,
          dentist: dentistProfile ? {
            first_name: dentistProfile.first_name,
            last_name: dentistProfile.last_name
          } : undefined,
          clinicName: businessName || undefined
        };
      });
      
      setAppointments(transformedData);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Group appointments using state machine
  const groupedAppointments = useMemo(() => {
    const upcoming: Appointment[] = [];
    const completed: Appointment[] = [];
    const cancelled: Appointment[] = [];
    
    appointments.forEach(apt => {
      const stateInput: AppointmentStateInput = {
        status: apt.status,
        payment_status: apt.payment_status ?? null,
        appointment_date: apt.appointment_date,
        completed_at: apt.completed_at ?? null,
      };
      
      const state = deriveAppointmentState(stateInput);
      const group = getAppointmentGroup(state);
      
      switch (group) {
        case 'upcoming':
          upcoming.push(apt);
          break;
        case 'completed':
          completed.push(apt);
          break;
        case 'cancelled':
          cancelled.push(apt);
          break;
      }
    });
    
    // Sort upcoming by date ascending (soonest first)
    upcoming.sort((a, b) => 
      new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
    );
    
    // Sort completed and cancelled by date descending (most recent first)
    completed.sort((a, b) => 
      new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
    );
    cancelled.sort((a, b) => 
      new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
    );
    
    return { upcoming, completed, cancelled };
  }, [appointments]);
  
  const handleCancelAppointment = useCallback(async (appointmentId: string) => {
    try {
      // Cancel appointment via RPC (also releases all booked slots)
      const { data, error } = await supabase.rpc('cancel_appointment', {
        appointment_id: appointmentId,
        user_id: user.id
      });
      if (error) throw error;
      if (data) {
        toast({ title: 'Appointment cancelled' });
      } else {
        toast({ title: 'Failed to cancel appointment', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      toast({ title: 'Failed to cancel appointment', variant: 'destructive' });
    }
    // Update UI regardless (optimistic for success, refetch will correct if failed)
    setAppointments(prev =>
      prev.map(apt =>
        apt.id === appointmentId
          ? { ...apt, status: 'cancelled' }
          : apt
      )
    );
    setDetailsDialogOpen(false);
    setSelectedAppointmentId(null);
  }, [user.id, toast]);

  const openAppointmentDetail = (id: string) => {
    setSelectedAppointmentId(id);
    setDetailsDialogOpen(true);
  };
  
  const renderListView = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-6 w-24 bg-muted rounded animate-pulse" />
            {[1, 2].map(i => <AppointmentIndexCardSkeleton key={i} />)}
          </div>
        </div>
      );
    }
    
    const hasAnyAppointments = appointments.length > 0;
    
    if (!hasAnyAppointments) {
      return (
        <EmptyState
          icon={CalendarCheck}
          title="No appointments yet"
          description="Your upcoming appointments will appear here once you book them. Get started by booking your first appointment."
          actionLabel={onOpenAssistant ? "Book Appointment" : undefined}
          onAction={onOpenAssistant}
          variant="illustrated"
          illustration="calendar"
        />
      );
    }
    
    const renderGroup = (
      group: keyof typeof shownCounts,
      items: Appointment[],
      dotColor: string,
      label: string
    ) => {
      if (items.length === 0) return null;
      const visible = items.slice(0, shownCounts[group]);
      const remaining = items.length - visible.length;
      return (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", dotColor)} />
            {label} ({items.length})
          </h3>
          <div className="space-y-2">
            {visible.map(apt => (
              <AppointmentIndexCard
                key={apt.id}
                appointment={apt}
                onClick={() => openAppointmentDetail(apt.id)}
              />
            ))}
          </div>
          {remaining > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full text-muted-foreground"
              onClick={() => showMore(group, items.length)}
            >
              Show {remaining} more
            </Button>
          )}
        </section>
      );
    };

    return (
      <div className="space-y-8">
        {renderGroup('upcoming', groupedAppointments.upcoming, 'bg-emerald-500', 'Upcoming')}
        {renderGroup('completed', groupedAppointments.completed, 'bg-sky-500', 'Completed')}
        {renderGroup('cancelled', groupedAppointments.cancelled, 'bg-rose-500', 'Cancelled')}
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="px-4 md:px-6 py-4 md:py-6 space-y-10">
        {/* Appointments section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold">{t.appointments}</h2>
              <p className="text-sm text-muted-foreground">
                {businessName ? `${businessName}` : 'Your appointments'}
              </p>
            </div>
          </div>

          {renderListView()}
        </div>

        {/* Records section */}
        {profileId && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Treatment Records
              </h2>
              <p className="text-sm text-muted-foreground">Your health history and documents</p>
            </div>
            <PatientRecordsTimeline patientId={profileId} />
          </div>
        )}
      </div>

      {/* Appointment Details Dialog */}
      <PatientAppointmentDetail
        appointmentId={selectedAppointmentId}
        open={detailsDialogOpen}
        onOpenChange={(open) => {
          setDetailsDialogOpen(open);
          if (!open) {
            setSelectedAppointmentId(null);
          }
        }}
        onCancel={handleCancelAppointment}
      />
    </div>
  );
};
