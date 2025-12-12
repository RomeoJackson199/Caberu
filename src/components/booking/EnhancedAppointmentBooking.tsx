import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CalendarDays, Clock, User as UserIcon, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { clinicTimeToUtc, utcToClinicTime, getClinicTimeSlots, formatClinicTime, createAppointmentDateTimeFromStrings } from "@/lib/timezone";
import { logger } from '@/lib/logger';
import { getCurrentBusinessId } from "@/lib/businessScopedSupabase";
import { format } from 'date-fns';
import { handleEmailError } from '@/hooks/useEmailLimit';

interface EnhancedAppointmentBookingProps {
  user: User;
  selectedDentist?: Dentist;
  prefilledReason?: string;
  chatNotes?: string;
  onComplete: (appointmentData?: Record<string, unknown>) => void;
  onCancel: () => void;
}

interface Dentist {
  id: string;
  profile_id: string;
  specialization?: string;
  profiles: {
    first_name: string;
    last_name: string;
    profile_picture_url?: string | null;
  };
}

interface TimeSlot {
  time: string;
  available: boolean;
  reason?: string;
}

export const EnhancedAppointmentBooking = ({
  user,
  selectedDentist: preSelectedDentist,
  prefilledReason,
  chatNotes,
  onComplete,
  onCancel
}: EnhancedAppointmentBookingProps) => {
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [selectedDentist, setSelectedDentist] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [allSlots, setAllSlots] = useState<TimeSlot[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const { toast } = useToast();

  // Initialize form data
  useEffect(() => {
    if (prefilledReason) {
      setReason(prefilledReason);
    }
    if (chatNotes) {
      setNotes(chatNotes);
    }
    // Generate idempotency key for this booking session
    setIdempotencyKey(`booking_${user.id}_${Date.now()}`);
  }, [prefilledReason, chatNotes, user.id]);

  const fetchDentists = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('dentists')
        .select(`
          id,
          profile_id,
          specialization,
          profiles:profile_id (
            first_name,
            last_name,
            profile_picture_url
          )
        `)
        .eq('is_active', true);

      if (error) throw error;

      const transformedData = (data || []).map((d: any) => ({
        ...d,
        profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles
      }));

      setDentists(transformedData);
    } catch (error) {
      console.error('Failed to fetch dentists:', error);
      toast({
        title: "Error",
        description: "Failed to load dentists",
        variant: "destructive"
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchDentists();
  }, [fetchDentists]);

  // Auto-select dentist
  useEffect(() => {
    if (dentists.length > 0 && !selectedDentist) {
      const dentistToSelect = preSelectedDentist?.id || dentists[0].id;
      setSelectedDentist(dentistToSelect);
    }
  }, [dentists, selectedDentist, preSelectedDentist]);

  // Monitor if selected time slot becomes unavailable
  useEffect(() => {
    if (!selectedTime || availableSlots.length === 0) return;

    const isStillAvailable = availableSlots.some(
      slot => slot.time === selectedTime && slot.available
    );

    if (!isStillAvailable) {
      // Slot was deselected or became unavailable
      toast({
        title: "Slot No Longer Available",
        description: "The time slot you selected has been booked by someone else. Please choose another time.",
        variant: "destructive",
      });
      setSelectedTime("");
    }
  }, [availableSlots, selectedTime, toast]);

  const fetchAvailability = async (date: Date) => {
    if (!selectedDentist) return;

    setLoadingTimes(true);
    setSelectedTime("");

    try {
      // Use format to preserve Brussels date without UTC conversion
      const dateStr = format(date, 'yyyy-MM-dd');
      const businessId = await getCurrentBusinessId();

      // Check schedule before generating slots
      try {
        const dayOfWeek = date.getDay();
        const { data: availability } = await supabase
          .from('dentist_availability')
          .select('is_available')
          .eq('dentist_id', selectedDentist)
          .eq('business_id', businessId)
          .eq('day_of_week', dayOfWeek)
          .maybeSingle();

        if (!availability || availability.is_available === false) {
          // Clean up any stale slots for closed days
          try {
            await supabase.rpc('generate_daily_slots', {
              p_dentist_id: selectedDentist,
              p_date: dateStr
            });
          } catch { }
          setAvailableSlots([]);
          setAllSlots([]);
          setLoadingTimes(false);
          return;
        }
      } catch (e) {
        console.warn('Availability check failed:', e);
      }

      // Generate slots for the date
      await supabase.rpc('generate_daily_slots', {
        p_dentist_id: selectedDentist,
        p_date: dateStr
      });

      // Fetch ALL slots for comprehensive view
      const { data: slots, error } = await supabase
        .from('appointment_slots')
        .select('slot_time, is_available')
        .eq('dentist_id', selectedDentist)
        .eq('slot_date', dateStr)
        .eq('business_id', businessId)
        .order('slot_time');

      if (error) throw error;

      const allSlotsData = (slots || []).map(slot => ({
        time: slot.slot_time.substring(0, 5),
        available: slot.is_available
      }));

      // Filter available slots
      const availableSlotsData = allSlotsData.filter(slot =>
        slot.available
      );

      setAllSlots(allSlotsData);
      setAvailableSlots(availableSlotsData);

    } catch (error) {
      console.error('Failed to fetch availability:', error);
      toast({
        title: "Error",
        description: "Failed to load available time slots",
        variant: "destructive",
      });
      setAvailableSlots([]);
      setAllSlots([]);
    } finally {
      setLoadingTimes(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedDentist || !selectedDate || !selectedTime) {
      toast({
        title: "Missing Information",
        description: "Please select a dentist, date and time",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Get patient profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, date_of_birth, phone, email")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;

      // Validate required fields
      const requiredFields = ['first_name', 'last_name', 'phone', 'email'];
      const missingFields = requiredFields.filter(field => !profile[field]);

      if (missingFields.length > 0) {
        toast({
          title: "Incomplete Profile",
          description: "Please complete your profile before booking an appointment",
          variant: "destructive",
        });
        return;
      }

      // Use format to preserve Brussels date without UTC conversion
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Create appointment datetime in clinic timezone, then convert to UTC
      // Parse date and time strings as Brussels timezone and convert to UTC
      const appointmentDateTime = createAppointmentDateTimeFromStrings(dateStr, selectedTime);

      // Book the slot first
      const { error: slotBookingError } = await supabase.rpc('book_appointment_slot', {
        p_dentist_id: selectedDentist,
        p_slot_date: dateStr,
        p_slot_time: selectedTime + ':00',
        p_appointment_id: idempotencyKey // Use as temp ID
      });

      if (slotBookingError) {
        throw new Error("This time slot is no longer available");
      }

      // Create the appointment with full metadata
      const { data: appointmentData, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          patient_id: profile.id,
          dentist_id: selectedDentist,
          appointment_date: appointmentDateTime.toISOString(),
          reason: reason || "General consultation",
          notes: notes || chatNotes || "",
          status: "confirmed",
          urgency: "medium",
          patient_name: `${profile.first_name} ${profile.last_name}`,
          duration_minutes: 60
        })
        .select()
        .single();

      if (appointmentError) {
        // Release slot if appointment creation fails
        await supabase.rpc('release_appointment_slot', {
          p_appointment_id: idempotencyKey
        });
        throw appointmentError;
      }

      // Update slot with actual appointment ID
      await supabase.rpc('book_appointment_slot', {
        p_dentist_id: selectedDentist,
        p_slot_date: dateStr,
        p_slot_time: selectedTime + ':00',
        p_appointment_id: appointmentData.id
      });

      const clinicDateTime = utcToClinicTime(new Date(appointmentData.appointment_date));

      // Send appointment confirmation email
      try {
        const { data: dentistProfile } = await supabase
          .from('dentists')
          .select(`
            profiles(first_name, last_name)
          `)
          .eq('id', selectedDentist)
          .single();

        const dentistName = dentistProfile?.profiles
          ? `Dr. ${dentistProfile.profiles.first_name} ${dentistProfile.profiles.last_name}`
          : 'Your dentist';

        const appointmentDetails = {
          date: formatClinicTime(clinicDateTime, 'EEEE, MMMM d, yyyy'),
          time: formatClinicTime(clinicDateTime, 'HH:mm'),
          reason: reason || "General consultation",
          dentist: dentistName
        };

        const emailSubject = `Appointment Confirmation - ${appointmentDetails.date} at ${appointmentDetails.time}`;
        const emailMessage = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2D5D7B; margin-bottom: 24px;">Your Appointment is Confirmed!</h2>
            
            <div style="background: #f8fafc; padding: 24px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1e293b; margin: 0 0 16px 0;">Appointment Details:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Date:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${appointmentDetails.date}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Time:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${appointmentDetails.time}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Dentist:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${appointmentDetails.dentist}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Reason:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${appointmentDetails.reason}</td>
                </tr>
              </table>
            </div>

            <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #1e40af; margin: 0 0 12px 0;">📍 Important Notes:</h4>
              <ul style="color: #1e40af; margin: 0; padding-left: 20px;">
                <li>Please arrive 10 minutes early for check-in</li>
                <li>Bring a valid ID and insurance card</li>
                <li>If you need to reschedule, please call us at least 24 hours in advance</li>
              </ul>
            </div>

            <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
              Thank you for choosing our dental practice. We look forward to seeing you soon!
            </p>
          </div>
        `;

        await supabase.functions.invoke('send-email-notification', {
          body: {
            to: profile.email,
            subject: emailSubject,
            message: emailMessage,
            messageType: 'appointment_confirmation',
            patientId: profile.id,
            dentistId: selectedDentist,
            appointmentDate: appointmentDetails.date,
            appointmentTime: appointmentDetails.time
          }
        });
      } catch (emailError: any) {
        // Check if it's an email limit error and show popup
        if (!handleEmailError(emailError)) {
          console.error('Failed to send confirmation email:', emailError);
        }
        // Don't fail the booking if email fails
      }

      toast({
        title: "Appointment Confirmed!",
        description: `Your appointment is scheduled for ${formatClinicTime(clinicDateTime, 'PPP')} at ${formatClinicTime(clinicDateTime, 'HH:mm')}. Check your email for confirmation details.`,
      });

      onComplete({
        id: appointmentData.id,
        date: formatClinicTime(clinicDateTime, 'PPP'),
        time: formatClinicTime(clinicDateTime, 'HH:mm'),
        reason: reason || "General consultation",
        notes: notes || chatNotes || "",
        dentist: dentists.find(d => d.id === selectedDentist)?.profiles.first_name + " " +
          dentists.find(d => d.id === selectedDentist)?.profiles.last_name
      });
    } catch (error) {
      console.error("Error booking appointment:", error);
      toast({
        title: "Booking Failed",
        description: error instanceof Error ? error.message : "Unable to book appointment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today || date.getDay() === 0 || date.getDay() === 6;
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setShowConfirmDialog(true);
  };

  const confirmBooking = () => {
    setShowConfirmDialog(false);
    handleBookAppointment();
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-background dark:via-background dark:to-primary/5 p-4">
        <div className="max-w-5xl mx-auto">
          <Card className="shadow-2xl border-0 bg-white/95 dark:bg-background/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-6 border-b bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white mb-3 shadow-lg mx-auto">
                <CalendarDays className="h-7 w-7" />
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Book Your Appointment
              </CardTitle>
              <p className="text-muted-foreground mt-2 text-base">Schedule your dental consultation in 3 simple steps</p>
            </CardHeader>

            <CardContent className="space-y-8 p-6 md:p-10">
              {/* Step Indicator */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${selectedDentist ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                  <span className="font-semibold">1. Dentist</span>
                  {selectedDentist && <CheckCircle className="h-4 w-4" />}
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${selectedDate ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                  <span className="font-semibold">2. Date & Time</span>
                  {selectedDate && selectedTime && <CheckCircle className="h-4 w-4" />}
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${reason ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                  <span className="font-semibold">3. Details</span>
                  {reason && <CheckCircle className="h-4 w-4" />}
                </div>
              </div>

              {/* Dentist Selection */}
              <div className="space-y-4">
                <Label className="text-lg font-bold text-foreground flex items-center">
                  <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Step 1: Choose Your Dentist
                </Label>
                <Select value={selectedDentist} onValueChange={setSelectedDentist}>
                  <SelectTrigger className="h-14 border-2 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 hover:border-blue-400 dark:hover:border-blue-700 transition-colors text-base">
                    <SelectValue placeholder="Select your preferred dentist" />
                  </SelectTrigger>
                  <SelectContent>
                    {dentists.map((dentist) => (
                      <SelectItem key={dentist.id} value={dentist.id} className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold overflow-hidden">
                            {dentist.profiles.profile_picture_url ? (
                              <img src={dentist.profiles.profile_picture_url} alt="Dr" className="w-full h-full object-cover" />
                            ) : (
                              <span>{dentist.profiles.first_name[0]}{dentist.profiles.last_name[0]}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold">Dr {dentist.profiles.first_name} {dentist.profiles.last_name}</div>
                            <div className="text-sm text-muted-foreground">{dentist.specialization || 'General Dentistry'}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Selection */}
              <div className="space-y-4">
                <Label className="text-lg font-bold text-foreground flex items-center">
                  <CalendarDays className="h-5 w-5 mr-2 text-purple-600" />
                  Step 2: Pick a Date
                </Label>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      if (date) fetchAvailability(date);
                    }}
                    disabled={isDateDisabled}
                    className="rounded-2xl border-2 border-purple-200 dark:border-purple-900 shadow-xl bg-purple-50/50 dark:bg-purple-950/20 p-6"
                  />
                </div>
              </div>

              {/* Time Selection with Enhanced UX */}
              {selectedDate && (
                <div className="space-y-4">
                  <Label className="text-lg font-bold text-foreground flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-pink-600" />
                    Select Your Time Slot
                  </Label>

                  {loadingTimes ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-dental-primary" />
                      <span className="ml-3 text-gray-600">Loading available slots...</span>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Available Slots - Scrollable */}
                      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-300 dark:border-green-800 shadow-lg">
                        <CardHeader className="pb-3 bg-green-100/50 dark:bg-green-900/30">
                          <CardTitle className="text-xl text-green-800 dark:text-green-300 flex items-center gap-2">
                            <CheckCircle className="h-5 w-5" />
                            Available Time Slots ({availableSlots.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                          {availableSlots.length > 0 ? (
                            <div
                              className="max-h-56 overflow-y-auto scrollbar-visible p-2"
                              style={{ scrollbarWidth: 'thin' }}
                            >
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                {availableSlots.map((slot) => (
                                  <Button
                                    key={slot.time}
                                    onClick={() => handleTimeSelect(slot.time)}
                                    variant={selectedTime === slot.time ? "default" : "outline"}
                                    className={cn(
                                      "h-14 text-base font-semibold transition-all shadow-sm",
                                      "hover:scale-105 hover:shadow-md",
                                      selectedTime === slot.time
                                        ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white border-0 ring-2 ring-blue-300 dark:ring-blue-800"
                                        : "bg-white dark:bg-gray-900 border-2 border-green-300 dark:border-green-800 hover:border-green-500 dark:hover:border-green-600"
                                    )}
                                  >
                                    <Clock className="h-4 w-4 mr-1" />
                                    {slot.time}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                              <p className="text-gray-600 dark:text-gray-400 font-medium">
                                No available slots for this date
                              </p>
                              <p className="text-sm text-muted-foreground mt-2">
                                Please select another date to see available times
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* All Slots Status */}
                      <Card className="bg-gray-50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">
                            Daily Schedule Overview ({allSlots.length} total)
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-6 sm:grid-cols-80 gap-1">
                            {allSlots.map((slot) => (
                              <div
                                key={`status-${slot.time}`}
                                className={cn(
                                  "h-14 flex flex-col items-center justify-center rounded text-xs font-medium border-2",
                                  slot.available
                                    ? "bg-green-50 border-green-200 text-green-700"
                                    : "bg-red-50 border-red-200 text-red-600"
                                )}
                                title={slot.available ? "Available" : "Occupied"}
                              >
                                {slot.available ? (
                                  <CheckCircle className="h-3 w-3 mb-1" />
                                ) : (
                                  <XCircle className="h-3 w-3 mb-1" />
                                )}
                                <span>{slot.time}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              )}

              {/* Reason and Notes */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for Visit</Label>
                  <Textarea
                    id="reason"
                    placeholder="Describe your symptoms or reason for the appointment"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>

                {chatNotes && (
                  <div className="space-y-2">
                    <Label>AI Chat Summary</Label>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">{chatNotes}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setShowConfirmDialog(true)}
                  className="flex-1"
                  disabled={!selectedDentist || !selectedDate || !selectedTime || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    'Book Appointment'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Your Appointment</DialogTitle>
            <DialogDescription>
              Please confirm the details of your appointment booking.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Date:</span>
                <p>{selectedDate?.toLocaleDateString()}</p>
              </div>
              <div>
                <span className="font-medium">Time:</span>
                <p>{selectedTime}</p>
              </div>
              <div className="col-span-2">
                <span className="font-medium">Dentist:</span>
                <p>Dr {dentists.find(d => d.id === selectedDentist)?.profiles.first_name} {dentists.find(d => d.id === selectedDentist)?.profiles.last_name}</p>
              </div>
              <div className="col-span-2">
                <span className="font-medium">Reason:</span>
                <p>{reason || "General consultation"}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              className="flex-1"
              disabled={isLoading}
            >
              Back
            </Button>
            <Button
              onClick={confirmBooking}
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Booking...
                </>
              ) : (
                'Confirm Booking'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};