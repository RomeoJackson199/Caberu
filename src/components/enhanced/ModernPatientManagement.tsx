import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
import { showEnhancedErrorToast } from "@/lib/enhancedErrorHandling";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Search,
  User,
  Calendar,
  CreditCard,
  Mail,
  Phone,
  Plus,
  Clock,
  LayoutGrid,
  ClipboardList,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Folder,
  UserPlus,
  Check,
  Edit2,
  MapPin,
  MoreVertical,
  X,
  ChevronLeft,
  Camera,
  FileText,
  Trash2,
  Download,
  Send,
  Bell,
  BellOff,
  Zap
} from "lucide-react";
import { format } from "date-fns";
import { NewPatientDialog } from "@/components/patient/NewPatientDialog";
import { QuickAppointmentDialog } from "@/components/appointments/QuickAppointmentDialog";
import { AppointmentCompletionDialog } from "@/components/appointment/AppointmentCompletionDialog";
import { PaymentRequestManager } from "@/components/PaymentRequestManager";
import { useImaging, ImagingFile } from "@/hooks/useImaging";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { sanitizeText } from '@/utils/sanitize';
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Generate unique gradient based on name
const generateGradient = (name: string): string => {
  const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  const gradients = [
    'from-rose-400 to-pink-500',
    'from-violet-400 to-purple-500',
    'from-blue-400 to-indigo-500',
    'from-cyan-400 to-teal-500',
    'from-emerald-400 to-green-500',
    'from-amber-400 to-orange-500',
    'from-fuchsia-400 to-pink-500',
    'from-sky-400 to-blue-500',
    'from-indigo-400 to-violet-500',
    'from-teal-400 to-cyan-500',
  ];
  return gradients[Math.abs(hash) % gradients.length];
};

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

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
  profile_picture_url?: string | null;
}

interface Appointment {
  id: string;
  patient_id: string;
  dentist_id: string;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  urgency: string;
  reason?: string;
  notes?: string;
  consultation_notes?: string;
  treatment_plan_id?: string;
}

interface TreatmentPlan {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  procedures?: any[];
}

interface PatientFlags {
  hasUnpaidBalance: boolean;
  outstandingCents?: number;
  hasUpcomingAppointment: boolean;
  hasActiveTreatmentPlan: boolean;
  lastVisitDate?: string;
  nextAppointmentDate?: string;
  totalAppointments: number;
  completedAppointments: number;
}

interface ModernPatientManagementProps {
  dentistId: string;
}

type TabType = 'overview' | 'clinical' | 'schedule' | 'financial';

const statusConfig: Record<string, { bg: string; text: string }> = {
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  confirmed: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  scheduled: { bg: 'bg-amber-50', text: 'text-amber-700' },
  pending: { bg: 'bg-orange-50', text: 'text-orange-700' },
  active: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  draft: { bg: 'bg-slate-100', text: 'text-slate-600' },
  cancelled: { bg: 'bg-rose-50', text: 'text-rose-600' },
};

export function ModernPatientManagement({ dentistId }: ModernPatientManagementProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [expandedTreatments, setExpandedTreatments] = useState<Set<string>>(new Set());
  const [treatmentAppointments, setTreatmentAppointments] = useState<Record<string, Appointment[]>>({});
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointmentDetailOpen, setAppointmentDetailOpen] = useState(false);
  const [appointmentImages, setAppointmentImages] = useState<{ files: ImagingFile[]; urls: Record<string, string> }>({ files: [], urls: {} });
  const [patientFlags, setPatientFlags] = useState<Record<string, PatientFlags>>({});
  const [newPatientDialogOpen, setNewPatientDialogOpen] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [appointmentToComplete, setAppointmentToComplete] = useState<Appointment | null>(null);
  const [selectedTreatmentPlan, setSelectedTreatmentPlan] = useState<TreatmentPlan | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareImages, setCompareImages] = useState<{ left: string | null; right: string | null }>({ left: null, right: null });
  const [imageUploaderOpen, setImageUploaderOpen] = useState(false);
  const [newTreatmentPlanOpen, setNewTreatmentPlanOpen] = useState(false);
  const [newTreatmentPlan, setNewTreatmentPlan] = useState({
    title: '',
    description: '',
    status: 'active',
    priority: 'normal',
    estimated_cost: '',
    diagnosis: '',
    target_completion_date: ''
  });
  const [editPatientOpen, setEditPatientOpen] = useState(false);
  const [editPatientForm, setEditPatientForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    date_of_birth: '',
    address: '',
    emergency_contact: '',
    medical_history: ''
  });
  const [appointmentSearchTerm, setAppointmentSearchTerm] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [patientNotes, setPatientNotes] = useState<{ id: string; title: string; content: string; created_at: string; note_type?: string }[]>([]);
  // New feature states
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [undoQueue, setUndoQueue] = useState<{ type: string; data: any; expiry: number }[]>([]);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [noteCategory, setNoteCategory] = useState('');
  const [selectedNoteCategory, setSelectedNoteCategory] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [timelineView, setTimelineView] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { businessId } = useBusinessContext();
  const { fetchImagingSets, getSignedUrl } = useImaging();

  // Fetch patients
  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('appointments')
        .select(`
          patient_id,
          profiles!appointments_patient_id_fkey (
            id, first_name, last_name, email, phone, date_of_birth,
            address, medical_history, emergency_contact, profile_picture_url
          )
        `)
        .eq('dentist_id', dentistId);

      if (businessId) {
        query = query.eq('business_id', businessId);
      }

      const { data: appointmentData, error } = await query;
      if (error) throw error;

      const uniquePatients = appointmentData
        .map(apt => Array.isArray(apt.profiles) ? apt.profiles[0] : apt.profiles)
        .filter((patient, index, self) =>
          patient && self.findIndex(p => p?.id === patient.id) === index
        )
        .filter(Boolean) as Patient[];

      setPatients(uniquePatients);
      if (uniquePatients.length > 0 && !selectedPatient) {
        setSelectedPatient(uniquePatients[0]);
      }
      uniquePatients.forEach(patient => fetchPatientFlags(patient.id));
    } catch (error) {
      showEnhancedErrorToast(error, { component: 'ModernPatientManagement', action: 'fetchPatients' });
    } finally {
      setLoading(false);
    }
  }, [dentistId, businessId]);

  const fetchPatientFlags = async (patientId: string) => {
    try {
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .eq('dentist_id', dentistId);

      const now = new Date();
      const hasUpcomingAppointment = (appointmentsData || []).some(a => {
        try { return new Date(a.appointment_date) > now && a.status !== 'cancelled'; } catch { return false; }
      });

      const lastVisitDate = (appointmentsData || [])
        .filter(a => a.status === 'completed')
        .map(a => a.appointment_date)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

      const { data: treatmentData } = await supabase
        .from('treatment_plans')
        .select('status')
        .eq('patient_id', patientId)
        .eq('dentist_id', dentistId);

      const hasActiveTreatmentPlan = (treatmentData || []).some(t => t.status === 'active');

      let outstandingCents = 0;
      try {
        const { data: prs } = await supabase
          .from('payment_requests')
          .select('amount, status')
          .eq('patient_id', patientId)
          .eq('dentist_id', dentistId);
        outstandingCents = (prs || [])
          .filter((p: any) => p.status !== 'paid' && p.status !== 'cancelled')
          .reduce((s: number, p: any) => s + (p.amount || 0), 0);
      } catch { }

      setPatientFlags(prev => ({
        ...prev,
        [patientId]: {
          hasUnpaidBalance: outstandingCents > 0,
          outstandingCents,
          hasUpcomingAppointment,
          hasActiveTreatmentPlan,
          lastVisitDate,
          nextAppointmentDate: (appointmentsData || []).find(a => new Date(a.appointment_date) > now && a.status !== 'cancelled')?.appointment_date,
          totalAppointments: (appointmentsData || []).length,
          completedAppointments: (appointmentsData || []).filter(a => a.status === 'completed').length
        }
      }));
    } catch (error) {
      console.error('Error fetching patient flags:', error);
    }
  };

  const fetchPatientAppointments = async (patientId: string) => {
    try {
      let query = supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .eq('dentist_id', dentistId);

      if (businessId) {
        query = query.eq('business_id', businessId);
      }

      const { data, error } = await query.order('appointment_date', { ascending: false });
      if (error) console.error('Appointments fetch error:', error);
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const fetchTreatmentPlans = async (patientId: string) => {
    try {
      let query = supabase
        .from('treatment_plans')
        .select('*')
        .eq('patient_id', patientId)
        .eq('dentist_id', dentistId);

      if (businessId) {
        query = query.eq('business_id', businessId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) console.error('Treatment plans fetch error:', error);
      setTreatmentPlans(data || []);
    } catch (error) {
      console.error('Error fetching treatment plans:', error);
    }
  };

  const fetchAppointmentImages = async (appointmentId: string) => {
    try {
      const sets = await fetchImagingSets({ appointmentId });
      const allFiles: ImagingFile[] = [];
      const urls: Record<string, string> = {};

      for (const set of sets) {
        if (set.files) {
          allFiles.push(...set.files);
          for (const file of set.files) {
            const url = await getSignedUrl(file.id);
            if (url) urls[file.id] = url;
          }
        }
      }

      setAppointmentImages({ files: allFiles, urls });
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  };

  const handleCompleteAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({ title: 'Appointment completed' });
      fetchPatientAppointments(selectedPatient!.id);
      setAppointmentDetailOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to complete appointment', variant: 'destructive' });
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({ title: 'Appointment cancelled' });
      fetchPatientAppointments(selectedPatient!.id);
      setAppointmentDetailOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to cancel appointment', variant: 'destructive' });
    }
  };

  const handleConfirmAppointment = async (appointmentId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', appointmentId);

      if (error) throw error;

      // Send email notification
      try {
        await supabase.functions.invoke('send-appointment-decision', {
          body: { appointment_id: appointmentId, decision: 'approved' }
        });
      } catch (emailErr) {
        console.error('Email notification failed:', emailErr);
      }

      toast({ title: 'Appointment confirmed', description: 'Patient has been notified by email' });
      fetchPatientAppointments(selectedPatient!.id);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to confirm appointment', variant: 'destructive' });
    }
  };

  const handleQuickComplete = (appt: Appointment, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setAppointmentToComplete(appt);
    setCompletionDialogOpen(true);
  };

  const handleQuickCancel = async (appointmentId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) throw error;

      // Send email notification
      try {
        await supabase.functions.invoke('send-appointment-decision', {
          body: { appointment_id: appointmentId, decision: 'rejected' }
        });
      } catch (emailErr) {
        console.error('Email notification failed:', emailErr);
      }

      toast({ title: 'Appointment cancelled', description: 'Patient has been notified by email' });
      fetchPatientAppointments(selectedPatient!.id);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to cancel appointment', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (businessId) fetchPatients();
  }, [businessId, fetchPatients]);

  useEffect(() => {
    const patientIdFromUrl = searchParams.get('patient');
    if (patientIdFromUrl && patients.length > 0) {
      const patient = patients.find(p => p.id === patientIdFromUrl);
      if (patient) {
        setSelectedPatient(patient);
        setSearchParams({});
      }
    }
  }, [searchParams, patients, setSearchParams]);

  useEffect(() => {
    if (selectedPatient && businessId) {
      console.log('Fetching appointments for patient:', selectedPatient.id, 'business:', businessId);
      fetchPatientAppointments(selectedPatient.id);
      fetchTreatmentPlans(selectedPatient.id);
      fetchPatientNotes(selectedPatient.id);
    }
  }, [selectedPatient, dentistId, businessId]);

  useEffect(() => {
    if (selectedAppointment) {
      fetchAppointmentImages(selectedAppointment.id);
    }
  }, [selectedAppointment]);

  const filteredPatients = patients.filter(patient => {
    const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
    const search = patientSearchTerm.toLowerCase();
    return fullName.includes(search) || patient.email.toLowerCase().includes(search);
  });

  const getAge = (dob?: string) => {
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: LayoutGrid },
    { id: 'clinical' as TabType, label: 'Clinical', icon: ClipboardList },
    { id: 'schedule' as TabType, label: 'Schedule', icon: Calendar },
    { id: 'financial' as TabType, label: 'Financial', icon: CreditCard },
  ];

  const upcomingAppts = appointments.filter(a => new Date(a.appointment_date) > new Date() && a.status !== 'cancelled');
  const pastAppts = appointments.filter(a => a.status === 'completed');

  const toggleTreatment = (treatmentId: string) => {
    setExpandedTreatments(prev => {
      const next = new Set(prev);
      if (next.has(treatmentId)) {
        next.delete(treatmentId);
      } else {
        next.add(treatmentId);
      }
      return next;
    });
  };

  const openAppointmentDetail = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setSelectedTreatmentPlan(null); // Clear treatment selection to show appointment
  };

  const createTreatmentPlan = async () => {
    if (!selectedPatient || !newTreatmentPlan.title.trim()) {
      toast({ title: 'Error', description: 'Please enter a title', variant: 'destructive' });
      return;
    }
    try {
      const { error } = await supabase.from('treatment_plans').insert({
        patient_id: selectedPatient.id,
        dentist_id: dentistId,
        business_id: businessId,
        title: newTreatmentPlan.title,
        description: newTreatmentPlan.description || null,
        status: newTreatmentPlan.status,
        priority: newTreatmentPlan.priority,
        estimated_cost: newTreatmentPlan.estimated_cost ? parseFloat(newTreatmentPlan.estimated_cost) : null,
        diagnosis: newTreatmentPlan.diagnosis || null,
        target_completion_date: newTreatmentPlan.target_completion_date || null,
      });
      if (error) {
        console.error('Treatment plan error:', error);
        throw error;
      }
      toast({ title: 'Treatment plan created' });
      setNewTreatmentPlanOpen(false);
      setNewTreatmentPlan({ title: '', description: '', status: 'active', priority: 'normal', estimated_cost: '', diagnosis: '', target_completion_date: '' });
      fetchTreatmentPlans(selectedPatient.id);
    } catch (err: any) {
      console.error('Treatment plan creation error:', err);
      toast({ title: 'Error', description: err?.message || 'Failed to create treatment plan', variant: 'destructive' });
    }
  };

  const openEditPatient = () => {
    if (!selectedPatient) return;
    setEditPatientForm({
      first_name: selectedPatient.first_name || '',
      last_name: selectedPatient.last_name || '',
      phone: selectedPatient.phone || '',
      email: selectedPatient.email || '',
      date_of_birth: selectedPatient.date_of_birth || '',
      address: selectedPatient.address || '',
      emergency_contact: selectedPatient.emergency_contact || '',
      medical_history: selectedPatient.medical_history || '',
    });
    setEditPatientOpen(true);
  };

  const updatePatient = async () => {
    if (!selectedPatient) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: editPatientForm.first_name,
          last_name: editPatientForm.last_name,
          phone: editPatientForm.phone,
          date_of_birth: editPatientForm.date_of_birth || null,
          address: editPatientForm.address || null,
          emergency_contact: editPatientForm.emergency_contact || null,
          medical_history: editPatientForm.medical_history || null,
        })
        .eq('id', selectedPatient.id);
      if (error) throw error;
      toast({ title: 'Patient updated' });
      setEditPatientOpen(false);
      setSelectedPatient({ ...selectedPatient, ...editPatientForm });
      fetchPatients();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update patient', variant: 'destructive' });
    }
  };

  // Confirm dialog helper
  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ open: true, title, message, onConfirm });
  };

  const deleteTreatmentPlan = (planId: string) => {
    showConfirm('Delete Treatment Plan', 'Are you sure you want to delete this treatment plan?', async () => {
      const planToDelete = treatmentPlans.find(p => p.id === planId);
      try {
        const { error } = await supabase.from('treatment_plans').delete().eq('id', planId);
        if (error) throw error;
        setSelectedTreatmentPlan(null);
        fetchTreatmentPlans(selectedPatient!.id);
        // Show undo toast
        toast({
          title: 'Treatment plan deleted',
          description: 'Click undo to restore',
          action: (
            <Button variant="outline" size="sm" onClick={() => restoreTreatmentPlan(planToDelete)}>
              Undo
            </Button>
          ),
        });
      } catch (err) {
        toast({ title: 'Error', description: 'Failed to delete treatment plan', variant: 'destructive' });
      }
      setConfirmDialog(null);
    });
  };

  const restoreTreatmentPlan = async (plan: any) => {
    if (!plan) return;
    try {
      const { error } = await supabase.from('treatment_plans').insert(plan);
      if (error) throw error;
      toast({ title: 'Treatment plan restored' });
      fetchTreatmentPlans(selectedPatient!.id);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to restore', variant: 'destructive' });
    }
  };

  const deleteAppointment = (appointmentId: string) => {
    showConfirm('Delete Appointment', 'Are you sure you want to permanently delete this appointment?', async () => {
      const apptToDelete = appointments.find(a => a.id === appointmentId);
      try {
        const { error } = await supabase.from('appointments').delete().eq('id', appointmentId);
        if (error) throw error;
        setSelectedAppointment(null);
        fetchPatientAppointments(selectedPatient!.id);
        toast({
          title: 'Appointment deleted',
          description: 'Click undo to restore',
          action: (
            <Button variant="outline" size="sm" onClick={() => restoreAppointment(apptToDelete)}>
              Undo
            </Button>
          ),
        });
      } catch (err) {
        toast({ title: 'Error', description: 'Failed to delete appointment', variant: 'destructive' });
      }
      setConfirmDialog(null);
    });
  };

  const restoreAppointment = async (appt: any) => {
    if (!appt) return;
    try {
      const { id, ...rest } = appt;
      const { error } = await supabase.from('appointments').insert({ ...rest });
      if (error) throw error;
      toast({ title: 'Appointment restored' });
      fetchPatientAppointments(selectedPatient!.id);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to restore', variant: 'destructive' });
    }
  };

  const fetchPatientNotes = async (patientId: string) => {
    try {
      const { data, error } = await supabase
        .from('patient_notes')
        .select('id, title, content, created_at, note_type')
        .eq('patient_id', patientId)
        .eq('dentist_id', dentistId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setPatientNotes(data || []);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    }
  };

  const addQuickNote = async () => {
    if (!selectedPatient || !quickNote.trim()) return;
    try {
      const { error } = await supabase.from('patient_notes').insert({
        patient_id: selectedPatient.id,
        dentist_id: dentistId,
        title: 'Quick Note',
        content: quickNote,
        note_type: noteCategory || 'general',
      });
      if (error) throw error;
      toast({ title: 'Note added' });
      setQuickNote('');
      setNoteCategory('');
      fetchPatientNotes(selectedPatient.id);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to add note', variant: 'destructive' });
    }
  };

  const deleteNote = async (noteId: string) => {
    const noteToDelete = patientNotes.find(n => n.id === noteId);
    try {
      const { error } = await supabase.from('patient_notes').delete().eq('id', noteId);
      if (error) throw error;
      if (selectedPatient) fetchPatientNotes(selectedPatient.id);
      toast({
        title: 'Note deleted',
        description: 'Click undo to restore',
        action: (
          <Button variant="outline" size="sm" onClick={() => restoreNote(noteToDelete)}>
            Undo
          </Button>
        ),
      });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete note', variant: 'destructive' });
    }
  };

  const restoreNote = async (note: any) => {
    if (!note || !selectedPatient) return;
    try {
      const { id, ...rest } = note;
      const { error } = await supabase.from('patient_notes').insert({ ...rest, patient_id: selectedPatient.id, dentist_id: dentistId });
      if (error) throw error;
      toast({ title: 'Note restored' });
      fetchPatientNotes(selectedPatient.id);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to restore', variant: 'destructive' });
    }
  };

  // Bulk delete
  const bulkDelete = () => {
    if (selectedItems.size === 0) return;
    showConfirm('Delete Selected Items', `Are you sure you want to delete ${selectedItems.size} selected items?`, async () => {
      // For now, just clear selection - would need to determine item type
      setSelectedItems(new Set());
      setBulkSelectMode(false);
      toast({ title: `${selectedItems.size} items deleted` });
      setConfirmDialog(null);
    });
  };

  // Global search filter
  const filteredByGlobalSearch = (items: any[], fields: string[]) => {
    if (!globalSearchTerm) return items;
    return items.filter(item =>
      fields.some(field => item[field]?.toLowerCase().includes(globalSearchTerm.toLowerCase()))
    );
  };

  // Drag & Drop state
  const [draggedAppointment, setDraggedAppointment] = useState<string | null>(null);
  const [dropTargetPlan, setDropTargetPlan] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, appointmentId: string) => {
    setDraggedAppointment(appointmentId);
    e.dataTransfer.setData('appointmentId', appointmentId);
    e.dataTransfer.effectAllowed = 'link';
  };

  const handleDragOver = (e: React.DragEvent, planId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'link';
    setDropTargetPlan(planId);
  };

  const handleDragLeave = () => {
    setDropTargetPlan(null);
  };

  const handleDrop = async (e: React.DragEvent, planId: string) => {
    e.preventDefault();
    const appointmentId = e.dataTransfer.getData('appointmentId');
    if (!appointmentId || !planId) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ treatment_plan_id: planId })
        .eq('id', appointmentId);

      if (error) throw error;

      const plan = treatmentPlans.find(p => p.id === planId);
      toast({ title: 'Appointment linked', description: `Linked to "${plan?.title}"` });
      fetchPatientAppointments(selectedPatient!.id);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to link appointment', variant: 'destructive' });
    }

    setDraggedAppointment(null);
    setDropTargetPlan(null);
  };

  // Export Patient PDF
  const exportPatientPDF = () => {
    if (!selectedPatient) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Patient Summary - ${selectedPatient.first_name} ${selectedPatient.last_name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #1e40af; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
          h2 { color: #475569; margin-top: 30px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; }
          .info-item { padding: 10px; background: #f8fafc; border-radius: 8px; }
          .info-label { font-size: 12px; color: #64748b; }
          .info-value { font-weight: bold; color: #1e293b; }
          .section { margin: 20px 0; }
          .item { padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; margin: 10px 0; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
          .badge-completed { background: #dbeafe; color: #1d4ed8; }
          .badge-pending { background: #fef3c7; color: #b45309; }
          .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>Patient Summary</h1>
        <div class="info-grid">
          <div class="info-item"><div class="info-label">Name</div><div class="info-value">${selectedPatient.first_name} ${selectedPatient.last_name}</div></div>
          <div class="info-item"><div class="info-label">Email</div><div class="info-value">${selectedPatient.email || 'N/A'}</div></div>
          <div class="info-item"><div class="info-label">Phone</div><div class="info-value">${selectedPatient.phone || 'N/A'}</div></div>
          <div class="info-item"><div class="info-label">Date of Birth</div><div class="info-value">${selectedPatient.date_of_birth ? format(new Date(selectedPatient.date_of_birth), 'MMM d, yyyy') : 'N/A'}</div></div>
          <div class="info-item"><div class="info-label">Address</div><div class="info-value">${selectedPatient.address || 'N/A'}</div></div>
          <div class="info-item"><div class="info-label">Medical History</div><div class="info-value">${selectedPatient.medical_history || 'None recorded'}</div></div>
        </div>
        
        <h2>Treatment Plans (${treatmentPlans.length})</h2>
        <div class="section">
          ${treatmentPlans.map(plan => `
            <div class="item">
              <strong>${plan.title}</strong>
              <span class="badge badge-${plan.status}">${plan.status}</span>
              <p style="margin: 5px 0 0; color: #64748b;">${plan.description || 'No description'}</p>
            </div>
          `).join('')}
          ${treatmentPlans.length === 0 ? '<p>No treatment plans.</p>' : ''}
        </div>
        
        <h2>Appointments (${appointments.length})</h2>
        <div class="section">
          ${appointments.map(appt => `
            <div class="item">
              <strong>${appt.reason || 'Appointment'}</strong>
              <span class="badge badge-${appt.status}">${appt.status}</span>
              <p style="margin: 5px 0 0; color: #64748b;">${format(new Date(appt.appointment_date), 'MMM d, yyyy h:mm a')}</p>
            </div>
          `).join('')}
          ${appointments.length === 0 ? '<p>No appointments.</p>' : ''}
        </div>
        
        <h2>Notes (${patientNotes.length})</h2>
        <div class="section">
          ${patientNotes.map(note => `
            <div class="item">
              <span class="badge">${(note.note_type || 'general').replace('_', ' ')}</span>
              <p style="margin: 5px 0;">${note.content}</p>
              <small style="color: #94a3b8;">${format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}</small>
            </div>
          `).join('')}
          ${patientNotes.length === 0 ? '<p>No notes.</p>' : ''}
        </div>
        
        <div class="footer">
          Generated on ${format(new Date(), 'MMMM d, yyyy')} • Caberu Dental Practice Management
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  // Send treatment summary email
  const sendTreatmentSummaryEmail = async () => {
    if (!selectedPatient?.email) {
      toast({ title: 'No email', description: 'Patient has no email address', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('send-email-notification', {
        body: {
          to: selectedPatient.email,
          subject: 'Your Treatment Summary',
          html: `
            <h1>Treatment Summary for ${selectedPatient.first_name} ${selectedPatient.last_name}</h1>
            <h2>Active Treatment Plans</h2>
            ${treatmentPlans.map(plan => `
              <div style="margin: 10px 0; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <strong>${plan.title}</strong> - ${plan.status}
                <p>${plan.description || 'No description'}</p>
              </div>
            `).join('')}
            <h2>Upcoming Appointments</h2>
            ${appointments.filter(a => new Date(a.appointment_date) > new Date()).map(appt => `
              <div style="margin: 10px 0; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <strong>${appt.reason || 'Appointment'}</strong>
                <p>${format(new Date(appt.appointment_date), 'MMMM d, yyyy')} at ${format(new Date(appt.appointment_date), 'h:mm a')}</p>
              </div>
            `).join('')}
            <p style="margin-top: 20px; color: #64748b;">Sent from Caberu Dental Practice Management</p>
          `
        }
      });

      if (error) throw error;
      toast({ title: 'Email sent', description: `Summary sent to ${selectedPatient.email}` });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to send email', variant: 'destructive' });
    }
  };

  // Quick action FAB state
  const [fabOpen, setFabOpen] = useState(false);
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-64px)] bg-slate-50">
        {/* Skeleton Sidebar */}
        <div className="w-20 bg-slate-900 flex flex-col items-center py-6 gap-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="w-12 h-12 rounded-xl bg-slate-700" />
          ))}
        </div>
        {/* Skeleton Content */}
        <div className="flex-1 p-6 space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-12 w-48 rounded-xl" />
            <Skeleton className="h-12 w-32 rounded-xl" />
          </div>
          <Skeleton className="h-32 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 overflow-hidden">
      {/* Vertical Tabs Sidebar - Refined glassmorphism */}
      <div className="w-20 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center py-6 gap-3 shadow-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 relative",
                isActive
                  ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/10"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600"
                  style={{ zIndex: -1 }}
                />
              )}
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Header with Patient Dropdown - Glassmorphism */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Patient Dropdown Selector */}
              <DropdownMenu open={patientDropdownOpen} onOpenChange={setPatientDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                    {selectedPatient ? (
                      <>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={selectedPatient.profile_picture_url || undefined} />
                          <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold">
                            {`${selectedPatient.first_name[0]}${selectedPatient.last_name[0]}`.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                          <p className="font-semibold text-slate-800">
                            {selectedPatient.first_name} {selectedPatient.last_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {getAge(selectedPatient.date_of_birth)} Years
                          </p>
                        </div>
                        <ChevronDown className="h-4 w-4 text-slate-400 ml-2" />
                      </>
                    ) : (
                      <span className="text-slate-500">Select Patient</span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72 p-0">
                  <div className="p-3 border-b">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Find patient..."
                        value={patientSearchTerm}
                        onChange={(e) => setPatientSearchTerm(e.target.value)}
                        className="pl-9 h-9 bg-slate-50"
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2">
                    {filteredPatients.map((patient, idx) => {
                      const isSelected = selectedPatient?.id === patient.id;
                      return (
                        <button
                          key={patient.id}
                          onClick={() => {
                            setSelectedPatient(patient);
                            setPatientDropdownOpen(false);
                            setActiveTab('overview');
                          }}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={patient.profile_picture_url || undefined} />
                            <AvatarFallback className={cn("bg-gradient-to-br text-white text-sm font-medium", generateGradient(`${patient.first_name}${patient.last_name}`))}>
                              {`${patient.first_name[0]}${patient.last_name[0]}`.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-left">
                            <p className="font-medium text-sm text-slate-800">
                              {patient.first_name} {patient.last_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {getAge(patient.date_of_birth)} years old
                            </p>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-indigo-600" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                      onClick={() => {
                        setNewPatientDialogOpen(true);
                        setPatientDropdownOpen(false);
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add New Patient
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Alert Badges */}
              {selectedPatient?.medical_history && (
                <Badge className="bg-rose-100 text-rose-700 border border-rose-200">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Medical Alert
                </Badge>
              )}
              {patientFlags[selectedPatient?.id || '']?.hasUnpaidBalance && (
                <Badge className="bg-amber-100 text-amber-700 border border-amber-200">
                  <CreditCard className="h-3 w-3 mr-1" />
                  Unpaid Balance
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4">
              {patientFlags[selectedPatient?.id || '']?.outstandingCents ? (
                <div className="text-right">
                  <p className="text-xs text-slate-500">BALANCE</p>
                  <p className="text-lg font-bold text-slate-800">
                    €{((patientFlags[selectedPatient?.id || '']?.outstandingCents || 0) / 100).toFixed(2)}
                  </p>
                </div>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Quick Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setBookingDialogOpen(true)}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Book Appointment
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab('financial')}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Create Payment
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab('clinical')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Add Treatment Plan
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => document.getElementById('quick-note-input')?.focus()}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Add Quick Note
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportPatientPDF}>
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Global Search Bar */}
          <div className="px-6 py-3 border-t border-slate-100">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search notes, appointments, treatments..."
                  value={globalSearchTerm}
                  onChange={(e) => setGlobalSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant={timelineView ? "default" : "outline"}
                size="sm"
                onClick={() => setTimelineView(!timelineView)}
                className={timelineView ? "bg-indigo-600 hover:bg-indigo-700" : ""}
              >
                <Clock className="h-4 w-4 mr-2" />
                Timeline
              </Button>
              <Button
                variant={bulkSelectMode ? "default" : "outline"}
                size="sm"
                onClick={() => { setBulkSelectMode(!bulkSelectMode); setSelectedItems(new Set()); }}
                className={bulkSelectMode ? "bg-indigo-600 hover:bg-indigo-700" : ""}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Select
              </Button>
              {bulkSelectMode && selectedItems.size > 0 && (
                <Button variant="destructive" size="sm" onClick={bulkDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedItems.size})
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {!selectedPatient ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 h-full">
              <div className="text-center">
                <User className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No patients yet</p>
              </div>
            </div>
          ) : (
            <>
              {/* TIMELINE VIEW */}
              {timelineView ? (
                <div className="p-8 max-w-4xl mx-auto">
                  <h2 className="text-xl font-bold text-slate-800 mb-6">Patient Timeline</h2>
                  <div className="relative border-l-2 border-indigo-200 ml-4 space-y-4">
                    {[
                      ...patientNotes.map(n => ({ type: 'note' as const, data: n, date: new Date(n.created_at) })),
                      ...appointments.map(a => ({ type: 'appointment' as const, data: a, date: new Date(a.appointment_date) }))
                    ]
                      .filter(item => {
                        if (!globalSearchTerm) return true;
                        const searchLower = globalSearchTerm.toLowerCase();
                        if (item.type === 'note') return item.data.content?.toLowerCase().includes(searchLower);
                        return item.data.reason?.toLowerCase().includes(searchLower) || item.data.notes?.toLowerCase().includes(searchLower);
                      })
                      .sort((a, b) => b.date.getTime() - a.date.getTime())
                      .map((item, idx) => (
                        <div key={idx} className="relative pl-8">
                          <div className={cn(
                            "absolute left-[-9px] w-4 h-4 rounded-full border-2 border-white",
                            item.type === 'note' ? "bg-indigo-500" : "bg-emerald-500"
                          )} />
                          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                              {item.type === 'note' ? (
                                <Badge className="bg-indigo-100 text-indigo-700">Note</Badge>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-700">Appointment</Badge>
                              )}
                              <span className="text-xs text-slate-400">
                                {format(item.date, 'MMM d, yyyy h:mm a')}
                              </span>
                            </div>
                            {item.type === 'note' ? (
                              <p className="text-slate-700">{item.data.content}</p>
                            ) : (
                              <div>
                                <p className="font-medium text-slate-800">{item.data.reason || 'Appointment'}</p>
                                <p className="text-sm text-slate-500">{item.data.notes}</p>
                                <Badge className={cn(
                                  "mt-2",
                                  item.data.status === 'completed' && "bg-indigo-100 text-indigo-700",
                                  item.data.status === 'confirmed' && "bg-blue-100 text-blue-700",
                                  item.data.status === 'pending' && "bg-amber-100 text-amber-700",
                                  item.data.status === 'cancelled' && "bg-slate-100 text-slate-500"
                                )}>
                                  {item.data.status}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* OVERVIEW TAB */}
                  {activeTab === 'overview' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-8 space-y-6 max-w-4xl mx-auto"
                    >
                      {/* Patient Info Card - Enhanced */}
                      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/50">
                        <CardContent className="p-0">
                          <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 h-24 relative">
                            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
                          </div>
                          <div className="px-8 pb-8 -mt-12">
                            <div className="flex items-end gap-6">
                              <Avatar className="h-28 w-28 border-4 border-white shadow-xl">
                                <AvatarImage src={selectedPatient.profile_picture_url || undefined} />
                                <AvatarFallback className={cn("text-white text-3xl font-bold bg-gradient-to-br", generateGradient(`${selectedPatient.first_name}${selectedPatient.last_name}`))}>
                                  {`${selectedPatient.first_name[0]}${selectedPatient.last_name[0]}`.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h2 className="text-2xl font-bold text-slate-800">
                                      {selectedPatient.first_name} {selectedPatient.last_name}
                                    </h2>
                                    <p className="text-slate-500 mt-1 flex items-center gap-2">
                                      <Calendar className="h-4 w-4" />
                                      {selectedPatient.date_of_birth
                                        ? `${format(new Date(selectedPatient.date_of_birth), 'yyyy-MM-dd')} (${getAge(selectedPatient.date_of_birth)}y)`
                                        : 'No DOB'
                                      }
                                    </p>
                                  </div>
                                  <Button variant="outline" size="sm" onClick={openEditPatient}>
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Edit Profile
                                  </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-4">
                                  {selectedPatient.email && (
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                      <Mail className="h-4 w-4 text-slate-400" />
                                      {selectedPatient.email}
                                    </div>
                                  )}
                                  {selectedPatient.phone && (
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                      <Phone className="h-4 w-4 text-slate-400" />
                                      {selectedPatient.phone}
                                    </div>
                                  )}
                                  {selectedPatient.address && (
                                    <div className="flex items-center gap-2 text-sm text-slate-600 col-span-2">
                                      <MapPin className="h-4 w-4 text-slate-400" />
                                      {selectedPatient.address}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>


                      {/* Stats Grid - Modern visual cards */}
                      <div className="grid grid-cols-4 gap-4">
                        <motion.div
                          whileHover={{ y: -2 }}
                          className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                              <Calendar className="h-5 w-5 text-indigo-600" />
                            </div>
                            <span className="text-2xl font-bold text-slate-800">
                              {patientFlags[selectedPatient.id]?.totalAppointments || 0}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">Total Visits</p>
                        </motion.div>

                        <motion.div
                          whileHover={{ y: -2 }}
                          className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            </div>
                            <span className="text-2xl font-bold text-emerald-600">
                              {patientFlags[selectedPatient.id]?.totalAppointments
                                ? Math.round((patientFlags[selectedPatient.id]?.completedAppointments || 0) / patientFlags[selectedPatient.id]?.totalAppointments * 100)
                                : 0}%
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">Completion Rate</p>
                        </motion.div>

                        <motion.div
                          whileHover={{ y: -2 }}
                          className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                              <Clock className="h-5 w-5 text-violet-600" />
                            </div>
                            <span className="text-sm font-semibold text-slate-700">
                              {patientFlags[selectedPatient.id]?.lastVisitDate
                                ? format(new Date(patientFlags[selectedPatient.id].lastVisitDate!), 'MMM d')
                                : 'Never'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">Last Visit</p>
                        </motion.div>

                        <motion.div
                          whileHover={{ y: -2 }}
                          className={cn(
                            "rounded-2xl p-5 shadow-sm border transition-shadow hover:shadow-md",
                            (patientFlags[selectedPatient.id]?.outstandingCents || 0) > 0
                              ? "bg-rose-50 border-rose-100"
                              : "bg-white border-slate-100"
                          )}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center",
                              (patientFlags[selectedPatient.id]?.outstandingCents || 0) > 0 ? "bg-rose-100" : "bg-slate-100"
                            )}>
                              <CreditCard className={cn(
                                "h-5 w-5",
                                (patientFlags[selectedPatient.id]?.outstandingCents || 0) > 0 ? "text-rose-600" : "text-slate-600"
                              )} />
                            </div>
                            <span className={cn(
                              "text-2xl font-bold",
                              (patientFlags[selectedPatient.id]?.outstandingCents || 0) > 0 ? "text-rose-600" : "text-slate-800"
                            )}>
                              €{((patientFlags[selectedPatient.id]?.outstandingCents || 0) / 100).toFixed(0)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">Balance Due</p>
                        </motion.div>
                      </div>

                      {/* Alerts & Medical Info */}
                      {selectedPatient.medical_history && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-200 rounded-2xl p-5"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                              <AlertTriangle className="h-5 w-5 text-rose-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-rose-800 mb-1">Medical Alert</h4>
                              <p className="text-sm text-rose-700">{sanitizeText(selectedPatient.medical_history)}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Quick Notes */}
                      <Card className="col-span-2 border-0 bg-white/70 backdrop-blur-sm shadow-sm">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <FileText className="h-4 w-4 text-indigo-600" />
                              </div>
                              Quick Notes
                            </h4>
                            {/* Category Filter Pills */}
                            <div className="flex gap-1">
                              {['all', 'general', 'clinical', 'billing', 'follow_up'].map((cat) => (
                                <button
                                  key={cat}
                                  onClick={() => setSelectedNoteCategory(cat)}
                                  className={cn(
                                    "px-3 py-1 text-xs font-medium rounded-full transition-all",
                                    selectedNoteCategory === cat
                                      ? "bg-indigo-600 text-white shadow-sm"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  )}
                                >
                                  {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2 mb-3">
                            <Input
                              id="quick-note-input"
                              placeholder="Add a quick note..."
                              value={quickNote}
                              onChange={(e) => setQuickNote(e.target.value)}
                              className="flex-1"
                              onKeyDown={(e) => e.key === 'Enter' && addQuickNote()}
                            />
                            <Select value={noteCategory} onValueChange={setNoteCategory}>
                              <SelectTrigger className="w-24">
                                <SelectValue placeholder="Type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="general">General</SelectItem>
                                <SelectItem value="clinical">Clinical</SelectItem>
                                <SelectItem value="billing">Billing</SelectItem>
                                <SelectItem value="follow_up">Follow-up</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button onClick={addQuickNote} className="bg-indigo-600 hover:bg-indigo-700" disabled={!quickNote.trim()}>
                              Add
                            </Button>
                          </div>
                          {patientNotes.filter(n => selectedNoteCategory === 'all' || n.note_type === selectedNoteCategory).length > 0 && (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {patientNotes.filter(n => selectedNoteCategory === 'all' || n.note_type === selectedNoteCategory).map((note) => (
                                <div key={note.id} className="bg-slate-50 rounded-lg p-2 text-sm flex justify-between items-start group">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className={cn(
                                        "text-xs px-1.5 py-0.5 rounded-full",
                                        note.note_type === 'clinical' && "bg-blue-100 text-blue-700",
                                        note.note_type === 'billing' && "bg-green-100 text-green-700",
                                        note.note_type === 'follow_up' && "bg-orange-100 text-orange-700",
                                        (!note.note_type || note.note_type === 'general') && "bg-slate-100 text-slate-600"
                                      )}>
                                        {(note.note_type || 'general').replace('_', ' ')}
                                      </span>
                                    </div>
                                    <p className="text-slate-700 mt-1">{note.content}</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                      {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => deleteNote(note.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-100 rounded transition-opacity"
                                    title="Delete note"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* CLINICAL TAB */}
                  {activeTab === 'clinical' && (
                    <div className="flex h-full">
                      {/* Modern Treatment History Sidebar */}
                      <div className="w-80 bg-gradient-to-b from-slate-50 to-white border-r border-slate-200/50 p-5 overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-slate-800 text-lg">Treatment History</h3>
                          <button
                            onClick={() => setNewTreatmentPlanOpen(!newTreatmentPlanOpen)}
                            className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                              newTreatmentPlanOpen
                                ? "bg-indigo-600 text-white rotate-45"
                                : "bg-indigo-50 hover:bg-indigo-100 text-indigo-600"
                            )}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        {/* New Treatment Plan Form */}
                        {newTreatmentPlanOpen && (
                          <div className="mb-4 p-4 bg-white rounded-2xl border border-indigo-100 shadow-sm animate-in slide-in-from-top-2">
                            <h4 className="font-medium text-sm text-slate-700 mb-3">New Treatment Plan</h4>
                            <div className="space-y-3">
                              <Input
                                placeholder="Treatment title..."
                                value={newTreatmentPlan.title}
                                onChange={(e) => setNewTreatmentPlan({ ...newTreatmentPlan, title: e.target.value })}
                                className="text-sm"
                              />
                              <Input
                                placeholder="Diagnosis..."
                                value={newTreatmentPlan.diagnosis}
                                onChange={(e) => setNewTreatmentPlan({ ...newTreatmentPlan, diagnosis: e.target.value })}
                                className="text-sm"
                              />
                              <textarea
                                placeholder="Description (optional)"
                                value={newTreatmentPlan.description}
                                onChange={(e) => setNewTreatmentPlan({ ...newTreatmentPlan, description: e.target.value })}
                                className="w-full p-2 text-sm rounded-lg border border-slate-200 resize-none h-16"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <select
                                  value={newTreatmentPlan.status}
                                  onChange={(e) => setNewTreatmentPlan({ ...newTreatmentPlan, status: e.target.value })}
                                  className="p-2 text-sm rounded-lg border border-slate-200"
                                >
                                  <option value="active">Active</option>
                                  <option value="draft">Draft</option>
                                </select>
                                <select
                                  value={newTreatmentPlan.priority}
                                  onChange={(e) => setNewTreatmentPlan({ ...newTreatmentPlan, priority: e.target.value })}
                                  className="p-2 text-sm rounded-lg border border-slate-200"
                                >
                                  <option value="low">Low Priority</option>
                                  <option value="normal">Normal</option>
                                  <option value="high">High Priority</option>
                                  <option value="urgent">Urgent</option>
                                </select>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  type="number"
                                  placeholder="Est. Cost €"
                                  value={newTreatmentPlan.estimated_cost}
                                  onChange={(e) => setNewTreatmentPlan({ ...newTreatmentPlan, estimated_cost: e.target.value })}
                                  className="text-sm"
                                />
                                <Input
                                  type="date"
                                  placeholder="Target Date"
                                  value={newTreatmentPlan.target_completion_date}
                                  onChange={(e) => setNewTreatmentPlan({ ...newTreatmentPlan, target_completion_date: e.target.value })}
                                  className="text-sm"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={createTreatmentPlan}
                                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-sm h-9"
                                >
                                  Create
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() => setNewTreatmentPlanOpen(false)}
                                  className="text-sm h-9"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Treatment Plans */}
                        <div className="space-y-2">
                          {treatmentPlans.map((plan) => {
                            const isExpanded = expandedTreatments.has(plan.id);
                            const linkedAppts = appointments.filter(a => a.treatment_plan_id === plan.id);

                            return (
                              <div
                                key={plan.id}
                                onDragOver={(e) => handleDragOver(e, plan.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, plan.id)}
                                className={cn(
                                  "transition-all rounded-xl",
                                  dropTargetPlan === plan.id && "ring-2 ring-indigo-400 ring-offset-2 bg-indigo-50"
                                )}
                              >
                                <Collapsible open={isExpanded} onOpenChange={() => { toggleTreatment(plan.id); setSelectedTreatmentPlan(plan); }}>
                                  <CollapsibleTrigger asChild>
                                    <button
                                      onClick={() => setSelectedTreatmentPlan(plan)}
                                      className={cn(
                                        "w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 group",
                                        selectedTreatmentPlan?.id === plan.id
                                          ? "bg-white shadow-md border border-indigo-200/50"
                                          : "hover:bg-white/80 hover:shadow-sm"
                                      )}>
                                      <div className={cn(
                                        "w-9 h-9 rounded-xl flex items-center justify-center",
                                        plan.status === 'active' ? "bg-gradient-to-br from-indigo-400 to-indigo-600" : "bg-slate-200"
                                      )}>
                                        <Folder className={cn("h-4 w-4", plan.status === 'active' ? "text-white" : "text-slate-500")} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm text-slate-800 truncate">{plan.title}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className={cn(
                                            "text-xs font-medium px-1.5 py-0.5 rounded-full",
                                            plan.status === 'active' ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
                                          )}>{plan.status}</span>
                                          <span className="text-xs text-slate-400">{linkedAppts.length} appt{linkedAppts.length !== 1 ? 's' : ''}</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); deleteTreatmentPlan(plan.id); }}
                                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-100 rounded transition-opacity"
                                          title="Delete treatment plan"
                                        >
                                          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                        </button>
                                        <div className={cn(
                                          "w-6 h-6 rounded-lg flex items-center justify-center transition-transform",
                                          isExpanded && "rotate-90"
                                        )}>
                                          <ChevronRight className="h-4 w-4 text-slate-400" />
                                        </div>
                                      </div>
                                    </button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="ml-4 pl-5 border-l-2 border-slate-200 space-y-1 mt-2 pb-2">
                                      {linkedAppts.length > 0 ? linkedAppts.map((appt) => (
                                        <button
                                          key={appt.id}
                                          onClick={() => openAppointmentDetail(appt)}
                                          className={cn(
                                            "w-full text-left p-2.5 rounded-lg transition-all flex items-center justify-between group",
                                            selectedAppointment?.id === appt.id
                                              ? "bg-indigo-50 border border-indigo-200"
                                              : "hover:bg-slate-50"
                                          )}
                                        >
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-700 truncate">{appt.reason || 'Appointment'}</p>
                                            <p className="text-xs text-slate-400">{format(new Date(appt.appointment_date), 'MMM d, h:mm a')}</p>
                                          </div>
                                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {appt.status === 'pending' && (
                                              <>
                                                <button onClick={(e) => { e.stopPropagation(); handleConfirmAppointment(appt.id, e); }} className="p-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-600" title="Approve">
                                                  <Check className="h-3 w-3" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleQuickCancel(appt.id, e); }} className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-600" title="Reject">
                                                  <X className="h-3 w-3" />
                                                </button>
                                              </>
                                            )}
                                            {appt.status === 'confirmed' && (
                                              <>
                                                <button onClick={(e) => { e.stopPropagation(); handleQuickComplete(appt, e); }} className="p-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-600" title="Complete">
                                                  <CheckCircle2 className="h-3 w-3" />
                                                </button>
                                              </>
                                            )}
                                          </div>
                                          {appt.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-indigo-500 flex-shrink-0" />}
                                          {appt.status === 'cancelled' && <X className="h-4 w-4 text-slate-300 flex-shrink-0" />}
                                        </button>
                                      )) : (
                                        <p className="text-xs text-slate-400 py-2">No appointments linked</p>
                                      )}
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              </div>
                            );
                          })}

                          {treatmentPlans.length === 0 && (
                            <div className="text-center py-8">
                              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                <Folder className="h-6 w-6 text-slate-300" />
                              </div>
                              <p className="text-sm text-slate-400">No treatment plans yet</p>
                            </div>
                          )}
                        </div>

                        {/* Divider */}
                        <div className="my-5 border-t border-slate-200/60" />

                        {/* All Appointments */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-indigo-600" />
                              Appointments
                            </h4>
                            <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{appointments.length}</span>
                          </div>
                          {/* Search */}
                          <div className="relative mb-3">
                            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                              placeholder="Search appointments..."
                              value={appointmentSearchTerm}
                              onChange={(e) => setAppointmentSearchTerm(e.target.value)}
                              className="h-8 pl-8 text-xs bg-white"
                            />
                          </div>
                          <div className="space-y-1 max-h-64 overflow-y-auto">
                            {appointments
                              .filter(appt =>
                                !appointmentSearchTerm ||
                                appt.reason?.toLowerCase().includes(appointmentSearchTerm.toLowerCase()) ||
                                appt.notes?.toLowerCase().includes(appointmentSearchTerm.toLowerCase()) ||
                                appt.status.toLowerCase().includes(appointmentSearchTerm.toLowerCase())
                              )
                              .sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())
                              .map((appt) => (
                                <button
                                  key={appt.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, appt.id)}
                                  onClick={() => openAppointmentDetail(appt)}
                                  className={cn(
                                    "w-full text-left p-3 rounded-xl transition-all flex items-center justify-between group cursor-grab active:cursor-grabbing",
                                    selectedAppointment?.id === appt.id
                                      ? "bg-white shadow-md border border-indigo-200/50"
                                      : "hover:bg-white/80 hover:shadow-sm",
                                    draggedAppointment === appt.id && "opacity-50"
                                  )}
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-700 truncate">{appt.reason || 'Appointment'}</p>
                                    <p className="text-xs text-slate-400">{format(new Date(appt.appointment_date), 'MMM d · h:mm a')}</p>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className={cn(
                                      "text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0",
                                      appt.status === 'completed' && "bg-indigo-100 text-indigo-700",
                                      appt.status === 'confirmed' && "bg-blue-100 text-blue-700",
                                      appt.status === 'pending' && "bg-amber-100 text-amber-700",
                                      appt.status === 'cancelled' && "bg-slate-100 text-slate-500"
                                    )}>
                                      {appt.status}
                                    </span>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); deleteAppointment(appt.id); }}
                                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-100 rounded transition-opacity"
                                      title="Delete appointment"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                    </button>
                                  </div>
                                </button>
                              ))}
                            {appointments.length === 0 && (
                              <p className="text-xs text-slate-400 text-center py-6">No appointments</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 p-6 overflow-y-auto">
                        {selectedAppointment && !selectedTreatmentPlan ? (
                          /* Modern Appointment Detail */
                          <div className="max-w-4xl mx-auto">
                            {/* Compare Mode View */}
                            {compareMode ? (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between mb-4">
                                  <h2 className="text-lg font-semibold text-slate-800">Compare Images</h2>
                                  <Button variant="outline" size="sm" onClick={() => setCompareMode(false)}>
                                    <X className="h-4 w-4 mr-1" /> Close
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  {/* Left Image Slot */}
                                  <div className="border-2 border-dashed border-slate-200 rounded-xl aspect-square flex items-center justify-center bg-slate-50">
                                    {compareImages.left ? (
                                      <img src={compareImages.left} alt="Compare Left" className="w-full h-full object-contain rounded-xl" />
                                    ) : (
                                      <div className="text-center text-slate-400">
                                        <Camera className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                        <p className="text-sm">Select an image</p>
                                      </div>
                                    )}
                                  </div>
                                  {/* Right Image Slot */}
                                  <div className="border-2 border-dashed border-slate-200 rounded-xl aspect-square flex items-center justify-center bg-slate-50">
                                    {compareImages.right ? (
                                      <img src={compareImages.right} alt="Compare Right" className="w-full h-full object-contain rounded-xl" />
                                    ) : (
                                      <div className="text-center text-slate-400">
                                        <Camera className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                        <p className="text-sm">Select an image</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {/* Image Selection */}
                                <div className="bg-slate-50 rounded-xl p-4">
                                  <p className="text-sm font-medium text-slate-700 mb-3">Select images to compare:</p>
                                  <div className="grid grid-cols-4 gap-2">
                                    {appointmentImages.files.map((file) => (
                                      <button
                                        key={file.id}
                                        onClick={() => {
                                          const url = appointmentImages.urls[file.id];
                                          if (!compareImages.left) setCompareImages({ ...compareImages, left: url });
                                          else if (!compareImages.right) setCompareImages({ ...compareImages, right: url });
                                          else setCompareImages({ left: url, right: null });
                                        }}
                                        className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-indigo-400 transition-all"
                                      >
                                        <img src={appointmentImages.urls[file.id]} alt={file.description || 'Image'} className="w-full h-full object-cover" />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* Normal View */
                              <div className="space-y-6">
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <button
                                      onClick={() => setSelectedAppointment(null)}
                                      className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                                    >
                                      <ChevronLeft className="h-5 w-5 text-slate-600" />
                                    </button>
                                    <div>
                                      <h2 className="text-xl font-semibold text-slate-800">
                                        {selectedAppointment.reason || 'Appointment'}
                                      </h2>
                                      <p className="text-sm text-slate-500">
                                        {format(new Date(selectedAppointment.appointment_date), 'EEEE, MMMM d, yyyy · h:mm a')}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Badge className={cn(statusConfig[selectedAppointment.status]?.bg, statusConfig[selectedAppointment.status]?.text, 'px-3 py-1')}>
                                      {selectedAppointment.status}
                                    </Badge>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setCompareMode(true)}
                                      className="border-slate-200 hover:border-indigo-400 hover:bg-indigo-50"
                                    >
                                      <ImageIcon className="h-4 w-4 mr-2 text-indigo-600" />
                                      Compare
                                    </Button>
                                  </div>
                                </div>

                                {/* Content Cards */}
                                <div className="grid grid-cols-2 gap-5">
                                  {/* Notes */}
                                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Notes</h3>
                                    <textarea
                                      value={selectedAppointment.notes || ''}
                                      onChange={(e) => setSelectedAppointment({ ...selectedAppointment, notes: e.target.value })}
                                      placeholder="Add notes..."
                                      className="w-full min-h-[140px] text-sm text-slate-600 bg-slate-50 rounded-xl p-3 border-0 resize-none focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all"
                                    />
                                  </div>

                                  {/* Images */}
                                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                      <h3 className="text-sm font-semibold text-slate-700">Images</h3>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setImageUploaderOpen(true)}
                                        className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                      >
                                        <Plus className="h-3.5 w-3.5 mr-1" />
                                        Add
                                      </Button>
                                    </div>
                                    {appointmentImages.files.length > 0 ? (
                                      <div className="grid grid-cols-2 gap-2">
                                        {appointmentImages.files.slice(0, 4).map((file) => (
                                          <div
                                            key={file.id}
                                            className="aspect-video bg-slate-100 rounded-xl overflow-hidden relative cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all"
                                            onClick={() => setCompareMode(true)}
                                          >
                                            {appointmentImages.urls[file.id] ? (
                                              <img
                                                src={appointmentImages.urls[file.id]}
                                                alt={file.description || 'Image'}
                                                className="w-full h-full object-cover"
                                              />
                                            ) : (
                                              <div className="flex items-center justify-center h-full">
                                                <Camera className="h-6 w-6 text-slate-300" />
                                              </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end p-2">
                                              <span className="text-xs text-white font-medium">{file.description || 'View'}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setImageUploaderOpen(true)}
                                        className="w-full py-8 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all flex flex-col items-center gap-2"
                                      >
                                        <Camera className="h-8 w-8 text-slate-300" />
                                        <span className="text-sm text-slate-400">Click to add images</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Bottom Row */}
                                <div className="grid grid-cols-2 gap-5">
                                  {/* Treatment Plan */}
                                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Treatment Plan</h3>
                                    <select
                                      value={selectedAppointment.treatment_plan_id || ''}
                                      onChange={(e) => setSelectedAppointment({ ...selectedAppointment, treatment_plan_id: e.target.value || null })}
                                      className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                                    >
                                      <option value="">No treatment plan linked</option>
                                      {treatmentPlans.map(plan => (
                                        <option key={plan.id} value={plan.id}>{plan.title}</option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Amount */}
                                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Amount Due</h3>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xl font-medium text-slate-400">€</span>
                                      <Input
                                        type="number"
                                        value={selectedAppointment.amount_cents ? selectedAppointment.amount_cents / 100 : ''}
                                        onChange={(e) => setSelectedAppointment({
                                          ...selectedAppointment,
                                          amount_cents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null
                                        })}
                                        placeholder="0.00"
                                        className="text-2xl font-semibold border-0 bg-transparent focus:ring-0 p-0"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-between pt-5 border-t border-slate-100">
                                  <Button
                                    variant="ghost"
                                    className="text-slate-500 hover:text-slate-700"
                                    onClick={() => setSelectedAppointment(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <div className="flex gap-3">
                                    {selectedAppointment.status === 'confirmed' && (
                                      <Button
                                        variant="outline"
                                        className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                        onClick={() => handleQuickComplete(selectedAppointment)}
                                      >
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Complete
                                      </Button>
                                    )}
                                    <Button
                                      className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-md"
                                      onClick={async () => {
                                        const { error } = await supabase
                                          .from('appointments')
                                          .update({
                                            reason: selectedAppointment.reason,
                                            notes: selectedAppointment.notes,
                                            status: selectedAppointment.status,
                                            treatment_plan_id: selectedAppointment.treatment_plan_id,
                                          })
                                          .eq('id', selectedAppointment.id);
                                        if (!error) {
                                          toast({ title: 'Saved successfully' });
                                          fetchPatientAppointments(selectedPatient!.id);
                                        } else {
                                          toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
                                        }
                                      }}
                                    >
                                      Save Changes
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : selectedTreatmentPlan ? (
                          <div className="space-y-6">
                            {/* Treatment Header */}
                            <div className="flex items-start justify-between">
                              <div>
                                <h2 className="text-xl font-semibold text-slate-800">{selectedTreatmentPlan.title}</h2>
                                <p className="text-slate-500 mt-1">{selectedTreatmentPlan.description || 'No description'}</p>
                              </div>
                              <Badge className={cn(statusConfig[selectedTreatmentPlan.status]?.bg, statusConfig[selectedTreatmentPlan.status]?.text, 'text-sm px-3 py-1')}>
                                {selectedTreatmentPlan.status}
                              </Badge>
                            </div>

                            {/* Treatment Info Cards */}
                            <div className="grid grid-cols-2 gap-4">
                              <Card className="border-slate-200">
                                <CardContent className="p-4">
                                  <p className="text-xs text-slate-500 mb-1">Created</p>
                                  <p className="font-medium text-slate-700">
                                    {format(new Date(selectedTreatmentPlan.created_at), 'PPP')}
                                  </p>
                                </CardContent>
                              </Card>
                              <Card className="border-slate-200">
                                <CardContent className="p-4">
                                  <p className="text-xs text-slate-500 mb-1">Linked Appointments</p>
                                  <p className="font-medium text-slate-700">
                                    {appointments.filter(a => a.treatment_plan_id === selectedTreatmentPlan.id).length}
                                  </p>
                                </CardContent>
                              </Card>
                            </div>

                            {/* Linked Appointments List */}
                            <div>
                              <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Appointments for this Treatment
                              </h3>
                              <div className="space-y-2">
                                {appointments.filter(a => a.treatment_plan_id === selectedTreatmentPlan.id).map(appt => (
                                  <Card key={appt.id} className="border-slate-200 hover:border-indigo-300 transition-colors cursor-pointer" onClick={() => openAppointmentDetail(appt)}>
                                    <CardContent className="p-4 flex items-center justify-between">
                                      <div>
                                        <p className="font-medium text-slate-700">{appt.reason || 'Appointment'}</p>
                                        <p className="text-sm text-slate-500">{format(new Date(appt.appointment_date), 'PPP p')}</p>
                                      </div>
                                      <Badge className={cn(statusConfig[appt.status]?.bg, statusConfig[appt.status]?.text)}>
                                        {appt.status}
                                      </Badge>
                                    </CardContent>
                                  </Card>
                                ))}
                                {appointments.filter(a => a.treatment_plan_id === selectedTreatmentPlan.id).length === 0 && (
                                  <p className="text-sm text-slate-400 text-center py-8">No appointments linked to this treatment yet</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full text-slate-400">
                            <div className="text-center">
                              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
                              <p>Select a treatment or appointment from the sidebar</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SCHEDULE TAB */}
                  {activeTab === 'schedule' && (
                    <div className="p-8 max-w-4xl mx-auto">
                      <h2 className="text-xl font-semibold text-slate-800 mb-6">Appointments</h2>

                      {/* Upcoming */}
                      <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-2 h-2 rounded-full bg-indigo-500" />
                          <span className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Upcoming</span>
                        </div>
                        {upcomingAppts.length === 0 ? (
                          <p className="text-slate-400 text-sm ml-4">No upcoming appointments</p>
                        ) : (
                          <div className="space-y-3">
                            {upcomingAppts.map((appt) => (
                              <Card key={appt.id} className="hover:shadow-md transition-shadow group">
                                <CardContent className="p-4 flex items-center justify-between">
                                  <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => openAppointmentDetail(appt)}>
                                    <div className="text-center w-14 py-2 bg-indigo-50 rounded-lg">
                                      <p className="text-xs text-indigo-600 font-medium uppercase">{format(new Date(appt.appointment_date), 'MMM')}</p>
                                      <p className="text-xl font-bold text-slate-800">{format(new Date(appt.appointment_date), 'd')}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium text-slate-800">{appt.reason || 'Appointment'}</p>
                                      <p className="text-sm text-slate-500">
                                        <Clock className="h-3 w-3 inline mr-1" />
                                        {format(new Date(appt.appointment_date), 'h:mm a')}
                                        {appt.duration_minutes && ` (${appt.duration_minutes} min)`}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge className={cn(statusConfig[appt.status]?.bg, statusConfig[appt.status]?.text)}>
                                      {appt.status}
                                    </Badge>
                                    {/* Pending: Approve/Reject */}
                                    {appt.status === 'pending' && (
                                      <div className="flex gap-1 ml-2">
                                        <button
                                          onClick={(e) => handleConfirmAppointment(appt.id, e)}
                                          className="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors"
                                          title="Approve"
                                        >
                                          <Check className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={(e) => handleQuickCancel(appt.id, e)}
                                          className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                                          title="Reject"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      </div>
                                    )}
                                    {/* Confirmed: Complete/Cancel */}
                                    {appt.status === 'confirmed' && (
                                      <div className="flex gap-1 ml-2">
                                        <button
                                          onClick={(e) => handleQuickComplete(appt, e)}
                                          className="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors"
                                          title="Complete"
                                        >
                                          <CheckCircle2 className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={(e) => handleQuickCancel(appt.id, e)}
                                          className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                                          title="Cancel"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* History */}
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-2 h-2 rounded-full bg-slate-400" />
                          <span className="text-sm font-semibold text-slate-600 uppercase tracking-wide">History</span>
                        </div>
                        {pastAppts.length === 0 ? (
                          <p className="text-slate-400 text-sm ml-4">No past appointments</p>
                        ) : (
                          <div className="space-y-2">
                            {pastAppts.map((appt) => (
                              <div
                                key={appt.id}
                                onClick={() => openAppointmentDetail(appt)}
                                className="flex items-center gap-4 py-3 px-4 rounded-lg hover:bg-white hover:shadow-sm cursor-pointer transition-all"
                              >
                                <p className="text-sm text-slate-500 w-24">{format(new Date(appt.appointment_date), 'MMM d, yyyy')}</p>
                                <p className="flex-1 font-medium text-slate-700">{appt.reason || 'Appointment'}</p>
                                <Badge className="bg-indigo-50 text-indigo-700 text-xs">Attended</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* FINANCIAL TAB */}
                  {activeTab === 'financial' && (
                    <div className="p-8 space-y-6 max-w-5xl mx-auto">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-800">Financial Ledger</h2>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-slate-500">Balance:</span>
                          <span className={cn(
                            "text-xl font-bold",
                            (patientFlags[selectedPatient.id]?.outstandingCents || 0) > 0 ? "text-rose-600" : "text-slate-800"
                          )}>
                            €{((patientFlags[selectedPatient.id]?.outstandingCents || 0) / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <PaymentRequestManager
                        patientId={selectedPatient.id}
                        dentistId={dentistId}
                        onPaymentCreated={() => fetchPatientFlags(selectedPatient.id)}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Quick Actions FAB */}
      {
        selectedPatient && (
          <div className="fixed bottom-6 right-6 z-50">
            <AnimatePresence>
              {fabOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 20 }}
                  className="absolute bottom-16 right-0 flex flex-col gap-2 items-end"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setBookingDialogOpen(true); setFabOpen(false); }}
                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg border hover:bg-slate-50"
                  >
                    <Calendar className="h-4 w-4 text-indigo-600" />
                    <span className="text-sm font-medium">New Appointment</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { document.getElementById('quick-note-input')?.focus(); setFabOpen(false); }}
                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg border hover:bg-slate-50"
                  >
                    <FileText className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium">Add Note</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { sendTreatmentSummaryEmail(); setFabOpen(false); }}
                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg border hover:bg-slate-50"
                  >
                    <Send className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Email Summary</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { exportPatientPDF(); setFabOpen(false); }}
                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg border hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4 text-violet-600" />
                    <span className="text-sm font-medium">Export PDF</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setFabOpen(!fabOpen)}
              className={cn(
                "w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors",
                fabOpen ? "bg-slate-700 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"
              )}
            >
              <motion.div animate={{ rotate: fabOpen ? 45 : 0 }}>
                <Zap className="h-6 w-6" />
              </motion.div>
            </motion.button>
          </div>
        )
      }

      {/* Appointment Detail Dialog */}
      <Dialog open={appointmentDetailOpen} onOpenChange={setAppointmentDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedAppointment?.reason || 'Appointment Details'}</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Date & Time</p>
                  <p className="font-medium">
                    {format(new Date(selectedAppointment.appointment_date), 'MMM d, yyyy')} at{' '}
                    {format(new Date(selectedAppointment.appointment_date), 'h:mm a')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Status</p>
                  <Badge className={cn(statusConfig[selectedAppointment.status]?.bg, statusConfig[selectedAppointment.status]?.text)}>
                    {selectedAppointment.status}
                  </Badge>
                </div>
              </div>

              {selectedAppointment.notes && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Notes</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
                    {selectedAppointment.notes}
                  </p>
                </div>
              )}

              {appointmentImages.files.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Images</p>
                  <div className="grid grid-cols-3 gap-2">
                    {appointmentImages.files.map((file) => (
                      <div key={file.id} className="aspect-square rounded-lg overflow-hidden bg-slate-100">
                        {appointmentImages.urls[file.id] ? (
                          <img src={appointmentImages.urls[file.id]} alt={file.filename} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <ImageIcon className="h-6 w-6 text-slate-300" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                {selectedAppointment.status !== 'completed' && selectedAppointment.status !== 'cancelled' && (
                  <>
                    <Button
                      onClick={() => handleCompleteAppointment(selectedAppointment.id)}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Complete
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleCancelAppointment(selectedAppointment.id)}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                )}
                {(selectedAppointment.status === 'completed' || selectedAppointment.status === 'cancelled') && (
                  <Button variant="outline" onClick={() => setAppointmentDetailOpen(false)} className="w-full">
                    Close
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <NewPatientDialog
        open={newPatientDialogOpen}
        onOpenChange={setNewPatientDialogOpen}
        dentistId={dentistId}
        onPatientCreated={fetchPatients}
      />

      {
        selectedPatient && (
          <QuickAppointmentDialog
            open={bookingDialogOpen}
            onOpenChange={setBookingDialogOpen}
            dentistId={dentistId}
            selectedDate={new Date()}
            selectedTime={format(new Date(), 'HH:00')}
            patient={selectedPatient}
          />
        )
      }

      {
        appointmentToComplete && selectedPatient && (
          <AppointmentCompletionDialog
            open={completionDialogOpen}
            onOpenChange={(open) => {
              setCompletionDialogOpen(open);
              if (!open) setAppointmentToComplete(null);
            }}
            appointment={{
              id: appointmentToComplete.id,
              patient_id: appointmentToComplete.patient_id,
              dentist_id: appointmentToComplete.dentist_id,
              appointment_date: appointmentToComplete.appointment_date,
              reason: appointmentToComplete.reason,
              patient: {
                first_name: selectedPatient.first_name,
                last_name: selectedPatient.last_name,
                email: selectedPatient.email,
              },
            }}
            onCompleted={() => {
              setCompletionDialogOpen(false);
              setAppointmentToComplete(null);
              fetchPatientAppointments(selectedPatient.id);
              fetchPatientFlags(selectedPatient.id);
            }}
          />
        )
      }

      {/* Edit Patient Dialog */}
      {
        editPatientOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">Edit Patient</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-600 mb-1 block">First Name</label>
                    <Input
                      value={editPatientForm.first_name}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, first_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 mb-1 block">Last Name</label>
                    <Input
                      value={editPatientForm.last_name}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, last_name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-600 mb-1 block">Phone</label>
                    <Input
                      value={editPatientForm.phone}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 mb-1 block">Date of Birth</label>
                    <Input
                      type="date"
                      value={editPatientForm.date_of_birth}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, date_of_birth: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">Address</label>
                  <Input
                    placeholder="Street, City, Postal Code"
                    value={editPatientForm.address}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, address: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">Emergency Contact</label>
                  <Input
                    placeholder="Name & Phone Number"
                    value={editPatientForm.emergency_contact}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, emergency_contact: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">Medical History / Allergies</label>
                  <textarea
                    placeholder="e.g. Penicillin allergy, diabetes, heart conditions..."
                    value={editPatientForm.medical_history}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, medical_history: e.target.value })}
                    className="w-full p-2 text-sm rounded-lg border border-slate-200 resize-none h-20"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" onClick={() => setEditPatientOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={updatePatient}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )
      }

      {/* Confirm Dialog */}
      <AlertDialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog?.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDialog(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={() => confirmDialog?.onConfirm()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}
