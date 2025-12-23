import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, CheckCircle, User as UserIcon } from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";
import { logger } from '@/lib/logger';
import { clinicTimeToUtc, createAppointmentDateTimeFromStrings } from "@/lib/timezone";
import { getCurrentBusinessId } from "@/lib/businessScopedSupabase";

interface ChatBookingFlowProps {
  user: User;
  selectedDentist?: any;
  onComplete: (appointmentData: any) => void;
  onCancel: () => void;
  onResponse: (message: string) => void;
  conversationHistory?: any[];
}

interface TimeSlot {
  time: string;
  available: boolean;
  emergency_only?: boolean;
}

export const ChatBookingFlow = ({ 
  user, 
  selectedDentist, 
  onComplete, 
  onCancel, 
  onResponse,
  conversationHistory = []
}: ChatBookingFlowProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [dentists, setDentists] = useState<any[]>([]);
  const [currentDentist, setCurrentDentist] = useState(selectedDentist);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'date' | 'time' | 'confirm'>('date');

  useEffect(() => {
    if (selectedDentist) {
      setCurrentDentist(selectedDentist);
      onResponse(`Great! I'll help you book an appointment with Dr. ${selectedDentist.first_name} ${selectedDentist.last_name}. Please select your preferred date:`);
    }
  }, [selectedDentist]);


  const fetchAvailableSlots = async (date: Date, dentistId: string) => {
    setLoading(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const businessId = await getCurrentBusinessId();

      // First, ensure slots are generated for this date
      try {
        await supabase.rpc('generate_daily_slots', {
          p_dentist_id: dentistId,
          p_date: dateStr
        });
      } catch (genError) {
        console.error('Error generating slots:', genError);
      }

      // Fetch available slots
      const { data, error } = await supabase
        .from('appointment_slots')
        .select('slot_time, is_available, emergency_only')
        .eq('dentist_id', dentistId)
        .eq('slot_date', dateStr)
        .eq('is_available', true)
        .order('slot_time');

      if (error) {
        console.error("Error fetching slots:", error);
        throw error;
      }

      const slots: TimeSlot[] = (data || []).map(slot => ({
        time: slot.slot_time.substring(0, 5),
        available: slot.is_available && !slot.emergency_only,
        emergency_only: slot.emergency_only
      }));

      const availableNormalSlots = slots.filter(s => s.available);
      setAvailableSlots(availableNormalSlots);
      
      if (availableNormalSlots.length === 0) {
        onResponse(`No available slots for ${format(date, "EEEE, MMMM d")}. Please try a different date.`);
      } else {
        onResponse(`Found ${availableNormalSlots.length} available times for ${format(date, "EEEE, MMMM d")} with Dr. ${currentDentist.first_name} ${currentDentist.last_name}. Please select a time:`);
      }
    } catch (error) {
      console.error("Error in fetchAvailableSlots:", error);
      onResponse("Sorry, I couldn't load the available times. Please try again or contact the clinic directly.");
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date || !currentDentist) return;
    
    setSelectedDate(date);
    setSelectedTime(undefined);
    setStep('time');
    fetchAvailableSlots(date, currentDentist.id);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep('confirm');
    onResponse(`Perfect! You've selected ${format(selectedDate!, "EEEE, MMMM d")} at ${time} with Dr. ${currentDentist.first_name} ${currentDentist.last_name}. Would you like to confirm this appointment?`);
  };

  const confirmBooking = async () => {
    if (!selectedDate || !selectedTime || !currentDentist) return;

    setLoading(true);
    try {
      let { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, phone, email, user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profErr) throw profErr;

      if (!profile) {
        const { data: inserted, error: insertErr } = await supabase
          .from("profiles")
          .insert({ user_id: user.id, email: user.email ?? null, first_name: '', last_name: '' })
          .select("id, first_name, last_name, phone, email")
          .single();
        if (insertErr) throw insertErr;
        profile = inserted as any;
      }

      if (!profile) {
        onResponse("Could not create or find your profile. Please try again.");
        onCancel();
        return;
      }

      // Check required fields (allow booking without phone)
      const email = profile.email || user.email;
      const missing: string[] = [];
      if (!profile.first_name) missing.push('first name');
      if (!profile.last_name) missing.push('last name');
      if (!email) missing.push('email');

      if (missing.length > 0) {
        onResponse("I need a few details to finish the booking (name and email). Please update your profile in Settings, then try again.");
        onCancel();
        return;
      }

      // Use format to preserve Brussels date without UTC conversion
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Create appointment with proper timezone handling
      // Parse date and time strings as Brussels timezone and convert to UTC
      const appointmentDateTime = createAppointmentDateTimeFromStrings(dateStr, selectedTime);

      // Generate AI appointment reason from conversation
      let appointmentReason = "General consultation";
      if (conversationHistory.length > 0) {
        try {
          const { generateAppointmentReason } = await import("@/lib/symptoms");
          const aiReason = await generateAppointmentReason(
            conversationHistory as any,
            { id: profile.id, first_name: profile.first_name, last_name: profile.last_name } as any
          );
          if (aiReason) appointmentReason = aiReason;
        } catch (err) {
          console.error('Failed to generate AI reason:', err);
        }
      }

      const { data: appointmentData, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          patient_id: profile.id,
          dentist_id: currentDentist.id,
          appointment_date: appointmentDateTime.toISOString(),
          reason: appointmentReason,
          status: "confirmed",
          urgency: "medium"
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Book all required slots for appointment duration (default 30 min)
      const { error: slotError } = await supabase.rpc('book_appointment_slots_for_duration', {
        p_dentist_id: currentDentist.id,
        p_slot_date: dateStr,
        p_start_time: selectedTime,
        p_duration_minutes: 30, // Default duration for chat bookings
        p_appointment_id: appointmentData.id
      });

      if (slotError) {
        await supabase.from("appointments").delete().eq("id", appointmentData.id);
        onResponse("That time was just taken. Please pick another time.");
        setStep('time');
        return;
      }

      toast({
        title: "Appointment Confirmed!",
        description: `Your appointment is scheduled for ${format(selectedDate, "EEEE, MMMM d")} at ${selectedTime}`
      });


      const confirmationMessage = `🎉 **Appointment Confirmed!**

📅 **Date:** ${format(selectedDate, "EEEE, MMMM d, yyyy")}
🕒 **Time:** ${selectedTime}
👨‍⚕️ **Dentist:** Dr. ${currentDentist.first_name} ${currentDentist.last_name}
📝 **Reason:** ${appointmentReason}

You'll receive a confirmation email shortly. If you need to reschedule or cancel, just ask me!`;

      onComplete({
        appointmentId: appointmentData.id,
        date: selectedDate,
        time: selectedTime,
        dentist: currentDentist,
        message: confirmationMessage
      });

    } catch (error) {
      console.error("Error booking appointment:", error);
      onResponse("I'm sorry, I couldn't complete your booking. Please try again or contact the clinic directly.");
    } finally {
      setLoading(false);
    }
  };

  const isDateDisabled = (date: Date) => {
    const today = startOfDay(new Date());
    return date < today || date.getDay() === 0 || date.getDay() === 6;
  };

  if (step === 'date' || step === 'time') {
    return (
      <Card className="max-w-md mx-auto my-4 border-primary/20 shadow-lg">
        <CardContent className="p-6">
          {step === 'date' && (
            <div className="space-y-4">
              <div className="text-center">
                <CalendarDays className="h-8 w-8 mx-auto text-primary mb-2" />
                <h3 className="font-semibold">Select Date</h3>
                <p className="text-sm text-muted-foreground">
                  Dr. {currentDentist?.first_name} {currentDentist?.last_name}
                </p>
              </div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={isDateDisabled}
                className="rounded-lg border"
              />
            </div>
          )}

          {step === 'time' && selectedDate && (
            <div className="space-y-4">
              <div className="text-center">
                <Clock className="h-8 w-8 mx-auto text-primary mb-2" />
                <h3 className="font-semibold">Select Time</h3>
                <p className="text-sm text-muted-foreground">
                  {format(selectedDate, "EEEE, MMMM d")}
                </p>
              </div>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Loading times...</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.filter(slot => slot.available).map((slot) => (
                    <Button
                      key={slot.time}
                      variant={selectedTime === slot.time ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleTimeSelect(slot.time)}
                      className="text-sm"
                    >
                      {slot.time}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            {step === 'date' && (
              <Button 
                onClick={() => setStep('time')} 
                disabled={!selectedDate}
                className="flex-1"
              >
                Continue
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'confirm') {
    return (
      <Card className="max-w-md mx-auto my-4 border-primary/20 shadow-lg">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
              <h3 className="font-semibold">Confirm Appointment</h3>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span>Dr. {currentDentist?.first_name} {currentDentist?.last_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span>{format(selectedDate!, "EEEE, MMMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{selectedTime}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={confirmBooking} 
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Booking..." : "Confirm"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};