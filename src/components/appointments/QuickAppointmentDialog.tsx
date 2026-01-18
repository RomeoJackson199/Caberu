import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, addMinutes, isBefore, isAfter, startOfDay, endOfDay } from "date-fns";
import { Calendar, Clock, User, Search, Loader2 } from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createAppointmentWithNotification } from "@/hooks/useAppointments";
import type { PatientMinimal } from "@/types/patient";

interface QuickAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dentistId: string;
  selectedDate: Date;
  selectedTime: string;
  patient?: PatientMinimal;
  showPatientSelector?: boolean;
}

/**
 * Renders a dialog UI to create and schedule a dentist appointment, including optional patient selection, date/time, reason, and duration.
 *
 * @param open - Whether the dialog is visible.
 * @param onOpenChange - Callback invoked when the dialog open state changes.
 * @param dentistId - ID of the dentist for whom the appointment will be created.
 * @param selectedDate - Initial date used to prefill the appointment date.
 * @param selectedTime - Initial time used to prefill the appointment time (e.g., "09:30").
 * @param patient - Optional preselected patient (PatientMinimal); when provided the patient selector is hidden unless `showPatientSelector` is true.
 * @param showPatientSelector - When true, always show the patient selection UI even if a `patient` is provided.
 * @returns The dialog element that manages appointment creation and related UI interactions.
 */
export function QuickAppointmentDialog({
  open,
  onOpenChange,
  dentistId,
  selectedDate,
  selectedTime,
  patient,
  showPatientSelector = false
}: QuickAppointmentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientMinimal | null>(patient || null);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("60");
  const [appointmentDate, setAppointmentDate] = useState(format(selectedDate, "yyyy-MM-dd"));
  const [appointmentTime, setAppointmentTime] = useState(selectedTime);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch dentist's business ID from multiple potential sources
  const { data: dentistBusiness } = useQuery({
    queryKey: ["dentist-business", dentistId],
    queryFn: async () => {
      // First, get the dentist's profile_id
      const { data: dentist, error: dentistError } = await supabase
        .from("dentists")
        .select("profile_id")
        .eq("id", dentistId)
        .single();

      if (dentistError || !dentist) {
        console.error("Could not find dentist:", dentistError);
        return null;
      }

      // Try 1: Get from business_members
      const { data: businessMember } = await supabase
        .from("business_members")
        .select("business_id")
        .eq("profile_id", dentist.profile_id)
        .limit(1)
        .maybeSingle();

      if (businessMember?.business_id) {
        return businessMember.business_id;
      }

      // Try 2: Get from businesses where they are owner
      const { data: ownedBusiness } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_profile_id", dentist.profile_id)
        .limit(1)
        .maybeSingle();

      if (ownedBusiness?.id) {
        return ownedBusiness.id;
      }

      // Try 3: Get from provider_business_map
      const { data: providerMap } = await supabase
        .from("provider_business_map")
        .select("business_id")
        .eq("provider_id", dentist.profile_id)
        .limit(1)
        .maybeSingle();

      if (providerMap?.business_id) {
        return providerMap.business_id;
      }

      // Try 4: Get from existing appointments for this dentist
      const { data: existingAppt } = await supabase
        .from("appointments")
        .select("business_id")
        .eq("dentist_id", dentistId)
        .not("business_id", "is", null)
        .limit(1)
        .maybeSingle();

      if (existingAppt?.business_id) {
        return existingAppt.business_id;
      }

      // Try 5: Just get ANY business (last resort)
      const { data: anyBusiness } = await supabase
        .from("businesses")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (anyBusiness?.id) {
        return anyBusiness.id;
      }

      return null;
    },
    enabled: open,
  });

  // Fetch all patients for this dentist
  const { data: patients = [], isLoading: patientsLoading } = useQuery({
    queryKey: ["dentist-patients", dentistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          patient_id,
          profiles!appointments_patient_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq("dentist_id", dentistId);

      if (error) throw error;

      const uniquePatients = new Map<string, Patient>();
      data?.forEach((apt: any) => {
        const profile = Array.isArray(apt.profiles) ? apt.profiles[0] : apt.profiles;
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
        .from("appointments")
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

        const isAvailable = !existingAppointments.some((apt: any) => {
          const aptStart = parseISO(apt.appointment_date);
          const aptEnd = addMinutes(aptStart, apt.duration_minutes || 60);

          return (
            (isAfter(slotStart, aptStart) && isBefore(slotStart, aptEnd)) ||
            (isAfter(slotEnd, aptStart) && isBefore(slotEnd, aptEnd)) ||
            (isBefore(slotStart, aptStart) && isAfter(slotEnd, aptEnd)) ||
            slotStart.getTime() === aptStart.getTime()
          );
        });

        if (isAvailable) {
          slots.push(time);
        }
      }
    }

    return slots;
  }, [appointmentDate, existingAppointments, duration]);

  useEffect(() => {
    if (patient) {
      setSelectedPatient(patient);
    }
  }, [patient]);

  useEffect(() => {
    setAppointmentDate(format(selectedDate, "yyyy-MM-dd"));
    setAppointmentTime(selectedTime);
  }, [selectedDate, selectedTime]);

  useEffect(() => {
    if (!open) {
      if (!patient) {
        setSelectedPatient(null);
      }
      setReason("");
      setDuration("60");
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
        p.email.toLowerCase().includes(search)
    );
  }, [patients, patientSearch]);

  const handleCreateAppointment = async () => {
    if (!selectedPatient) {
      toast({
        title: "Missing Information",
        description: "Please select a patient",
        variant: "destructive",
      });
      return;
    }

    if (!appointmentTime) {
      toast({
        title: "Missing Information",
        description: "Please select a time slot",
        variant: "destructive",
      });
      return;
    }

    if (!dentistBusiness) {
      toast({
        title: "Error",
        description: "Could not determine business. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const appointmentDateTime = new Date(appointmentDate);
      const [hours, minutes] = appointmentTime.split(":");
      appointmentDateTime.setHours(parseInt(hours), parseInt(minutes || "0"), 0, 0);

      // Use createAppointmentWithNotification to send email to patient
      await createAppointmentWithNotification({
        dentist_id: dentistId,
        patient_id: selectedPatient.id,
        business_id: dentistBusiness,
        appointment_date: appointmentDateTime.toISOString(),
        duration_minutes: parseInt(duration),
        status: "confirmed",
        urgency: "medium",
        reason: reason || "General consultation",
      });

      toast({
        title: "Appointment Created",
        description: `Successfully created appointment for ${selectedPatient.first_name} ${selectedPatient.last_name}. Confirmation email sent.`,
      });

      await queryClient.invalidateQueries({ queryKey: ["appointments-calendar"] });
      await queryClient.invalidateQueries({ queryKey: ["appointments-day"] });
      await queryClient.invalidateQueries({ queryKey: ["all-appointments"] });
      await queryClient.invalidateQueries({ queryKey: ["appointments-for-date"] });

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create appointment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Book Appointment
          </DialogTitle>
          <DialogDescription>
            {selectedPatient
              ? `Schedule an appointment for ${selectedPatient.first_name} ${selectedPatient.last_name}`
              : "Select a patient and time slot"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Patient Selector */}
          {(showPatientSelector || !patient) ? (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Patient *
              </Label>
              <Popover open={patientSearchOpen} onOpenChange={setPatientSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={patientSearchOpen}
                    className="w-full justify-between"
                  >
                    {selectedPatient ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {selectedPatient.first_name[0]}{selectedPatient.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span>{selectedPatient.first_name} {selectedPatient.last_name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Select patient...</span>
                    )}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search patients..."
                      value={patientSearch}
                      onValueChange={setPatientSearch}
                    />
                    <CommandList>
                      {patientsLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        <>
                          <CommandEmpty>No patients found.</CommandEmpty>
                          <CommandGroup>
                            {filteredPatients.map((p) => (
                              <CommandItem
                                key={p.id}
                                value={`${p.first_name} ${p.last_name} ${p.email}`}
                                onSelect={() => {
                                  setSelectedPatient(p);
                                  setPatientSearchOpen(false);
                                }}
                              >
                                <div className="flex items-center gap-3 w-full">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback>
                                      {p.first_name[0]}{p.last_name[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">
                                      {p.first_name} {p.last_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {p.email}
                                    </p>
                                  </div>
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
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="text-sm">
                    {selectedPatient?.first_name[0]}{selectedPatient?.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedPatient?.first_name} {selectedPatient?.last_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedPatient?.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="appointmentDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date
              </Label>
              <Input
                id="appointmentDate"
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="appointmentTime" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time
              </Label>
              <Select value={appointmentTime} onValueChange={setAppointmentTime}>
                <SelectTrigger id="appointmentTime">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {availableTimeSlots.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No available slots
                    </div>
                  ) : (
                    availableTimeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Visit</Label>
            <Textarea
              id="reason"
              placeholder="E.g., Routine checkup, tooth pain..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Duration
            </Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger id="duration">
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreateAppointment} disabled={loading || !selectedPatient || !dentistBusiness}>
            {loading ? "Creating..." : "Book Appointment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}