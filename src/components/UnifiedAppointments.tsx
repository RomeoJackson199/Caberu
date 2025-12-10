import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentBusinessId, addBusinessContext } from '@/lib/businessScopedSupabase';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AppointmentCompletionDialog } from "@/components/appointment/AppointmentCompletionDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Clock,
  User,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  RefreshCw,
  MoreVertical,
  AlertCircle,
  DollarSign,
  FileText,
  Pill
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import PaymentWizard from "@/components/payments/PaymentWizard";
import { PrescriptionManager } from "@/components/PrescriptionManager";
import { Sheet as UISheet, SheetContent as UISheetContent } from "@/components/ui/sheet";
import { logger } from '@/lib/logger';

interface UnifiedAppointment {
  id: string;
  patient_id: string;
  dentist_id: string;
  appointment_date: string;
  duration_minutes: number | null;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  reason?: string | null;
  consultation_notes?: string | null;
  urgency?: string;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    date_of_birth?: string | null;
  } | null;
  dentist?: {
    id: string;
    profile?: {
      first_name: string;
      last_name: string;
    };
  } | null;
}

interface UnifiedAppointmentsProps {
  dentistId: string;
  patientId?: string;
  onOpenPatientProfile?: (patientId: string) => void;
  viewMode?: 'clinical' | 'patient';
}

export function UnifiedAppointments({
  dentistId,
  patientId,
  onOpenPatientProfile,
  viewMode = 'clinical'
}: UnifiedAppointmentsProps) {
  const { businessId } = useBusinessContext();
  const [appointments, setAppointments] = useState<UnifiedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<UnifiedAppointment | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const { toast } = useToast();
  const { t } = useLanguage();

  // Quick booking state
  const [quickPatients, setQuickPatients] = useState<Array<{ id: string; first_name: string; last_name: string; email?: string }>>([]);
  const [quickPatientId, setQuickPatientId] = useState<string>("");
  const [quickDate, setQuickDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [quickTime, setQuickTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [quickReason, setQuickReason] = useState<string>("Routine Checkup");
  const [quickUrgency, setQuickUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [quickDuration, setQuickDuration] = useState<number>(30);

  // UI state for quick actions
  const [showPaymentWizard, setShowPaymentWizard] = useState(false);
  const [showPrescription, setShowPrescription] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [addingNoteForPatientId, setAddingNoteForPatientId] = useState<string | null>(null);

  // Derive next appointment (upcoming earliest)
  const nextAppointment = useMemo(() => {
    const upcoming = appointments
      .filter(a => ['confirmed', 'pending', 'in_progress', 'scheduled'].includes(a.status))
      .filter(a => new Date(a.appointment_date).getTime() >= Date.now())
      .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());
    return upcoming[0] || null;
  }, [appointments]);

  // Derive current in-progress appointment ("current visit open")
  const currentInProgress = useMemo(() => {
    const now = Date.now();
    return appointments.find(a => a.status === 'confirmed' && new Date(a.appointment_date).getTime() <= now && (a.duration_minutes ? new Date(a.appointment_date).getTime() + a.duration_minutes * 60000 > now : true)) || null;
  }, [appointments]);

  const createPaymentRequest = () => setShowPaymentWizard(true);
  const openPrescription = () => setShowPrescription(true);
  const addQuickNote = async () => {
    try {
      if (!addingNoteForPatientId || !noteText.trim()) return;
      const { error } = await supabase
        .from('notes')
        .insert({
          patient_id: addingNoteForPatientId,
          title: 'Quick Note',
          content: noteText.trim(),
          note_type: 'general',
          created_by: dentistId
        });
      if (error) throw error;
      setNoteText("");
      setAddingNoteForPatientId(null);
      toast({ title: t.success, description: t.changesSaved });
    } catch (e) {
      toast({ title: t.error, description: "Something went wrong", variant: 'destructive' });
    }
  };

  // Fetch appointments
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('appointments')
        .select(`
          *,
          patient:profiles!appointments_patient_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            date_of_birth
          ),
          dentist:dentists!appointments_dentist_id_fkey (
            id,
            profiles:profile_id (
              first_name,
              last_name
            )
          )
        `)
        .order('appointment_date', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      } else {
        query = query.eq('dentist_id', dentistId);
      }

      // SECURITY: Multi-tenant isolation
      if (businessId) {
        query = query.eq('business_id', businessId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "Failed to load appointments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [dentistId, patientId, businessId, toast]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Load patients for quick booking
  const loadQuickPatients = useCallback(async () => {
    if (patientId) {
      // If viewing as a patient, only that patient can book
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('id', patientId)
        .single();
      if (data) {
        setQuickPatients([data]);
        setQuickPatientId(data.id);
      }
    } else {
      // Load all patients for dentist view
      const { data } = await supabase
        .from('appointments')
        .select(`patient_id, patient:profiles!appointments_patient_id_fkey ( id, first_name, last_name, email )`)
        .eq('dentist_id', dentistId)
        .eq('business_id', businessId || '');  // Multi-tenant filter

      const unique: Record<string, any> = {};
      (data || []).forEach((row: any) => {
        const p = row.patient;
        if (p && !unique[p.id]) unique[p.id] = p;
      });
      setQuickPatients(Object.values(unique));
    }
  }, [dentistId, patientId]);

  useEffect(() => {
    if (showBooking) {
      loadQuickPatients();
    }
  }, [showBooking, loadQuickPatients]);

  // Filter appointments based on status
  const filteredAppointments = useMemo(() => {
    const now = new Date();

    return appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);

      switch (filterStatus) {
        case 'upcoming':
          return aptDate >= now && apt.status !== 'cancelled' && apt.status !== 'completed';
        case 'completed':
          return apt.status === 'completed';
        case 'cancelled':
          return apt.status === 'cancelled';
        default:
          return true;
      }
    });
  }, [appointments, filterStatus]);

  // Status badge with consistent styling
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" },
      pending: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200" },
      completed: { bg: "bg-green-100", text: "text-green-800", border: "border-green-200" },
      cancelled: { bg: "bg-red-100", text: "text-red-800", border: "border-red-200" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] ||
      { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-200" };

    return (
      <Badge className={`${config.bg} ${config.text} ${config.border} border capitalize px-3 py-1`}>
        {status}
      </Badge>
    );
  };

  // Handle appointment actions
  const handleComplete = (appointment: UnifiedAppointment) => {
    setSelectedAppointment(appointment);
    setShowCompletion(true);
  };

  const handleReschedule = (appointment: UnifiedAppointment) => {
    setSelectedAppointment(appointment);
    const date = new Date(appointment.appointment_date);
    setRescheduleDate(date.toISOString().slice(0, 10));
    setRescheduleTime(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`);
    setShowReschedule(true);
  };

  const handleCancel = async (appointment: UnifiedAppointment) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointment.id);

      if (error) throw error;

      toast({
        title: "Appointment Cancelled",
        description: "The appointment has been cancelled successfully.",
      });

      fetchAppointments();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel appointment",
        variant: "destructive",
      });
    }
  };

  const applyReschedule = async () => {
    if (!selectedAppointment || !rescheduleDate || !rescheduleTime) return;

    try {
      const newDateTime = new Date(`${rescheduleDate}T${rescheduleTime}`).toISOString();

      const { error } = await supabase
        .from('appointments')
        .update({ appointment_date: newDateTime })
        .eq('id', selectedAppointment.id);

      if (error) throw error;

      toast({
        title: "Appointment Rescheduled",
        description: "The appointment has been rescheduled successfully.",
      });

      setShowReschedule(false);
      setSelectedAppointment(null);
      fetchAppointments();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reschedule appointment",
        variant: "destructive",
      });
    }
  };

  const handleQuickBook = async () => {
    try {
      if (!quickPatientId || !quickDate || !quickTime) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const appointmentDateTime = new Date(`${quickDate}T${quickTime}`).toISOString();

      const { error } = await supabase
        .from('appointments')
        .insert({
          patient_id: quickPatientId,
          dentist_id: dentistId,
          business_id: businessId,  // Multi-tenant isolation
          appointment_date: appointmentDateTime,
          duration_minutes: quickDuration,
          status: 'confirmed',
          reason: quickReason || 'Routine Checkup',
          urgency: quickUrgency
        });

      if (error) throw error;

      toast({
        title: "Appointment Booked",
        description: "The appointment has been booked successfully.",
      });

      setShowBooking(false);
      // Reset form
      setQuickPatientId("");
      setQuickReason("Routine Checkup");
      fetchAppointments();
    } catch (error) {
      console.error('Booking error:', error);
      toast({
        title: "Error",
        description: "Failed to book appointment",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-dental-primary" />
              <span>{t.appointments}</span>
              <Badge variant="outline">{filteredAppointments.length}</Badge>
            </CardTitle>
            <Button
              onClick={() => setShowBooking(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t.bookAppointment}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
            >
              All
            </Button>
            <Button
              variant={filterStatus === 'upcoming' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('upcoming')}
            >
              {t.upcoming}
            </Button>
            <Button
              variant={filterStatus === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('completed')}
            >
              {t.completed}
            </Button>
            <Button
              variant={filterStatus === 'cancelled' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('cancelled')}
            >
              {t.cancelled}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appointments list */}
      <div className="space-y-3">
        {filteredAppointments.length > 0 ? (
          filteredAppointments.map((appointment) => (
            <Card key={appointment.id} className="hover:shadow-lg transition-all">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-base">
                          {format(new Date(appointment.appointment_date), 'PPP')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(appointment.appointment_date), 'p')}
                          {appointment.duration_minutes && ` • ${appointment.duration_minutes} minutes`}
                        </p>
                      </div>
                      {getStatusBadge(appointment.status)}
                    </div>

                    {viewMode === 'clinical' && appointment.patient && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <button
                          type="button"
                          className="text-sm text-primary hover:underline"
                          onClick={() => onOpenPatientProfile?.(appointment.patient!.id)}
                        >
                          {appointment.patient.first_name} {appointment.patient.last_name}
                        </button>
                      </div>
                    )}

                    {appointment.reason && (
                      <p className="text-sm text-muted-foreground">
                        Reason: {appointment.reason}
                      </p>
                    )}

                    {appointment.consultation_notes && (
                      <div className="mt-2 p-3 bg-muted rounded-lg">
                        <p className="text-sm">{appointment.consultation_notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Action buttons - consistent across all views */}
                  <div className="flex flex-row sm:flex-col gap-2">
                    {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleComplete(appointment)}
                          className="flex-1 sm:flex-initial"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReschedule(appointment)}
                          className="flex-1 sm:flex-initial"
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Reschedule
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancel(appointment)}
                          className="flex-1 sm:flex-initial text-destructive hover:bg-destructive/10"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </>
                    )}


                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No appointments found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowBooking(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Book Your First Appointment
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Book Appointment Dialog */}
      <Dialog open={showBooking} onOpenChange={setShowBooking}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Book New Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!patientId && (
              <div>
                <Label>Patient *</Label>
                <Select value={quickPatientId} onValueChange={setQuickPatientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {quickPatients.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.first_name} {p.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={quickDate}
                  onChange={(e) => setQuickDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Time *</Label>
                <Input
                  type="time"
                  value={quickTime}
                  onChange={(e) => setQuickTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Reason for Visit</Label>
              <Select value={quickReason} onValueChange={setQuickReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Routine Checkup">Routine Checkup</SelectItem>
                  <SelectItem value="Cleaning">Cleaning</SelectItem>
                  <SelectItem value="Filling">Filling</SelectItem>
                  <SelectItem value="Root Canal">Root Canal</SelectItem>
                  <SelectItem value="Extraction">Extraction</SelectItem>
                  <SelectItem value="Emergency">Emergency</SelectItem>
                  <SelectItem value="Consultation">Consultation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={quickDuration}
                  onChange={(e) => setQuickDuration(parseInt(e.target.value) || 30)}
                  min="15"
                  step="15"
                />
              </div>
              <div>
                <Label>Urgency</Label>
                <Select value={quickUrgency} onValueChange={(v: any) => setQuickUrgency(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleQuickBook} className="flex-1">
                Book Appointment
              </Button>
              <Button variant="outline" onClick={() => setShowBooking(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={showReschedule} onOpenChange={setShowReschedule}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>New Date</Label>
                <Input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                />
              </div>
              <div>
                <Label>New Time</Label>
                <Input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={applyReschedule} className="flex-1">
                Confirm Reschedule
              </Button>
              <Button variant="outline" onClick={() => setShowReschedule(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Wizard Dialog */}
      {showPaymentWizard && (
        <PaymentWizard dentistId={dentistId} isOpen={showPaymentWizard} onClose={() => setShowPaymentWizard(false)} />
      )}

      {/* Prescription Manager in a side sheet */}
      <UISheet open={showPrescription} onOpenChange={setShowPrescription}>
        <UISheetContent side="right" className="w-full sm:w-[540px]">
          <div className="p-2">
            <PrescriptionManager dentistId={dentistId} />
          </div>
        </UISheetContent>
      </UISheet>

      {/* Modern Completion Dialog */}
      {selectedAppointment && (
        <AppointmentCompletionDialog
          open={showCompletion}
          onOpenChange={setShowCompletion}
          appointment={selectedAppointment}
          onCompleted={() => {
            setShowCompletion(false);
            setSelectedAppointment(null);
            fetchAppointments();
          }}
        />
      )}
    </div>
  );
}