import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  Clock,
  Activity,
  Heart,
  Calendar,
  User,
  Phone,
  MessageSquare
} from "lucide-react";
import { format } from "date-fns";
import { logger } from '@/lib/logger';
import { useBusinessContext } from '@/hooks/useBusinessContext';

interface UrgencyAppointment {
  id: string;
  patient_name: string;
  appointment_date: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  reason: string;
  pain_level?: number;
  symptoms?: string;
  created_at: string;
  status: string;
  reminderSent?: boolean;
}

interface DentistUrgencyGridProps {
  dentistId: string;
}

export const DentistUrgencyGrid = ({ dentistId }: DentistUrgencyGridProps) => {
  const { businessId } = useBusinessContext();
  const [appointments, setAppointments] = useState<UrgencyAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (businessId) fetchUrgentAppointments();
  }, [dentistId, businessId]);

  const fetchUrgentAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          patient_name,
          appointment_date,
          urgency,
          reason,
          created_at,
          status,
          urgency_assessments (
            pain_level,
            duration_symptoms
          )
        `)
        .eq('dentist_id', dentistId)
        .eq('business_id', businessId || '')  // Multi-tenant isolation
        .gte('appointment_date', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching urgent appointments:', error);
      toast({
        title: "Error",
        description: "Failed to load urgent appointments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyConfig = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: Heart,
          priority: 4,
          text: 'EMERGENCY'
        };
      case 'high':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: AlertTriangle,
          priority: 3,
          text: 'HIGH'
        };
      case 'medium':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Clock,
          priority: 2,
          text: 'MEDIUM'
        };
      case 'low':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: Activity,
          priority: 1,
          text: 'LOW'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Activity,
          priority: 1,
          text: 'STANDARD'
        };
    }
  };

  const sortedAppointments = appointments.sort((a, b) => {
    const urgencyA = getUrgencyConfig(a.urgency);
    const urgencyB = getUrgencyConfig(b.urgency);
    if (urgencyA.priority !== urgencyB.priority) {
      return urgencyB.priority - urgencyA.priority; // Higher priority first
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const handlePrioritizeAppointment = (appointmentId: string) => {
    setAppointments(prev =>
      prev.map(a =>
        a.id === appointmentId
          ? {
            ...a,
            urgency: a.urgency === 'high' ? 'emergency' : 'high',
          }
          : a
      )
    );
    toast({ title: 'Priority updated' });
  };

  const handleSendReminder = (appointmentId: string) => {
    setAppointments(prev =>
      prev.map(a => (a.id === appointmentId ? { ...a, reminderSent: true } : a))
    );
    toast({ title: 'Reminder sent' });
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dental-primary mx-auto"></div>
          <p className="mt-4 text-dental-muted-foreground">Loading urgent requests...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
            Urgency Triage Dashboard
          </CardTitle>
          <p className="text-dental-muted-foreground">
            Prioritize patient care based on AI-assessed urgency levels
          </p>
        </CardHeader>
      </Card>

      {/* Urgency Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {['emergency', 'high', 'medium', 'low'].map((urgency) => {
          const config = getUrgencyConfig(urgency);
          const count = appointments.filter(apt => apt.urgency === urgency).length;
          const IconComponent = config.icon;

          return (
            <Card key={urgency} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm text-dental-muted-foreground">{config.text}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Appointments Grid */}
      <div className="space-y-4">
        {sortedAppointments.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <Activity className="h-12 w-12 text-dental-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Urgent Requests</h3>
              <p className="text-dental-muted-foreground">
                All current appointments are routine. You'll see urgent requests here as they come in.
              </p>
            </CardContent>
          </Card>
        ) : (
          sortedAppointments.map((appointment) => {
            const config = getUrgencyConfig(appointment.urgency);
            const IconComponent = config.icon;

            return (
              <Card key={appointment.id} className={`glass-card border-l-4 ${config.color.split(' ')[2]}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center space-x-3">
                        <Badge className={config.color}>
                          <IconComponent className="h-3 w-3 mr-1" />
                          {config.text}
                        </Badge>
                        <div className="flex items-center space-x-2 text-sm text-dental-muted-foreground">
                          <User className="h-4 w-4" />
                          <span className="font-medium">{appointment.patient_name}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-dental-primary" />
                          <span>{format(new Date(appointment.appointment_date), 'MMM dd, yyyy HH:mm')}</span>
                        </div>

                        {appointment.reason && (
                          <div className="flex items-center space-x-2">
                            <MessageSquare className="h-4 w-4 text-dental-secondary" />
                            <span className="truncate">{appointment.reason}</span>
                          </div>
                        )}

                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-dental-accent" />
                          <span>Requested {format(new Date(appointment.created_at), 'HH:mm')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendReminder(appointment.id)}
                        disabled={appointment.reminderSent}
                        className="flex items-center space-x-1"
                      >
                        <Phone className="h-3 w-3" />
                        <span>{appointment.reminderSent ? 'Reminded' : 'Remind'}</span>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handlePrioritizeAppointment(appointment.id)}
                        className="bg-gradient-primary text-white"
                      >
                        Prioritize
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};