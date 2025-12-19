import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { BusinessSelectionForPatients } from "@/components/BusinessSelectionForPatients";
import { Button } from "@/components/ui/button";
import { AppointmentSuccessDialog } from "@/components/AppointmentSuccessDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Star,
  Clock,
  CalendarDays,
  CheckCircle,
  Users,
  Package,
  Timer
} from "lucide-react";
import { format, startOfDay, startOfWeek, addDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
const ClinicMap = lazy(() => import("@/components/Map"));
import { logger } from '@/lib/logger';
import { AnimatedBackground, EmptyState } from "@/components/ui/polished-components";
import { createAppointmentDateTimeFromStrings } from "@/lib/timezone";

interface Dentist {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  specialization: string;
  license_number?: string;
  profile_id: string;
  clinic_address?: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    address?: string;
    bio?: string;
    profile_picture_url?: string | null;
  } | null;
  require_appointment_approval?: boolean;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  duration_minutes: number | null;
  category: string | null;
}

export default function BookAppointment() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { businessId, loading: businessLoading, switchBusiness } = useBusinessContext();
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [selectedDentist, setSelectedDentist] = useState<Dentist | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedTime, setSelectedTime] = useState<string>();
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingStep, setBookingStep] = useState<'dentist' | 'service' | 'datetime' | 'confirm'>('dentist');
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [loadingServices, setLoadingServices] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{ date: string; time: string; dentist?: string; reason?: string; pendingApproval?: boolean } | undefined>(undefined);
  const [dentistAvailableDays, setDentistAvailableDays] = useState<number[]>([]);
  // Vacation days are no longer shown to patients - they just can't book those dates

  useEffect(() => {
    if (!businessLoading && businessId) {
      fetchDentists();
    }
  }, [businessId, businessLoading]);

  const fetchDentists = async () => {
    if (!businessId) return;

    setLoading(true);
    try {
      const { data: memberData, error: memberError } = await supabase
        .from("business_members")
        .select(`
          profile_id,
          profiles:profile_id (
            id,
            first_name,
            last_name,
            email,
            phone,
            address
          )
        `)
        .eq("business_id", businessId);

      if (memberError) throw memberError;

      const profileIds = memberData?.map(m => m.profile_id) || [];

      if (profileIds.length === 0) {
        toast({
          title: "No Dentists Available",
          description: "This clinic doesn't have any dentists registered yet.",
          variant: "destructive",
        });
        setDentists([]);
        setLoading(false);
        return;
      }

      const dentistResult = await supabase
        .from("dentists")
        .select(`
          id,
          first_name,
          last_name,
          email,
          specialization,
          license_number,
          profile_id,
          require_appointment_approval,
          profiles:profile_id (
            first_name,
            last_name,
            email,
            phone,
            address,
            bio,
            profile_picture_url
          )
        `)
        .eq("is_active", true)
        .in("profile_id", profileIds);

      if (dentistResult.error) throw dentistResult.error;

      const transformedData = (dentistResult.data || []).map((d: any) => ({
        ...d,
        profiles: Array.isArray(d.profiles) ? d.profiles[0] : (d.profiles || null),
      }));

      setDentists(transformedData);
    } catch (error) {
      logger.error("Error fetching dentists:", error);
      toast({
        title: "Error",
        description: "Failed to load dentists",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    if (!businessId) return;
    
    setLoadingServices(true);
    try {
      const { data, error } = await supabase
        .from('business_services')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      logger.error("Error fetching services:", error);
    } finally {
      setLoadingServices(false);
    }
  };

  const fetchAvailableSlots = async (date: Date, dentistId: string) => {
    if (!businessId) return;

    setLoadingSlots(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');

      // Ensure slots exist for this day
      await supabase.rpc('generate_daily_slots', {
        p_dentist_id: dentistId,
        p_date: dateStr,
        p_business_id: businessId
      });

      // Get ALL slots
      const { data, error } = await supabase
        .from('appointment_slots')
        .select('slot_time, is_available')
        .eq('dentist_id', dentistId)
        .eq('slot_date', dateStr)
        .eq('business_id', businessId)
        .order('slot_time');

      if (error) {
        throw error;
      }

      // Get existing appointments for this day (pending, confirmed, scheduled)
      const { data: existingAppts } = await supabase
        .from("appointments")
        .select("appointment_date, duration_minutes")
        .eq("dentist_id", dentistId)
        .eq("business_id", businessId)
        .gte("appointment_date", `${dateStr}T00:00:00`)
        .lt("appointment_date", `${dateStr}T23:59:59`)
        .in("status", ["pending", "confirmed", "scheduled"]);

      // Build set of blocked time slots from existing appointments
      const blockedSlots = new Set<string>();
      existingAppts?.forEach(appt => {
        const apptDate = new Date(appt.appointment_date);
        const apptDuration = appt.duration_minutes || 30;
        const slotsBlocked = Math.ceil(apptDuration / 30);
        
        for (let i = 0; i < slotsBlocked; i++) {
          const slotTime = new Date(apptDate.getTime() + i * 30 * 60000);
          const timeStr = slotTime.toTimeString().substring(0, 5);
          blockedSlots.add(timeStr);
        }
      });

      if (!data || data.length === 0) {
        toast({
          title: "No Available Slots",
          description: "No available slots found for this dentist on the selected date",
          variant: "destructive",
        });
        setAvailableSlots([]);
        setLoadingSlots(false);
        return;
      }

      // Map slots and mark as unavailable if blocked by existing appointments
      const allSlots = data.map((slot: { slot_time: string; is_available: boolean }) => {
        const timeStr = slot.slot_time.substring(0, 5);
        return {
          time: timeStr,
          available: slot.is_available && !blockedSlots.has(timeStr),
        };
      });

      // Filter available slots based on service duration
      const duration = selectedService?.duration_minutes || 30;
      const slotsNeeded = Math.ceil(duration / 30);

      // For each slot, check if enough consecutive slots are available
      const filteredSlots = allSlots.filter((slot: TimeSlot, index: number) => {
        if (!slot.available) return false;
        
        if (slotsNeeded <= 1) return true;
        
        for (let i = 1; i < slotsNeeded; i++) {
          const nextSlot = allSlots[index + i];
          if (!nextSlot || !nextSlot.available) return false;
        }
        return true;
      });

      setAvailableSlots(filteredSlots);
    } catch (error) {
      logger.error("Error fetching slots:", error);
      toast({
        title: "Error",
        description: "Failed to load available times",
        variant: "destructive",
      });
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDentistSelect = async (dentist: Dentist) => {
    setSelectedDentist(dentist);
    setSelectedService(null);
    
    // Fetch services first
    await fetchServices();
    setBookingStep('service');
    
    if (businessId) {
      // Fetch dentist's available days
      const { data: availabilityData } = await supabase
        .from('dentist_availability')
        .select('day_of_week, is_available')
        .eq('dentist_id', dentist.id)
        .eq('business_id', businessId)
        .eq('is_available', true);
      
      if (availabilityData && availabilityData.length > 0) {
        setDentistAvailableDays(availabilityData.map(d => d.day_of_week));
      } else {
        setDentistAvailableDays([1, 2, 3, 4, 5]);
      }
    }
  };

  const handleServiceSelect = (service: Service | null) => {
    setSelectedService(service);
    setBookingStep('datetime');
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date || !selectedDentist) return;
    setSelectedDate(date);
    setSelectedTime(undefined);
    fetchAvailableSlots(date, selectedDentist.id);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setBookingStep('confirm');
  };

  const confirmBooking = async () => {
    if (!selectedDate || !selectedTime || !selectedDentist || !businessId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to book an appointment",
          variant: "destructive",
        });
        navigate('/login');
        return;
      }

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
          .select("id, first_name, last_name, phone, email, user_id")
          .single();
        if (insertErr) throw insertErr;
        profile = inserted;
      }

      const email = profile.email || user.email;
      const missing: string[] = [];
      if (!profile.first_name) missing.push('first name');
      if (!profile.last_name) missing.push('last name');
      if (!email) missing.push('email');

      if (missing.length > 0) {
        toast({
          title: "Profile Incomplete",
          description: "Please complete your profile first",
          variant: "destructive",
        });
        return;
      }

      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const appointmentDateTime = createAppointmentDateTimeFromStrings(dateStr, selectedTime);

      // Check if slot is already taken by checking existing appointments
      const serviceDuration = selectedService?.duration_minutes || 30;
      const slotsNeeded = Math.ceil(serviceDuration / 30);
      
      // Get all appointments for this dentist on this date to check for conflicts
      const { data: existingAppts } = await supabase
        .from("appointments")
        .select("appointment_date, duration_minutes, status")
        .eq("dentist_id", selectedDentist.id)
        .eq("business_id", businessId)
        .gte("appointment_date", `${dateStr}T00:00:00`)
        .lt("appointment_date", `${dateStr}T23:59:59`)
        .in("status", ["pending", "confirmed", "scheduled"]);

      // Check if our desired time slot conflicts with any existing appointment
      const requestedStart = new Date(`${dateStr}T${selectedTime}:00`);
      const requestedEnd = new Date(requestedStart.getTime() + serviceDuration * 60000);

      const hasConflict = existingAppts?.some(appt => {
        const apptStart = new Date(appt.appointment_date);
        const apptDuration = appt.duration_minutes || 30;
        const apptEnd = new Date(apptStart.getTime() + apptDuration * 60000);
        
        // Check if time ranges overlap
        return requestedStart < apptEnd && requestedEnd > apptStart;
      });

      if (hasConflict) {
        throw new Error("This time slot is no longer available. Please select another time.");
      }

      // Check if dentist requires approval
      const needsApproval = selectedDentist.require_appointment_approval === true;
      const appointmentStatus = needsApproval ? "pending" : "confirmed";

      const { data: appointmentData, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          patient_id: profile.id,
          dentist_id: selectedDentist.id,
          business_id: businessId,
          appointment_date: appointmentDateTime.toISOString(),
          reason: selectedService ? selectedService.name : "General consultation",
          status: appointmentStatus,
          booking_source: "manual",
          urgency: "low",
          service_id: selectedService?.id || null,
          duration_minutes: selectedService?.duration_minutes || 30
        })
        .select()
        .single();

      if (appointmentError) {
        throw appointmentError;
      }

      logger.info("Appointment created:", {
        dentistId: selectedDentist.id,
        date: dateStr,
        time: selectedTime,
        appointmentId: appointmentData.id,
        status: appointmentStatus
      });

      setSuccessDetails({
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        dentist: `Dr. ${selectedDentist.first_name} ${selectedDentist.last_name}`,
        reason: selectedService ? selectedService.name : "General consultation",
        pendingApproval: needsApproval
      });
      setShowSuccessDialog(true);
    } catch (error) {
      logger.error("Error booking appointment:", error);
      const errorMessage = error instanceof Error ? error.message : "Please try again";

      if (errorMessage.includes("no longer available") || errorMessage.includes("Slot not available")) {
        toast({
          title: "Slot No Longer Available",
          description: "Sorry, this slot is not available. It may have just been taken.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Booking Failed",
          description: "Please try again or contact support.",
          variant: "destructive",
        });
      }
      // Refresh slots on failure to prevent stale data
      if (selectedDate && selectedDentist) {
        fetchAvailableSlots(selectedDate, selectedDentist.id);
      }
      setBookingStep('datetime');
    }
  };

  const isDateDisabled = (date: Date) => {
    const today = startOfDay(new Date());
    if (date < today) return true;
    
    // Check if dentist works on this day of week
    const dayOfWeek = date.getDay();
    return !dentistAvailableDays.includes(dayOfWeek);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart(prev => addDays(prev, direction === 'next' ? 7 : -7));
  };

  const getDentistInitials = (dentist: Dentist) => {
    const fn = dentist.first_name || dentist.profiles?.first_name || "";
    const ln = dentist.last_name || dentist.profiles?.last_name || "";
    return `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase();
  };

  if (businessLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 p-4">
        <div className="max-w-6xl mx-auto space-y-6 py-8">
          <Skeleton className="h-12 w-48" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!businessId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 p-4">
        <div className="max-w-4xl mx-auto py-8">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">Select a Clinic</h2>
              <p className="text-muted-foreground mb-6">Please select a clinic to view available dentists and book an appointment.</p>
              <BusinessSelectionForPatients
                onSelectBusiness={(id) => switchBusiness(id)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <AppointmentSuccessDialog
        open={showSuccessDialog}
        onOpenChange={(open) => {
          setShowSuccessDialog(open);
          if (!open && selectedDate && selectedDentist) {
            // Refresh slots when dialog is closed to show updated availability
            fetchAvailableSlots(selectedDate, selectedDentist.id);
            setSelectedTime(undefined);
            setBookingStep('datetime');
          }
        }}
        appointmentDetails={successDetails}
      />

      {/* Step 1: Select Dentist */}
      {bookingStep === 'dentist' && (
        <div className="max-w-6xl mx-auto p-4 py-8 space-y-6">
          {/* Header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 rounded-2xl p-6 mb-6">
            <AnimatedBackground />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(-1)}
                  className="gap-2 hover:bg-white/50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </div>

              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                    <CalendarDays className="h-6 w-6 text-white" />
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Book an Appointment
                  </h1>
                </div>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Choose your preferred dentist and schedule a convenient time
                </p>
              </div>
            </div>
          </div>

          {/* Dentist Grid */}
          {dentists.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No Dentists Available"
              description="This clinic doesn't have any dentists available for booking at the moment."
              action={{
                label: "Go Back",
                onClick: () => navigate(-1)
              }}
            />
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {dentists.map((dentist) => {
                const displayName = `${dentist.first_name || dentist.profiles?.first_name} ${dentist.last_name || dentist.profiles?.last_name}`;
                const bio = dentist.profiles?.bio;
                const email = dentist.email || dentist.profiles?.email;
                const phone = dentist.profiles?.phone;
                const address = dentist.clinic_address || dentist.profiles?.address;

                return (
                  <Card
                    key={dentist.id}
                    className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-500/40"
                    onClick={() => handleDentistSelect(dentist)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-14 w-14 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
                          <AvatarImage src={dentist.profiles?.profile_picture_url || undefined} className="object-cover" />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 text-primary text-base font-bold">
                            {getDentistInitials(dentist)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate group-hover:text-blue-600 transition-colors">
                            Dr. {displayName}
                          </h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            {dentist.specialization || 'General Dentistry'}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            {[1, 2, 3, 4].map((i) => (
                              <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            ))}
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 opacity-50" />
                            <span className="text-xs text-muted-foreground ml-1">4.87</span>
                          </div>
                        </div>
                      </div>

                      {/* Profile Details */}
                      {bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2 border-t pt-3">
                          {bio}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {email && (
                          <span className="flex items-center gap-1">
                            📧 {email}
                          </span>
                        )}
                        {phone && (
                          <span className="flex items-center gap-1">
                            📞 {phone}
                          </span>
                        )}
                      </div>

                      <Button
                        size="sm"
                        className="w-full mt-2 group-hover:bg-blue-600"
                      >
                        Select Dr. {dentist.first_name || dentist.profiles?.first_name}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select Service */}
      {bookingStep === 'service' && selectedDentist && (
        <div className="max-w-4xl mx-auto p-4 py-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBookingStep('dentist')}
            className="gap-2 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dentists
          </Button>

          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Selected Dentist */}
              <div className="flex items-center gap-4 pb-4 border-b">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedDentist.profiles?.profile_picture_url || undefined} className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {getDentistInitials(selectedDentist)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold">
                    Dr. {selectedDentist.first_name} {selectedDentist.last_name}
                  </h2>
                  <p className="text-muted-foreground capitalize">
                    {selectedDentist.specialization || 'General Dentistry'}
                  </p>
                </div>
              </div>

              {/* Service Selection */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-semibold text-lg">Select a Service</h3>
                </div>

                {loadingServices ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-32 rounded-lg" />
                    ))}
                  </div>
                ) : services.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground mb-4">No services configured yet.</p>
                    <Button onClick={() => handleServiceSelect(null)}>
                      Continue without service
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {services.map((service) => {
                      const isSelected = selectedService?.id === service.id;
                      return (
                        <Card
                          key={service.id}
                          className={`cursor-pointer transition-all hover:shadow-lg border-2 ${
                            isSelected
                              ? "ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20"
                              : "border-border hover:border-indigo-300 dark:hover:border-indigo-700"
                          }`}
                          onClick={() => handleServiceSelect(service)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold">{service.name}</h4>
                                  {isSelected && <CheckCircle className="h-4 w-4 text-indigo-600" />}
                                </div>
                                {service.description && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {service.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-3 pt-3 border-t">
                              <div className="text-lg font-bold text-indigo-600">
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: service.currency,
                                }).format(service.price_cents / 100)}
                              </div>
                              <span className="flex items-center gap-1 text-sm text-muted-foreground bg-secondary px-2 py-1 rounded">
                                <Timer className="h-3 w-3" />
                                {service.duration_minutes || 30} min
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Select Date & Time */}
      {bookingStep === 'datetime' && selectedDentist && (
        <div className="max-w-4xl mx-auto p-4 py-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBookingStep('service')}
            className="gap-2 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to services
          </Button>

          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Selected Dentist */}
              <div className="flex items-center gap-4 pb-4 border-b">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedDentist.profiles?.profile_picture_url || undefined} className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {getDentistInitials(selectedDentist)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold">
                    Dr. {selectedDentist.first_name} {selectedDentist.last_name}
                  </h2>
                  <p className="text-muted-foreground capitalize">
                    {selectedDentist.specialization || 'General Dentistry'}
                  </p>
                </div>
              </div>

              {/* Week Navigation */}
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => navigateWeek('prev')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-semibold">
                  {selectedDate ? format(selectedDate, "EEE, dd MMMM") : "Select a date"}
                </h3>
                <Button variant="ghost" size="icon" onClick={() => navigateWeek('next')}>
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                </Button>
              </div>

              {/* Week Days */}
              <div className="grid grid-cols-7 gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                  const date = addDays(currentWeekStart, index);
                  const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
                  const isDisabled = isDateDisabled(date);

                  return (
                    <button
                      key={day}
                      onClick={() => !isDisabled && handleDateSelect(date)}
                      disabled={isDisabled}
                      className={`flex flex-col items-center p-3 rounded-full transition-all ${isSelected
                        ? 'bg-primary text-primary-foreground'
                        : isDisabled
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:bg-muted'
                        }`}
                    >
                      <span className="text-xs mb-1">{day}</span>
                      <span className="text-lg font-medium">{date.getDate()}</span>
                    </button>
                  );
                })}
              </div>

              {/* Time Slots */}
              {selectedDate && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-muted-foreground">
                      Available Time Slots ({availableSlots.filter(slot => slot.available).length})
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {loadingSlots ? (
                      <p className="col-span-full text-center text-muted-foreground py-8">Loading time slots...</p>
                    ) : availableSlots.length === 0 ? (
                      <p className="col-span-full text-center text-muted-foreground py-8">No available slots for this date</p>
                    ) : (
                      availableSlots
                        .filter(slot => slot.available)
                        .map((slot) => (
                          <button
                            key={slot.time}
                            onClick={() => handleTimeSelect(slot.time)}
                            className={`p-3 rounded-lg border-2 text-center font-medium transition-all ${selectedTime === slot.time
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-muted hover:border-primary/50 hover:bg-muted/50'
                              }`}
                          >
                            <Clock className="h-4 w-4 mx-auto mb-1" />
                            {slot.time}
                          </button>
                        ))
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Confirm Booking */}
      {bookingStep === 'confirm' && selectedDentist && selectedDate && selectedTime && (
        <div className="max-w-2xl mx-auto p-4 py-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setBookingStep('datetime');
              if (selectedDate && selectedDentist) {
                fetchAvailableSlots(selectedDate, selectedDentist.id);
              }
            }}
            className="gap-2 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to time selection
          </Button>

          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Confirm Your Appointment</h2>
                <p className="text-muted-foreground">Review your booking details</p>
              </div>

              <div className="space-y-4 py-4 border-y">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dentist</span>
                  <span className="font-medium">Dr. {selectedDentist.first_name} {selectedDentist.last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">{selectedTime}</span>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full"
                onClick={confirmBooking}
              >
                Confirm Booking
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
