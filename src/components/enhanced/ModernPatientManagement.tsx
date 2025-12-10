import { useState, useEffect } from "react";
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
  MapPin,
  FileText,
  Plus,
  Activity,
  TrendingUp,
  Eye as EyeIcon,
  ClipboardList as ClipboardListIcon
} from "lucide-react";
import { format } from "date-fns";
import { NewPatientDialog } from "@/components/patient/NewPatientDialog";
import { PatientDetailsTabs } from "./PatientDetailsTabs";
import { QuickAppointmentDialog } from "@/components/appointments/QuickAppointmentDialog";
import { logger } from '@/lib/logger';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useBusinessContext } from '@/hooks/useBusinessContext';

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
  consultation_notes?: string;
}

interface PatientFlags {
  hasUnpaidBalance: boolean;
  outstandingCents?: number;
  hasUpcomingAppointment: boolean;
  hasActiveTreatmentPlan: boolean;
  lastVisitDate?: string;
  nextAppointmentDate?: string;
  nextAppointmentStatus?: string;
  totalAppointments: number;
  completedAppointments: number;
}

interface ModernPatientManagementProps {
  dentistId: string;
}

export function ModernPatientManagement({ dentistId }: ModernPatientManagementProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientFlags, setPatientFlags] = useState<Record<string, PatientFlags>>({});
  const [newPatientDialogOpen, setNewPatientDialogOpen] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { businessId } = useBusinessContext();

  useEffect(() => {
    if (businessId) fetchPatients();
  }, [dentistId, businessId]);

  // Handle URL query parameter for patient selection
  useEffect(() => {
    const patientIdFromUrl = searchParams.get('patient');
    if (patientIdFromUrl && patients.length > 0) {
      const patientToSelect = patients.find(p => p.id === patientIdFromUrl);
      if (patientToSelect) {
        setSelectedPatient(patientToSelect);
        // Clear the query parameter after selecting
        setSearchParams({});
      }
    }
  }, [searchParams, patients]);

  useEffect(() => {
    if (selectedPatient) {
      fetchPatientData(selectedPatient.id);
    }
  }, [selectedPatient, dentistId]);

  const fetchPatients = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('appointments')
        .select(`
          patient_id,
          profiles!appointments_patient_id_fkey (
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
        .eq('dentist_id', dentistId);

      // Multi-tenant isolation - only filter if we have a business context
      if (businessId) {
        query = query.eq('business_id', businessId);
      }

      const { data: appointmentData, error: appointmentError } = await query;

      if (appointmentError) throw appointmentError;

      const uniquePatients = appointmentData
        .map(apt => Array.isArray(apt.profiles) ? apt.profiles[0] : apt.profiles)
        .filter((patient, index, self) =>
          patient && self.findIndex(p => p?.id === patient.id) === index
        )
        .filter(Boolean) as Patient[];

      setPatients(uniquePatients);

      // Fetch flags for all patients
      uniquePatients.forEach(patient => {
        fetchPatientFlags(patient.id);
      });
    } catch (error: unknown) {
      showEnhancedErrorToast(error, {
        component: 'ModernPatientManagement',
        action: 'fetchPatients',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientFlags = async (patientId: string) => {
    try {
      // Fetch appointments
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

      const nextAppointment = (appointmentsData || [])
        .filter(a => {
          try { return new Date(a.appointment_date) > now && a.status !== 'cancelled'; } catch { return false; }
        })
        .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())[0];

      // Fetch treatment plans
      const { data: treatmentData } = await supabase
        .from('treatment_plans')
        .select('status')
        .eq('patient_id', patientId)
        .eq('dentist_id', dentistId);

      const hasActiveTreatmentPlan = (treatmentData || []).some(t => t.status === 'active');

      // Fetch payment info
      let outstandingCents = 0;
      try {
        const { data: prs } = await supabase
          .from('payment_requests')
          .select('amount, status')
          .eq('patient_id', patientId)
          .eq('dentist_id', dentistId);
        outstandingCents += (prs || [])
          .filter((p: any) => p.status !== 'paid' && p.status !== 'cancelled')
          .reduce((s: number, p: any) => s + (p.amount || 0), 0);
      } catch { }

      const hasUnpaidBalance = outstandingCents > 0;
      const totalAppointments = (appointmentsData || []).length;
      const completedAppointments = (appointmentsData || []).filter(a => a.status === 'completed').length;

      setPatientFlags(prev => ({
        ...prev,
        [patientId]: {
          hasUnpaidBalance,
          outstandingCents,
          hasUpcomingAppointment,
          hasActiveTreatmentPlan,
          lastVisitDate,
          nextAppointmentDate: nextAppointment?.appointment_date,
          nextAppointmentStatus: nextAppointment?.status,
          totalAppointments,
          completedAppointments
        }
      }));
    } catch (error) {
      console.error('Error fetching patient flags:', error);
    }
  };

  const fetchPatientData = async (patientId: string) => {
    try {
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .eq('dentist_id', dentistId)
        .order('appointment_date', { ascending: false });

      setAppointments(appointmentsData || []);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch patient data",
        variant: "destructive",
      });
    }
  };

  const filteredPatients = patients.filter(patient => {
    const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search)
      || patient.email.toLowerCase().includes(search)
      || (patient.phone || '').toLowerCase().includes(search);
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

  const stats = {
    totalPatients: patients.length,
    activeTreatments: Object.values(patientFlags).filter(f => f.hasActiveTreatmentPlan).length,
    upcomingAppointments: Object.values(patientFlags).filter(f => f.hasUpcomingAppointment).length,
    pendingPayments: Object.values(patientFlags).filter(f => f.hasUnpaidBalance).length
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 sm:p-6 space-y-6">
      {/* Modern Header with Stats */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-text bg-clip-text text-transparent flex items-center gap-3">
              <div className="bg-primary/10 p-3 rounded-2xl">
                <Users className="h-7 w-7 text-primary" />
              </div>
              Patient Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage and track your patient records
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-96">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm"
              />
            </div>
            <Button
              onClick={() => setNewPatientDialogOpen(true)}
              size="lg"
              className="h-12 px-6 rounded-xl"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Patient
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border/50 hover:shadow-elegant transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Patients</p>
                  <p className="text-3xl font-bold mt-1 text-foreground">{stats.totalPatients}</p>
                </div>
                <div className="bg-primary/10 p-3 rounded-xl">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 hover:shadow-elegant transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Treatments</p>
                  <p className="text-3xl font-bold mt-1 text-foreground">{stats.activeTreatments}</p>
                </div>
                <div className="bg-blue-500/10 p-3 rounded-xl">
                  <Activity className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 hover:shadow-elegant transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Upcoming Appts</p>
                  <p className="text-3xl font-bold mt-1 text-foreground">{stats.upcomingAppointments}</p>
                </div>
                <div className="bg-green-500/10 p-3 rounded-xl">
                  <Calendar className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 hover:shadow-elegant transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
                  <p className="text-3xl font-bold mt-1 text-foreground">{stats.pendingPayments}</p>
                </div>
                <div className="bg-orange-500/10 p-3 rounded-xl">
                  <CreditCard className="h-6 w-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Modern Patient List */}
        <div className="lg:col-span-1">
          <Card className="bg-card border-border/50 h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Patients</span>
                <Badge variant="secondary" className="rounded-full">
                  {filteredPatients.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[calc(100vh-380px)] overflow-y-auto px-4 pb-4 space-y-2">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-pulse space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 bg-muted/50 rounded-xl" />
                      ))}
                    </div>
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="bg-muted/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium">No patients found</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">Try adjusting your search</p>
                  </div>
                ) : (
                  filteredPatients.map((patient) => {
                    const flags = patientFlags[patient.id] || { hasUnpaidBalance: false, hasUpcomingAppointment: false, hasActiveTreatmentPlan: false, totalAppointments: 0, completedAppointments: 0 };
                    const initials = `${patient.first_name[0]}${patient.last_name[0]}`.toUpperCase();
                    const isSelected = selectedPatient?.id === patient.id;

                    return (
                      <div
                        key={patient.id}
                        onClick={() => setSelectedPatient(patient)}
                        className={`
                          group relative p-4 rounded-xl cursor-pointer transition-all duration-200
                          ${isSelected
                            ? 'bg-primary/10 border-2 border-primary shadow-elegant'
                            : 'bg-background/50 border border-border/50 hover:bg-muted/50 hover:shadow-md'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className={`
                            flex-shrink-0
                          `}>
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={patient.profile_picture_url || undefined} />
                              <AvatarFallback className={`font-semibold text-sm ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-gradient-primary text-white'}`}>
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                          </div>

                          {/* Patient Info */}
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold truncate ${isSelected ? 'text-primary' : ''}`}>
                              {patient.first_name} {patient.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{patient.email}</p>
                            {patient.phone && (
                              <p className="text-xs text-muted-foreground">{patient.phone}</p>
                            )}
                          </div>
                        </div>

                        {/* Status Badges */}
                        {(flags?.hasUnpaidBalance || flags?.hasUpcomingAppointment || flags?.hasActiveTreatmentPlan) && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {flags?.hasUnpaidBalance && (
                              <Badge variant="destructive" className="text-xs rounded-full">
                                <CreditCard className="h-3 w-3 mr-1" />
                                Payment Due
                              </Badge>
                            )}
                            {flags?.hasUpcomingAppointment && (
                              <Badge className="text-xs rounded-full bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20">
                                <Calendar className="h-3 w-3 mr-1" />
                                Upcoming
                              </Badge>
                            )}
                            {flags?.hasActiveTreatmentPlan && (
                              <Badge variant="secondary" className="text-xs rounded-full">
                                <ClipboardListIcon className="h-3 w-3 mr-1" />
                                Treatment
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modern Patient Details */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedPatient ? (
            <Card className="bg-gradient-card border-border/50 h-full flex items-center justify-center min-h-[600px]">
              <CardContent className="text-center py-20">
                <div className="bg-primary/5 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                  <User className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-2">No Patient Selected</h3>
                <p className="text-muted-foreground">Select a patient from the list to view their details</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Patient Header */}
              <div className="bg-card border border-border/50 rounded-2xl shadow-elegant p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16 rounded-2xl shadow-lg">
                      <AvatarImage src={selectedPatient.profile_picture_url || undefined} className="rounded-2xl object-cover" />
                      <AvatarFallback className="bg-gradient-primary text-white text-2xl font-bold rounded-2xl">
                        {`${selectedPatient.first_name[0]}${selectedPatient.last_name[0]}`.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-foreground">
                        {selectedPatient.first_name} {selectedPatient.last_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        {selectedPatient.date_of_birth && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {getAge(selectedPatient.date_of_birth)} years old
                          </p>
                        )}
                        {patientFlags[selectedPatient.id]?.lastVisitDate && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Last visit: {format(new Date(patientFlags[selectedPatient.id].lastVisitDate!), 'MMM d')}
                          </p>
                        )}
                        {patientFlags[selectedPatient.id]?.totalAppointments && (
                          <Badge variant="secondary" className="rounded-full">
                            {patientFlags[selectedPatient.id].totalAppointments} appointments
                          </Badge>
                        )}
                      </div>

                      {/* Contact Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{selectedPatient.email}</span>
                        </div>
                        {selectedPatient.phone && (
                          <div className="flex items-center gap-2 text-sm text-foreground">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedPatient.phone}</span>
                          </div>
                        )}
                        {selectedPatient.address && (
                          <div className="flex items-center gap-2 text-sm text-foreground md:col-span-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedPatient.address}</span>
                          </div>
                        )}
                      </div>

                      {/* Medical History Alert */}
                      {selectedPatient.medical_history && (
                        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                          <p className="text-sm font-medium text-destructive flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Medical Alert
                          </p>
                          <p className="text-sm mt-1 text-foreground">{selectedPatient.medical_history}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-3 md:w-auto w-full">
                    <Card className="bg-background/50">
                      <CardContent className="p-3 text-center">
                        <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-500" />
                        <p className="text-xs text-muted-foreground">Completed</p>
                        <p className="text-lg font-bold">
                          {patientFlags[selectedPatient.id]?.completedAppointments || 0}
                        </p>
                      </CardContent>
                    </Card>
                    {patientFlags[selectedPatient.id]?.hasUnpaidBalance && (
                      <Card className="bg-destructive/10 border-destructive/20">
                        <CardContent className="p-3 text-center">
                          <CreditCard className="h-5 w-5 mx-auto mb-1 text-destructive" />
                          <p className="text-xs text-muted-foreground">Outstanding</p>
                          <p className="text-lg font-bold text-destructive">
                            €{((patientFlags[selectedPatient.id]?.outstandingCents || 0) / 100).toFixed(2)}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setBookingDialogOpen(true)}
                  >
                    <Calendar className="h-4 w-4" />
                    Book Appointment
                  </Button>
                </div>
              </div>

              {/* Tabbed Content */}
              <Card className="bg-card border-border/50">
                <CardContent className="p-6">
                  <PatientDetailsTabs
                    selectedPatient={selectedPatient}
                    dentistId={dentistId}
                    appointments={appointments}
                    onRefresh={() => {
                      fetchPatientData(selectedPatient.id);
                      fetchPatientFlags(selectedPatient.id);
                    }}
                  />
                </CardContent>
              </Card>
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
