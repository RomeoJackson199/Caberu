import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  MapPin,
  Plus,
  Clock,
  LayoutGrid,
  ClipboardList,
  Pill,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  ChevronDown,
  Folder,
  UserPlus,
  Check
} from "lucide-react";
import { format } from "date-fns";
import { NewPatientDialog } from "@/components/patient/NewPatientDialog";
import { QuickAppointmentDialog } from "@/components/appointments/QuickAppointmentDialog";
import { PrescriptionManager } from "@/components/PrescriptionManager";
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
} from "@/components/ui/dropdown-menu";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string | null>(null);
  const [selectedProcedure, setSelectedProcedure] = useState<any | null>(null);
  const [treatmentImages, setTreatmentImages] = useState<{ files: ImagingFile[]; urls: Record<string, string> }>({ files: [], urls: {} });
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
      if (data && data.length > 0) {
        setSelectedTreatmentId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching treatment plans:', error);
    }
  };

  const fetchTreatmentImages = async (patientId: string) => {
    try {
      const sets = await fetchImagingSets({ patientId });
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

      setTreatmentImages({ files: allFiles, urls });
    } catch (error) {
      console.error('Error fetching images:', error);
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
      fetchTreatmentImages(selectedPatient.id);
    }
  }, [selectedPatient, dentistId]);

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

  const selectedTreatment = treatmentPlans.find(t => t.id === selectedTreatmentId);
  const upcomingAppts = appointments.filter(a => new Date(a.appointment_date) > new Date() && a.status !== 'cancelled');
  const pastAppts = appointments.filter(a => new Date(a.appointment_date) <= new Date() || a.status === 'completed');

  // Calculate treatment progress
  const completedProcedures = selectedTreatment?.procedures?.filter((p: any) => p.status === 'completed').length || 0;
  const totalProcedures = selectedTreatment?.procedures?.length || 1;
  const progressPercent = Math.round((completedProcedures / totalProcedures) * 100);

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
                            #PT_{patients.indexOf(selectedPatient) + 1} • {getAge(selectedPatient.date_of_birth)} Years
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
                    {filteredPatients.map((patient) => {
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
                              #PT_{patients.indexOf(patient) + 1} • {getAge(patient.date_of_birth)}y
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
              {activeTab === 'overview' && (
                <div className="p-8 space-y-6 max-w-5xl">
                  {/* Contact & Info Cards */}
                  <div className="grid grid-cols-2 gap-6">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium text-slate-700">Contact</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                          <Mail className="h-4 w-4 text-slate-400" />
                          <span>{selectedPatient.email}</span>
                        </div>
                        {selectedPatient.phone && (
                          <div className="flex items-center gap-3 text-sm">
                            <Phone className="h-4 w-4 text-slate-400" />
                            <span>{selectedPatient.phone}</span>
                          </div>
                        )}
                        {selectedPatient.address && (
                          <div className="flex items-center gap-3 text-sm">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            <span>{selectedPatient.address}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-teal-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Completed</p>
                            <p className="text-lg font-semibold">{patientFlags[selectedPatient.id]?.completedAppointments || 0}</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-sky-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Visits</p>
                            <p className="text-lg font-semibold">{patientFlags[selectedPatient.id]?.totalAppointments || 0}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Upcoming Appointments */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-medium text-slate-700">Upcoming</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {upcomingAppts.length === 0 ? (
                        <p className="text-sm text-slate-400">No upcoming appointments</p>
                      ) : (
                        <div className="space-y-3">
                          {upcomingAppts.slice(0, 3).map(appt => (
                            <div key={appt.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="text-center">
                                  <p className="text-xs text-teal-600 font-medium uppercase">{format(new Date(appt.appointment_date), 'MMM')}</p>
                                  <p className="text-xl font-bold text-slate-800">{format(new Date(appt.appointment_date), 'd')}</p>
                                </div>
                                <div>
                                  <p className="font-medium text-slate-800">{appt.reason || 'Appointment'}</p>
                                  <p className="text-sm text-slate-500">{format(new Date(appt.appointment_date), 'h:mm a')}</p>
                                </div>
                              </div>
                              <Badge className={cn(statusConfig[appt.status]?.bg, statusConfig[appt.status]?.text)}>
                                {appt.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'clinical' && (
                <div className="flex h-full">
                  {/* Treatment History Sidebar */}
                  <div className="w-72 bg-white border-r p-4 overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-700">Treatment History</h3>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-teal-600">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {treatmentPlans.map((plan) => (
                        <div key={plan.id} className="space-y-1">
                          <button
                            onClick={() => {
                              setSelectedTreatmentId(plan.id);
                              setSelectedProcedure(null);
                            }}
                            className={cn(
                              "w-full text-left p-3 rounded-lg transition-all",
                              selectedTreatmentId === plan.id && !selectedProcedure
                                ? "bg-teal-50 border-l-4 border-l-teal-500"
                                : "hover:bg-slate-50 border-l-4 border-l-transparent"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Folder className="h-4 w-4 text-teal-600" />
                              <span className="font-medium text-sm text-slate-800">{plan.title}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={cn(
                                "w-2 h-2 rounded-full",
                                plan.status === 'active' ? "bg-teal-500" : "bg-slate-300"
                              )} />
                              <span className="text-xs text-slate-500 uppercase">{plan.status}</span>
                            </div>
                          </button>

                          {/* Procedures under this treatment */}
                          {plan.procedures && plan.procedures.length > 0 && (
                            <div className="ml-6 space-y-1">
                              {plan.procedures.map((proc: any, idx: number) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    setSelectedTreatmentId(plan.id);
                                    setSelectedProcedure(proc);
                                  }}
                                  className={cn(
                                    "w-full text-left p-2 rounded-lg text-sm flex items-center justify-between transition-all",
                                    selectedProcedure?.name === proc.name
                                      ? "bg-slate-100"
                                      : "hover:bg-slate-50"
                                  )}
                                >
                                  <div>
                                    <p className="font-medium text-slate-700">{proc.name}</p>
                                    <p className="text-xs text-slate-400">{proc.date || 'Scheduled'}</p>
                                  </div>
                                  {proc.status === 'completed' && (
                                    <CheckCircle2 className="h-4 w-4 text-teal-500" />
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      {treatmentPlans.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-8">No treatment plans yet</p>
                      )}
                    </div>
                  </div>

                  {/* Treatment Detail Content */}
                  <div className="flex-1 p-6 overflow-y-auto">
                    {selectedTreatment ? (
                      <div className="space-y-6">
                        {/* Treatment Header */}
                        <div className="flex items-center gap-3">
                          <Folder className="h-5 w-5 text-teal-600" />
                          <h2 className="text-xl font-semibold text-slate-800">
                            {selectedProcedure ? selectedProcedure.name : selectedTreatment.title}
                          </h2>
                        </div>

                        {!selectedProcedure ? (
                          <>
                            {/* Plan Overview */}
                            <Card>
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                  <h3 className="font-semibold text-slate-700">Plan Overview</h3>
                                  <Badge className={cn(statusConfig[selectedTreatment.status]?.bg, statusConfig[selectedTreatment.status]?.text, "uppercase text-xs")}>
                                    {selectedTreatment.status}
                                  </Badge>
                                </div>
                                <p className="text-slate-600 mb-4">{selectedTreatment.description || 'No description'}</p>
                                <Progress value={progressPercent} className="h-2" />
                              </CardContent>
                            </Card>

                            {/* Gallery */}
                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium text-slate-700 flex items-center gap-2">
                                  <ImageIcon className="h-4 w-4" />
                                  Gallery
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                {treatmentImages.files.length > 0 ? (
                                  <div className="grid grid-cols-3 gap-4">
                                    {treatmentImages.files.slice(0, 6).map((file) => (
                                      <div
                                        key={file.id}
                                        className="relative aspect-square rounded-xl overflow-hidden bg-slate-200 cursor-pointer hover:ring-2 hover:ring-teal-300 transition-all"
                                      >
                                        {treatmentImages.urls[file.id] ? (
                                          <img
                                            src={treatmentImages.urls[file.id]}
                                            alt={file.filename}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="flex items-center justify-center h-full">
                                            <ImageIcon className="h-8 w-8 text-slate-400" />
                                          </div>
                                        )}
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                                          <p className="text-white text-sm font-medium truncate">{file.filename}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-8 text-slate-400">
                                    <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No images yet</p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </>
                        ) : (
                          /* Procedure Detail View */
                          <div className="grid grid-cols-2 gap-6">
                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium text-slate-700">Notes</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-slate-600">
                                  {selectedProcedure.notes || 'No notes for this procedure'}
                                </p>
                              </CardContent>
                            </Card>

                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium text-slate-700">Images</CardTitle>
                              </CardHeader>
                              <CardContent>
                                {treatmentImages.files.length > 0 ? (
                                  <div className="grid grid-cols-2 gap-3">
                                    {treatmentImages.files.slice(0, 4).map((file) => (
                                      <div
                                        key={file.id}
                                        className="relative aspect-square rounded-lg overflow-hidden bg-slate-200"
                                      >
                                        {treatmentImages.urls[file.id] ? (
                                          <img
                                            src={treatmentImages.urls[file.id]}
                                            alt={file.filename}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="flex items-center justify-center h-full">
                                            <ImageIcon className="h-6 w-6 text-slate-400" />
                                          </div>
                                        )}
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                          <p className="text-white text-xs truncate">{file.filename}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-6 text-slate-400">
                                    <ImageIcon className="h-6 w-6 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No images</p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400">
                        <div className="text-center">
                          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p>Select a treatment plan</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'schedule' && (
                <div className="p-8 space-y-6 max-w-4xl">
                  {/* Upcoming */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2 h-2 rounded-full bg-teal-500" />
                      <span className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Upcoming</span>
                    </div>
                    {upcomingAppts.length === 0 ? (
                      <p className="text-slate-400 text-sm ml-4">No upcoming appointments</p>
                    ) : (
                      <div className="space-y-3">
                        {upcomingAppts.map((appt) => (
                          <Card key={appt.id}>
                            <CardContent className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="text-center w-16">
                                  <p className="text-xs text-teal-600 font-medium uppercase">{format(new Date(appt.appointment_date), 'MMM')}</p>
                                  <p className="text-2xl font-bold text-slate-800">{format(new Date(appt.appointment_date), 'd')}</p>
                                </div>
                                <div>
                                  <p className="font-medium text-slate-800">{appt.reason || 'Appointment'}</p>
                                  <p className="text-sm text-slate-500">
                                    {format(new Date(appt.appointment_date), 'h:mm a')}
                                    {appt.duration_minutes && ` (${appt.duration_minutes} min)`}
                                  </p>
                                </div>
                              </div>
                              <Badge className={cn(statusConfig[appt.status]?.bg, statusConfig[appt.status]?.text)}>
                                {appt.status}
                              </Badge>
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
                          <div key={appt.id} className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0">
                            <p className="text-sm text-slate-500 w-20">{format(new Date(appt.appointment_date), 'MMM d')}</p>
                            <p className="flex-1 font-medium text-slate-700">{appt.reason || 'Appointment'}</p>
                            <Badge className={cn(statusConfig[appt.status]?.bg, statusConfig[appt.status]?.text, "text-xs")}>
                              {appt.status === 'completed' ? 'Attended' : appt.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'financial' && (
                <div className="p-8 space-y-6 max-w-5xl">
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
