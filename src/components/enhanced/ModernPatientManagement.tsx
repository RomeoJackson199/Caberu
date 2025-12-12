import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
import { showEnhancedErrorToast } from "@/lib/enhancedErrorHandling";
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
  X
} from "lucide-react";
import { format } from "date-fns";
import { NewPatientDialog } from "@/components/patient/NewPatientDialog";
import { QuickAppointmentDialog } from "@/components/appointments/QuickAppointmentDialog";
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
  completed: { bg: 'bg-teal-50', text: 'text-teal-700' },
  confirmed: { bg: 'bg-sky-50', text: 'text-sky-700' },
  scheduled: { bg: 'bg-amber-50', text: 'text-amber-700' },
  pending: { bg: 'bg-amber-50', text: 'text-amber-700' },
  active: { bg: 'bg-teal-50', text: 'text-teal-700' },
  draft: { bg: 'bg-slate-50', text: 'text-slate-700' },
  cancelled: { bg: 'bg-rose-50', text: 'text-rose-700' },
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
      const { data } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .eq('dentist_id', dentistId)
        .order('appointment_date', { ascending: false });
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const fetchTreatmentPlans = async (patientId: string) => {
    try {
      const { data } = await supabase
        .from('treatment_plans')
        .select('*')
        .eq('patient_id', patientId)
        .eq('dentist_id', dentistId)
        .order('created_at', { ascending: false });

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
    if (selectedPatient) {
      fetchPatientAppointments(selectedPatient.id);
      fetchTreatmentPlans(selectedPatient.id);
    }
  }, [selectedPatient, dentistId]);

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
    setAppointmentDetailOpen(true);
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading patients...</div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-50">
      {/* Vertical Tabs Sidebar */}
      <div className="w-20 bg-slate-900 flex flex-col items-center py-6 gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all",
                isActive
                  ? "bg-teal-500 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Header with Patient Dropdown */}
        <div className="bg-white border-b px-6 py-4">
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
                          <AvatarFallback className="bg-teal-100 text-teal-700 font-semibold">
                            {`${selectedPatient.first_name[0]}${selectedPatient.last_name[0]}`.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                          <p className="font-semibold text-slate-800">
                            {selectedPatient.first_name} {selectedPatient.last_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            #PT_{String(patients.indexOf(selectedPatient) + 1).padStart(2, '0')} • {getAge(selectedPatient.date_of_birth)} Years
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
                            <AvatarFallback className="bg-slate-100 text-slate-600 text-sm">
                              {`${patient.first_name[0]}${patient.last_name[0]}`.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-left">
                            <p className="font-medium text-sm text-slate-800">
                              {patient.first_name} {patient.last_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              #PT_{String(idx + 1).padStart(2, '0')} • {getAge(patient.date_of_birth)}y
                            </p>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-teal-600" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-teal-600 hover:text-teal-700 hover:bg-teal-50"
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
                  Penicillin
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
              <Button onClick={() => setBookingDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700">
                <Plus className="h-4 w-4 mr-2" />
                Action
              </Button>
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
              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <div className="p-8 space-y-6 max-w-4xl mx-auto">
                  {/* Patient Info Card */}
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-6">
                        <Avatar className="h-24 w-24">
                          <AvatarImage src={selectedPatient.profile_picture_url || undefined} />
                          <AvatarFallback className="bg-slate-200 text-slate-600 text-3xl font-semibold">
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
                            <Button variant="outline" size="sm">
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
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-2 gap-6">
                    {/* Alerts Card */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium text-slate-700 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-rose-500" />
                          Alerts
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedPatient.medical_history ? (
                          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-rose-600" />
                              <span className="font-medium text-rose-700">Penicillin</span>
                            </div>
                            <p className="text-sm text-rose-600 mt-1">
                              {sanitizeText(selectedPatient.medical_history)}
                            </p>
                          </div>
                        ) : (
                          <p className="text-slate-400 text-sm">No alerts</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium text-slate-700">Quick Info</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Total Visits</span>
                          <span className="font-semibold">{patientFlags[selectedPatient.id]?.totalAppointments || 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Completed</span>
                          <span className="font-semibold text-teal-600">{patientFlags[selectedPatient.id]?.completedAppointments || 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Last Visit</span>
                          <span className="font-semibold">
                            {patientFlags[selectedPatient.id]?.lastVisitDate
                              ? format(new Date(patientFlags[selectedPatient.id].lastVisitDate!), 'MMM d, yyyy')
                              : '-'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Balance</span>
                          <span className={cn("font-semibold", (patientFlags[selectedPatient.id]?.outstandingCents || 0) > 0 && "text-rose-600")}>
                            €{((patientFlags[selectedPatient.id]?.outstandingCents || 0) / 100).toFixed(2)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* CLINICAL TAB */}
              {activeTab === 'clinical' && (
                <div className="flex h-full">
                  {/* Treatment History Sidebar */}
                  <div className="w-80 bg-white border-r p-4 overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-700">Treatment History</h3>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-teal-600">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {treatmentPlans.map((plan) => {
                        const isExpanded = expandedTreatments.has(plan.id);
                        // Show all appointments for this patient under each treatment plan
                        const linkedAppts = appointments;

                        return (
                          <Collapsible key={plan.id} open={isExpanded} onOpenChange={() => toggleTreatment(plan.id)}>
                            <CollapsibleTrigger asChild>
                              <button className="w-full text-left p-3 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                                  <Folder className="h-4 w-4 text-teal-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm text-slate-800">{plan.title}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className={cn(
                                      "w-1.5 h-1.5 rounded-full",
                                      plan.status === 'active' ? "bg-teal-500" : "bg-slate-300"
                                    )} />
                                    <span className="text-xs text-slate-500 uppercase">{plan.status}</span>
                                  </div>
                                </div>
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-slate-400" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-slate-400" />
                                )}
                              </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="ml-11 space-y-1 mt-1">
                                {linkedAppts.length > 0 ? linkedAppts.map((appt) => (
                                  <button
                                    key={appt.id}
                                    onClick={() => openAppointmentDetail(appt)}
                                    className="w-full text-left p-2 rounded-lg hover:bg-slate-100 transition-all flex items-center justify-between"
                                  >
                                    <div>
                                      <p className="text-sm font-medium text-slate-700">{appt.reason || 'Appointment'}</p>
                                      <p className="text-xs text-slate-400">{format(new Date(appt.appointment_date), 'MMM d')}</p>
                                    </div>
                                    {appt.status === 'completed' && (
                                      <CheckCircle2 className="h-4 w-4 text-teal-500" />
                                    )}
                                  </button>
                                )) : (
                                  <p className="text-xs text-slate-400 p-2">No linked appointments</p>
                                )}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}

                      {treatmentPlans.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-8">No treatment plans yet</p>
                      )}
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Select a treatment or appointment from the sidebar</p>
                    </div>
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
                      <div className="w-2 h-2 rounded-full bg-teal-500" />
                      <span className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Upcoming</span>
                    </div>
                    {upcomingAppts.length === 0 ? (
                      <p className="text-slate-400 text-sm ml-4">No upcoming appointments</p>
                    ) : (
                      <div className="space-y-3">
                        {upcomingAppts.map((appt) => (
                          <Card key={appt.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openAppointmentDetail(appt)}>
                            <CardContent className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="text-center w-14 py-2 bg-teal-50 rounded-lg">
                                  <p className="text-xs text-teal-600 font-medium uppercase">{format(new Date(appt.appointment_date), 'MMM')}</p>
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
                              <div className="flex items-center gap-3">
                                <Badge className={cn(statusConfig[appt.status]?.bg, statusConfig[appt.status]?.text)}>
                                  {appt.status}
                                </Badge>
                                <ChevronRight className="h-5 w-5 text-slate-300" />
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
                            <Badge className="bg-teal-50 text-teal-700 text-xs">Attended</Badge>
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
        </div>
      </div>

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
                      className="flex-1 bg-teal-600 hover:bg-teal-700"
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

      {selectedPatient && (
        <QuickAppointmentDialog
          open={bookingDialogOpen}
          onOpenChange={setBookingDialogOpen}
          dentistId={dentistId}
          selectedDate={new Date()}
          selectedTime={format(new Date(), 'HH:00')}
          patient={selectedPatient}
        />
      )}
    </div>
  );
}
