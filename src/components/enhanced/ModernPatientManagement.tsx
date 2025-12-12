import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  FileText,
  Plus,
  Activity,
  Clock,
  LayoutGrid,
  ClipboardList,
  Pill,
  Image as ImageIcon,
  Edit2,
  Save,
  X,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { NewPatientDialog } from "@/components/patient/NewPatientDialog";
import { QuickAppointmentDialog } from "@/components/appointments/QuickAppointmentDialog";
import { TreatmentPlanManager } from "@/components/TreatmentPlanManager";
import { PrescriptionManager } from "@/components/PrescriptionManager";
import { PaymentRequestManager } from "@/components/PaymentRequestManager";
import { ImagingGallery } from "@/components/imaging/ImagingGallery";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { sanitizeText } from '@/utils/sanitize';
import { cn } from "@/lib/utils";

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
  cancelled: { bg: 'bg-rose-50', text: 'text-rose-700' },
};

export function ModernPatientManagement({ dentistId }: ModernPatientManagementProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientFlags, setPatientFlags] = useState<Record<string, PatientFlags>>({});
  const [newPatientDialogOpen, setNewPatientDialogOpen] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { businessId } = useBusinessContext();

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
    }
  }, [selectedPatient, dentistId]);

  const filteredPatients = patients.filter(patient => {
    const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
    const search = searchTerm.toLowerCase();
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
  const pastAppts = appointments.filter(a => new Date(a.appointment_date) <= new Date() || a.status === 'completed');

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-50">
      {/* Patient List Sidebar */}
      <div className="w-72 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-slate-50 border-slate-200"
            />
          </div>
          <Button
            onClick={() => setNewPatientDialogOpen(true)}
            className="w-full mt-3 bg-teal-600 hover:bg-teal-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Patient
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No patients found</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredPatients.map((patient) => {
                const flags = patientFlags[patient.id];
                const isSelected = selectedPatient?.id === patient.id;
                const initials = `${patient.first_name[0]}${patient.last_name[0]}`.toUpperCase();

                return (
                  <button
                    key={patient.id}
                    onClick={() => {
                      setSelectedPatient(patient);
                      setActiveTab('overview');
                    }}
                    className={cn(
                      "w-full text-left p-3 rounded-lg transition-all flex items-center gap-3",
                      isSelected
                        ? "bg-teal-50 border-l-4 border-l-teal-500"
                        : "hover:bg-slate-50 border-l-4 border-l-transparent"
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={patient.profile_picture_url || undefined} />
                      <AvatarFallback className={cn(
                        "text-sm font-medium",
                        isSelected ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-600"
                      )}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-medium text-sm truncate", isSelected && "text-teal-700")}>
                        {patient.first_name} {patient.last_name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{patient.email}</p>
                    </div>
                    {flags?.hasUnpaidBalance && (
                      <div className="w-2 h-2 rounded-full bg-rose-500" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Vertical Tabs Sidebar */}
      {selectedPatient && (
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
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {!selectedPatient ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <User className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Select a patient</p>
              <p className="text-sm">Choose a patient from the list to view their profile</p>
            </div>
          </div>
        ) : (
          <>
            {/* Patient Header */}
            <div className="bg-white border-b px-8 py-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={selectedPatient.profile_picture_url || undefined} />
                    <AvatarFallback className="bg-teal-100 text-teal-700 text-xl font-semibold">
                      {`${selectedPatient.first_name[0]}${selectedPatient.last_name[0]}`.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </h1>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                      {selectedPatient.date_of_birth && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(selectedPatient.date_of_birth), 'MMM d, yyyy')}
                          <span className="text-slate-400">• {getAge(selectedPatient.date_of_birth)}y</span>
                        </span>
                      )}
                      {patientFlags[selectedPatient.id]?.nextAppointmentDate && (
                        <span className="flex items-center gap-1 text-teal-600">
                          <Clock className="h-3 w-3" />
                          Next: {format(new Date(patientFlags[selectedPatient.id].nextAppointmentDate!), 'MMM d, h:mm a')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {patientFlags[selectedPatient.id]?.hasUnpaidBalance && (
                    <Badge className="bg-rose-50 text-rose-700 border border-rose-200">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      €{((patientFlags[selectedPatient.id]?.outstandingCents || 0) / 100).toFixed(2)} Due
                    </Badge>
                  )}
                  <Button onClick={() => setBookingDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Book Appointment
                  </Button>
                </div>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-8">
              {activeTab === 'overview' && (
                <div className="space-y-6 max-w-5xl">
                  {/* Contact & Info Cards */}
                  <div className="grid grid-cols-2 gap-6">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium text-slate-700">Contact Information</CardTitle>
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

                    {selectedPatient.medical_history && (
                      <Card className="border-rose-200 bg-rose-50/30">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-medium text-rose-700 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Medical Alerts
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-slate-700">{sanitizeText(selectedPatient.medical_history)}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-4 gap-4">
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
                          <p className="text-xs text-slate-500">Total Visits</p>
                          <p className="text-lg font-semibold">{patientFlags[selectedPatient.id]?.totalAppointments || 0}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Last Visit</p>
                          <p className="text-lg font-semibold">
                            {patientFlags[selectedPatient.id]?.lastVisitDate
                              ? format(new Date(patientFlags[selectedPatient.id].lastVisitDate!), 'MMM d')
                              : '-'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-rose-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Balance</p>
                          <p className="text-lg font-semibold">
                            €{((patientFlags[selectedPatient.id]?.outstandingCents || 0) / 100).toFixed(2)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Upcoming Appointments */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-medium text-slate-700 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-teal-600" />
                        Upcoming Appointments
                      </CardTitle>
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
                <div className="space-y-8 max-w-6xl">
                  {/* Treatment Plans */}
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-teal-600" />
                      Treatment Plans
                    </h2>
                    <TreatmentPlanManager patientId={selectedPatient.id} dentistId={dentistId} />
                  </div>

                  {/* Prescriptions */}
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <Pill className="h-5 w-5 text-teal-600" />
                      Prescriptions
                    </h2>
                    <PrescriptionManager patientId={selectedPatient.id} dentistId={dentistId} mode="dentist" />
                  </div>

                  {/* Imaging */}
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-teal-600" />
                      Imaging
                    </h2>
                    <Card>
                      <CardContent className="p-6">
                        <ImagingGallery patientId={selectedPatient.id} />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === 'schedule' && (
                <div className="space-y-6 max-w-4xl">
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
                            <p className="text-sm text-slate-500 w-20">{format(new Date(appt.appointment_date), 'MMM d, yyyy')}</p>
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
                <div className="space-y-6 max-w-5xl">
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
            </div>
          </>
        )}
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
