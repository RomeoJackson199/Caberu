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
import { format, startOfDay } from "date-fns";
import { isPublicHoliday } from "@/lib/belgianHolidays";
import { cn } from "@/lib/utils";
import { showAppointmentRescheduled } from "@/lib/successNotifications";
import { Skeleton } from "@/components/ui/skeleton";

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
  const { toast } = useToast();

  // Load appointment details when dialog opens
  useEffect(() => {
    if (open && appointmentId) {
      loadAppointmentDetails();
    } else {
      // Reset state when dialog closes
      setSelectedDate(undefined);
      setSelectedTime("");
      setAvailableSlots([]);
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

      // Transform nested dentists array to single object
      const dentistData = Array.isArray(data.dentists) ? data.dentists[0] : data.dentists;
      // Handle profiles being array or object
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
    } catch (error) {
      console.error('Error loading appointment:', error);
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
      // Generate slots for the selected date
      // Use format to get date string in Brussels timezone (avoid UTC conversion)
      const dateStr = format(date, 'yyyy-MM-dd');

      const { error: generateError } = await supabase.rpc('generate_daily_slots', {
        p_dentist_id: appointment.dentist_id,
        p_date: dateStr
      });

      if (generateError) {
        console.warn('Slot generation warning:', generateError);
      }

      const businessId = await getCurrentBusinessId();

      // Check schedule; if closed or missing, return empty
      try {
        const dayOfWeek = date.getDay();
        const { data: availability } = await supabase
          .from('dentist_availability')
          .select('is_available')
          .eq('dentist_id', appointment.dentist_id)
          .eq('business_id', businessId)
          .eq('day_of_week', dayOfWeek)
          .maybeSingle();
        if (!availability || availability.is_available === false) {
          setAvailableSlots([]);
          setLoadingSlots(false);
          return;
        }
      } catch { }

      // Fetch available slots
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

      if (!slots || slots.length === 0) {
        toast({
          title: "No slots available",
          description: "Please select a different date",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error loading slots:', error);
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
      // Atomically reschedule via secure RPC (handles RLS, releases old slot, books new slot, updates appointment)
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) {
        throw new Error('You must be logged in to reschedule.');
      }

      // Use format to get date string in Brussels timezone (avoid UTC conversion)
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      const { error: rpcError } = await (supabase as any).rpc('reschedule_appointment', {
        p_appointment_id: appointment.id,
        p_user_id: userData.user.id,
        p_slot_date: dateStr,
        p_slot_time: selectedTime
      });

      if (rpcError) throw rpcError;

      // Success!
      showAppointmentRescheduled(format(selectedDate, 'MMM d, yyyy') + ' at ' + selectedTime);

      toast({
        title: "Appointment Rescheduled",
        description: `Your appointment has been moved to ${format(selectedDate, 'MMMM d, yyyy')} at ${selectedTime}`,
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();

    } catch (error: any) {
      console.error('Error rescheduling appointment:', error);
      const message = (error?.message || '').includes('slot_unavailable')
        ? 'This time slot is no longer available. Please select another time.'
        : (error?.message || 'Failed to reschedule appointment');
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
    // Disable past dates
    if (date < today) return true;
    // Disable Belgian public holidays
    if (isPublicHoliday(date)) return true;
    // Disable weekends (TODO: should check dentist availability instead)
    return date.getDay() === 0 || date.getDay() === 6;
  };

  if (!appointment && loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="py-8 space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <Skeleton className="h-64 w-full rounded-lg" />
            <div className="flex gap-3 justify-end">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-32" />
            </div>
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Reschedule Appointment</DialogTitle>
          <DialogDescription>
            Choose a new date and time for your appointment
          </DialogDescription>
        </DialogHeader>

        {appointment && (
          <div className="space-y-6 py-4">
            {/* Current Appointment Info */}
            <Card className="bg-muted/50 border-dashed">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Current Appointment</p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarIcon className="h-4 w-4" />
                        <span className="font-medium">
                          {currentDate && format(currentDate, 'EEEE, MMMM d, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">
                          {currentDate && format(currentDate, 'h:mm a')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4" />
                        <span>{dentistName}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline">{appointment.reason}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* New Date Selection */}
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Select New Date
                </h4>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={isDateDisabled}
                    className="rounded-md border"
                  />
                </div>
              </div>

              {/* Time Slot Selection */}
              {selectedDate && (
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Select New Time
                  </h4>

                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                      <span className="text-sm text-muted-foreground">Loading available times...</span>
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot.slot_time}
                          variant={selectedTime === slot.slot_time.substring(0, 5) ? "default" : "outline"}
                          className={cn(
                            "h-auto py-3",
                            selectedTime === slot.slot_time.substring(0, 5) && "ring-2 ring-primary"
                          )}
                          onClick={() => setSelectedTime(slot.slot_time.substring(0, 5))}
                        >
                          {slot.slot_time.substring(0, 5)}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <p className="text-sm text-muted-foreground">
                          No available time slots for this date.
                          <br />
                          Please select a different date.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Summary */}
              {selectedDate && selectedTime && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-semibold mb-1">New Appointment</p>
                        <p className="text-sm text-muted-foreground">
                          {format(selectedDate, 'EEEE, MMMM d, yyyy')} at {selectedTime}
                        </p>
                        <p className="text-sm text-muted-foreground">with {dentistName}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
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
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm Reschedule
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
