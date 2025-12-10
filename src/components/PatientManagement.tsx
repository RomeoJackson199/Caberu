import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Search,
  User,
  Calendar,
  FileText,
  Plus,
  Pill,
  ClipboardList as ClipboardListIcon,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  CreditCard
} from "lucide-react";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PhotoUpload } from "@/components/PhotoUpload";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { CompletionSheet } from "@/components/CompletionSheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PatientPaymentHistory } from "@/components/PatientPaymentHistory";
import { PaymentRequestForm } from "@/components/PaymentRequestForm";
import { useNavigate } from "react-router-dom";
import { useBusinessTemplate } from "@/hooks/useBusinessTemplate";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { logger } from '@/lib/logger';
import { sanitizeText } from '@/utils/sanitize';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  medical_history?: string;
  emergency_contact?: string;
  profile_picture_url?: string;
}

interface Appointment {
  id: string;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  urgency: string;
  reason?: string;
  consultation_notes?: string;
}

interface TreatmentPlan {
  id: string;
  title: string;
  description?: string;
  diagnosis?: string;
  status: string;
  priority: string;
  estimated_cost?: number;
  estimated_duration_weeks?: number;
  start_date?: string;
  end_date?: string;
  notes?: string;
  created_at: string;
}

interface Prescription {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration_days?: number;
  instructions?: string;
  status: string;
  prescribed_date: string;
  created_at: string;
}

interface PatientNote {
  id: string;
  title: string;
  content: string;
  note_type: string;
  is_private: boolean;
  created_at: string;
}

interface PatientManagementProps {
  dentistId: string;
}

export function PatientManagement({ dentistId }: PatientManagementProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
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
  const [patientFlags, setPatientFlags] = useState<Record<string, {
    hasUnpaidBalance: boolean;
    outstandingCents?: number;
    hasUpcomingAppointment: boolean;
    hasActiveTreatmentPlan: boolean;
    lastVisitDate?: string;
    nextAppointmentDate?: string;
    nextAppointmentStatus?: string;
  }>>({});

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

      // Extract unique patients
      const uniquePatients = appointmentData
        .map(apt => apt.profiles)
        .filter((patient, index, self) =>
          patient && self.findIndex(p => p?.id === patient.id) === index
        )
        .filter(Boolean) as Patient[];

      setPatients(uniquePatients);
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
        .from('patient_notes')
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
      const hasActiveTreatmentPlan = (treatmentData || []).some(t => t.status === 'active');



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
    return fullName.includes(search)
      || patient.email.toLowerCase().includes(search)
      || (patient.phone || '').toLowerCase().includes(search)
      || patient.id.toLowerCase().includes(search);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAge = (dob?: string) => {
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
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
          .from('patient_notes')
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
          .from('patient_notes')
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
      const { error } = await supabase.from('patient_notes').delete().eq('id', id);
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

          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-y-auto">
            {filteredPatients.map((patient) => (
              <div
                key={patient.id}
                className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${selectedPatient?.id === patient.id ? 'bg-dental-primary/10 border-dental-primary' : ''
                  }`}
                onClick={() => setSelectedPatient(patient)}
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarImage src={patient.profile_picture_url || undefined} />
                    <AvatarFallback className="bg-dental-primary/10 text-dental-primary">
                      {patient.first_name?.[0]}{patient.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">
                        {patient.first_name} {patient.last_name}
                      </p>
                      {/* Medical alerts */}
                      {patient.medical_history && patient.medical_history.toLowerCase().includes('allerg') && (
                        <Badge variant="destructive" className="text-[10px] px-2 py-0.5">Allergies</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground truncate mt-1">
                      <span>{patient.phone || 'No phone'}</span>
                      {patientFlags[patient.id]?.lastVisitDate && (
                        <span>• Last: {format(new Date(patientFlags[patient.id]!.lastVisitDate as string), 'PP')}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      {patientFlags[patient.id]?.hasUpcomingAppointment && (
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5">Upcoming</Badge>
                      )}
                      {patientFlags[patient.id]?.hasActiveTreatmentPlan && (
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5">Active Plan</Badge>
                      )}
                      {patientFlags[patient.id]?.hasUnpaidBalance && (
                        <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
                          Unpaid {patientFlags[patient.id]?.outstandingCents ? `€${(patientFlags[patient.id]!.outstandingCents! / 100).toFixed(2)}` : ''}
                        </Badge>
                      )}

                    </div>
                  </div>
                </div>
              </div>
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
                    {/* Slide-up sheets for add actions (opened by + menu) */}
                    <Sheet open={showTreatmentDialog} onOpenChange={setShowTreatmentDialog}>
                      <SheetContent side="bottom" className="sm:max-w-lg">
                        <SheetHeader>
                          <SheetTitle>{editingTreatmentId ? 'Edit Treatment Plan' : 'Add Treatment Plan'}</SheetTitle>
                        </SheetHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="title">Title *</Label>
                            <Input
                              id="title"
                              value={treatmentForm.title}
                              onChange={(e) => setTreatmentForm(prev => ({ ...prev, title: e.target.value }))}
                              placeholder="e.g., Root Canal Treatment"
                            />
                          </div>
                          <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              value={treatmentForm.description}
                              onChange={(e) => setTreatmentForm(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Treatment details..."
                            />
                          </div>
                          <div>
                            <Label htmlFor="diagnosis">Diagnosis</Label>
                            <Textarea
                              id="diagnosis"
                              value={treatmentForm.diagnosis}
                              onChange={(e) => setTreatmentForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                              placeholder="Clinical findings and diagnosis..."
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="priority">Priority</Label>
                              <Select
                                value={treatmentForm.priority}
                                onValueChange={(value) => setTreatmentForm(prev => ({ ...prev, priority: value }))}
                              >
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
                            <div>
                              <Label htmlFor="cost">Estimated Cost ($)</Label>
                              <Input
                                id="cost"
                                type="number"
                                value={treatmentForm.estimated_cost}
                                onChange={(e) => setTreatmentForm(prev => ({ ...prev, estimated_cost: e.target.value }))}
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="duration">Duration (weeks)</Label>
                            <Input
                              id="duration"
                              type="number"
                              value={treatmentForm.estimated_duration_weeks}
                              onChange={(e) => setTreatmentForm(prev => ({ ...prev, estimated_duration_weeks: e.target.value }))}
                              placeholder="e.g., 4"
                            />
                          </div>
                          <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="outline" onClick={() => { setShowTreatmentDialog(false); setEditingTreatmentId(null); }}>
                              Cancel
                            </Button>
                            <Button onClick={handleAddTreatmentPlan} disabled={!treatmentForm.title}>
                              {editingTreatmentId ? 'Save Changes' : 'Add Treatment Plan'}
                            </Button>
                          </div>
                        </div>
                      </SheetContent>
                    </Sheet>

                    <Sheet open={showPrescriptionDialog} onOpenChange={setShowPrescriptionDialog}>
                      <SheetContent side="bottom" className="sm:max-w-lg">
                        <SheetHeader>
                          <SheetTitle>{editingPrescriptionId ? 'Edit Prescription' : 'Add Prescription'}</SheetTitle>
                        </SheetHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="medication">Medication Name *</Label>
                            <Input
                              id="medication"
                              value={prescriptionForm.medication_name}
                              onChange={(e) => setPrescriptionForm(prev => ({ ...prev, medication_name: e.target.value }))}
                              placeholder="e.g., Amoxicillin"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="dosage">Dosage *</Label>
                              <Input
                                id="dosage"
                                value={prescriptionForm.dosage}
                                onChange={(e) => setPrescriptionForm(prev => ({ ...prev, dosage: e.target.value }))}
                                placeholder="e.g., 500mg"
                              />
                            </div>
                            <div>
                              <Label htmlFor="frequency">Frequency *</Label>
                              <Input
                                id="frequency"
                                value={prescriptionForm.frequency}
                                onChange={(e) => setPrescriptionForm(prev => ({ ...prev, frequency: e.target.value }))}
                                placeholder="e.g., 3 times daily"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="duration_days">Duration (days)</Label>
                            <Input
                              id="duration_days"
                              type="number"
                              value={prescriptionForm.duration_days}
                              onChange={(e) => setPrescriptionForm(prev => ({ ...prev, duration_days: e.target.value }))}
                              placeholder="e.g., 7"
                            />
                          </div>
                          <div>
                            <Label htmlFor="instructions">Instructions</Label>
                            <Textarea
                              id="instructions"
                              value={prescriptionForm.instructions}
                              onChange={(e) => setPrescriptionForm(prev => ({ ...prev, instructions: e.target.value }))}
                              placeholder="Take with food, avoid alcohol, etc..."
                            />
                          </div>
                          <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="outline" onClick={() => { setShowPrescriptionDialog(false); setEditingPrescriptionId(null); }}>
                              Cancel
                            </Button>
                            <Button
                              onClick={handleAddPrescription}
                              disabled={!prescriptionForm.medication_name || !prescriptionForm.dosage || !prescriptionForm.frequency}
                            >
                              {editingPrescriptionId ? 'Save Changes' : 'Add Prescription'}
                            </Button>
                          </div>
                        </div>
                      </SheetContent>
                    </Sheet>

                    <Sheet open={showNoteDialog} onOpenChange={setShowNoteDialog}>
                      <SheetContent side="bottom" className="sm:max-w-lg">
                        <SheetHeader>
                          <SheetTitle>{editingNoteId ? 'Edit Note' : 'Add Note'}</SheetTitle>
                        </SheetHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="note_title">Title *</Label>
                            <Input
                              id="note_title"
                              value={noteForm.title}
                              onChange={(e) => setNoteForm(prev => ({ ...prev, title: e.target.value }))}
                              placeholder="Note title..."
                            />
                          </div>
                          <div>
                            <Label htmlFor="note_content">Content *</Label>
                            <Textarea
                              id="note_content"
                              value={noteForm.content}
                              onChange={(e) => setNoteForm(prev => ({ ...prev, content: e.target.value }))}
                              placeholder="Write your note here..."
                              className="min-h-[120px]"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="note_type">Type</Label>
                              <Select
                                value={noteForm.note_type}
                                onValueChange={(value) => setNoteForm(prev => ({ ...prev, note_type: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="general">General</SelectItem>
                                  <SelectItem value="consultation">Consultation</SelectItem>
                                  <SelectItem value="follow_up">Follow-up</SelectItem>
                                  <SelectItem value="reminder">Reminder</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center space-x-2 pt-6">
                              <input
                                type="checkbox"
                                id="private"
                                checked={noteForm.is_private}
                                onChange={(e) => setNoteForm(prev => ({ ...prev, is_private: e.target.checked }))}
                                className="rounded border-muted-foreground"
                              />
                              <Label htmlFor="private" className="text-sm">Private note</Label>
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="outline" onClick={() => { setShowNoteDialog(false); setEditingNoteId(null); }}>
                              Cancel
                            </Button>
                            <Button
                              onClick={handleAddNote}
                              disabled={!noteForm.title || !noteForm.content}
                            >
                              {editingNoteId ? 'Save Changes' : 'Add Note'}
                            </Button>
                          </div>
                        </div>
                      </SheetContent>
                    </Sheet>

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
                    <div className="flex items-center space-x-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedPatient.email}</span>
                    </div>
                    {selectedPatient.phone && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedPatient.phone}</span>
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
                {selectedPatient.medical_history && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium text-sm mb-2">Medical Alerts</h4>
                    <p className="text-sm bg-muted p-3 rounded-md">{selectedPatient.medical_history}</p>
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

            {/* Appointments Section - Custom Implementation */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-dental-primary" />
                  <span>Appointments</span>
                  <Badge variant="outline">{appointments.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {appointments.length > 0 ? (
                  <div className="space-y-3">
                    {appointments
                      .filter(apt => apt.status !== 'cancelled')
                      .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())
                      .slice(0, appointmentsPage === 1 ? 3 : 10)
                      .map((appointment) => (
                        <div key={appointment.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="font-medium">
                                  {format(new Date(appointment.appointment_date), 'PPP')}
                                </p>
                                <Badge className={getStatusColor(appointment.status)}>
                                  {appointment.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(appointment.appointment_date), 'p')}
                                {appointment.duration_minutes && ` • ${appointment.duration_minutes} minutes`}
                              </p>
                              {appointment.reason && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  Reason: {appointment.reason}
                                </p>
                              )}
                              {appointment.consultation_notes && (
                                <div className="mt-2 p-2 bg-muted rounded text-sm">
                                  {appointment.consultation_notes}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}

                    {appointments.filter(apt => apt.status !== 'cancelled').length > 3 && (
                      <div className="flex justify-center pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setAppointmentsPage(appointmentsPage === 1 ? 2 : 1)}
                        >
                          {appointmentsPage === 1 ? 'View All' : 'Show Less'}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No appointments found</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Collapsible Sections */}
            <Accordion type="single" collapsible value={accordionValue} onValueChange={(val) => {
              setAccordionValue(val);
              if (selectedPatient) {
                setAccordionOpenByPatient(prev => ({ ...prev, [selectedPatient.id]: val }));
              }
            }} className="w-full">
              {hasFeature('prescriptions') && (
                <AccordionItem value="prescriptions">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Pill className="h-5 w-5 text-dental-primary" />
                          <span>Prescriptions</span>
                          <Badge variant="outline">{prescriptions.length}</Badge>
                        </div>
                        <AccordionTrigger className="py-0" />
                      </CardTitle>
                    </CardHeader>
                    <AccordionContent>
                      <CardContent>
                        {prescriptions.length > 0 ? (
                          <div className="space-y-3">
                            {prescriptions
                              .slice()
                              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                              .map((prescription) => (
                                <div key={prescription.id} className="p-3 border rounded-lg group">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-medium">{prescription.medication_name}</h4>
                                        <Badge className={getStatusColor(prescription.status)}>
                                          {prescription.status}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {prescription.dosage} - {prescription.frequency}
                                      </p>
                                      {prescription.duration_days && (
                                        <p className="text-sm">Duration: {prescription.duration_days} days</p>
                                      )}
                                      {prescription.instructions && (
                                        <p className="text-sm mt-2 bg-muted p-2 rounded">
                                          {sanitizeText(prescription.instructions)}
                                        </p>
                                      )}
                                      <p className="text-xs text-muted-foreground mt-2">
                                        Prescribed: {format(new Date(prescription.prescribed_date), 'PPP')}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100">
                                      <Button size="icon" variant="ghost" onClick={() => openEditPrescription(prescription)}>
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
                                            <AlertDialogTitle>Delete prescription?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              This action cannot be undone.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeletePrescription(prescription.id)}>Delete</AlertDialogAction>
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
                            No prescriptions found
                          </p>
                        )}
                        <div className="pt-3 flex justify-end">
                          <Button size="sm" variant="ghost">View All</Button>
                        </div>
                      </CardContent>
                    </AccordionContent>
                  </Card>
                </AccordionItem>
              )}

              {hasFeature('treatmentPlans') && (
                <AccordionItem value="treatments">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ClipboardListIcon className="h-5 w-5 text-dental-primary" />
                          <span>Treatment Plans</span>
                          <Badge variant="outline">{treatmentPlans.length}</Badge>
                        </div>
                        <AccordionTrigger className="py-0" />
                      </CardTitle>
                    </CardHeader>
                    <AccordionContent>
                      <CardContent>
                        {treatmentPlans.length > 0 ? (
                          <div className="space-y-3">
                            {treatmentPlans
                              .slice()
                              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                              .map((plan) => (
                                <div key={plan.id} className="p-3 border rounded-lg group">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-medium">{plan.title}</h4>
                                        <Badge className={getStatusColor(plan.status)}>
                                          {plan.status}
                                        </Badge>
                                      </div>
                                      {plan.description && (
                                        <p className="text-sm text-muted-foreground mt-1">{sanitizeText(plan.description)}</p>
                                      )}
                                      {plan.diagnosis && (
                                        <p className="text-sm mt-2 bg-muted p-2 rounded">
                                          <span className="font-medium">Diagnosis:</span> {sanitizeText(plan.diagnosis)}
                                        </p>
                                      )}
                                      <div className="flex space-x-4 mt-2 text-sm">
                                        {plan.estimated_cost && (
                                          <span>Cost: ${plan.estimated_cost}</span>
                                        )}
                                        {plan.estimated_duration_weeks && (
                                          <span>Duration: {plan.estimated_duration_weeks} weeks</span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100">
                                      <Button size="icon" variant="ghost" onClick={() => openEditTreatment(plan)}>
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
                                            <AlertDialogTitle>Delete treatment plan?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              This action cannot be undone.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteTreatment(plan.id)}>Delete</AlertDialogAction>
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
                            No treatment plans found
                          </p>
                        )}
                        <div className="pt-3 flex justify-end">
                          <Button size="sm" variant="ghost">View All</Button>
                        </div>
                      </CardContent>
                    </AccordionContent>
                  </Card>
                </AccordionItem>
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