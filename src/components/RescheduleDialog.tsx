import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCurrentBusinessId } from "@/lib/businessScopedSupabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar as CalendarIcon, Clock, User, ArrowRight, CheckCircle, Sun, Sunset, AlertCircle } from "lucide-react";
import { format, startOfDay, addDays } from "date-fns";
import { isPublicHoliday } from "@/lib/belgianHolidays";
import { cn } from "@/lib/utils";
import { showAppointmentRescheduled } from "@/lib/successNotifications";
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
  dentist?: {
    profiles?: {
      first_name: string;
      last_name: string;
    } | null;
  } | null;
}

interface TimeSlot {
  slot_time: string;
  is_available: boolean;
}

type Step = "date" | "time" | "confirm";

function groupSlotsByPeriod(slots: TimeSlot[]) {
  const morning: TimeSlot[] = [];
  const afternoon: TimeSlot[] = [];

  for (const slot of slots) {
    const hour = parseInt(slot.slot_time.substring(0, 2), 10);
    if (hour < 12) {
      morning.push(slot);
    } else {
      afternoon.push(slot);
    }
  }

  return { morning, afternoon };
}

export const RescheduleDialog = ({ appointmentId, open, onOpenChange, onSuccess }: RescheduleDialogProps) => {
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dentistAvailability, setDentistAvailability] = useState<Record<number, boolean>>({});
  const [step, setStep] = useState<Step>("date");
  const { toast } = useToast();

  // Load appointment details when dialog opens
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
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          reason,
          dentist_id,
          dentists!appointments_dentist_id_fkey (
            profiles:profile_id (
              first_name,
              last_name
            )
          )
        `)
        .eq('id', appointmentId)
        .single();

      if (error) throw error;

      const dentistData = Array.isArray(data.dentists) ? data.dentists[0] : data.dentists;
      const profilesData = dentistData?.profiles;
      const normalizedProfiles = Array.isArray(profilesData) ? profilesData[0] : profilesData;

      const transformedData: AppointmentDetails = {
        id: data.id,
        appointment_date: data.appointment_date,
        reason: data.reason,
        dentist_id: data.dentist_id,
        dentist: dentistData ? { profiles: normalizedProfiles || null } : null,
      };
      setAppointment(transformedData);

      // Load dentist availability schedule
      const businessId = await getCurrentBusinessId();
      const { data: avail } = await supabase
        .from('dentist_availability')
        .select('day_of_week, is_available')
        .eq('dentist_id', data.dentist_id)
        .eq('business_id', businessId);

      if (avail) {
        const map: Record<number, boolean> = {};
        avail.forEach((a: { day_of_week: number; is_available: boolean }) => { map[a.day_of_week] = a.is_available; });
        setDentistAvailability(map);
      }
    } catch (error) {
      logger.error('Error loading appointment:', error);
      toast({
        title: "Error",
        description: "Failed to load appointment details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load available slots when date is selected
  useEffect(() => {
    if (selectedDate && appointment) {
      loadAvailableSlots(selectedDate);
    }
  }, [selectedDate, appointment]);

  const loadAvailableSlots = async (date: Date) => {
    if (!appointment) return;

    setLoadingSlots(true);
    setSelectedTime("");
    setAvailableSlots([]);

    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const businessId = await getCurrentBusinessId();

      const { error: generateError } = await supabase.rpc('generate_daily_slots', {
        p_dentist_id: appointment.dentist_id,
        p_date: dateStr,
        p_business_id: businessId
      });

      if (generateError) {
        logger.warn('Slot generation warning:', generateError);
      }

      const { data: slots, error: slotsError } = await supabase
        .from('appointment_slots')
        .select('slot_time, is_available')
        .eq('dentist_id', appointment.dentist_id)
        .eq('slot_date', dateStr)
        .eq('business_id', businessId)
        .eq('is_available', true)
        .order('slot_time');

      if (slotsError) throw slotsError;

      setAvailableSlots(slots || []);
    } catch (error) {
      logger.error('Error loading slots:', error);
      toast({
        title: "Error",
        description: "Failed to load available time slots",
        variant: "destructive"
      });
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleReschedule = async () => {
    if (!appointment || !selectedDate || !selectedTime) return;

    setProcessing(true);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) {
        throw new Error('You must be logged in to reschedule.');
      }

      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      const { error: rpcError } = await supabase.rpc('reschedule_appointment', {
        p_appointment_id: appointment.id,
        p_user_id: userData.user.id,
        p_slot_date: dateStr,
        p_slot_time: selectedTime
      });

      if (rpcError) throw rpcError;

      showAppointmentRescheduled(format(selectedDate, 'MMM d, yyyy') + ' at ' + selectedTime);

      toast({
        title: "Appointment Rescheduled",
        description: `Your appointment has been moved to ${format(selectedDate, 'MMMM d, yyyy')} at ${selectedTime}`,
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();

    } catch (error: unknown) {
      logger.error('Error rescheduling appointment:', error);
      const errorMessage = error instanceof Error ? error.message : '';
      const message = errorMessage.includes('slot_unavailable')
        ? 'This time slot is no longer available. Please select another time.'
        : (errorMessage || 'Failed to reschedule appointment');
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const isDateDisabled = (date: Date) => {
    const today = startOfDay(new Date());
    if (date < today) return true;
    if (isPublicHoliday(date)) return true;
    const dayOfWeek = date.getDay();
    if (Object.keys(dentistAvailability).length > 0) {
      return dentistAvailability[dayOfWeek] === false || dentistAvailability[dayOfWeek] === undefined;
    }
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  if (!appointment && loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
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
  const dentistName = appointment?.dentist?.profiles
    ? `Dr. ${appointment.dentist.profiles.first_name} ${appointment.dentist.profiles.last_name}`
    : "Your Dentist";

  const steps: { key: Step; label: string }[] = [
    { key: "date", label: "Date" },
    { key: "time", label: "Time" },
    { key: "confirm", label: "Confirm" },
  ];

  const stepIndex = steps.findIndex((s) => s.key === step);

  const canProceedToTime = !!selectedDate;
  const canProceedToConfirm = !!selectedDate && !!selectedTime;

  const { morning, afternoon } = groupSlotsByPeriod(availableSlots);

  const renderTimeSlotGroup = (label: string, icon: React.ReactNode, slots: TimeSlot[]) => {
    if (slots.length === 0) return null;
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {slots.map((slot) => {
            const timeStr = slot.slot_time.substring(0, 5);
            const isSelected = selectedTime === timeStr;
            return (
              <Button
                key={slot.slot_time}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-10 text-sm font-medium transition-all",
                  isSelected && "ring-2 ring-primary ring-offset-2 shadow-md",
                  !isSelected && "hover:border-primary/50 hover:bg-primary/5"
                )}
                onClick={() => setSelectedTime(timeStr)}
              >
                {timeStr}
              </Button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header with step indicator */}
        <div className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Reschedule Appointment</DialogTitle>
            <DialogDescription className="text-sm">
              Choose a new date and time for your appointment
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          <div className="mt-4 flex items-center gap-1">
            {steps.map((s, i) => {
              const isActive = i === stepIndex;
              const isCompleted = i < stepIndex;
              return (
                <div key={s.key} className="flex items-center flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (i < stepIndex) setStep(s.key);
                    }}
                    disabled={i > stepIndex}
                    className={cn(
                      "flex items-center gap-2 w-full rounded-md px-3 py-2 text-xs font-medium transition-colors",
                      isActive && "bg-primary text-primary-foreground",
                      isCompleted && "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20",
                      !isActive && !isCompleted && "bg-muted text-muted-foreground"
                    )}
                  >
                    <span className={cn(
                      "flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold shrink-0",
                      isActive && "bg-primary-foreground text-primary",
                      isCompleted && "bg-primary text-primary-foreground",
                      !isActive && !isCompleted && "bg-muted-foreground/30 text-muted-foreground"
                    )}>
                      {isCompleted ? <CheckCircle className="h-3 w-3" /> : i + 1}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {i < steps.length - 1 && (
                    <div className={cn(
                      "h-px w-4 mx-1 shrink-0",
                      i < stepIndex ? "bg-primary" : "bg-border"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content area */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">

          {/* Step 1: Date selection */}
          {step === "date" && (
            <div className="space-y-4">
              {/* Current appointment info */}
              {appointment && currentDate && (
                <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarIcon className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="text-amber-800 dark:text-amber-200">
                        Current: <span className="font-medium">{format(currentDate, 'EEEE, MMM d, yyyy')}</span> at <span className="font-medium">{format(currentDate, 'h:mm a')}</span>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div>
                <h4 className="text-sm font-medium mb-3">Select a new date</h4>
                <div className="flex justify-center">
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
                    className="rounded-md border pointer-events-auto"
                    classNames={{
                      day: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Time selection */}
          {step === "time" && selectedDate && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">
                  Available times for {format(selectedDate, 'EEEE, MMM d')}
                </h4>
                <Badge variant="outline" className="text-xs">
                  {availableSlots.length} slot{availableSlots.length !== 1 ? 's' : ''} available
                </Badge>
              </div>

              {loadingSlots ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Finding available times...</span>
                </div>
              ) : availableSlots.length > 0 ? (
                <div className="space-y-4">
                  {renderTimeSlotGroup("Morning", <Sun className="h-3.5 w-3.5 text-amber-500" />, morning)}
                  {renderTimeSlotGroup("Afternoon", <Sunset className="h-3.5 w-3.5 text-orange-500" />, afternoon)}
                </div>
              ) : (
                <div className="flex flex-col items-center py-10 gap-3 text-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">No times available</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Try selecting a different date
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep("date")}
                    className="mt-1"
                  >
                    Choose another date
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === "confirm" && selectedDate && selectedTime && appointment && currentDate && (
            <div className="space-y-5">
              <h4 className="text-sm font-medium">Review your changes</h4>

              {/* Visual comparison: old vs new */}
              <div className="flex items-stretch gap-3">
                {/* Current appointment */}
                <Card className="flex-1 border-dashed opacity-60">
                  <CardContent className="p-4 space-y-2">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Current</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{format(currentDate, 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{format(currentDate, 'h:mm a')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Arrow */}
                <div className="flex items-center">
                  <ArrowRight className="h-5 w-5 text-primary" />
                </div>

                {/* New appointment */}
                <Card className="flex-1 border-primary bg-primary/5">
                  <CardContent className="p-4 space-y-2">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-primary">New</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                        <span>{format(selectedDate, 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span>{selectedTime}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Dentist info */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
                <User className="h-3.5 w-3.5" />
                <span>with {dentistName}</span>
              </div>

              {appointment.reason && (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                  Reason: {appointment.reason}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with navigation */}
        <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-between gap-3">
          <div>
            {step !== "date" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (step === "time") setStep("date");
                  if (step === "confirm") setStep("time");
                }}
                disabled={processing}
              >
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={processing}
            >
              Cancel
            </Button>

            {step === "date" && (
              <Button
                onClick={() => setStep("time")}
                disabled={!canProceedToTime}
              >
                Continue
              </Button>
            )}

            {step === "time" && (
              <Button
                onClick={() => setStep("confirm")}
                disabled={!canProceedToConfirm}
              >
                Continue
              </Button>
            )}

            {step === "confirm" && (
              <Button
                onClick={handleReschedule}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Rescheduling...
                  </>
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
