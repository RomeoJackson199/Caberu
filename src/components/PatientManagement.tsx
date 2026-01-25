import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Search,
  User,
  Calendar,
  FileText,
  Plus,
  ClipboardList as ClipboardListIcon,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Edit,
  Trash2,
  Filter,
  AlertTriangle,
  ExternalLink,
  MessageSquare
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { withErrorBoundary } from "@/components/ErrorBoundary";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PhotoUpload } from "@/components/PhotoUpload";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CompletionSheet } from "@/components/CompletionSheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PatientPaymentHistory } from "@/components/PatientPaymentHistory";
import { PaymentRequestForm } from "@/components/PaymentRequestForm";
import { useNavigate } from "react-router-dom";
import { useBusinessTemplate } from "@/hooks/useBusinessTemplate";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { logger } from '@/lib/logger';
import { sanitizeText } from '@/utils/sanitize';
import {
  Patient,
  Appointment,
  TreatmentPlan,
  Prescription,
  PatientNote,
  PatientManagementProps,
  PatientFlags,
  TreatmentForm,
  PrescriptionForm,
  NoteForm,
  getAge,
  PatientListItem,
  TreatmentPlanFormSheet,
  PrescriptionFormSheet,
  NoteFormSheet,
  AppointmentsList,
  PrescriptionsSection,
  TreatmentPlansSection,
  AllergyManager,
  PatientStatsCard
} from "@/components/patient-management";


function PatientManagementComponent({ dentistId }: PatientManagementProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<'all' | 'unpaid' | 'upcoming' | 'active_plan'>('all');
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [latestOutcome, setLatestOutcome] = useState<any[]>([]);
  const [treatmentsByAppointment, setTreatmentsByAppointment] = useState<Record<string, any[]>>({});
  const [showCompletion, setShowCompletion] = useState(false);
  const [lastAppointment, setLastAppointment] = useState<Appointment | null>(null);
  const [completionAppointment, setCompletionAppointment] = useState<Appointment | null>(null);

  // Pagination state for appointments
  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const appointmentsPerPage = 3;

  // Flags per patient for badges
  const [patientFlags, setPatientFlags] = useState<Record<string, PatientFlags>>({});

  // Editing state for inline edit flows
  const [editingTreatmentId, setEditingTreatmentId] = useState<string | null>(null);
  const [editingPrescriptionId, setEditingPrescriptionId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Accordion open-state per patient (remembered)
  const [accordionOpenByPatient, setAccordionOpenByPatient] = useState<Record<string, string>>({});
  // Start with appointments or first available section
  const [accordionValue, setAccordionValue] = useState<string>(() => {
    if (hasFeature('prescriptions')) return 'prescriptions';
    if (hasFeature('treatmentPlans')) return 'treatments';
    return 'appointments';
  });

  // Dialog states
  const [showTreatmentDialog, setShowTreatmentDialog] = useState(false);
  const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  // Form states
  const [treatmentForm, setTreatmentForm] = useState({
    title: "",
    description: "",
    diagnosis: "",
    priority: "normal",
    estimated_cost: "",
    estimated_duration_weeks: "",
  });

  const [prescriptionForm, setPrescriptionForm] = useState({
    medication_name: "",
    dosage: "",
    frequency: "",
    duration_days: "",
    instructions: "",
  });

  const [noteForm, setNoteForm] = useState({
    title: "",
    content: "",
    note_type: "general",
    is_private: false,
  });

  const { toast } = useToast();
  const sb: any = supabase;
  const navigate = useNavigate();
  const { hasFeature, t } = useBusinessTemplate();
  const { businessId } = useBusinessContext();

  useEffect(() => {
    fetchPatients();
  }, [dentistId]);

  // Preselect patient if requested from another tab
  useEffect(() => {
    const requestedId = sessionStorage.getItem('requestedPatientId');
    if (requestedId && patients.length > 0) {
      const patient = patients.find(p => p.id === requestedId);
      if (patient) {
        setSelectedPatient(patient);
      }
      sessionStorage.removeItem('requestedPatientId');
    }
  }, [patients]);

  useEffect(() => {
    if (selectedPatient) {
      fetchPatientData(selectedPatient.id);
      fetchPatientOutcomes(selectedPatient.id);
    }
  }, [selectedPatient, dentistId]);

  const fetchPatients = async () => {
    try {
      setLoading(true);

      // SECURITY: Get patients who have appointments with this dentist AND business
      if (!businessId) {
        toast({
          title: "Error",
          description: "No business context. Please refresh the page.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          patient_id,
          profiles(
            id,
            first_name,
            last_name,
            email,
            phone,
            date_of_birth,
            address,
            medical_history,
            emergency_contact,
            profile_picture_url
          )
        `)
        .eq('dentist_id', dentistId)
        .eq('business_id', businessId);  // Multi-tenant isolation

      if (appointmentError) {
        console.error('Error fetching appointments:', appointmentError);
        throw appointmentError;
      }

      // Extract unique patients - profiles might be an array from Supabase join
      const uniquePatients = appointmentData
        .map(apt => {
          const profile = Array.isArray(apt.profiles) ? apt.profiles[0] : apt.profiles;
          return profile;
        })
        .filter((patient, index, self) =>
          patient && self.findIndex(p => p?.id === patient?.id) === index
        )
        .filter(Boolean) as Patient[];

      setPatients(uniquePatients);

      // Pre-fetch flags for all patients (for quick filters)
      const now = new Date();
      const flagsMap: Record<string, PatientFlags> = {};

      for (const patient of uniquePatients) {
        // Get appointments for this patient
        const patientAppointments = appointmentData.filter(apt => apt.patient_id === patient.id);
        const hasUpcomingAppointment = patientAppointments.some(a => {
          try {
            // We need to get the full appointment to check date
            return false; // Will be computed when patient is selected
          } catch { return false; }
        });

        // For now, just set empty flags - they will be fully computed when patient is selected
        flagsMap[patient.id] = {
          hasUnpaidBalance: false,
          hasUpcomingAppointment: false,
          hasActiveTreatmentPlan: false,
        };
      }

      // Batch fetch upcoming appointments
      const { data: upcomingAppts } = await supabase
        .from('appointments')
        .select('patient_id, appointment_date, status')
        .eq('dentist_id', dentistId)
        .eq('business_id', businessId)
        .neq('status', 'cancelled')
        .gte('appointment_date', now.toISOString());

      (upcomingAppts || []).forEach(apt => {
        if (flagsMap[apt.patient_id]) {
          flagsMap[apt.patient_id].hasUpcomingAppointment = true;
        }
      });

      // Batch fetch active treatment plans
      if (hasFeature('treatmentPlans')) {
        const { data: activePlans } = await supabase
          .from('treatment_plans')
          .select('patient_id')
          .eq('dentist_id', dentistId)
          .eq('status', 'active');

        (activePlans || []).forEach(plan => {
          if (flagsMap[plan.patient_id]) {
            flagsMap[plan.patient_id].hasActiveTreatmentPlan = true;
          }
        });
      }

      // Batch fetch unpaid balances
      const patientIds = uniquePatients.map(p => p.id);
      try {
        const { data: pendingPayments } = await sb
          .from('payment_requests')
          .select('patient_id, amount, status')
          .eq('dentist_id', dentistId)
          .in('patient_id', patientIds)
          .neq('status', 'paid')
          .neq('status', 'cancelled');

        (pendingPayments || []).forEach((pr: any) => {
          if (flagsMap[pr.patient_id]) {
            flagsMap[pr.patient_id].hasUnpaidBalance = true;
            flagsMap[pr.patient_id].outstandingCents = (flagsMap[pr.patient_id].outstandingCents || 0) + (pr.amount || 0);
          }
        });
      } catch {
        // Ignore payment query errors
      }

      try {
        const { data: unpaidInvoices } = await sb
          .from('invoices')
          .select('patient_id, patient_amount_cents, status')
          .eq('dentist_id', dentistId)
          .in('patient_id', patientIds)
          .neq('status', 'paid')
          .neq('status', 'cancelled');

        (unpaidInvoices || []).forEach((inv: any) => {
          if (flagsMap[inv.patient_id]) {
            flagsMap[inv.patient_id].hasUnpaidBalance = true;
            flagsMap[inv.patient_id].outstandingCents = (flagsMap[inv.patient_id].outstandingCents || 0) + (inv.patient_amount_cents || 0);
          }
        });
      } catch {
        // Ignore invoice query errors
      }

      setPatientFlags(flagsMap);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch patients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientData = async (patientId: string) => {
    try {
      // Fetch appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .eq('dentist_id', dentistId)
        .order('appointment_date', { ascending: false });

      if (appointmentsError) throw appointmentsError;
      setAppointments(appointmentsData || []);
      setLastAppointment((appointmentsData || []).find(a => a.status !== 'cancelled') || null);

      // Fetch treatment plans only if feature is enabled
      if (hasFeature('treatmentPlans')) {
        const { data: treatmentData, error: treatmentError } = await supabase
          .from('treatment_plans')
          .select('*')
          .eq('patient_id', patientId)
          .eq('dentist_id', dentistId)
          .order('created_at', { ascending: false });

        if (treatmentError) throw treatmentError;
        setTreatmentPlans(treatmentData || []);
      } else {
        setTreatmentPlans([]);
      }

      // Fetch prescriptions only if feature is enabled
      if (hasFeature('prescriptions')) {
        const { data: prescriptionData, error: prescriptionError } = await supabase
          .from('prescriptions')
          .select('*')
          .eq('patient_id', patientId)
          .eq('dentist_id', dentistId)
          .order('created_at', { ascending: false });

        if (prescriptionError) throw prescriptionError;
        setPrescriptions(prescriptionData || []);
      } else {
        setPrescriptions([]);
      }

      // Fetch notes
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .eq('patient_id', patientId)
        .eq('dentist_id', dentistId)
        .order('created_at', { ascending: false });

      if (notesError) throw notesError;
      setNotes(notesData || []);

      // Compute flags for list badges and filters
      const now = new Date();
      const hasUpcomingAppointment = (appointmentsData || []).some(a => {
        try { return new Date(a.appointment_date) > now && a.status !== 'cancelled'; } catch { return false; }
      });
      const lastVisitDate = (appointmentsData || [])
        .filter(a => a.status === 'completed')
        .map(a => a.appointment_date)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
      const nextAppointment = (appointmentsData || [])
        .filter(a => {
          try { return new Date(a.appointment_date) > now && a.status !== 'cancelled'; } catch { return false; }
        })
        .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())[0];
      const hasActiveTreatmentPlan = treatmentPlans.some((t: TreatmentPlan) => t.status === 'active');



      // Outstanding balance (sum pending payment_requests + unpaid invoices patient_amount_cents)
      let outstandingCents = 0;
      try {
        const { data: prs } = await sb.from('payment_requests').select('amount, status').eq('patient_id', patientId).eq('dentist_id', dentistId);
        outstandingCents += (prs || []).filter((p: any) => p.status !== 'paid' && p.status !== 'cancelled').reduce((s: number, p: any) => s + (p.amount || 0), 0);
      } catch {
        // ignore payment requests query errors
      }
      try {
        const { data: inv } = await sb.from('invoices').select('patient_amount_cents, status').eq('patient_id', patientId).eq('dentist_id', dentistId);
        outstandingCents += (inv || []).filter((i: any) => i.status !== 'paid' && i.status !== 'cancelled').reduce((s: number, i: any) => s + (i.patient_amount_cents || 0), 0);
      } catch {
        // ignore invoices query errors
      }
      const hasUnpaidBalance = outstandingCents > 0;

      setPatientFlags(prev => ({
        ...prev,
        [patientId]: {
          hasUnpaidBalance,
          outstandingCents,
          hasUpcomingAppointment,
          hasActiveTreatmentPlan,
          lastVisitDate,
          nextAppointmentDate: nextAppointment?.appointment_date,
          nextAppointmentStatus: nextAppointment?.status
        }
      }));

      // Restore accordion state for this patient
      setAccordionValue(prev => accordionOpenByPatient[patientId] || prev);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch patient data",
        variant: "destructive",
      });
    }
  };

  const fetchPatientOutcomes = async (patientId: string) => {
    const { data } = await sb
      .from('appointment_outcomes')
      .select('*, appointments!inner(appointment_date, id)')
      .eq('appointments.patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(5);
    setLatestOutcome(data || []);

    const appointmentIds = (data || []).map((o: any) => o.appointments.id);
    if (appointmentIds.length > 0) {
      const { data: treatments } = await sb
        .from('appointment_treatments')
        .select('*')
        .in('appointment_id', appointmentIds);
      const grouped: Record<string, any[]> = {};
      (treatments || []).forEach((t: any) => {
        if (!grouped[t.appointment_id]) grouped[t.appointment_id] = [];
        grouped[t.appointment_id].push(t);
      });
      setTreatmentsByAppointment(grouped);
    } else {
      setTreatmentsByAppointment({});
    }
  };

  const filteredPatients = patients.filter(patient => {
    const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    const matchesSearch = fullName.includes(search)
      || patient.email.toLowerCase().includes(search)
      || (patient.phone || '').toLowerCase().includes(search)
      || patient.id.toLowerCase().includes(search);

    if (!matchesSearch) return false;

    // Apply active filter
    const flags = patientFlags[patient.id];
    if (activeFilter === 'unpaid' && !flags?.hasUnpaidBalance) return false;
    if (activeFilter === 'upcoming' && !flags?.hasUpcomingAppointment) return false;
    if (activeFilter === 'active_plan' && !flags?.hasActiveTreatmentPlan) return false;

    return true;
  });

  // Count patients matching each filter for badges
  const filterCounts = {
    unpaid: patients.filter(p => patientFlags[p.id]?.hasUnpaidBalance).length,
    upcoming: patients.filter(p => patientFlags[p.id]?.hasUpcomingAppointment).length,
    active_plan: patients.filter(p => patientFlags[p.id]?.hasActiveTreatmentPlan).length,
  };


  const openEditTreatment = (plan: TreatmentPlan) => {
    setEditingTreatmentId(plan.id);
    setTreatmentForm({
      title: plan.title || "",
      description: plan.description || "",
      diagnosis: plan.diagnosis || "",
      priority: plan.priority || "normal",
      estimated_cost: plan.estimated_cost ? String(plan.estimated_cost) : "",
      estimated_duration_weeks: plan.estimated_duration_weeks ? String(plan.estimated_duration_weeks) : "",
    });
    setShowTreatmentDialog(true);
  };

  const openEditPrescription = (p: Prescription) => {
    setEditingPrescriptionId(p.id);
    setPrescriptionForm({
      medication_name: p.medication_name || "",
      dosage: p.dosage || "",
      frequency: p.frequency || "",
      duration_days: p.duration_days ? String(p.duration_days) : "",
      instructions: p.instructions || "",
    });
    setShowPrescriptionDialog(true);
  };

  const openEditNote = (n: PatientNote) => {
    setEditingNoteId(n.id);
    setNoteForm({
      title: n.title || "",
      content: n.content || "",
      note_type: n.note_type || "general",
      is_private: n.is_private || false,
    });
    setShowNoteDialog(true);
  };

  const handleAddTreatmentPlan = async () => {
    if (!selectedPatient) return;

    try {
      if (editingTreatmentId) {
        const { error } = await supabase
          .from('treatment_plans')
          .update({
            title: treatmentForm.title,
            description: treatmentForm.description,
            diagnosis: treatmentForm.diagnosis,
            priority: treatmentForm.priority,
            estimated_cost: treatmentForm.estimated_cost ? Number(treatmentForm.estimated_cost) : null,
            estimated_duration_weeks: treatmentForm.estimated_duration_weeks ? Number(treatmentForm.estimated_duration_weeks) : null,
          })
          .eq('id', editingTreatmentId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('treatment_plans')
          .insert({
            patient_id: selectedPatient.id,
            dentist_id: dentistId,
            title: treatmentForm.title,
            description: treatmentForm.description,
            diagnosis: treatmentForm.diagnosis,
            priority: treatmentForm.priority,
            estimated_cost: treatmentForm.estimated_cost ? Number(treatmentForm.estimated_cost) : null,
            estimated_duration_weeks: treatmentForm.estimated_duration_weeks ? Number(treatmentForm.estimated_duration_weeks) : null,
            status: 'draft'
          });
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: editingTreatmentId ? "Treatment plan updated" : "Treatment plan added successfully",
      });

      setTreatmentForm({
        title: "",
        description: "",
        diagnosis: "",
        priority: "normal",
        estimated_cost: "",
        estimated_duration_weeks: "",
      });
      setEditingTreatmentId(null);
      setShowTreatmentDialog(false);
      fetchPatientData(selectedPatient.id);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save treatment plan",
        variant: "destructive",
      });
    }
  };

  const handleAddPrescription = async () => {
    if (!selectedPatient) return;

    try {
      if (editingPrescriptionId) {
        const { error } = await supabase
          .from('prescriptions')
          .update({
            medication_name: prescriptionForm.medication_name,
            dosage: prescriptionForm.dosage,
            frequency: prescriptionForm.frequency,
            duration_days: prescriptionForm.duration_days ? Number(prescriptionForm.duration_days) : null,
            instructions: prescriptionForm.instructions,
          })
          .eq('id', editingPrescriptionId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('prescriptions')
          .insert({
            patient_id: selectedPatient.id,
            dentist_id: dentistId,
            medication_name: prescriptionForm.medication_name,
            dosage: prescriptionForm.dosage,
            frequency: prescriptionForm.frequency,
            duration_days: prescriptionForm.duration_days ? Number(prescriptionForm.duration_days) : null,
            instructions: prescriptionForm.instructions,
            status: 'active'
          });
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: editingPrescriptionId ? "Prescription updated" : "Prescription added successfully",
      });

      setPrescriptionForm({
        medication_name: "",
        dosage: "",
        frequency: "",
        duration_days: "",
        instructions: "",
      });
      setEditingPrescriptionId(null);
      setShowPrescriptionDialog(false);
      fetchPatientData(selectedPatient.id);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save prescription",
        variant: "destructive",
      });
    }
  };

  const handleAddNote = async () => {
    if (!selectedPatient) return;

    try {
      if (editingNoteId) {
        const { error } = await supabase
          .from('notes')
          .update({
            title: noteForm.title,
            content: noteForm.content,
            note_type: noteForm.note_type,
            is_private: noteForm.is_private
          })
          .eq('id', editingNoteId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notes')
          .insert({
            patient_id: selectedPatient.id,
            dentist_id: dentistId,
            title: noteForm.title,
            content: noteForm.content,
            note_type: noteForm.note_type,
            is_private: noteForm.is_private
          });
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: editingNoteId ? "Note updated" : "Note added successfully",
      });

      setNoteForm({
        title: "",
        content: "",
        note_type: "general",
        is_private: false,
      });
      setEditingNoteId(null);
      setShowNoteDialog(false);
      fetchPatientData(selectedPatient.id);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save note",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTreatment = async (id: string) => {
    try {
      const { error } = await supabase.from('treatment_plans').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Deleted', description: 'Treatment plan deleted' });
      if (selectedPatient) fetchPatientData(selectedPatient.id);
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleDeletePrescription = async (id: string) => {
    try {
      const { error } = await supabase.from('prescriptions').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Deleted', description: 'Prescription deleted' });
      if (selectedPatient) fetchPatientData(selectedPatient.id);
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Deleted', description: 'Note deleted' });
      if (selectedPatient) fetchPatientData(selectedPatient.id);
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to delete', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">Loading patients...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Patient List */}
      <Card className="glass-card lg:col-span-1">
        <CardHeader className="space-y-4">
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-6 w-6 text-dental-primary" />
            <span>My Patients</span>
            <Badge variant="outline" className="ml-auto">{patients.length} total</Badge>
          </CardTitle>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or phone"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={activeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('all')}
                className="h-8 text-xs"
              >
                All
              </Button>
              <Button
                variant={activeFilter === 'unpaid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('unpaid')}
                className="h-8 text-xs"
              >
                <CreditCard className="h-3 w-3 mr-1" />
                Unpaid {filterCounts.unpaid > 0 && `(${filterCounts.unpaid})`}
              </Button>
              <Button
                variant={activeFilter === 'upcoming' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('upcoming')}
                className="h-8 text-xs"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Upcoming {filterCounts.upcoming > 0 && `(${filterCounts.upcoming})`}
              </Button>
              <Button
                variant={activeFilter === 'active_plan' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('active_plan')}
                className="h-8 text-xs"
              >
                <ClipboardListIcon className="h-3 w-3 mr-1" />
                Active Plan {filterCounts.active_plan > 0 && `(${filterCounts.active_plan})`}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-y-auto">
            {filteredPatients.map((patient) => (
              <PatientListItem
                key={patient.id}
                patient={patient}
                isSelected={selectedPatient?.id === patient.id}
                patientFlags={patientFlags[patient.id]}
                onClick={() => setSelectedPatient(patient)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Patient Details */}
      <div className="lg:col-span-2 space-y-6">
        {selectedPatient ? (
          <>
            {/* Patient Info Card */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedPatient.profile_picture_url || undefined} />
                      <AvatarFallback className="bg-dental-primary/10 text-dental-primary">
                        {selectedPatient.first_name?.[0]}{selectedPatient.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{selectedPatient.first_name} {selectedPatient.last_name}</span>
                        {patientFlags[selectedPatient.id]?.hasUnpaidBalance && (
                          <CreditCard className="h-4 w-4 text-red-500" />
                        )}
                        {selectedPatient.medical_history && selectedPatient.medical_history.toLowerCase().includes('allerg') && (
                          <Badge variant="destructive" className="text-[10px]">Allergies</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                        {selectedPatient.date_of_birth && (
                          <span>Age: {getAge(selectedPatient.date_of_birth) ?? '—'}</span>
                        )}
                        {patientFlags[selectedPatient.id]?.nextAppointmentDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Next: {format(new Date(patientFlags[selectedPatient.id]!.nextAppointmentDate as string), 'PPP p')}
                            {patientFlags[selectedPatient.id]?.nextAppointmentStatus && (
                              <Badge variant="outline" className="text-[10px] ml-1">{patientFlags[selectedPatient.id]!.nextAppointmentStatus}</Badge>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Form sheets for add/edit actions */}
                    <TreatmentPlanFormSheet
                      open={showTreatmentDialog}
                      onOpenChange={(open) => {
                        setShowTreatmentDialog(open);
                        if (!open) setEditingTreatmentId(null);
                      }}
                      form={treatmentForm}
                      onFormChange={setTreatmentForm}
                      onSubmit={handleAddTreatmentPlan}
                      isEditing={!!editingTreatmentId}
                    />

                    <PrescriptionFormSheet
                      open={showPrescriptionDialog}
                      onOpenChange={(open) => {
                        setShowPrescriptionDialog(open);
                        if (!open) setEditingPrescriptionId(null);
                      }}
                      form={prescriptionForm}
                      onFormChange={setPrescriptionForm}
                      onSubmit={handleAddPrescription}
                      isEditing={!!editingPrescriptionId}
                    />

                    <NoteFormSheet
                      open={showNoteDialog}
                      onOpenChange={(open) => {
                        setShowNoteDialog(open);
                        if (!open) setEditingNoteId(null);
                      }}
                      form={noteForm}
                      onFormChange={setNoteForm}
                      onSubmit={handleAddNote}
                      isEditing={!!editingNoteId}
                    />

                    {/* Unified + menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-2">
                          <Plus className="h-4 w-4" />
                          Add
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Quick Add</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setShowNoteDialog(true)}>Add Note</DropdownMenuItem>
                        {hasFeature('prescriptions') && (
                          <DropdownMenuItem onClick={() => setShowPrescriptionDialog(true)}>Add Prescription</DropdownMenuItem>
                        )}
                        {hasFeature('treatmentPlans') && (
                          <DropdownMenuItem onClick={() => setShowTreatmentDialog(true)}>Add Treatment Plan</DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {hasFeature('photoUpload') && (
                          <DropdownMenuItem onClick={() => setAccordionValue('files')}>Upload Image / File</DropdownMenuItem>
                        )}
                        {hasFeature('paymentRequests') && (
                          <DropdownMenuItem onClick={() => setShowPaymentDialog(true)}>Add Payment (request)</DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setAccordionValue('appointments')}>Book {t('appointment')}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm group">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`mailto:${selectedPatient.email}`}
                        className="hover:text-dental-primary hover:underline transition-colors"
                      >
                        {selectedPatient.email}
                      </a>
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </div>
                    {selectedPatient.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex items-center space-x-2 group flex-1">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={`tel:${selectedPatient.phone}`}
                            className="hover:text-dental-primary hover:underline transition-colors"
                          >
                            {selectedPatient.phone}
                          </a>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => window.open(`tel:${selectedPatient.phone}`, '_self')}
                            title="Call patient"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => window.open(`sms:${selectedPatient.phone}`, '_self')}
                            title="Send SMS"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                    {selectedPatient.address && (
                      <div className="flex items-center space-x-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedPatient.address}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {selectedPatient.date_of_birth && (
                      <div className="text-sm">
                        <span className="font-medium">Date of Birth:</span>
                        <p>{format(new Date(selectedPatient.date_of_birth), 'PPP')}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {patientFlags[selectedPatient.id]?.hasUnpaidBalance && (
                      <div className="text-sm">
                        <span className="font-medium">Outstanding:</span>
                        <p>€{((patientFlags[selectedPatient.id]?.outstandingCents || 0) / 100).toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>
                {/* Allergy Management Section */}
                <div className="mt-4 pt-4 border-t">
                  <AllergyManager
                    patientId={selectedPatient.id}
                    businessId={businessId || ''}
                  />
                </div>

                {selectedPatient.medical_history && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium text-sm mb-2">Medical History</h4>
                    <p className="text-sm bg-muted p-3 rounded-md">{sanitizeText(selectedPatient.medical_history)}</p>
                  </div>
                )}
                {/* Quick actions for booking and payment - Improved layout */}
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium text-sm mb-3">Quick Actions</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                      size="lg"
                      variant="outline"
                      disabled
                      className="h-12 rounded-xl"
                      title="Staff booking temporarily disabled - needs reimplementation with slot locking"
                    >
                      <Calendar className="h-5 w-5 mr-2" />
                      Book Appointment
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => setShowPaymentDialog(true)}
                      className="h-12 rounded-xl"
                    >
                      <CreditCard className="h-5 w-5 mr-2" />
                      Create Payment Request
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Patient Stats Overview */}
            <PatientStatsCard
              appointments={appointments}
              treatmentPlans={treatmentPlans}
              prescriptions={prescriptions}
              flags={patientFlags[selectedPatient.id]}
            />

            {/* Appointments Section */}
            <AppointmentsList
              appointments={appointments}
              onComplete={(appointmentId) => {
                const apt = appointments.find(a => a.id === appointmentId);
                if (apt) {
                  setCompletionAppointment(apt);
                  setShowCompletion(true);
                }
              }}
              onCancel={async (appointmentId) => {
                try {
                  const { error } = await supabase
                    .from('appointments')
                    .update({ status: 'cancelled' })
                    .eq('id', appointmentId);
                  if (error) throw error;
                  toast({ title: 'Appointment cancelled' });
                  if (selectedPatient) fetchPatientData(selectedPatient.id);
                } catch (error: unknown) {
                  toast({
                    title: 'Error',
                    description: error instanceof Error ? error.message : 'Failed to cancel',
                    variant: 'destructive'
                  });
                }
              }}
            />

            {/* Collapsible Sections */}
            <Accordion type="single" collapsible value={accordionValue} onValueChange={(val) => {
              setAccordionValue(val);
              if (selectedPatient) {
                setAccordionOpenByPatient(prev => ({ ...prev, [selectedPatient.id]: val }));
              }
            }} className="w-full">
              {hasFeature('prescriptions') && (
                <PrescriptionsSection
                  prescriptions={prescriptions}
                  onEdit={openEditPrescription}
                  onDelete={handleDeletePrescription}
                />
              )}

              {hasFeature('treatmentPlans') && (
                <TreatmentPlansSection
                  treatmentPlans={treatmentPlans}
                  onEdit={openEditTreatment}
                  onDelete={handleDeleteTreatment}
                />
              )}

              <AccordionItem value="payments">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-dental-primary" />
                        <span>Payments</span>
                        {patientFlags[selectedPatient.id]?.hasUnpaidBalance && (
                          <Badge variant="destructive">Due €{((patientFlags[selectedPatient.id]?.outstandingCents || 0) / 100).toFixed(2)}</Badge>
                        )}
                      </div>
                      <AccordionTrigger className="py-0" />
                    </CardTitle>
                  </CardHeader>
                  <AccordionContent>
                    <CardContent>
                      <div className="mb-3">
                        <Button size="sm" variant="outline" onClick={() => setShowPaymentDialog(true)}>
                          <CreditCard className="h-4 w-4 mr-1" /> Create Payment Request
                        </Button>
                      </div>
                      <PatientPaymentHistory patientId={selectedPatient.id} />
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>

              <AccordionItem value="notes">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-dental-primary" />
                        <span>Notes</span>
                        <Badge variant="outline">{notes.length}</Badge>
                      </div>
                      <AccordionTrigger className="py-0" />
                    </CardTitle>
                  </CardHeader>
                  <AccordionContent>
                    <CardContent>
                      {notes.length > 0 ? (
                        <div className="space-y-3">
                          {notes
                            .slice()
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                            .map((note) => (
                              <div key={note.id} className="p-3 border rounded-lg group">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <h4 className="font-medium">{note.title}</h4>
                                      {note.is_private && (
                                        <Badge variant="secondary" className="text-xs">Private</Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">{sanitizeText(note.content)}</p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                      {format(new Date(note.created_at), 'PPP p')}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100">
                                    <Button size="icon" variant="ghost" onClick={() => openEditNote(note)}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button size="icon" variant="ghost">
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete note?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDeleteNote(note.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">
                          No notes found
                        </p>
                      )}
                      <div className="pt-3 flex justify-end">
                        <Button size="sm" variant="ghost">View All</Button>
                      </div>
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>

              <AccordionItem value="files">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-dental-primary" />
                        <span>Images / Files</span>
                      </div>
                      <AccordionTrigger className="py-0" />
                    </CardTitle>
                  </CardHeader>
                  <AccordionContent>
                    <CardContent>
                      <div className="py-2">
                        <PhotoUpload onComplete={() => { }} onCancel={() => { }} />
                      </div>
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>

              <AccordionItem value="outcomes">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ClipboardListIcon className="h-5 w-5 text-dental-primary" />
                        <span>Appointment Outcomes</span>
                        <Badge variant="outline">{latestOutcome.length}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {lastAppointment && Math.abs(new Date(lastAppointment.appointment_date).getTime() - Date.now()) < 24 * 60 * 60 * 1000 && (
                          <Button size="sm" onClick={() => setShowCompletion(true)}>Complete Last Appointment</Button>
                        )}
                        <AccordionTrigger className="py-0" />
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <AccordionContent>
                    <CardContent>
                      {latestOutcome.length > 0 ? (
                        <div className="space-y-3">
                          {latestOutcome.map((o: any) => (
                            <div key={o.id} className="p-3 border rounded-lg">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Badge className="capitalize">{o.outcome}</Badge>
                                    <span className="text-xs text-muted-foreground">{new Date(o.appointments.appointment_date).toLocaleString()}</span>
                                  </div>
                                  {o.notes && (
                                    <p className="text-sm mt-2 bg-muted p-2 rounded">{sanitizeText(o.notes)}</p>
                                  )}
                                  {treatmentsByAppointment[o.appointments.id] && (
                                    <div className="mt-2 text-xs">
                                      <div className="font-medium mb-1">Performed treatments</div>
                                      <div className="space-y-1">
                                        {treatmentsByAppointment[o.appointments.id].map((t) => (
                                          <div key={t.id} className="flex justify-between">
                                            <span>{t.code} x{t.quantity}</span>
                                            <span>Patient €{(t.patient_share * t.quantity).toFixed(2)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No outcomes recorded</p>
                      )}
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            </Accordion>

            {(completionAppointment || lastAppointment) && (
              <CompletionSheet
                open={showCompletion}
                onOpenChange={(open) => {
                  setShowCompletion(open);
                  if (!open) setCompletionAppointment(null);
                }}
                appointment={{
                  id: (completionAppointment ?? lastAppointment)!.id,
                  patient_id: selectedPatient.id,
                  dentist_id: dentistId,
                  appointment_date: (completionAppointment ?? lastAppointment)!.appointment_date,
                  status: (completionAppointment ?? lastAppointment)!.status
                }}
                dentistId={dentistId}
                onCompleted={() => {
                  setShowCompletion(false);
                  setCompletionAppointment(null);
                  fetchPatientData(selectedPatient.id);
                  fetchPatientOutcomes(selectedPatient.id);
                }}
              />
            )}

            {/* Payment Request Side Sheet */}
            <Sheet open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
              <SheetContent side="right" className="sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Create Payment Request</SheetTitle>
                </SheetHeader>
                <PaymentRequestForm dentistId={dentistId} onClose={() => setShowPaymentDialog(false)} />
              </SheetContent>
            </Sheet>

            {/* Removed floating FAB; consolidated into + menu above */}
          </>
        ) : (
          <Card className="glass-card h-96">
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">Select a Patient</p>
                <p className="text-muted-foreground">
                  Choose a patient from the list to view their information and manage their care.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Export with error boundary for better stability
export const PatientManagement = withErrorBoundary(PatientManagementComponent);