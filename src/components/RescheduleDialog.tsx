import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCurrentBusinessId } from "@/lib/businessScopedSupabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar as CalendarIcon, Clock, User, ArrowRight, Sun, Sunset, AlertCircle } from "lucide-react";
import { format, addDays } from "date-fns";
import { isPublicHoliday } from "@/lib/belgianHolidays";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";

interface RescheduleDialogProps {
  appointmentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface AppointmentDetails {
  id: string;
  appointment_date: string;
  reason: string;
  dentist_id: string;
  service_id: string | null;
  dentistName: string;
}

interface TimeSlot {
  slot_time: string;
}

function groupSlotsByPeriod(slots: TimeSlot[]) {
  const morning: TimeSlot[] = [];
  const afternoon: TimeSlot[] = [];
  for (const slot of slots) {
    const hour = parseInt(slot.slot_time.substring(0, 2), 10);
    (hour < 12 ? morning : afternoon).push(slot);
  }
  return { morning, afternoon };
}

export const RescheduleDialog = ({ appointmentId, open, onOpenChange, onSuccess }: RescheduleDialogProps) => {
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dentistAvailability, setDentistAvailability] = useState<Record<number, boolean>>({});
  const [businessId, setBusinessId] = useState<string>("");
  const { toast } = useToast();

  // Reset state when dialog closes
  useEffect(() => {
    if (open && appointmentId) {
      loadAppointmentDetails();
    } else {
      setSelectedDate(undefined);
      setSelectedTime("");
      setAvailableSlots([]);
      setAppointment(null);
      setDentistAvailability({});
    }
  }, [open, appointmentId]);

  const loadAppointmentDetails = async () => {
    if (!appointmentId) return;
    setLoading(true);
    try {
      const bId = await getCurrentBusinessId();
      setBusinessId(bId);

      const { data, error } = await supabase
        .from('appointments_decrypted')
        .select('id, appointment_date, reason, dentist_id, service_id')
        .eq('id', appointmentId)
        .single();
      if (error) throw error;

      // Fetch dentist name
      let dentistName = "Your Dentist";
      if (data.dentist_id) {
        const { data: dentist } = await supabase
          .from('dentists')
          .select('profiles:profile_id(first_name, last_name)')
          .eq('id', data.dentist_id)
          .single();
        const p = dentist?.profiles;
        const profile = Array.isArray(p) ? p[0] : p;
        if (profile) dentistName = `Dr. ${profile.first_name} ${profile.last_name}`;
      }

      setAppointment({
        id: data.id,
        appointment_date: data.appointment_date,
        reason: data.reason,
        dentist_id: data.dentist_id,
        service_id: data.service_id,
        dentistName,
      });

      // Load dentist weekly schedule for calendar disabling
      const { data: avail } = await supabase
        .from('dentist_availability')
        .select('day_of_week, is_available')
        .eq('dentist_id', data.dentist_id)
        .eq('business_id', bId);

      if (avail) {
        const map: Record<number, boolean> = {};
        avail.forEach((a: { day_of_week: number; is_available: boolean }) => {
          map[a.day_of_week] = a.is_available;
        });
        setDentistAvailability(map);
      }
    } catch (error) {
      logger.error('Error loading appointment:', error);
      toast({ title: "Error", description: "Failed to load appointment details", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Fetch slots when date changes
  useEffect(() => {
    if (selectedDate && appointment && businessId) {
      loadAvailableSlots(selectedDate);
    }
  }, [selectedDate, appointment, businessId]);

  const loadAvailableSlots = async (date: Date) => {
    if (!appointment || !businessId) return;
    setLoadingSlots(true);
    setSelectedTime("");
    setAvailableSlots([]);

    try {
      // If appointment has no service_id, find a default one for this business
      let serviceId = appointment.service_id;
      if (!serviceId) {
        const { data: services } = await supabase
          .from('business_services')
          .select('id')
          .eq('business_id', businessId)
          .eq('is_active', true)
          .limit(1);
        serviceId = services?.[0]?.id || null;
      }

      // If still no service ID, we can't call the RPC
      if (!serviceId) {
        logger.error('No service_id found for rescheduling');
        setAvailableSlots([]);
        setLoadingSlots(false);
        return;
      }

      const dateStr = format(date, 'yyyy-MM-dd');

      const { data, error } = await (supabase as unknown as {
        rpc: (fn: string, params: Record<string, unknown>) => Promise<{
          data: Array<{ slot_start: string; slot_end: string }> | null;
          error: unknown;
        }>;
      }).rpc('get_available_slots', {
        p_dentist_id: appointment.dentist_id,
        p_date: dateStr,
        p_business_id: businessId,
        p_service_id: serviceId,
      });

      if (error) {
        logger.error('Error fetching slots:', error);
        setAvailableSlots([]);
        return;
      }

      // Filter out past times if today
      const now = new Date();
      const isToday = format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      const slots: TimeSlot[] = (data || [])
        .map((slot: { slot_start: string }) => {
          const timeStr = typeof slot.slot_start === 'string' && slot.slot_start.includes('T')
            ? slot.slot_start.split('T')[1]?.substring(0, 5) || slot.slot_start.substring(0, 5)
            : slot.slot_start.substring(0, 5);
          return { slot_time: timeStr };
        })
        .filter((slot: TimeSlot) => {
          if (!isToday) return true;
          const [h, m] = slot.slot_time.split(':').map(Number);
          const slotDate = new Date(date);
          slotDate.setHours(h, m, 0, 0);
          return slotDate > oneHourFromNow;
        });

      setAvailableSlots(slots);
    } catch (error) {
      logger.error('Error loading slots:', error);
      toast({ title: "Error", description: "Failed to load available time slots", variant: "destructive" });
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleReschedule = async () => {
    if (!appointment || !selectedDate || !selectedTime) return;
    setProcessing(true);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) throw new Error('You must be logged in.');

      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Try patient-scoped RPC first
      const { error: rpcError } = await supabase.rpc('reschedule_appointment', {
        p_appointment_id: appointment.id,
        p_user_id: userData.user.id,
        p_slot_date: dateStr,
        p_slot_time: selectedTime + ':00',
      });

      if (rpcError) {
        if (rpcError.message?.includes('not_authorized')) {
          const newDateTime = `${dateStr}T${selectedTime}:00`;
          const { error: updateError } = await supabase
            .from('appointments')
            .update({
              appointment_date: new Date(`${newDateTime}+01:00`).toISOString(),
              status: 'confirmed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', appointment.id);
          if (updateError) throw updateError;
        } else {
          throw rpcError;
        }
      }

      toast({
        title: "Appointment rescheduled",
        description: `Moved to ${format(selectedDate, 'MMM d, yyyy')} at ${selectedTime}`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      logger.error('Error rescheduling:', error);
      const msg = error instanceof Error ? error.message : 'Failed to reschedule';
      toast({ title: "Error", description: msg.includes('slot_unavailable') ? 'This slot is no longer available.' : msg, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const isDateDisabled = (date: Date) => {
    if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;
    if (isPublicHoliday(date)) return true;
    const dow = date.getDay();
    if (Object.keys(dentistAvailability).length > 0) {
      return dentistAvailability[dow] === false || dentistAvailability[dow] === undefined;
    }
    return dow === 0 || dow === 6;
  };

  // Loading state
  if (!appointment && loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="py-8 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const currentDate = appointment ? new Date(appointment.appointment_date) : null;
  const hasSelectedSlot = !!selectedDate && !!selectedTime;
  const { morning, afternoon } = groupSlotsByPeriod(availableSlots);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Reschedule Appointment
            </DialogTitle>
            <DialogDescription>
              {appointment?.dentistName && (
                <span className="flex items-center gap-1.5 mt-1">
                  <User className="h-3.5 w-3.5" />
                  with {appointment.dentistName}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Current appointment info */}
          {currentDate && (
            <div className="mt-3 flex items-center gap-2 text-sm bg-muted rounded-lg px-3 py-2">
              <span className="text-muted-foreground">Current:</span>
              <span className="font-medium">{format(currentDate, 'EEE, MMM d')}</span>
              <span className="text-muted-foreground">at</span>
              <span className="font-medium">{format(currentDate, 'h:mm a')}</span>
            </div>
          )}
        </div>

        {/* Content: Calendar + Slots side by side on larger screens */}
        <div className="px-6 py-5 max-h-[65vh] overflow-y-auto">
          <div className="flex flex-col md:flex-row gap-5">
            {/* Calendar */}
            <div className="shrink-0">
              <p className="text-sm font-medium mb-2">Pick a new date</p>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setSelectedTime("");
                  }
                }}
                disabled={isDateDisabled}
                fromDate={new Date()}
                toDate={addDays(new Date(), 90)}
                className="rounded-lg border"
                classNames={{
                  disabled: "text-muted-foreground opacity-30 line-through cursor-not-allowed",
                }}
              />
            </div>

            {/* Time slots */}
            <div className="flex-1 min-w-0">
              {!selectedDate ? (
                <div className="flex flex-col items-center justify-center h-full py-10 text-center">
                  <CalendarIcon className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Select a date to see available times</p>
                </div>
              ) : loadingSlots ? (
                <div className="flex flex-col items-center justify-center h-full py-10 gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Loading times…</span>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-10 gap-2 text-center">
                  <AlertCircle className="h-7 w-7 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">No times available</p>
                  <p className="text-xs text-muted-foreground/70">Try a different date</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {format(selectedDate, 'EEE, MMM d')}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {availableSlots.length} slot{availableSlots.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  {morning.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Sun className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Morning</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {morning.map((slot) => {
                          const t = slot.slot_time.substring(0, 5);
                          const sel = selectedTime === t;
                          return (
                            <Button
                              key={t}
                              variant={sel ? "default" : "outline"}
                              size="sm"
                              className={cn("h-9 text-sm", sel && "ring-2 ring-primary ring-offset-1")}
                              onClick={() => setSelectedTime(t)}
                            >
                              {t}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {afternoon.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Sunset className="h-3.5 w-3.5 text-orange-500" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Afternoon</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {afternoon.map((slot) => {
                          const t = slot.slot_time.substring(0, 5);
                          const sel = selectedTime === t;
                          return (
                            <Button
                              key={t}
                              variant={sel ? "default" : "outline"}
                              size="sm"
                              className={cn("h-9 text-sm", sel && "ring-2 ring-primary ring-offset-1")}
                              onClick={() => setSelectedTime(t)}
                            >
                              {t}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Confirmation summary */}
          {hasSelectedSlot && (
            <div className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">New Appointment</p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  <span className="font-medium">{format(selectedDate!, 'EEEE, MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-medium">{selectedTime}</span>
                </div>
              </div>
              {currentDate && (
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <span>{format(currentDate, 'MMM d')} at {format(currentDate, 'h:mm a')}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="text-primary font-medium">{format(selectedDate!, 'MMM d')} at {selectedTime}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Cancel
          </Button>
          <Button onClick={handleReschedule} disabled={!hasSelectedSlot || processing}>
            {processing ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Rescheduling…</>
            ) : (
              "Confirm Reschedule"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
