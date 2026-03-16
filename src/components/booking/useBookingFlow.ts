import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useBusinessDetails } from "@/hooks/useBusinessDetails";
import { format, startOfWeek, addDays, addMinutes, startOfDay } from "date-fns";
import { logger } from "@/lib/logger";
import { createAppointmentDateTimeFromStrings } from "@/lib/timezone";
import { isPublicHoliday } from "@/lib/belgianHolidays";
import { retryAppointmentOperation } from "@/lib/retryStrategies";
import { getFriendlyErrorMessage } from "@/lib/userFriendlyErrors";
import type { Dentist, TimeSlot, Service, BookingStep, AIBookingData, SuccessDetails } from "./types";


type DentistForServiceRpcRow = {
  dentist_id: string;
  dentist_first_name: string;
  dentist_last_name: string;
  specialization: string;
  profile_picture_url: string | null;
  service_duration_minutes: number;
  service_price_cents: number;
  next_available_date: string | null;
  next_available_time: string | null;
};

type SlotRpcRow = string | { slot_time?: string; start_time?: string; slot_start?: string };

const extractSlotTime = (slot: SlotRpcRow): string => {
  if (typeof slot === 'string') return slot.substring(0, 5);
  return (slot.slot_start || slot.slot_time || slot.start_time || '').toString().substring(0, 5);
};

export function useBookingFlow() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { businessId, loading: businessLoading, switchBusiness } = useBusinessContext();
  const { data: businessData } = useBusinessDetails(businessId);

  // Core booking state
  const [bookingStep, setBookingStep] = useState<BookingStep>('symptoms');
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [selectedDentist, setSelectedDentist] = useState<Dentist | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedTime, setSelectedTime] = useState<string>();
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [dentistAvailableDays, setDentistAvailableDays] = useState<number[]>([]);
  const [vacationRanges, setVacationRanges] = useState<{ start_date: string; end_date: string }[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  // Success dialog
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successDetails, setSuccessDetails] = useState<SuccessDetails | undefined>(undefined);

  // AI booking data
  const [aiBookingData, setAiBookingData] = useState<AIBookingData | null>(null);
  const [symptomSummary, setSymptomSummary] = useState<string>("");
  const [isEditingSymptoms, setIsEditingSymptoms] = useState(false);

  useEffect(() => {
    const storedData = sessionStorage.getItem('aiBookingData');
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        setAiBookingData(parsed);
        setSymptomSummary(parsed.symptoms || "");
        sessionStorage.removeItem('aiBookingData');
      } catch (e) {
        logger.error("Error parsing AI booking data:", e);
      }
    }
  }, []);

  const fetchDentists = useCallback(async () => {
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

      const transformedData = (dentistResult.data || []).map((d) => ({
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
  }, [businessId, toast]);

  const fetchServices = useCallback(async () => {
    if (!businessId) return;

    setLoadingServices(true);
    try {
      // Fetch services and dentist-service links in parallel
      const [servicesResult, dentistServicesResult] = await Promise.all([
        supabase
          .from('business_services')
          .select('*')
          .eq('business_id', businessId)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('dentist_services')
          .select('service_id')
          .eq('business_id', businessId)
          .eq('is_active', true),
      ]);

      if (servicesResult.error) throw servicesResult.error;

      // Only show services that have at least one active dentist assigned
      const assignedServiceIds = new Set(
        (dentistServicesResult.data || []).map((ds) => ds.service_id)
      );
      const fetchedServices = (servicesResult.data || []).filter(
        (s) => assignedServiceIds.has(s.id)
      );
      setServices(fetchedServices);

      if (aiBookingData?.recommendedService && fetchedServices.length > 0) {
        const recommendedServiceName = aiBookingData.recommendedService.toLowerCase();
        const matchingService = fetchedServices.find(s =>
          s.name.toLowerCase().includes(recommendedServiceName) ||
          recommendedServiceName.includes(s.name.toLowerCase())
        );
        if (matchingService) {
          setSelectedService(matchingService);
        }
      }
    } catch (error) {
      logger.error("Error fetching services:", error);
    } finally {
      setLoadingServices(false);
    }
  }, [businessId, aiBookingData]);

  const fetchDentistsForService = useCallback(async (serviceId: string) => {
    if (!businessId) return;

    setLoading(true);
    try {
      const { data, error } = await (supabase as unknown as { rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: DentistForServiceRpcRow[] | null; error: unknown }> }).rpc('get_dentists_for_service', {
        p_business_id: businessId,
        p_service_id: serviceId,
      });

      if (error) throw error;

      // Fetch extra dentist details (approval + profile bio) in parallel
      const dentistIds = (data || []).map(d => d.dentist_id);
      const [{ data: dentistDetails }, { data: profileDetails }] = dentistIds.length > 0
        ? await Promise.all([
            supabase
              .from('dentists')
              .select('id, profile_id, require_appointment_approval, clinic_address')
              .in('id', dentistIds),
            supabase
              .from('dentists')
              .select('id, profiles:profile_id(bio, phone, address, email)')
              .in('id', dentistIds),
          ])
        : [{ data: [] }, { data: [] }];

      const approvalMap = new Map(
        (dentistDetails || []).map(d => [d.id, d.require_appointment_approval])
      );
      const clinicAddressMap = new Map(
        (dentistDetails || []).map(d => [d.id, d.clinic_address])
      );
      const profileMap = new Map(
        (profileDetails || []).map(d => {
          const p = Array.isArray(d.profiles) ? d.profiles[0] : d.profiles;
          return [d.id, p] as [string, { bio?: string; phone?: string; address?: string; email?: string } | null];
        })
      );

      const typedDentists: Dentist[] = (data || []).map((dentist) => {
        const profile = profileMap.get(dentist.dentist_id);
        return {
          id: dentist.dentist_id,
          first_name: dentist.dentist_first_name,
          last_name: dentist.dentist_last_name,
          email: profile?.email || '',
          specialization: dentist.specialization || '',
          profile_id: '',
          clinic_address: clinicAddressMap.get(dentist.dentist_id) || undefined,
          require_appointment_approval: approvalMap.get(dentist.dentist_id) ?? false,
          next_available_slot: dentist.next_available_date && dentist.next_available_time
            ? `${dentist.next_available_date}T${dentist.next_available_time}`
            : null,
          profiles: {
            first_name: dentist.dentist_first_name,
            last_name: dentist.dentist_last_name,
            email: profile?.email || '',
            phone: profile?.phone,
            address: profile?.address,
            bio: profile?.bio,
            profile_picture_url: dentist.profile_picture_url,
          },
        };
      });

      setDentists(typedDentists);
    } catch (error) {
      logger.error('Error fetching dentists for service:', error);
      toast({
        title: "Unable to filter dentists",
        description: "Showing all available dentists instead.",
      });
      await fetchDentists();
    } finally {
      setLoading(false);
    }
  }, [businessId, fetchDentists, toast]);

  useEffect(() => {
    if (!businessLoading && businessId) {
      fetchDentists();
      fetchServices();
    }
  }, [businessId, businessLoading, fetchDentists, fetchServices]);

  const fetchAvailableSlots = useCallback(async (date: Date, dentistId: string, serviceId?: string) => {
    if (!businessId) return;

    setLoadingSlots(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const activeServiceId = serviceId || selectedService?.id;

      if (!activeServiceId) {
        setAvailableSlots([]);
        return;
      }

      const { data, error } = await (supabase as unknown as { rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: SlotRpcRow[] | null; error: unknown }> }).rpc('get_available_slots', {
        p_dentist_id: dentistId,
        p_date: dateStr,
        p_business_id: businessId,
        p_service_id: activeServiceId,
      });

      if (error) throw error;

      const now = new Date();
      const isToday = format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      const slots: TimeSlot[] = (data || []).map((slot) => ({
        time: extractSlotTime(slot),
        available: true,
      })).filter((slot: TimeSlot) => {
        if (!slot.time) return false;
        if (isToday) {
          const [h, m] = slot.time.split(':').map(Number);
          const slotDate = new Date(date);
          slotDate.setHours(h, m, 0, 0);
          return slotDate > oneHourFromNow;
        }
        return true;
      });

      setAvailableSlots(slots);
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
  }, [businessId, selectedService, toast]);

  const handleDentistSelect = useCallback(async (dentist: Dentist) => {
    setSelectedDentist(dentist);
    setBookingStep('datetime');

    if (businessId) {
      // Fetch availability and vacation days in parallel
      const [availResult, vacationResult] = await Promise.all([
        supabase
          .from('dentist_availability')
          .select('day_of_week, is_available')
          .eq('dentist_id', dentist.id)
          .eq('business_id', businessId)
          .eq('is_available', true),
        supabase
          .from('dentist_vacation_days')
          .select('start_date, end_date')
          .eq('dentist_id', dentist.id)
          .eq('business_id', businessId)
          .eq('is_approved', true)
          .gte('end_date', format(new Date(), 'yyyy-MM-dd')),
      ]);

      const availableDays = availResult.data && availResult.data.length > 0
        ? availResult.data.map(d => d.day_of_week)
        : [1, 2, 3, 4, 5];
      const vacations = vacationResult.data || [];

      setDentistAvailableDays(availableDays);
      setVacationRanges(vacations);

      // Auto-select the first available date using the freshly fetched data.
      // We can't rely on state (isDateDisabled) here because React state updates
      // are asynchronous and the new values won't be visible yet.
      const isDisabledLocal = (date: Date) => {
        const today = startOfDay(new Date());
        if (date < today) return true;
        if (isPublicHoliday(date)) return true;
        const dayOfWeek = date.getDay();
        if (!availableDays.includes(dayOfWeek)) return true;
        const dateStr = format(date, 'yyyy-MM-dd');
        return vacations.some(v => dateStr >= v.start_date && dateStr <= v.end_date);
      };

      let candidate = startOfDay(new Date());
      for (let i = 0; i < 60; i++) {
        if (!isDisabledLocal(candidate)) {
          setSelectedDate(candidate);
          setCurrentWeekStart(startOfWeek(candidate, { weekStartsOn: 1 }));
          fetchAvailableSlots(candidate, dentist.id, selectedService?.id);
          break;
        }
        candidate = addDays(candidate, 1);
      }
    }
  }, [businessId, selectedService, fetchAvailableSlots]);

  const handleSymptomsNext = useCallback(() => {
    setBookingStep('service');
  }, []);

  const handleServiceSelect = useCallback(async (service: Service | null) => {
    if (!service) {
      toast({
        title: "Service required",
        description: "Please select a service to continue booking.",
        variant: "destructive",
      });
      setBookingStep('service');
      return;
    }

    setSelectedService(service);
    setSelectedDentist(null);
    setSelectedDate(undefined);
    setSelectedTime(undefined);
    setAvailableSlots([]);
    setBookingStep('dentist');

    if (service.id) {
      await fetchDentistsForService(service.id);
    } else {
      await fetchDentists();
    }
  }, [fetchDentistsForService, fetchDentists, toast]);

  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (!date || !selectedDentist) return;
    setSelectedDate(date);
    setSelectedTime(undefined);
    fetchAvailableSlots(date, selectedDentist.id, selectedService?.id);
  }, [selectedDentist, selectedService, fetchAvailableSlots]);

  const handleTimeSelect = useCallback((time: string) => {
    setSelectedTime(time);
    setBookingStep('confirm');
  }, []);

  const navigateWeek = useCallback((direction: 'prev' | 'next') => {
    setCurrentWeekStart(prev => addDays(prev, direction === 'next' ? 7 : -7));
  }, []);

  const isDateDisabled = useCallback((date: Date) => {
    const today = startOfDay(new Date());
    if (date < today) return true;
    if (isPublicHoliday(date)) return true;
    const dayOfWeek = date.getDay();
    if (!dentistAvailableDays.includes(dayOfWeek)) return true;

    // Check vacation ranges
    const dateStr = format(date, 'yyyy-MM-dd');
    return vacationRanges.some(v => dateStr >= v.start_date && dateStr <= v.end_date);
  }, [dentistAvailableDays, vacationRanges]);

  const confirmBooking = useCallback(async () => {
    if (!selectedDate || !selectedTime || !selectedDentist || !businessId || !selectedService) return;

    setIsBooking(true);
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

      const { data: existingProfile, error: profErr } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, phone, email, user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profErr) throw profErr;

      let profile = existingProfile;

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
      const serviceDuration = selectedService.duration_minutes || 30;

      const { data: latestSlots, error: slotCheckError } = await (supabase as unknown as { rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: SlotRpcRow[] | null; error: unknown }> }).rpc('get_available_slots', {
        p_dentist_id: selectedDentist.id,
        p_date: dateStr,
        p_business_id: businessId,
        p_service_id: selectedService.id,
      });

      if (slotCheckError) throw slotCheckError;

      const stillAvailable = (latestSlots || []).some((slot) => extractSlotTime(slot) === selectedTime);

      if (!stillAvailable) {
        throw new Error("This time slot is no longer available. Please select another time.");
      }

      const requestedStart = createAppointmentDateTimeFromStrings(dateStr, selectedTime);
      const requestedEnd = addMinutes(requestedStart, serviceDuration);

      const { data: existingAppts } = await supabase
        .from("appointments_decrypted")
        .select("appointment_date, duration_minutes, status")
        .eq("dentist_id", selectedDentist.id)
        .eq("business_id", businessId)
        .gte("appointment_date", `${dateStr}T00:00:00`)
        .lt("appointment_date", `${dateStr}T23:59:59`)
        .in("status", ["pending", "confirmed", "scheduled"]);

      const hasConflict = existingAppts?.some(appt => {
        const apptStart = new Date(appt.appointment_date);
        const apptDuration = appt.duration_minutes || 30;
        const apptEnd = new Date(apptStart.getTime() + apptDuration * 60000);
        return requestedStart < apptEnd && requestedEnd > apptStart;
      });

      if (hasConflict) {
        throw new Error("This time slot is no longer available. Please select another time.");
      }

      const needsApproval = selectedDentist.require_appointment_approval === true;
      const appointmentStatus = needsApproval ? "pending" : "confirmed";

      const appointmentData = await retryAppointmentOperation(async () => {
        const { data, error } = await supabase
          .from("appointments")
          .insert({
            patient_id: profile.id,
            dentist_id: selectedDentist.id,
            business_id: businessId,
            appointment_date: appointmentDateTime.toISOString(),
            reason: symptomSummary || selectedService.name,
            status: appointmentStatus,
            booking_source: aiBookingData ? "ai" : "manual",
            urgency: "low",
            service_id: selectedService.id,
            duration_minutes: serviceDuration,
            notes: symptomSummary || null
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }, 'create appointment');

      // Note: Double-booking prevention is handled by get_available_slots RPC
      // which checks directly against the appointments table for conflicts.
      // No need for appointment_slots table reservation since the RPC dynamically
      // computes availability based on existing appointments.

      logger.info("Appointment created:", {
        dentistId: selectedDentist.id,
        date: dateStr,
        time: selectedTime,
        appointmentId: appointmentData.id,
        status: appointmentStatus,
        serviceId: selectedService.id,
        serviceDuration,
      });

      // Sync to Google Calendar (fire-and-forget, don't block the success flow)
      supabase.functions.invoke('google-calendar-create-event', {
        body: { appointmentId: appointmentData.id, action: 'create' }
      }).then(({ error: gcalError }) => {
        if (gcalError) {
          logger.warn("Google Calendar sync failed (non-blocking):", gcalError);
        } else {
          logger.info("Appointment synced to Google Calendar");
        }
      });

      // Send WhatsApp confirmation (fire-and-forget)
      if (profile.phone) {
        const confirmDate = format(selectedDate, 'd-M');
        const confirmTime = selectedTime; // already HH:mm
        supabase.functions.invoke('whatsapp-send', {
          body: {
            action: 'send_template',
            phone: profile.phone,
            content_sid: 'HXb42396a8935679888be901c6511d346e',
            content_variables: {
              "1": profile.first_name || 'Patient',
              "2": businessData?.name || '',
              "3": confirmDate,
              "4": confirmTime,
            },
            business_id: businessId,
            patient_id: profile.id,
            template_name: 'appointment_confirmation',
          }
        }).then(({ error: waErr }) => {
          if (waErr) logger.warn("WhatsApp confirmation failed (non-blocking):", waErr);
          else logger.info("WhatsApp confirmation sent");
        });
      }

      setSuccessDetails({
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        dentist: `Dr. ${selectedDentist.first_name} ${selectedDentist.last_name}`,
        reason: selectedService.name,
        location: businessData?.address || undefined,
        pendingApproval: needsApproval
      });
      setShowSuccessDialog(true);
    } catch (error) {
      logger.error("Error booking appointment:", error);

      const friendlyError = getFriendlyErrorMessage(
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'booking your appointment', entity: 'appointment' }
      );

      toast({
        title: friendlyError.title,
        description: friendlyError.message,
        variant: "destructive",
      });

      if (friendlyError.suggestion) {
        setTimeout(() => {
          toast({
            description: friendlyError.suggestion,
            duration: 5000,
          });
        }, 500);
      }

      if (selectedDate && selectedDentist && friendlyError.canRetry) {
        fetchAvailableSlots(selectedDate, selectedDentist.id, selectedService?.id);
      }
      setBookingStep('datetime');
    } finally {
      setIsBooking(false);
    }
  }, [selectedDate, selectedTime, selectedDentist, businessId, selectedService, aiBookingData, symptomSummary, businessData, toast, navigate, fetchAvailableSlots]);

  const handleSuccessDialogChange = useCallback((open: boolean) => {
    setShowSuccessDialog(open);
    if (!open && selectedDate && selectedDentist) {
      fetchAvailableSlots(selectedDate, selectedDentist.id, selectedService?.id);
      setSelectedTime(undefined);
      setBookingStep('datetime');
    }
  }, [selectedDate, selectedDentist, selectedService, fetchAvailableSlots]);

  return {
    bookingStep,
    setBookingStep,
    dentists,
    selectedDentist,
    selectedDate,
    currentWeekStart,
    selectedTime,
    availableSlots,
    services,
    selectedService,
    setSelectedService,
    dentistAvailableDays,
    loading,
    loadingSlots,
    loadingServices,
    isBooking,
    showSuccessDialog,
    successDetails,
    aiBookingData,
    symptomSummary,
    setSymptomSummary,
    isEditingSymptoms,
    setIsEditingSymptoms,
    businessId,
    businessAddress: businessData?.address || null,
    businessLoading,
    switchBusiness,
    handleDentistSelect,
    handleSymptomsNext,
    handleServiceSelect,
    handleDateSelect,
    handleTimeSelect,
    navigateWeek,
    isDateDisabled,
    confirmBooking,
    handleSuccessDialogChange,
    fetchAvailableSlots,
    navigate,
  };
}
