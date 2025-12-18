import { useState, useEffect } from "react";
import { startOfDay, format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { BusinessSelectionForPatients } from "@/components/BusinessSelectionForPatients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Clock, User, CheckCircle2, ArrowLeft } from "lucide-react";
import { ModernLoadingSpinner } from "@/components/enhanced/ModernLoadingSpinner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Header } from "@/components/homepage/Header";
import { Footer } from "@/components/homepage/Footer";
import { ServiceSelector } from "@/components/booking/ServiceSelector";
import { logger } from '@/lib/logger';
import { clinicTimeToUtc, createAppointmentDateTimeFromStrings } from "@/lib/timezone";

interface Dentist {
  id: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
  specialization?: string;
}

export default function PublicBooking() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { businessId: contextBusinessId, loading: businessLoading } = useBusinessContext();
  const [effectiveBusinessId, setEffectiveBusinessId] = useState<string | null>(null);

  // Form state
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDentist, setSelectedDentist] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  // Patient info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!businessLoading) {
      const stored = sessionStorage.getItem('selected_business_id');
      setEffectiveBusinessId(contextBusinessId || stored);
    }
  }, [contextBusinessId, businessLoading]);

  useEffect(() => {
    setSelectedTime("");
  }, [selectedDentist, selectedDate]);

  // Fetch dentists
  useEffect(() => {
    if (!effectiveBusinessId) return;

    const fetchDentists = async () => {
      const { data: members } = await supabase
        .from('business_members')
        .select('profile_id')
        .eq('business_id', effectiveBusinessId);

      if (!members || members.length === 0) {
        setDentists([]);
        return;
      }

      const { data, error } = await supabase
        .from('dentists')
        .select('id, specialization, profiles(first_name, last_name)')
        .eq('is_active', true)
        .in('profile_id', members.map(m => m.profile_id));

      if (!error && data) {
        setDentists(data.map(d => ({
          ...d,
          profiles: d.profiles as unknown as { first_name: string; last_name: string }
        })));
      }
    };
    fetchDentists();
  }, [effectiveBusinessId]);

  // Fetch available times
  useEffect(() => {
    if (!selectedDentist || !selectedDate) {
      setAvailableTimes([]);
      setSelectedTime("");
      return;
    }

    const fetchTimes = async () => {
      setLoadingTimes(true);
      setSelectedTime("");
      // Use format to preserve Brussels date without UTC conversion
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // 0) Check dentist schedule for this day before generating/fetching slots
      try {
        const dayOfWeek = selectedDate.getDay();
        const { data: availability } = await supabase
          .from('dentist_availability')
          .select('is_available')
          .eq('dentist_id', selectedDentist)
          .eq('business_id', effectiveBusinessId)
          .eq('day_of_week', dayOfWeek)
          .maybeSingle();

        if (!availability || availability.is_available === false) {
          // Clean up any stale slots for this closed day
          try {
            await supabase.rpc('generate_daily_slots', {
              p_dentist_id: selectedDentist,
              p_date: dateStr,
            });
          } catch { }
          setAvailableTimes([]);
          setLoadingTimes(false);
          return;
        }
      } catch (e) {
        console.warn('Availability check failed (continuing):', e);
      }

      try {
        // 1. Regenerate slots for this date to ensure cleanup and freshness
        await supabase.rpc('generate_daily_slots', {
          p_dentist_id: selectedDentist,
          p_date: dateStr,
        });
      } catch (e) {
        console.warn('generate_daily_slots failed (continuing):', e);
      }

      // 2. Sync with Google Calendar to block busy times
      try {
        await supabase.functions.invoke('google-calendar-sync', {
          body: {
            dentistId: selectedDentist,
            startDate: startOfDay(selectedDate).toISOString(),
            endDate: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59).toISOString(),
          }
        });
      } catch (syncError) {
        console.warn('Google Calendar sync failed (might not be connected):', syncError);
      }

      // 3. Fetch available slots
      const { data, error } = await supabase
        .from('appointment_slots')
        .select('slot_time, is_available')
        .eq('dentist_id', selectedDentist)
        .eq('slot_date', dateStr)
        .eq('business_id', effectiveBusinessId)
        .eq('is_available', true)
        .order('slot_time');

      if (!error && data) {
        setAvailableTimes(data.map(s => (s.slot_time.length === 8 ? s.slot_time.slice(0, 5) : s.slot_time)));
      } else {
        console.error('Error fetching slots:', error);
        setAvailableTimes([]);
      }
      setLoadingTimes(false);
    };
    fetchTimes();
  }, [selectedDentist, selectedDate, effectiveBusinessId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName || !lastName || !email || !selectedDentist || !selectedDate || !selectedTime) {
      toast({
        title: t.error,
        description: t.pleaseCompleteAllFields,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Create a temporary profile for the patient
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          role: 'patient'
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Create the appointment with proper timezone handling
      // Use format to preserve Brussels date without UTC conversion
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      // Parse date and time strings as Brussels timezone and convert to UTC
      const appointmentDateTime = createAppointmentDateTimeFromStrings(dateStr, selectedTime);

      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          patient_id: profile.id,
          dentist_id: selectedDentist,
          business_id: effectiveBusinessId,
          appointment_date: appointmentDateTime.toISOString(),
          reason: selectedService?.name || reason || 'General Consultation',
          status: 'pending',
          patient_name: `${firstName} ${lastName}`,
          service_id: selectedService?.id || null,
          duration_minutes: selectedService?.duration_minutes || 60
        });

      if (appointmentError) throw appointmentError;

      setSuccess(true);
      toast({
        title: t.success,
        description: t.appointmentBooked,
      });

      setTimeout(() => navigate('/'), 3000);
    } catch (error) {
      console.error('Booking error:', error);
      toast({
        title: t.error,
        description: t.unableToBookAppointment,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <Header user={null} />
        <div className="min-h-screen flex items-center justify-center mesh-bg p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold">{t.appointmentConfirmed}</h2>
              <p className="text-muted-foreground">{t.appointmentBooked}</p>
              <Button onClick={() => navigate('/')} className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t.back}
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header user={null} />
      <div className="min-h-screen mesh-bg p-4">
        <div className="max-w-3xl mx-auto py-8">
          <TooltipProvider>
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.back}
            </Button>

            <Card>
              <CardHeader>
                <CardTitle className="text-3xl">{t.bookAppointment}</CardTitle>
                <CardDescription>{t.bookAppointmentDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Service Selection */}
                  {effectiveBusinessId && (
                    <ServiceSelector
                      businessId={effectiveBusinessId}
                      selectedServiceId={selectedService?.id || null}
                      onSelectService={setSelectedService}
                    />
                  )}

                  {/* Patient Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <User className="mr-2 h-5 w-5" />
                      {t.personalInformation}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">{t.firstName} *</Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder={t.enterFirstName}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">{t.lastName} *</Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder={t.enterLastName}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">{t.email} *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={t.enterEmail}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">{t.phone}</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Input
                              id="phone"
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder={t.enterPhoneNumber}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t.optional}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>

                  {/* Dentist Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="dentist">{t.selectDentist} *</Label>
                    <Select value={selectedDentist} onValueChange={setSelectedDentist}>
                      <SelectTrigger id="dentist">
                        <SelectValue placeholder={t.chooseDentist} />
                      </SelectTrigger>
                      <SelectContent>
                        {dentists.map((dentist) => (
                          <SelectItem key={dentist.id} value={dentist.id}>
                            Dr. {dentist.profiles.first_name} {dentist.profiles.last_name}
                            {dentist.specialization && ` - ${dentist.specialization}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Selection */}
                  <div className="space-y-2">
                    <Label className="flex items-center">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {t.selectDate} *
                    </Label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < startOfDay(new Date())}
                      className="rounded-md border"
                    />
                  </div>

                  {/* Time Selection */}
                  {selectedDate && selectedDentist && (
                    <div className="space-y-2">
                      <Label className="flex items-center">
                        <Clock className="mr-2 h-4 w-4" />
                        {t.selectTime} *
                      </Label>
                      {loadingTimes ? (
                        <ModernLoadingSpinner variant="minimal" size="sm" message={t.loading} />
                      ) : availableTimes.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {availableTimes.map((time) => (
                            <Button
                              key={time}
                              type="button"
                              variant={selectedTime === time ? "default" : "outline"}
                              onClick={() => setSelectedTime(time)}
                              className="w-full"
                            >
                              {time}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">{t.noSlotsAvailable}</p>
                      )}
                    </div>
                  )}

                  {/* Reason */}
                  <div className="space-y-2">
                    <Label htmlFor="reason">{t.reason}</Label>
                    <Textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={t.describeSymptoms}
                      rows={4}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || !firstName || !lastName || !email || !selectedDentist || !selectedDate || !selectedTime}
                  >
                    {loading ? t.booking : t.confirmBooking}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TooltipProvider>
        </div>
      </div>
      <Footer />
    </>
  );
}
