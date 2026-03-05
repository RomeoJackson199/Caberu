import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, addMinutes, isBefore, isAfter, startOfDay, endOfDay } from "date-fns";
import { createAppointmentDateTimeFromStrings } from "@/lib/timezone";
import { Calendar, Clock, User, Search, Loader2, Stethoscope, CheckCircle2, Euro } from "lucide-react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createAppointmentWithNotification } from "@/hooks/useAppointments";
import { cn } from "@/lib/utils";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

interface DentistService {
  id: string;
  service_id: string;
  custom_duration_minutes: number | null;
  custom_price_cents: number | null;
  business_services: {
    id: string;
    name: string;
    duration_minutes: number | null;
    price_cents: number;
    category: string | null;
    description: string | null;
  };
}

interface QuickAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dentistId: string;
  selectedDate: Date;
  selectedTime: string;
  patient?: Patient;
  showPatientSelector?: boolean;
}

export function QuickAppointmentDialog({
  open,
  onOpenChange,
  dentistId,
  selectedDate,
  selectedTime,
  patient,
  showPatientSelector = false
}: QuickAppointmentDialogProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(patient || null);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("60");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [appointmentDate, setAppointmentDate] = useState(format(selectedDate, "yyyy-MM-dd"));
  const [appointmentTime, setAppointmentTime] = useState(selectedTime);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch dentist's business ID from multiple potential sources
  const { data: dentistBusiness } = useQuery({
    queryKey: ["dentist-business", dentistId],
    queryFn: async () => {
      const { data: dentist, error: dentistError } = await supabase
        .from("dentists")
        .select("profile_id")
        .eq("id", dentistId)
        .single();

      if (dentistError || !dentist) return null;

      const { data: businessMember } = await supabase
        .from("business_members")
        .select("business_id")
        .eq("profile_id", dentist.profile_id)
        .limit(1)
        .maybeSingle();

      if (businessMember?.business_id) return businessMember.business_id;

      const { data: ownedBusiness } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_profile_id", dentist.profile_id)
        .limit(1)
        .maybeSingle();

      if (ownedBusiness?.id) return ownedBusiness.id;

      const { data: providerMap } = await supabase
        .from("provider_business_map")
        .select("business_id")
        .eq("provider_id", dentist.profile_id)
        .limit(1)
        .maybeSingle();

      if (providerMap?.business_id) return providerMap.business_id;

      const { data: existingAppt } = await supabase
        .from("appointments_decrypted")
        .select("business_id")
        .eq("dentist_id", dentistId)
        .not("business_id", "is", null)
        .limit(1)
        .maybeSingle();

      if (existingAppt?.business_id) return existingAppt.business_id;

      const { data: anyBusiness } = await supabase
        .from("businesses")
        .select("id")
        .limit(1)
        .maybeSingle();

      return anyBusiness?.id ?? null;
    },
    enabled: open,
  });

  // Fetch dentist's active services
  const { data: dentistServices = [] } = useQuery({
    queryKey: ["dentist-services", dentistId, dentistBusiness],
    queryFn: async () => {
      if (!dentistBusiness) return [];
      const { data, error } = await supabase
        .from("dentist_services")
        .select("id, service_id, custom_duration_minutes, custom_price_cents, business_services(id, name, duration_minutes, price_cents, category, description)")
        .eq("dentist_id", dentistId)
        .eq("business_id", dentistBusiness)
        .eq("is_active", true);
      if (error) throw error;
      return (data || []) as unknown as DentistService[];
    },
    enabled: open && !!dentistBusiness,
  });

  // Fetch all patients for this dentist
  const { data: patients = [], isLoading: patientsLoading } = useQuery({
    queryKey: ["dentist-patients", dentistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("patient_id")
        .eq("dentist_id", dentistId);
      if (error) throw error;

      const patientIds = [...new Set((data || []).map(a => a.patient_id).filter(Boolean))];
      const { data: profiles } = patientIds.length > 0
        ? await supabase.from('profiles').select('id, first_name, last_name, email, phone').in('id', patientIds)
        : { data: [] };

      const uniquePatients = new Map<string, Patient>();
      (profiles || []).forEach((profile: Patient) => {
        if (profile && !uniquePatients.has(profile.id)) {
          uniquePatients.set(profile.id, profile);
        }
      });

      return Array.from(uniquePatients.values());
    },
    enabled: open && (showPatientSelector || !patient),
  });

  // Fetch existing appointments for the selected date
  const { data: existingAppointments = [] } = useQuery({
    queryKey: ["appointments-for-date", dentistId, appointmentDate],
    queryFn: async () => {
      const dateStart = startOfDay(new Date(appointmentDate));
      const dateEnd = endOfDay(new Date(appointmentDate));
      const { data, error } = await supabase
        .from("appointments_decrypted")
        .select("appointment_date, duration_minutes, status")
        .eq("dentist_id", dentistId)
        .gte("appointment_date", dateStart.toISOString())
        .lte("appointment_date", dateEnd.toISOString())
        .neq("status", "cancelled");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Generate available time slots
  const availableTimeSlots = useMemo(() => {
    const slots: string[] = [];
    const durationMinutes = parseInt(duration);

    for (let h = 8; h <= 18; h++) {
      for (let m = 0; m < 60; m += 30) {
        if (h === 18 && m > 0) continue;
        const time = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        const slotStart = new Date(`${appointmentDate}T${time}:00`);
        const slotEnd = addMinutes(slotStart, durationMinutes);

        const isAvailable = !existingAppointments.some((apt: { appointment_date: string; duration_minutes: number | null }) => {
          const aptStart = parseISO(apt.appointment_date);
          const aptEnd = addMinutes(aptStart, apt.duration_minutes || 60);
          return (
            (isAfter(slotStart, aptStart) && isBefore(slotStart, aptEnd)) ||
            (isAfter(slotEnd, aptStart) && isBefore(slotEnd, aptEnd)) ||
            (isBefore(slotStart, aptStart) && isAfter(slotEnd, aptEnd)) ||
            slotStart.getTime() === aptStart.getTime()
          );
        });

        if (isAvailable) slots.push(time);
      }
    }
    return slots;
  }, [appointmentDate, existingAppointments, duration]);

  useEffect(() => {
    if (patient) setSelectedPatient(patient);
  }, [patient]);

  useEffect(() => {
    setAppointmentDate(format(selectedDate, "yyyy-MM-dd"));
    setAppointmentTime(selectedTime);
  }, [selectedDate, selectedTime]);

  useEffect(() => {
    if (!open) {
      if (!patient) setSelectedPatient(null);
      setReason("");
      setDuration("60");
      setSelectedServiceId("");
      setPatientSearch("");
    }
  }, [open, patient]);

  const filteredPatients = useMemo(() => {
    if (!patientSearch) return patients;
    const search = patientSearch.toLowerCase();
    return patients.filter(
      (p) =>
        p.first_name.toLowerCase().includes(search) ||
        p.last_name.toLowerCase().includes(search) ||
        p.email.toLowerCase().includes(search) ||
        (p.phone && p.phone.toLowerCase().includes(search))
    );
  }, [patients, patientSearch]);

  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    if (serviceId === "") return;
    const dentistService = dentistServices.find(ds => ds.service_id === serviceId);
    if (!dentistService) return;
    const service = dentistService.business_services;
    const effectiveDuration = dentistService.custom_duration_minutes ?? service.duration_minutes;
    if (effectiveDuration) setDuration(String(effectiveDuration));
    if (!reason) setReason(service.name);
  };

  // Selected service info for summary
  const selectedService = dentistServices.find(ds => ds.service_id === selectedServiceId);
  const effectivePrice = selectedService
    ? (selectedService.custom_price_cents ?? selectedService.business_services.price_cents)
    : null;

  // Optimistic mutation
  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedPatient || !dentistBusiness) throw new Error("Missing required fields");
      const appointmentDateTime = createAppointmentDateTimeFromStrings(appointmentDate, appointmentTime);
      return createAppointmentWithNotification({
        dentist_id: dentistId,
        patient_id: selectedPatient.id,
        business_id: dentistBusiness,
        appointment_date: appointmentDateTime.toISOString(),
        duration_minutes: parseInt(duration),
        status: "confirmed",
        urgency: "medium",
        reason: reason || "General consultation",
        ...(selectedServiceId ? { service_id: selectedServiceId } : {}),
      });
    },
    onMutate: async () => {
      if (!selectedPatient || !dentistBusiness) return;

      // Cancel any in-flight queries to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["appointments-calendar"] });
      await queryClient.cancelQueries({ queryKey: ["appointments-day"] });
      await queryClient.cancelQueries({ queryKey: ["all-appointments"] });

      const appointmentDateTime = createAppointmentDateTimeFromStrings(appointmentDate, appointmentTime);
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticAppointment = {
        id: optimisticId,
        dentist_id: dentistId,
        patient_id: selectedPatient.id,
        business_id: dentistBusiness,
        appointment_date: appointmentDateTime.toISOString(),
        duration_minutes: parseInt(duration),
        status: "confirmed",
        urgency: "medium",
        reason: reason || "General consultation",
        service_id: selectedServiceId || null,
        patient: {
          id: selectedPatient.id,
          first_name: selectedPatient.first_name,
          last_name: selectedPatient.last_name,
          email: selectedPatient.email,
        },
        _isOptimistic: true,
      };

      // Snapshot all relevant caches for rollback
      const snapshots: Record<string, unknown> = {};

      queryClient.getQueriesData({ queryKey: ["appointments-calendar"] }).forEach(([key, data]) => {
        snapshots[JSON.stringify(key)] = data;
        if (Array.isArray(data)) {
          queryClient.setQueryData(key, [...data, optimisticAppointment]);
        }
      });

      queryClient.getQueriesData({ queryKey: ["appointments-day"] }).forEach(([key, data]) => {
        snapshots[JSON.stringify(key)] = data;
        if (Array.isArray(data)) {
          queryClient.setQueryData(key, [...data, optimisticAppointment]);
        }
      });

      // Immediately close the dialog so the user sees the optimistic result
      onOpenChange(false);

      return { snapshots };
    },
    onSuccess: () => {
      toast({
        title: "Appointment Booked",
        description: `${selectedPatient?.first_name} ${selectedPatient?.last_name} — ${format(new Date(`${appointmentDate}T${appointmentTime}`), "EEE, MMM d 'at' h:mm a")}. Confirmation email sent.`,
      });
      queryClient.invalidateQueries({ queryKey: ["appointments-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["appointments-day"] });
      queryClient.invalidateQueries({ queryKey: ["all-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments-for-date"] });
    },
    onError: (error: Error, _vars, context) => {
      // Rollback optimistic updates
      if (context?.snapshots) {
        Object.entries(context.snapshots).forEach(([key, data]) => {
          queryClient.setQueryData(JSON.parse(key), data);
        });
      }
      // Re-open dialog so user can retry
      onOpenChange(true);
      toast({
        title: "Failed to Book",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateAppointment = () => {
    if (!selectedPatient) {
      toast({ title: "Select a patient", description: "Please choose a patient before booking.", variant: "destructive" });
      return;
    }
    if (!appointmentTime) {
      toast({ title: "Select a time", description: "Please pick a time slot.", variant: "destructive" });
      return;
    }
    if (!dentistBusiness) {
      toast({ title: "Error", description: "Could not determine business. Please try again.", variant: "destructive" });
      return;
    }
    mutation.mutate();
  };

  const isLoading = mutation.isPending;
  const canBook = !!selectedPatient && !!appointmentTime && !!dentistBusiness && !isLoading;

  // Format time for display
  const formatTimeDisplay = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden gap-0">
        {/* Colored Header */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-6 pt-6 pb-5 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-white text-lg">
              <div className="bg-white/20 rounded-lg p-1.5">
                <Calendar className="h-4 w-4" />
              </div>
              New Appointment
            </DialogTitle>
            <DialogDescription className="text-blue-100 mt-1">
              {format(new Date(appointmentDate + "T12:00"), "EEEE, MMMM d, yyyy")}
              {appointmentTime && (
                <span className="ml-2 font-medium text-white">· {formatTimeDisplay(appointmentTime)}</span>
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
          {/* Patient Selector */}
          {(showPatientSelector || !patient) ? (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Patient <span className="text-red-500">*</span>
              </Label>
              <Popover open={patientSearchOpen} onOpenChange={setPatientSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={patientSearchOpen}
                    className={cn(
                      "w-full justify-between h-11 font-normal",
                      !selectedPatient && "text-muted-foreground"
                    )}
                  >
                    {selectedPatient ? (
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7 border border-border">
                          <AvatarFallback className="text-xs bg-blue-50 text-blue-700 font-semibold">
                            {selectedPatient.first_name?.[0]}{selectedPatient.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{selectedPatient.first_name} {selectedPatient.last_name}</span>
                        <span className="text-xs text-muted-foreground">{selectedPatient.phone || selectedPatient.email}</span>
                      </div>
                    ) : (
                      <span>Search patient...</span>
                    )}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-40" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[460px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Name, phone or email..."
                      value={patientSearch}
                      onValueChange={setPatientSearch}
                    />
                    <CommandList>
                      {patientsLoading ? (
                        <div className="flex items-center justify-center p-6">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <>
                          <CommandEmpty>No patients found.</CommandEmpty>
                          <CommandGroup>
                            {filteredPatients.map((p) => (
                              <CommandItem
                                key={p.id}
                                value={`${p.first_name} ${p.last_name} ${p.phone || ''} ${p.email}`}
                                onSelect={() => {
                                  setSelectedPatient(p);
                                  setPatientSearchOpen(false);
                                }}
                              >
                                <div className="flex items-center gap-3 w-full py-0.5">
                                  <Avatar className="h-9 w-9 border border-border">
                                    <AvatarFallback className="text-sm bg-blue-50 text-blue-700 font-semibold">
                                      {p.first_name?.[0]}{p.last_name?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{p.first_name} {p.last_name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{p.phone || p.email}</p>
                                  </div>
                                  {selectedPatient?.id === p.id && (
                                    <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
              <Avatar className="h-11 w-11 border-2 border-white shadow-sm">
                <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                  {selectedPatient?.first_name?.[0]}{selectedPatient?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{selectedPatient?.first_name} {selectedPatient?.last_name}</p>
                <p className="text-sm text-muted-foreground">{selectedPatient?.email}</p>
              </div>
            </div>
          )}

          {/* Service Selector */}
          {dentistServices.length > 0 && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
                Service
              </Label>
              <Select value={selectedServiceId} onValueChange={handleServiceChange}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a service (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {dentistServices.map((ds) => {
                    const service = ds.business_services;
                    const dur = ds.custom_duration_minutes ?? service.duration_minutes;
                    const price = ds.custom_price_cents ?? service.price_cents;
                    return (
                      <SelectItem key={ds.service_id} value={ds.service_id}>
                        <div className="flex items-center justify-between gap-4 w-full">
                          <span className="font-medium">{service.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {dur ? `${dur} min` : ""}
                            {dur && price ? " · " : ""}
                            {price ? `€${(price / 100).toFixed(2)}` : ""}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedServiceId && selectedService?.business_services?.description && (
                <p className="text-xs text-muted-foreground pl-0.5">
                  {selectedService.business_services.description}
                </p>
              )}
            </div>
          )}

          {/* Date and Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="appointmentDate" className="flex items-center gap-1.5 text-sm font-medium">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Date
              </Label>
              <Input
                id="appointmentDate"
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Duration
              </Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Time Slot Grid */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              Time Slot <span className="text-red-500">*</span>
            </Label>
            {availableTimeSlots.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground bg-muted/40 rounded-xl border border-dashed">
                No available slots for this date
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto pr-1">
                {availableTimeSlots.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setAppointmentTime(time)}
                    className={cn(
                      "px-2 py-2 text-xs font-medium rounded-lg border transition-all",
                      appointmentTime === time
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200 dark:shadow-blue-900/30"
                        : "bg-background border-border hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 text-foreground"
                    )}
                  >
                    {formatTimeDisplay(time)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="reason" className="text-sm font-medium">Reason for Visit</Label>
            <Textarea
              id="reason"
              placeholder="E.g., Routine checkup, tooth pain..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Summary Card — shown when patient + time are selected */}
          {selectedPatient && appointmentTime && (
            <div className="rounded-xl border bg-muted/30 p-3.5 space-y-2 text-sm">
              <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Booking Summary</p>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Patient</span>
                  <span className="font-medium">{selectedPatient.first_name} {selectedPatient.last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date & Time</span>
                  <span className="font-medium">
                    {format(new Date(appointmentDate + "T12:00"), "MMM d")} · {formatTimeDisplay(appointmentTime)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">
                    {parseInt(duration) >= 60
                      ? `${parseInt(duration) / 60}h${parseInt(duration) % 60 > 0 ? ` ${parseInt(duration) % 60}m` : ""}`
                      : `${duration} min`}
                  </span>
                </div>
                {selectedService && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{selectedService.business_services.name}</span>
                      {effectivePrice !== null && effectivePrice > 0 && (
                        <Badge variant="secondary" className="text-xs font-semibold gap-0.5">
                          <Euro className="h-3 w-3" />
                          {(effectivePrice / 100).toFixed(2)}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/20 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button
            onClick={handleCreateAppointment}
            disabled={!canBook}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Booking...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Book Appointment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
