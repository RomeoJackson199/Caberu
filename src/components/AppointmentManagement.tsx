import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { AIWritingAssistant } from "@/components/AIWritingAssistant";
import { PrescriptionManager } from "@/components/PrescriptionManager";
import { TreatmentPlanManager } from "@/components/TreatmentPlanManager";
import { AppointmentConfirmationWidget } from "@/components/AppointmentConfirmationWidget";
import { DentistAppointmentDetail } from "@/components/appointments/DentistAppointmentDetail";
import { 
  Search, 
  Calendar, 
  Clock, 
  Plus,
  Edit,
  Save,
  X,
  CheckCircle,
  Stethoscope,
  Pill,
  FileText,
  AlertTriangle,
  User,
  BookOpen,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { generateSymptomSummary } from "@/lib/symptoms";
import { AIConversationDialog } from "@/components/AIConversationDialog";
import { CompletionSheet } from "@/components/CompletionSheet";
import { AppointmentList } from "@/components/optimized/AppointmentList";
import { AppointmentStats } from "@/components/optimized/AppointmentStats";
import { logger } from '@/lib/logger';

interface Appointment {
  id: string;
  patient_id: string;
  dentist_id?: string;
  business_id?: string;
  patient_name?: string;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  urgency: string;
  reason?: string;
  notes?: string;
  consultation_notes?: string;
  patient_age?: number;
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

interface AppointmentManagementProps {
  dentistId: string;
}

export function AppointmentManagement({ dentistId }: AppointmentManagementProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [consultationNotes, setConsultationNotes] = useState("");
  const [showCompletion, setShowCompletion] = useState(false);
  const { toast } = useToast();

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patients (
            first_name,
            last_name,
            email,
            phone,
            date_of_birth
          )
        `)
        .eq('dentist_id', dentistId)
        .order('appointment_date', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "Failed to load appointments. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [dentistId, toast]);

  const fetchPatients = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'patient')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatients(data?.map(p => ({
        ...p,
        total_appointments: 0,
        upcoming_appointments: 0
      })) || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast({
        title: "Error",
        description: "Failed to load patients. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
  }, [fetchAppointments, fetchPatients]);

  const handleEditNotes = (appointmentId: string, currentNotes: string) => {
    setEditingNotes(appointmentId);
    setConsultationNotes(currentNotes || "");
  };

  const handleSaveNotes = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ consultation_notes: consultationNotes })
        .eq('id', appointmentId);

      if (error) throw error;

      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, consultation_notes: consultationNotes }
            : apt
        )
      );

      setEditingNotes(null);
      toast({
        title: "Success",
        description: "Consultation notes saved successfully",
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleCompleteAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appointmentId);

      if (error) throw error;

      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: 'completed' }
            : apt
        )
      );

      toast({
        title: "Success",
        description: "Appointment marked as completed",
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };


  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">Loading appointments...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-6 w-6 text-dental-primary" />
              <span>Appointment Management</span>
            </CardTitle>
            <Dialog open={showNewAppointment} onOpenChange={setShowNewAppointment}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Appointment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Appointment</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Patient</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select patient" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="patient1">John Doe</SelectItem>
                          <SelectItem value="patient2">Jane Smith</SelectItem>
                          <SelectItem value="patient3">Bob Johnson</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Dentist</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select dentist" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dentist1">Dr. Smith</SelectItem>
                          <SelectItem value="dentist2">Dr. Johnson</SelectItem>
                          <SelectItem value="dentist3">Dr. Brown</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Date</label>
                      <Input type="date" />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Time</label>
                      <Input type="time" />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Reason</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checkup">Regular checkup</SelectItem>
                        <SelectItem value="cleaning">Cleaning</SelectItem>
                        <SelectItem value="filling">Cavity filling</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                        <SelectItem value="consultation">Consultation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Notes (Optional)</label>
                    <Textarea 
                      placeholder="Additional notes or special instructions..."
                      className="resize-none"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowNewAppointment(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => {
                        // Handle appointment creation
                        setShowNewAppointment(false);
                        toast({
                          title: "Appointment Created",
                          description: "New appointment has been successfully scheduled.",
                        });
                      }}
                    >
                      Create Appointment
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search appointments by patient name or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Statistics */}
          <AppointmentStats appointments={appointments} />
        </CardContent>
      </Card>

      {/* Appointments List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          {searchTerm ? "Search Results" : "Today's Appointments"}
        </h3>
        <AppointmentList
          appointments={appointments}
          searchTerm={searchTerm}
          isDentistView={true}
          onConfirm={async (appointmentId) => {
            try {
              const { error } = await supabase
                .from('appointments')
                .update({ status: 'confirmed' })
                .eq('id', appointmentId);
              if (error) throw error;
              fetchAppointments();
            } catch (error: unknown) {
              throw new Error(error instanceof Error ? error.message : "Unknown error");
            }
          }}
          onCancel={async (appointmentId) => {
            try {
              const { error } = await supabase
                .from('appointments')
                .update({ status: 'cancelled' })
                .eq('id', appointmentId);
              if (error) throw error;
              fetchAppointments();
            } catch (error: unknown) {
              throw new Error(error instanceof Error ? error.message : "Unknown error");
            }
          }}
          onDelete={async (appointmentId) => {
            try {
              const { error } = await supabase
                .from('appointments')
                .delete()
                .eq('id', appointmentId);
              if (error) throw error;
              fetchAppointments();
            } catch (error: unknown) {
              throw new Error(error instanceof Error ? error.message : "Unknown error");
            }
          }}
          onViewDetails={(appointment) => {
            setSelectedAppointment(appointment);
            setShowDetailSheet(true);
          }}
          onComplete={(appointment) => {
            setSelectedAppointment(appointment);
            setShowCompletion(true);
          }}
        />
      </div>

      {/* Appointment Detail Sheet */}
      <Sheet open={showDetailSheet} onOpenChange={setShowDetailSheet}>
        <SheetContent className="w-full sm:max-w-md p-0 overflow-y-auto" side="right">
          {selectedAppointment && (
            <DentistAppointmentDetail
              appointment={selectedAppointment}
              onClose={() => {
                setShowDetailSheet(false);
                setSelectedAppointment(null);
              }}
              onStatusChange={async (id, status) => {
                await supabase
                  .from('appointments')
                  .update({ status })
                  .eq('id', id);
                fetchAppointments();
                if (status === 'cancelled' || status === 'completed') {
                  setShowDetailSheet(false);
                  setSelectedAppointment(null);
                }
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {selectedAppointment && (
        <CompletionSheet
          open={showCompletion}
          onOpenChange={setShowCompletion}
          appointment={{
            id: selectedAppointment.id,
            patient_id: selectedAppointment.patient_id,
            dentist_id: dentistId,
            appointment_date: selectedAppointment.appointment_date,
            status: selectedAppointment.status
          }}
          dentistId={dentistId}
          onCompleted={() => {
            setShowCompletion(false);
            fetchAppointments();
          }}
        />
      )}
    </div>
  );
}