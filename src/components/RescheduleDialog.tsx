import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCurrentBusinessId } from "@/lib/businessScopedSupabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Calendar as CalendarIcon, Clock, User, ArrowRight,
  CheckCircle, Sun, Sunset, AlertCircle,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { createAppointmentDateTimeFromStrings } from "@/lib/timezone";
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

type Step = "date" | "time" | "confirm";

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
  const [step, setStep] = useState<Step>("date");
  const { toast } = useToast();

  useEffect(() => {
    if (open && appointmentId) {
      loadAppointmentDetails();
    } else {
      setSelectedDate(undefined);
      setSelectedTime("");
      setAvailableSlots([]);
      setAppointment(null);
      setDentistAvailability({});
      setStep("date");
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

      let dentistName = "";
      if (data.dentist_id) {
        // Try dentists table with profile join
        const { data: dentist } = await supabase
          .from('dentists')
          .select('first_name, last_name, profiles:profile_id(first_name, last_name)')
          .eq('id', data.dentist_id)
          .single();
        
        // Use dentists table fields first, fall back to profiles join
        const dFirst = dentist?.first_name;
        const dLast = dentist?.last_name;
        const p = dentist?.profiles;
        const profile = Array.isArray(p) ? p[0] : p;
        const pFirst = profile?.first_name;
        const pLast = profile?.last_name;
        
        const firstName = dFirst || pFirst || '';
        const lastName = dLast || pLast || '';
        if (firstName || lastName) {
          dentistName = `Dr. ${firstName} ${lastName}`.trim();
        }
      }

      setAppointment({
        id: data.id,
        appointment_date: data.appointment_date,
        reason: data.reason,
        dentist_id: data.dentist_id,
        service_id: data.service_id,
        dentistName,
      });

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

      if (!serviceId) {
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

      // Direct update — the reschedule_appointment RPC is not deployed
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          appointment_date: createAppointmentDateTimeFromStrings(dateStr, selectedTime).toISOString(),
          status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointment.id);
      if (updateError) throw updateError;

      // Release old slots and book new ones if possible
      try {
        await supabase.rpc('release_appointment_slots', { p_appointment_id: appointment.id });
      } catch {
        // Slot release is best-effort
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
      toast({
        title: "Error",
        description: msg.includes('slot_unavailable') ? 'This slot is no longer available.' : msg,
        variant: "destructive",
      });
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
  const { morning, afternoon } = groupSlotsByPeriod(availableSlots);

  const steps: { key: Step; label: string; icon: typeof CalendarIcon }[] = [
    { key: "date", label: "Date", icon: CalendarIcon },
    { key: "time", label: "Time", icon: Clock },
    { key: "confirm", label: "Confirm", icon: CheckCircle },
  ];
  const stepIndex = steps.findIndex(s => s.key === step);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarIcon className="h-4 w-4 text-primary" />
              </div>
              Reschedule Appointment
            </DialogTitle>
            <DialogDescription className="sr-only">
              Choose a new date and time for your appointment
            </DialogDescription>
          </DialogHeader>

          {appointment?.dentistName && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1 ml-[42px]">
              <User className="h-3.5 w-3.5" />
              with {appointment.dentistName}
            </p>
          )}

          {/* Current appointment pill */}
          {currentDate && (
            <div className="mt-4 bg-muted rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Current:</span>
              <span className="font-semibold">{format(currentDate, 'EEE, MMM d')}</span>
              <span className="text-muted-foreground">at</span>
              <span className="font-semibold">{format(currentDate, 'h:mm a')}</span>
            </div>
          )}

          {/* Step indicator */}
          <div className="mt-5 flex items-center gap-0">
            {steps.map((s, i) => {
              const active = i === stepIndex;
              const completed = i < stepIndex;
              const StepIcon = s.icon;
              return (
                <div key={s.key} className="flex items-center flex-1">
                  <button
                    type="button"
                    onClick={() => { if (completed) setStep(s.key); }}
                    disabled={i > stepIndex}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all w-full justify-center",
                      active && "bg-primary text-primary-foreground shadow-sm",
                      completed && "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20",
                      !active && !completed && "text-muted-foreground",
                    )}
                  >
                    {completed ? (
                      <CheckCircle className="h-3.5 w-3.5" />
                    ) : (
                      <StepIcon className="h-3.5 w-3.5" />
                    )}
                    {s.label}
                  </button>
                  {i < steps.length - 1 && (
                    <div className={cn(
                      "h-px w-6 mx-0.5 shrink-0 transition-colors",
                      completed ? "bg-primary" : "bg-border",
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-2 max-h-[55vh] overflow-y-auto">
          {/* Step 1: Date */}
          {step === "date" && (
            <div className="flex justify-center pb-4">
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
              />
            </div>
          )}

          {/* Step 2: Time */}
          {step === "time" && selectedDate && (
            <div className="space-y-4 pb-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {format(selectedDate, 'EEEE, MMM d')}
                </p>
                {!loadingSlots && availableSlots.length > 0 && (
                  <Badge className="bg-primary/10 text-primary border-0 text-xs font-semibold px-2.5">
                    {availableSlots.length} slots
                  </Badge>
                )}
              </div>

              {loadingSlots ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Finding available times…</span>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="flex flex-col items-center py-12 gap-3 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">No times available</p>
                    <p className="text-xs text-muted-foreground mt-1">Try selecting a different date</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setStep("date")} className="mt-2">
                    Choose another date
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  {morning.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <Sun className="h-4 w-4 text-amber-500" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Morning</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {morning.map((slot) => {
                          const t = slot.slot_time.substring(0, 5);
                          const sel = selectedTime === t;
                          return (
                            <button
                              key={t}
                              onClick={() => setSelectedTime(t)}
                              className={cn(
                                "h-10 rounded-xl text-sm font-medium transition-all border",
                                sel
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]"
                                  : "bg-background border-border hover:border-primary/50 hover:bg-primary/5",
                              )}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {afternoon.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <Sunset className="h-4 w-4 text-orange-500" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Afternoon</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {afternoon.map((slot) => {
                          const t = slot.slot_time.substring(0, 5);
                          const sel = selectedTime === t;
                          return (
                            <button
                              key={t}
                              onClick={() => setSelectedTime(t)}
                              className={cn(
                                "h-10 rounded-xl text-sm font-medium transition-all border",
                                sel
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]"
                                  : "bg-background border-border hover:border-primary/50 hover:bg-primary/5",
                              )}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === "confirm" && selectedDate && selectedTime && appointment && currentDate && (
            <div className="space-y-5 pb-4">
              <p className="text-sm font-medium">Review your changes</p>

              <div className="flex items-stretch gap-3">
                {/* Old */}
                <Card className="flex-1 border-dashed opacity-60">
                  <CardContent className="p-4 space-y-2">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Current</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        {format(currentDate, 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {format(currentDate, 'h:mm a')}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-center">
                  <ArrowRight className="h-5 w-5 text-primary" />
                </div>

                {/* New */}
                <Card className="flex-1 border-primary/40 bg-primary/5">
                  <CardContent className="p-4 space-y-2">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-primary">New</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                        {format(selectedDate, 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        {selectedTime}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                with {appointment.dentistName}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <div>
            {step !== "date" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(step === "confirm" ? "time" : "date")}
                disabled={processing}
              >
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
              Cancel
            </Button>

            {step === "date" && (
              <Button onClick={() => setStep("time")} disabled={!selectedDate}>
                Continue
              </Button>
            )}
            {step === "time" && (
              <Button onClick={() => setStep("confirm")} disabled={!selectedTime}>
                Continue
              </Button>
            )}
            {step === "confirm" && (
              <Button onClick={handleReschedule} disabled={processing} className="min-w-[140px]">
                {processing ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Rescheduling…</>
                ) : (
                  "Confirm Reschedule"
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
