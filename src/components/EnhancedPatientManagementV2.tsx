import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  User, 
  Calendar, 
  ArrowLeft,
  Clock,
  Users,
  CreditCard,
  MessageSquare,
  FileText,
  Stethoscope,
  Pill,
  ClipboardList,
  FileImage,
  Edit,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Award,
  Clock as ClockIcon,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar as CalendarIcon,
  RefreshCw,
  Brain,
  Sparkles,
  Activity,
  Target,
  TrendingUp
} from "lucide-react";
import { AIConversationDialog } from "@/components/AIConversationDialog";
import { generateSymptomSummary } from "@/lib/symptoms";
import { EnhancedPatientOverview } from "@/components/enhanced/EnhancedPatientOverview";
import { PrescriptionsTab } from "@/components/enhanced/PrescriptionsTab";
import { TreatmentPlansTab } from "@/components/enhanced/TreatmentPlansTab";
import { MedicalRecordsTab } from "@/components/enhanced/MedicalRecordsTab";
import { PatientNotesTab } from "@/components/enhanced/PatientNotesTab";
import { AppointmentsTab } from "@/components/enhanced/AppointmentsTab";
import { DentistProfileTab } from "@/components/enhanced/DentistProfileTab";
import { EnhancedPrescriptionManager } from "@/components/EnhancedPrescriptionManager";
import { EnhancedTreatmentPlanManager } from "@/components/EnhancedTreatmentPlanManager";
import { 
  Patient, 
  Prescription, 
  TreatmentPlan, 
  MedicalRecord, 
  PatientNote, 
  AppointmentFollowUp,
  NewPrescriptionForm,
  NewTreatmentPlanForm,
  NewMedicalRecordForm,
  NewPatientNoteForm,
  NewFollowUpForm,
  DentistProfile
} from "@/types/dental";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

interface EnhancedPatientManagementV2Props {
  dentistId: string;
}

export function EnhancedPatientManagementV2({ dentistId }: EnhancedPatientManagementV2Props) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeView, setActiveView] = useState<'list' | 'profile'>('list');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [appointmentSummary, setAppointmentSummary] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [generatingAISummary, setGeneratingAISummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);
  const [patientData, setPatientData] = useState({
    prescriptions: [] as Prescription[],
    treatmentPlans: [] as TreatmentPlan[],
    medicalRecords: [] as MedicalRecord[],
    notes: [] as PatientNote[],
    followUps: [] as AppointmentFollowUp[]
  });
  const { toast } = useToast();

  // Enhanced AI features
  const [aiFeatures, setAiFeatures] = useState({
    autoDiagnosis: false,
    smartSuggestions: true,
    predictiveAnalytics: false,
    automatedNotes: true
  });

  const fetchDentistProfile = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('dentists')
        .select(`
          *,
          profiles:profile_id (
            id,
            first_name,
            last_name,
            email,
            phone,
            avatar_url
          )
        `)
        .eq('id', dentistId)
        .single();

      if (error) throw error;
      return profile;
    } catch (error) {
      console.error('Error fetching dentist profile:', error);
      return null;
    }
  };

  const fetchPatients = async (retryAttempt = 0) => {
    try {
      setLoading(true);
      const { data: patients, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          date_of_birth,
          gender,
          address,
          emergency_contact,
          medical_history,
          allergies,
          current_medications,
          insurance_provider,
          insurance_number,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPatients(patients || []);
      setFilteredPatients(patients || []);
    } catch (error: unknown) {
      console.error('Error fetching patients:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      
      if (retryAttempt < 3) {
        setTimeout(() => fetchPatients(retryAttempt + 1), 1000 * (retryAttempt + 1));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientData = async (patientId: string, retryAttempt = 0) => {
    try {
      // Fetch prescriptions
      const { data: prescriptions, error: prescriptionsError } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', patientId)
        .order('prescribed_date', { ascending: false });

      if (prescriptionsError) throw prescriptionsError;

      // Fetch treatment plans
      const { data: treatmentPlans, error: treatmentPlansError } = await supabase
        .from('treatment_plans')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (treatmentPlansError) throw treatmentPlansError;

      // Fetch medical records
      const { data: medicalRecords, error: medicalRecordsError } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('record_date', { ascending: false });

      if (medicalRecordsError) throw medicalRecordsError;

      // Fetch patient notes
      const { data: notes, error: notesError } = await supabase
        .from('patient_notes')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (notesError) throw notesError;

      // Fetch appointment follow-ups
      const { data: followUps, error: followUpsError } = await supabase
        .from('appointment_follow_ups')
        .select(`
          *,
          appointments:appointment_id (
            id,
            appointment_date,
            patient_id
          )
        `)
        .eq('appointments.patient_id', patientId)
        .order('scheduled_date', { ascending: false });

      if (followUpsError) throw followUpsError;

      setPatientData({
        prescriptions: prescriptions || [],
        treatmentPlans: treatmentPlans || [],
        medicalRecords: medicalRecords || [],
        notes: notes || [],
        followUps: followUps || []
      });
    } catch (error: unknown) {
      console.error('Error fetching patient data:', error);
      
      if (retryAttempt < 3) {
        setTimeout(() => fetchPatientData(patientId, retryAttempt + 1), 1000 * (retryAttempt + 1));
      }
    }
  };

  const filterPatients = () => {
    if (!searchTerm.trim()) {
      setFilteredPatients(patients);
      return;
    }

    const filtered = patients.filter(patient => 
      patient.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phone?.includes(searchTerm)
    );
    setFilteredPatients(filtered);
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setActiveView('profile');
    fetchPatientData(patient.id);
  };

  const handleBackToList = () => {
    setSelectedPatient(null);
    setActiveView('list');
    setPatientData({
      prescriptions: [],
      treatmentPlans: [],
      medicalRecords: [],
      notes: [],
      followUps: []
    });
  };

  const generateAISuggestions = async () => {
    if (!selectedPatient) return;

    setGeneratingSuggestions(true);
    try {
      // Simulate AI analysis based on patient data
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const suggestions = [
        {
          type: 'prescription',
          title: 'Pain Management',
          description: 'Based on recent procedures, consider prescribing pain relief medication',
          action: 'Add Prescription',
          icon: Pill
        },
        {
          type: 'treatment',
          title: 'Follow-up Care',
          description: 'Schedule follow-up appointment for treatment monitoring',
          action: 'Create Treatment Plan',
          icon: ClipboardList
        },
        {
          type: 'note',
          title: 'Patient Education',
          description: 'Add note about post-treatment care instructions',
          action: 'Add Note',
          icon: FileText
        }
      ];
      
      setAiSuggestions(suggestions);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate AI suggestions",
        variant: "destructive",
      });
    } finally {
      setGeneratingSuggestions(false);
    }
  };

  const handlePrescriptionCreated = () => {
    if (selectedPatient) {
      fetchPatientData(selectedPatient.id);
    }
  };

  const handleTreatmentPlanCreated = () => {
    if (selectedPatient) {
      fetchPatientData(selectedPatient.id);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    filterPatients();
  }, [searchTerm, patients]);

  if (loading && patients.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Activity className="h-6 w-6 animate-spin" />
          <span>Loading patients...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Patients</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => fetchPatients()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (activeView === 'profile' && selectedPatient) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={handleBackToList}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Patients
            </Button>
            <div>
              <h2 className="text-2xl font-bold">
                {selectedPatient.first_name} {selectedPatient.last_name}
              </h2>
              <p className="text-muted-foreground">{selectedPatient.email}</p>
            </div>
          </div>
          
          {/* AI Assistant Button */}
          <Button 
            onClick={() => setShowAIAssistant(true)}
            variant="outline"
            className="gap-2"
          >
            <Brain className="h-4 w-4" />
            AI Assistant
          </Button>
        </div>

        {/* AI Features Toggle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              AI Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="autoDiagnosis"
                  checked={aiFeatures.autoDiagnosis}
                  onCheckedChange={(checked) => setAiFeatures(prev => ({ ...prev, autoDiagnosis: checked }))}
                />
                <Label htmlFor="autoDiagnosis">Auto Diagnosis</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="smartSuggestions"
                  checked={aiFeatures.smartSuggestions}
                  onCheckedChange={(checked) => setAiFeatures(prev => ({ ...prev, smartSuggestions: checked }))}
                />
                <Label htmlFor="smartSuggestions">Smart Suggestions</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="predictiveAnalytics"
                  checked={aiFeatures.predictiveAnalytics}
                  onCheckedChange={(checked) => setAiFeatures(prev => ({ ...prev, predictiveAnalytics: checked }))}
                />
                <Label htmlFor="predictiveAnalytics">Predictive Analytics</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="automatedNotes"
                  checked={aiFeatures.automatedNotes}
                  onCheckedChange={(checked) => setAiFeatures(prev => ({ ...prev, automatedNotes: checked }))}
                />
                <Label htmlFor="automatedNotes">Automated Notes</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <EnhancedPrescriptionManager
                appointmentId=""
                patientId={selectedPatient.id}
                dentistId={dentistId}
                onPrescriptionCreated={handlePrescriptionCreated}
              />
              <EnhancedTreatmentPlanManager
                appointmentId=""
                patientId={selectedPatient.id}
                dentistId={dentistId}
                onTreatmentPlanCreated={handleTreatmentPlanCreated}
              />
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                Add Note
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Suggestions */}
        {aiFeatures.smartSuggestions && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!generatingSuggestions && aiSuggestions.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-4">
                    Get AI-powered recommendations based on patient data
                  </p>
                  <Button onClick={generateAISuggestions} className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Generate Suggestions
                  </Button>
                </div>
              ) : generatingSuggestions ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-6 w-6 animate-spin" />
                    <span>Analyzing patient data...</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {aiSuggestions.map((suggestion, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <suggestion.icon className="h-5 w-5 text-blue-600" />
                          <div>
                            <h4 className="font-medium">{suggestion.title}</h4>
                            <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          {suggestion.action}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Patient Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
            <TabsTrigger value="treatments">Treatments</TabsTrigger>
            <TabsTrigger value="records">Records</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <EnhancedPatientOverview patient={selectedPatient} />
          </TabsContent>

          <TabsContent value="prescriptions">
            <PrescriptionsTab
              prescriptions={patientData.prescriptions}
              patient={selectedPatient}
              dentistId={dentistId}
              onRefresh={() => fetchPatientData(selectedPatient.id)}
            />
          </TabsContent>

          <TabsContent value="treatments">
            <TreatmentPlansTab
              treatmentPlans={patientData.treatmentPlans}
              patient={selectedPatient}
              dentistId={dentistId}
              onRefresh={() => fetchPatientData(selectedPatient.id)}
            />
          </TabsContent>

          <TabsContent value="records">
            <MedicalRecordsTab
              medicalRecords={patientData.medicalRecords}
              patient={selectedPatient}
              dentistId={dentistId}
              onRefresh={() => fetchPatientData(selectedPatient.id)}
            />
          </TabsContent>

          <TabsContent value="notes">
            <PatientNotesTab
              notes={patientData.notes}
              patient={selectedPatient}
              dentistId={dentistId}
              onRefresh={() => fetchPatientData(selectedPatient.id)}
            />
          </TabsContent>

          <TabsContent value="appointments">
            <AppointmentsTab
              appointments={appointments}
              patient={selectedPatient}
              dentistId={dentistId}
              onRefresh={() => fetchPatientData(selectedPatient.id)}
            />
          </TabsContent>
        </Tabs>

        {/* AI Conversation Dialog */}
        <AIConversationDialog
          open={showAIAssistant}
          onOpenChange={setShowAIAssistant}
          patient={selectedPatient}
          context="patient_management"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Patient Management</h1>
          <p className="text-muted-foreground">
            Manage your patients and their treatment plans
          </p>
        </div>
        <Button onClick={() => setShowAIAssistant(true)} className="gap-2">
          <Brain className="h-4 w-4" />
          AI Assistant
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search patients by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary">
              {filteredPatients.length} patients
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Patients List */}
      <div className="grid gap-4">
        {filteredPatients.map((patient) => (
          <Card key={patient.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handlePatientSelect(patient)}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {patient.first_name} {patient.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{patient.email}</p>
                    {patient.phone && (
                      <p className="text-sm text-muted-foreground">{patient.phone}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {patient.date_of_birth && (
                    <Badge variant="outline">
                      {new Date(patient.date_of_birth).toLocaleDateString()}
                    </Badge>
                  )}
                  <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPatients.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No patients found</h3>
          <p className="text-muted-foreground">
            {searchTerm ? 'Try adjusting your search terms.' : 'Start by adding your first patient.'}
          </p>
        </div>
      )}

      {/* AI Conversation Dialog */}
      <AIConversationDialog
        open={showAIAssistant}
        onOpenChange={setShowAIAssistant}
        context="patient_management"
      />
    </div>
  );
}