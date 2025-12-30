import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  User,
  FileText,
  MapPin,
  AlertCircle,
  CheckCircle,
  Star,
  Phone,
  Mail
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logger } from '@/lib/logger';

interface AppointmentDetailsProps {
  appointmentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppointmentDetailsDialog({ appointmentId, open, onOpenChange }: AppointmentDetailsProps) {
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && appointmentId) {
      fetchAppointmentDetails();
    }
  }, [open, appointmentId]);

  const fetchAppointmentDetails = async () => {
    setLoading(true);
    try {
      // Fetch real appointment data from database
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          status,
          urgency,
          reason,
          notes,
          ai_summary,
          duration_minutes,
          booking_source,
          created_at,
          dentists:dentists!appointments_dentist_id_fkey (
            id,
            specialization,
            clinic_address,
            profiles:profile_id (
              first_name,
              last_name,
              email,
              phone,
              address
            )
          ),
          patient:profiles!appointments_patient_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone
          ),
          services:service_id (
            name,
            description,
            duration_minutes,
            price_cents
          )
        `)
        .eq('id', appointmentId)
        .single();

      if (error) throw error;
      setAppointment(data);
    } catch (error) {
      logger.error('Error fetching appointment details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'confirmed':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
      case 'emergency':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  if (!appointment && !loading) {
    return null;
  }

  const dentistName = appointment?.dentists?.profiles
    ? `${appointment.dentists.profiles.first_name} ${appointment.dentists.profiles.last_name}`
    : 'Unknown';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Appointment Details
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : appointment ? (
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6 pr-4">
              {/* Appointment Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Appointment Information</span>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-white", getStatusColor(appointment.status))}>
                        {appointment.status}
                      </Badge>
                      {appointment.urgency && (
                        <Badge className={getUrgencyColor(appointment.urgency)}>
                          {appointment.urgency}
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {format(new Date(appointment.appointment_date), 'EEEE, MMMM d, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {format(new Date(appointment.appointment_date), 'h:mm a')}
                        {appointment.duration_minutes && ` (${appointment.duration_minutes} min)`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Dr. {dentistName}</span>
                    </div>
                    {appointment.dentists?.specialization && (
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm capitalize">{appointment.dentists.specialization}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {(appointment.dentists?.clinic_address || appointment.dentists?.profiles?.address) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {appointment.dentists.clinic_address || appointment.dentists.profiles?.address}
                        </span>
                      </div>
                    )}
                    {appointment.dentists?.profiles?.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{appointment.dentists.profiles.email}</span>
                      </div>
                    )}
                    {appointment.dentists?.profiles?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{appointment.dentists.profiles.phone}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Reason for Visit */}
              {appointment.reason && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4" />
                      Reason for Visit
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{appointment.reason}</p>
                  </CardContent>
                </Card>
              )}

              {/* Patient Symptoms */}
              {(appointment.notes || appointment.ai_summary) && (
                <Card className="border-blue-200 dark:border-blue-800">
                  <CardHeader className="bg-blue-50 dark:bg-blue-950/50 rounded-t-lg">
                    <CardTitle className="flex items-center gap-2 text-base text-blue-700 dark:text-blue-300">
                      <AlertCircle className="h-4 w-4" />
                      Patient Symptoms
                      {appointment.booking_source === 'ai_chat' && (
                        <Badge variant="outline" className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700">
                          AI Assisted
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {appointment.notes || appointment.ai_summary}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Service Details */}
              {appointment.services && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CheckCircle className="h-4 w-4" />
                      Service
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="font-medium">{appointment.services.name}</p>
                      {appointment.services.description && (
                        <p className="text-sm text-muted-foreground">{appointment.services.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {appointment.services.duration_minutes && (
                          <span>Duration: {appointment.services.duration_minutes} min</span>
                        )}
                        {appointment.services.price_cents && (
                          <span>Price: €{(appointment.services.price_cents / 100).toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {appointment.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4" />
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {appointment.notes}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Booking Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Booking Information</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  <p>Booked: {format(new Date(appointment.created_at), 'PPP')}</p>
                  {appointment.booking_source && (
                    <p>Source: {appointment.booking_source}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Failed to load appointment details</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}