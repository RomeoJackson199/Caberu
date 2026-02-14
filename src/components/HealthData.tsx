import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle,
  XCircle,
  Pill,
  Target,
  FileText,
  User as UserIcon,
  Phone,
  Mail
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { loadProfileData } from "@/lib/profileUtils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSkeleton } from "@/components/ui/skeleton";
import { PrescriptionManager } from "@/components/PrescriptionManager";
import { TreatmentPlanManager } from "@/components/TreatmentPlanManager";
import { AIConversationDialog } from "@/components/AIConversationDialog";
import { logger } from '@/lib/logger';
import { MedicalDataConsentDialog, checkMedicalDataConsent } from '@/components/gdpr/MedicalDataConsentDialog';

interface HealthDataProps {
  user: User;
  onBack?: () => void;
  patientId?: string;
  dentistId?: string;
  mode?: 'patient' | 'dentist';
}

interface Prescription {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  instructions: string;
  prescribed_date: string;
  status: string;
  dentist: {
    profile: {
      first_name: string;
      last_name: string;
    };
  };
}

interface TreatmentPlan {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  estimated_cost: number;
  estimated_duration: string;
  start_date: string;
  end_date: string;
  created_at: string;
  dentist: {
    profile: {
      first_name: string;
      last_name: string;
    };
  };
}

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  reason: string;
  consultation_notes: string;
  urgency: string;
  dentist: {
    profile: {
      first_name: string;
      last_name: string;
    };
  };
}

interface MedicalRecord {
  id: string;
  title: string;
  description: string;
  findings: string;
  recommendations: string;
  visit_date: string;
  record_type: string;
  dentist: {
    profile: {
      first_name: string;
      last_name: string;
    };
  };
}

export const HealthData = ({
  user,
  onBack,
  patientId: propPatientId,
  dentistId,
  mode = 'patient'
}: HealthDataProps) => {
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showAIConsultation, setShowAIConsultation] = useState(false);
  const [activeTab, setActiveTab] = useState("prescriptions");
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [consentRequired, setConsentRequired] = useState(false);
  const { toast } = useToast();

  const patientId = mode === 'dentist' ? propPatientId : null;
  const userId = mode === 'patient' ? user.id : null;

  useEffect(() => {
    loadHealthData();
  }, [user, patientId, userId]);

  const loadHealthData = async () => {
    try {
      setIsLoading(true);

      let profile: any = null;

      // Determine the user ID for consent check
      const targetUserId = mode === 'dentist' ? propPatientId : user.id;

      // GDPR Article 9: Check consent before loading medical data
      if (targetUserId) {
        const hasConsent = await checkMedicalDataConsent(targetUserId);
        if (!hasConsent) {
          setConsentRequired(true);
          setShowConsentDialog(true);
          setIsLoading(false);
          return;
        }
        setConsentRequired(false);

        // Log access for GDPR audit - fire and forget
        void supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'VIEW_MEDICAL_RECORDS',
          target_user_id: targetUserId,
          target_table: 'medical_records',
          metadata: {
            access_mode: mode,
            consent_verified: true
          },
          created_at: new Date().toISOString()
        });
      }

      if (mode === 'patient') {
        try {
          const profileData = await loadProfileData(user);
          profile = {
            id: user.id,
            user_id: user.id,
            ...profileData
          };
        } catch (error) {
          console.error('Error loading patient profile:', error);
          throw error;
        }
      } else if (mode === 'dentist' && patientId) {
        const { data: profileData, error: profileError } = await supabase
          .from('secure_profiles_view')
          .select('*')
          .eq('id', patientId)
          .single();

        if (profileError) {
          console.error('Error loading patient profile for dentist:', profileError);
          throw profileError;
        }
        profile = profileData;
      }

      if (!profile) {
        throw new Error('Patient profile not found');
      }

      setPatientProfile(profile);

      // Load all health data in parallel
      const [
        medicalRecordsResult,
        prescriptionsResult,
        treatmentPlansResult,
        appointmentsResult
      ] = await Promise.allSettled([
        loadMedicalRecords(profile.id),
        loadPrescriptions(profile.id),
        loadTreatmentPlans(profile.id),
        loadAppointments(profile.id)
      ]);

      // Handle results
      if (medicalRecordsResult.status === 'fulfilled') {
        const records = medicalRecordsResult.value.map((record: any) => {
          const d = record?.dentist;
          return {
            ...record,
            visit_date: record.record_date,
            dentist: d && typeof d === 'object' && (d as any).profile
              ? d
              : { profile: { first_name: '', last_name: '' } }
          };
        });
        setMedicalRecords(records);
      }
      if (prescriptionsResult.status === 'fulfilled') {
        const prescriptions = prescriptionsResult.value.map((prescription: any) => {
          const d = prescription?.dentist;
          return {
            ...prescription,
            dentist: d && typeof d === 'object' && (d as any).profile
              ? d
              : { profile: { first_name: '', last_name: '' } }
          };
        });
        setPrescriptions(prescriptions);
      }
      if (treatmentPlansResult.status === 'fulfilled') {
        const plans = treatmentPlansResult.value.map((plan: any) => {
          const d = plan?.dentist;
          return {
            ...plan,
            estimated_duration: plan.estimated_duration_weeks ? `${plan.estimated_duration_weeks} weeks` : '',
            dentist: d && typeof d === 'object' && (d as any).profile
              ? d
              : { profile: { first_name: '', last_name: '' } }
          };
        });
        setTreatmentPlans(plans);
      }
      if (appointmentsResult.status === 'fulfilled') {
        // Transform appointments - handle dentist being array from Supabase join
        const transformedAppointments = (appointmentsResult.value || []).map((apt: any) => {
          const dentist = Array.isArray(apt.dentist) ? apt.dentist[0] : apt.dentist;
          const profile = dentist?.profile ? (Array.isArray(dentist.profile) ? dentist.profile[0] : dentist.profile) : { first_name: '', last_name: '' };
          return { ...apt, dentist: { ...dentist, profile } };
        });
        setAppointments(transformedAppointments as any);
      }

    } catch (error) {
      console.error('Error loading health data:', error);
      toast({
        title: "Error",
        description: "Failed to load health data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMedicalRecords = async (profileId: string) => {
    const { data, error } = await supabase
      .from('medical_records_decrypted' as any)
      .select(`
        *,
        dentist:dentists(
          profile:profiles(first_name, last_name, specialty)
        )
      `)
      .eq('patient_id', profileId)
      .order('visit_date', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const loadPrescriptions = async (profileId: string) => {
    const { data, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        dentist:dentists(
          profile:profiles(first_name, last_name)
        )
      `)
      .eq('patient_id', profileId)
      .order('prescribed_date', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const loadTreatmentPlans = async (profileId: string) => {
    const { data, error } = await supabase
      .from('treatment_plans_decrypted')
      .select(`
        *,
        dentist:dentists(
          profile:profiles(first_name, last_name)
        )
      `)
      .eq('patient_id', profileId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const loadAppointments = async (profileId: string) => {
    let query = supabase
      .from('appointments_decrypted')
      .select('id, appointment_date, status, reason, consultation_notes, urgency, dentist_id')
      .eq('patient_id', profileId)
      .order('appointment_date', { ascending: false });

    if (dentistId) {
      query = query.eq('dentist_id', dentistId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Fetch dentist profiles separately (views don't support PostgREST joins)
    const dentistIds = [...new Set((data || []).map(a => a.dentist_id).filter(Boolean))];
    const { data: dentists } = dentistIds.length > 0
      ? await supabase.from('dentists').select('id, profiles:profile_id(first_name, last_name)').in('id', dentistIds)
      : { data: [] };
    const dentistsMap = new Map((dentists || []).map(d => [d.id, d]));

    return (data || []).map(apt => ({
      ...apt,
      dentist: dentistsMap.get(apt.dentist_id) || undefined,
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Enhanced Header */}
      <Card className="floating-card">
        <CardHeader className="bg-gradient-primary text-white rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserIcon className="h-6 w-6" />
              <div>
                <CardTitle className="text-xl">
                  {mode === 'patient' ? 'My Health Data' : 'Patient Health Data'}
                </CardTitle>
                <p className="text-white/80 text-sm">
                  {patientProfile?.first_name} {patientProfile?.last_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {mode === 'dentist' && dentistId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAIConsultation(true)}
                  className="text-white hover:bg-white/20"
                >
                  <UserIcon className="h-4 w-4 mr-2" />
                  AI Consultation
                </Button>
              )}
              {onBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="text-white hover:bg-white/20"
                >
                  <UserIcon className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Enhanced Patient Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <UserIcon className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Patient</p>
                <p className="font-medium">
                  {patientProfile?.first_name} {patientProfile?.last_name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Date of Birth</p>
                <p className="font-medium">
                  {patientProfile?.date_of_birth
                    ? formatDate(patientProfile.date_of_birth)
                    : 'Not provided'}
                </p>
              </div>
            </div>

            {patientProfile?.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{patientProfile.phone}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{patientProfile?.email}</p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{appointments.length}</div>
              <div className="text-sm text-muted-foreground">Total Appointments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{prescriptions.length}</div>
              <div className="text-sm text-muted-foreground">Prescriptions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{treatmentPlans.length}</div>
              <div className="text-sm text-muted-foreground">Treatment Plans</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-600">{medicalRecords.length}</div>
              <div className="text-sm text-muted-foreground">Medical Records</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6">
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="treatments">Treatment Plans</TabsTrigger>
          <TabsTrigger value="records">Medical Records</TabsTrigger>
          {mode === 'dentist' && (
            <>
              <TabsTrigger value="add-prescription">+ Prescription</TabsTrigger>
              <TabsTrigger value="add-treatment">+ Treatment</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="prescriptions">
          <Card className="floating-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Pill className="h-5 w-5 mr-2" />
                Prescriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {prescriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Pill className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No prescriptions found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {prescriptions.map((prescription) => (
                    <Card key={prescription.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{prescription.medication_name}</h4>
                          <Badge variant={prescription.status === 'active' ? 'default' : 'secondary'}>
                            {prescription.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Dosage:</span> {prescription.dosage}
                          </div>
                          <div>
                            <span className="font-medium">Frequency:</span> {prescription.frequency}
                          </div>
                          <div>
                            <span className="font-medium">Duration:</span> {prescription.duration_days} days
                          </div>
                          <div>
                            <span className="font-medium">Prescribed:</span> {formatDate(prescription.prescribed_date)}
                          </div>
                        </div>
                        {prescription.instructions && (
                          <div className="mt-2 p-2 bg-gray-50 rounded">
                            <p className="text-sm">{prescription.instructions}</p>
                          </div>
                        )}
                        {prescription.dentist && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Prescribed by: Dr. {prescription.dentist.profile.first_name} {prescription.dentist.profile.last_name}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments">
          <Card className="floating-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {appointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No appointments found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.map((appointment) => (
                    <Card key={appointment.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{appointment.reason}</h4>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(appointment.appointment_date)}
                            </p>
                            {appointment.dentist && (
                              <p className="text-sm text-muted-foreground">
                                Dr. {appointment.dentist.profile.first_name} {appointment.dentist.profile.last_name}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <Badge variant={appointment.status === 'completed' ? 'default' : 'secondary'}>
                              {appointment.status}
                            </Badge>
                            {appointment.urgency && (
                              <Badge variant="outline" className="ml-2">
                                {appointment.urgency}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {appointment.consultation_notes && (
                          <div className="mt-3 p-3 bg-blue-50 rounded">
                            <p className="text-sm">{appointment.consultation_notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="treatments">
          <Card className="floating-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Treatment Plans
              </CardTitle>
            </CardHeader>
            <CardContent>
              {treatmentPlans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No treatment plans found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {treatmentPlans.map((plan) => (
                    <Card key={plan.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{plan.title}</h4>
                          <div className="flex space-x-2">
                            <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                              {plan.status}
                            </Badge>
                            <Badge variant="outline">{plan.priority}</Badge>
                          </div>
                        </div>
                        {plan.description && (
                          <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Duration:</span> {plan.estimated_duration}
                          </div>
                          <div>
                            <span className="font-medium">Cost:</span> €{plan.estimated_cost}
                          </div>
                          <div>
                            <span className="font-medium">Start Date:</span> {plan.start_date ? formatDate(plan.start_date) : 'Not set'}
                          </div>
                        </div>
                        {plan.dentist && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Created by: Dr. {plan.dentist.profile.first_name} {plan.dentist.profile.last_name}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records">
          <Card className="floating-card">
            <CardHeader>
              <CardTitle>Medical Records</CardTitle>
            </CardHeader>
            <CardContent>
              {medicalRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No medical records found</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {medicalRecords.map((record) => (
                      <Card key={record.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold">{record.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(record.visit_date)}
                              </p>
                            </div>
                            <Badge variant="outline">{record.record_type}</Badge>
                          </div>

                          {record.description && (
                            <div className="mb-3">
                              <h4 className="font-medium text-sm mb-1">Description:</h4>
                              <p className="text-sm text-muted-foreground">{record.description}</p>
                            </div>
                          )}

                          {record.findings && (
                            <div className="mb-3">
                              <h4 className="font-medium text-sm mb-1">Findings:</h4>
                              <p className="text-sm text-muted-foreground">{record.findings}</p>
                            </div>
                          )}

                          {record.recommendations && (
                            <div>
                              <h4 className="font-medium text-sm mb-1">Recommendations:</h4>
                              <p className="text-sm text-muted-foreground">{record.recommendations}</p>
                            </div>
                          )}

                          {record.dentist && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              Recorded by: Dr. {record.dentist.profile.first_name} {record.dentist.profile.last_name}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {mode === 'dentist' && dentistId && patientProfile && (
          <>
            <TabsContent value="add-prescription">
              <PrescriptionManager
                dentistId={dentistId}
              />
            </TabsContent>

            <TabsContent value="add-treatment">
              <TreatmentPlanManager
                patientId={patientProfile.id}
                dentistId={dentistId}
              />
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* AI Consultation Dialog */}
      {showAIConsultation && patientProfile && dentistId && (
        <AIConversationDialog
          patientId={patientProfile.id}
          dentistId={dentistId}
          patientName={`${patientProfile.first_name} ${patientProfile.last_name}`}
          contextType="patient"
        />
      )}

      {/* GDPR Medical Data Consent Dialog */}
      <MedicalDataConsentDialog
        userId={mode === 'dentist' ? (propPatientId || '') : user.id}
        open={showConsentDialog}
        onOpenChange={setShowConsentDialog}
        onConsentGranted={() => {
          setConsentRequired(false);
          loadHealthData(); // Reload data after consent granted
        }}
      />
    </div>
  );
};
