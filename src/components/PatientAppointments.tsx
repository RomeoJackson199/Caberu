import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import {
  Calendar,
  Clock,
  AlertTriangle,
  FileText,
  Save,
  Eye,
  Edit,
  CheckCircle
} from "lucide-react";
import { format } from "date-fns";
import { sanitizeText } from '@/utils/sanitize';

interface Appointment {
  id: string;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  urgency: string;
  reason?: string;
  notes?: string;
  consultation_notes?: string;
  patient_name?: string;
  patient_age?: number;
}

interface PatientAppointmentsProps {
  patientId: string;
  dentistId: string;
}

export function PatientAppointments({ patientId, dentistId }: PatientAppointmentsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAppointment, setEditingAppointment] = useState<string | null>(null);
  const [consultationNotes, setConsultationNotes] = useState("");
  const { toast } = useToast();
  const { businessId } = useBusinessContext();

  useEffect(() => {
    if (businessId) {
      fetchAppointments();
    }
  }, [patientId, dentistId, businessId]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);

      if (!businessId) {
        setAppointments([]);
        return;
      }

      const { data, error } = await supabase
        .from('appointments_decrypted' as any)
        .select('*')
        .eq('patient_id', patientId)
        .eq('dentist_id', dentistId)
        .eq('business_id', businessId)
        .order('appointment_date', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditConsultationNotes = (appointmentId: string, currentNotes: string) => {
    setEditingAppointment(appointmentId);
    setConsultationNotes(currentNotes || "");
  };

  const handleSaveConsultationNotes = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ consultation_notes: consultationNotes })
        .eq('id', appointmentId);

      if (error) throw error;

      // Update local state
      setAppointments(prev =>
        prev.map(apt =>
          apt.id === appointmentId
            ? { ...apt, consultation_notes: consultationNotes }
            : apt
        )
      );

      setEditingAppointment(null);
      setConsultationNotes("");

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
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-6 w-6 text-dental-primary" />
            <span>Patient Appointments</span>
            <Badge variant="outline">{appointments.length} total</Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No appointments found for this patient.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <Card key={appointment.id} className="glass-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-dental-primary/10 rounded-full flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-dental-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {format(new Date(appointment.appointment_date), 'PPP')}
                      </h3>
                      <p className="text-muted-foreground flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>{format(new Date(appointment.appointment_date), 'p')}</span>
                        <span>({appointment.duration_minutes} min)</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(appointment.status)}>
                      {appointment.status}
                    </Badge>
                    <Badge className={getUrgencyColor(appointment.urgency)}>
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {appointment.urgency} urgency
                    </Badge>
                  </div>
                </div>

                {/* Appointment Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {appointment.reason && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Reason for Visit</h4>
                      <p className="text-sm bg-muted p-3 rounded-md">{sanitizeText(appointment.reason)}</p>
                    </div>
                  )}

                  {appointment.notes && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Patient Notes</h4>
                      <p className="text-sm bg-muted p-3 rounded-md">{sanitizeText(appointment.notes)}</p>
                    </div>
                  )}
                </div>

                {/* Consultation Notes Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span>Consultation Notes</span>
                    </h4>

                    {appointment.status === 'completed' && (
                      <div className="flex items-center space-x-2">
                        {editingAppointment === appointment.id ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleSaveConsultationNotes(appointment.id)}
                            >
                              <Save className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingAppointment(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditConsultationNotes(appointment.id, appointment.consultation_notes || "")}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            {appointment.consultation_notes ? 'Edit' : 'Add'} Notes
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {editingAppointment === appointment.id ? (
                    <Textarea
                      value={consultationNotes}
                      onChange={(e) => setConsultationNotes(e.target.value)}
                      placeholder="Enter consultation notes, findings, recommendations..."
                      className="min-h-[120px]"
                    />
                  ) : appointment.consultation_notes ? (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-md">
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          Consultation completed
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{sanitizeText(appointment.consultation_notes)}</p>
                    </div>
                  ) : appointment.status === 'completed' ? (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md text-center">
                      <p className="text-sm text-yellow-800">
                        No consultation notes recorded for this appointment.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-muted p-4 rounded-md text-center">
                      <p className="text-sm text-muted-foreground">
                        Consultation notes will be available after the appointment is completed.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}