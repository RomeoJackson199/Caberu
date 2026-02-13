import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCurrentBusinessId } from "@/lib/businessScopedSupabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar as CalendarIcon, Clock, User, ArrowRight, CheckCircle } from "lucide-react";
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

export const RescheduleDialog = ({ appointmentId, open, onOpenChange, onSuccess }: RescheduleDialogProps) => {
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dentistAvailability, setDentistAvailability] = useState<Record<number, boolean>>({});
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
    }
  }, [open, appointmentId]);

  const loadAppointmentDetails = async () => {
    if (!appointmentId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments_decrypted')
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
        avail.forEach((a: any) => { map[a.day_of_week] = a.is_available; });
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

      const { error: generateError } = await supabase.rpc('generate_daily_slots', {
        p_dentist_id: appointment.dentist_id,
        p_date: dateStr
      });

      if (generateError) {
        logger.warn('Slot generation warning:', generateError);
      }

      const businessId = await getCurrentBusinessId();

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

      const { error: rpcError } = await (supabase as any).rpc('reschedule_appointment', {
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
    // Check actual dentist availability instead of hardcoding weekends
    const dayOfWeek = date.getDay();
    if (Object.keys(dentistAvailability).length > 0) {
      return dentistAvailability[dayOfWeek] === false || dentistAvailability[dayOfWeek] === undefined;
    }
    // Fallback: disable weekends if no availability data
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Reschedule Appointment</DialogTitle>
            <DialogDescription className="text-sm">
              Choose a new date and time for your appointment
            </DialogDescription>
          </DialogHeader>

          {/* Current appointment summary */}
          {appointment && currentDate && (
            <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5" />
                <span>{format(currentDate, 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{format(currentDate, 'h:mm a')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span>{dentistName}</span>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Calendar */}
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

          {/* Time Slots */}
          {selectedDate && (
            <div>
              <h4 className="text-sm font-medium mb-3">
                Available times for {format(selectedDate, 'EEEE, MMM d')}
              </h4>

              {loadingSlots ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                  <span className="text-sm text-muted-foreground">Loading times...</span>
                </div>
              ) : availableSlots.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {availableSlots.map((slot) => {
                    const timeStr = slot.slot_time.substring(0, 5);
                    const isSelected = selectedTime === timeStr;
                    return (
                      <Button
                        key={slot.slot_time}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "h-10 text-sm font-medium",
                          isSelected && "ring-2 ring-primary ring-offset-2"
                        )}
                        onClick={() => setSelectedTime(timeStr)}
                      >
                        {timeStr}
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground border rounded-lg bg-muted/30">
                  No available times for this date. Try another day.
                </div>
              )}
            </div>
          )}

          {/* Confirmation summary */}
          {selectedDate && selectedTime && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">
                      {format(selectedDate, 'EEEE, MMMM d, yyyy')} at {selectedTime}
                    </p>
                    <p className="text-muted-foreground">with {dentistName}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/30 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReschedule}
            disabled={!selectedDate || !selectedTime || processing}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
