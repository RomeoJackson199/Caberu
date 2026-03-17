import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pill, Plus, Search, Filter, Calendar, User } from "lucide-react";
import { useMobileOptimizations } from "@/components/mobile/MobileOptimizations";
import { logger } from '@/lib/logger';
import { ListSkeleton } from "@/components/ui/page-skeletons";

interface Prescription {
  id: string;
  patient_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  patient_name?: string;
}

interface PrescriptionManagerProps {
  dentistId: string;
}

export function PrescriptionManager({ dentistId }: PrescriptionManagerProps) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { isMobile, cardClass } = useMobileOptimizations();

  const [patients, setPatients] = useState<Array<{ id: string, first_name: string, last_name: string }>>([]);
  const [newPrescription, setNewPrescription] = useState({
    patient_id: '',
    medication_name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
    status: 'active' as const
  });

  useEffect(() => {
    fetchPrescriptions();
    fetchPatients();
  }, [dentistId]);

  const fetchPatients = async () => {
    try {
      // Fetch patient IDs from appointments, then fetch profiles separately
      const { data, error } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('dentist_id', dentistId);

      if (error) throw error;

      const patientIds = [...new Set((data || []).map(item => item.patient_id).filter(Boolean))];
      const { data: profiles } = patientIds.length > 0
        ? await supabase.from('profiles').select('id, first_name, last_name').in('id', patientIds)
        : { data: [] };

      const uniquePatients = (profiles || []).filter(p => p.id);

      setPatients(uniquePatients as any);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('prescriptions')
        .select(`
          *,
          patient:profiles!prescriptions_patient_id_fkey(first_name, last_name)
        `)
        .eq('dentist_id', dentistId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedPrescriptions = data?.map((p: any) => ({
        ...p,
        patient_name: p.patient ? `${p.patient.first_name} ${p.patient.last_name}` : 'Unknown'
      })) || [];

      setPrescriptions(mappedPrescriptions);
      setLoading(false);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch prescriptions",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleCreatePrescription = async () => {
    try {
      if (!newPrescription.patient_id || !newPrescription.medication_name) {
        toast({
          title: "Validation Error",
          description: "Please select a patient and enter medication name",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await (supabase as any)
        .from('prescriptions')
        .insert({
          patient_id: newPrescription.patient_id,
          dentist_id: dentistId,
          medication_name: newPrescription.medication_name,
          dosage: newPrescription.dosage,
          frequency: newPrescription.frequency,
          duration: newPrescription.duration,
          instructions: newPrescription.instructions,
          status: newPrescription.status,
          prescribed_date: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification to patient
      const { data: patientProfile } = await supabase
        .from('secure_profiles_view')
        .select('user_id')
        .eq('id', newPrescription.patient_id)
        .single();

      if (patientProfile?.user_id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: patientProfile.user_id,
            patient_id: newPrescription.patient_id,
            dentist_id: dentistId,
            type: 'prescription',
            title: 'New Prescription Available',
            message: `Your dentist has prescribed ${newPrescription.medication_name}. ${newPrescription.dosage} ${newPrescription.frequency}`,
            priority: 'high',
            action_url: '/dashboard?tab=health',
            action_label: 'View Prescription'
          });
      }

      toast({
        title: "Success",
        description: "Prescription created and patient notified",
      });

      setIsDialogOpen(false);
      setNewPrescription({
        patient_id: '',
        medication_name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
        status: 'active'
      });
      fetchPrescriptions();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create prescription",
        variant: "destructive",
      });
    }
  };

  const filteredPrescriptions = prescriptions.filter(prescription => {
    const matchesSearch = prescription.medication_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.patient_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || prescription.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className={`space-y-6 ${isMobile ? 'p-4' : ''}`}>
        <ListSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isMobile ? 'p-4' : ''}`}>
      {/* Header */}
      <Card className={`${cardClass} border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50`}>
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Pill className="h-6 w-6 mr-2 text-blue-600" />
            Prescription Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`flex flex-col ${isMobile ? 'space-y-4' : 'sm:flex-row sm:space-y-0 sm:space-x-4'}`}>
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search prescriptions or patients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-primary hover:opacity-90">
                    <Plus className="h-4 w-4 mr-2" />
                    New Prescription
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Prescription</DialogTitle>
                    <DialogDescription>Fill in the prescription details for the patient.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="patient">Patient</Label>
                      <select
                        id="patient"
                        className="w-full border rounded-md p-2"
                        value={newPrescription.patient_id}
                        onChange={(e) => setNewPrescription({ ...newPrescription, patient_id: e.target.value })}
                      >
                        <option value="">Select a patient</option>
                        {patients.map((patient) => (
                          <option key={patient.id} value={patient.id}>
                            {patient.first_name} {patient.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="medication">Medication Name</Label>
                      <Input
                        id="medication"
                        value={newPrescription.medication_name}
                        onChange={(e) => setNewPrescription({ ...newPrescription, medication_name: e.target.value })}
                        placeholder="Enter medication name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="dosage">Dosage</Label>
                        <Input
                          id="dosage"
                          value={newPrescription.dosage}
                          onChange={(e) => setNewPrescription({ ...newPrescription, dosage: e.target.value })}
                          placeholder="e.g., 500mg"
                        />
                      </div>
                      <div>
                        <Label htmlFor="frequency">Frequency</Label>
                        <Input
                          id="frequency"
                          value={newPrescription.frequency}
                          onChange={(e) => setNewPrescription({ ...newPrescription, frequency: e.target.value })}
                          placeholder="e.g., 2x daily"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration</Label>
                      <Input
                        id="duration"
                        value={newPrescription.duration}
                        onChange={(e) => setNewPrescription({ ...newPrescription, duration: e.target.value })}
                        placeholder="e.g., 7 days"
                      />
                    </div>
                    <div>
                      <Label htmlFor="instructions">Instructions</Label>
                      <Textarea
                        id="instructions"
                        value={newPrescription.instructions}
                        onChange={(e) => setNewPrescription({ ...newPrescription, instructions: e.target.value })}
                        placeholder="Special instructions for the patient"
                        rows={3}
                      />
                    </div>
                    <Button onClick={handleCreatePrescription} className="w-full">
                      Create Prescription
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      <Card className={`${cardClass} text-center p-8`}>
        <Pill className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Prescriptions Found</h3>
        <p className="text-muted-foreground mb-4">
          Create your first prescription to get started
        </p>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create First Prescription
            </Button>
          </DialogTrigger>
        </Dialog>
      </Card>
    </div>
  );
}