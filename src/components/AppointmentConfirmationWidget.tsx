import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Stethoscope,
  FileText,
  MessageSquare,
  Edit,
  Trash2,
  Eye,
  Clock as ClockIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatClinicTime } from "@/lib/timezone";

interface AppointmentDetails {
  id: string;
  patient_name: string;
  patient_email?: string;
  patient_phone?: string;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  urgency: string;
  reason?: string;
  notes?: string;
  consultation_notes?: string;
  dentist_name?: string;
  dentist_specialty?: string;
  location?: string;
}

interface AppointmentConfirmationWidgetProps {
  appointment: AppointmentDetails;
  onConfirm?: () => void;
  onCancel?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewDetails?: () => void;
  onComplete?: () => void;
  isDentistView?: boolean;
  showActions?: boolean;
  className?: string;
}

export function AppointmentConfirmationWidget({
  appointment,
  onConfirm,
  onCancel,
  onEdit,
  onDelete,
  onViewDetails,
  onComplete,
  isDentistView = false,
  showActions = true,
  className = ""
}: AppointmentConfirmationWidgetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'emergency': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleConfirm = async () => {
    if (!onConfirm) return;
    
    setIsLoading(true);
    try {
      await onConfirm();
      toast({
        title: "Success",
        description: "Appointment confirmed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to confirm appointment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!onCancel) return;
    
    setIsLoading(true);
    try {
      await onCancel();
      toast({
        title: "Success",
        description: "Appointment cancelled successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel appointment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsLoading(true);
    try {
      await onDelete();
      setShowDeleteConfirm(false);
      toast({
        title: "Success",
        description: "Appointment deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete appointment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const appointmentDate = new Date(appointment.appointment_date);
  const isPast = appointmentDate < new Date();
  const isToday = formatClinicTime(appointment.appointment_date, 'yyyy-MM-dd') === formatClinicTime(new Date(), 'yyyy-MM-dd');

  return (
    <Card className={`glass-card hover:shadow-lg transition-all duration-300 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-dental-primary/10">
              <Calendar className="h-5 w-5 text-dental-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {isDentistView ? appointment.patient_name : `Dr. ${appointment.dentist_name}`}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {isDentistView ? "Patient Appointment" : "Dental Consultation"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(appointment.status)}>
              {appointment.status}
            </Badge>
            <Badge className={getUrgencyColor(appointment.urgency)}>
              <AlertTriangle className="h-3 w-3 mr-1" />
              {appointment.urgency}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Date and Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">
                {formatClinicTime(appointment.appointment_date, 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-sm text-blue-700">
                {isToday ? "Today" : formatClinicTime(appointment.appointment_date, 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
            <Clock className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">
                {formatClinicTime(appointment.appointment_date, 'h:mm a')}
              </p>
              <p className="text-sm text-green-700">
                Duration: {formatDuration(appointment.duration_minutes)}
              </p>
            </div>
          </div>
        </div>

        {/* Patient/Dentist Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
            <User className="h-5 w-5 text-purple-600" />
            <div>
              <p className="font-medium text-purple-900">
                {isDentistView ? "Patient" : "Dentist"}
              </p>
              <p className="text-sm text-purple-700">
                {isDentistView ? appointment.patient_name : `Dr. ${appointment.dentist_name}`}
              </p>
              {appointment.dentist_specialty && !isDentistView && (
                <p className="text-xs text-purple-600">{appointment.dentist_specialty}</p>
              )}
            </div>
          </div>

          {appointment.location && (
            <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
              <MapPin className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-900">Location</p>
                <p className="text-sm text-orange-700">{appointment.location}</p>
              </div>
            </div>
          )}
        </div>

        {/* Contact Information */}
        {(appointment.patient_email || appointment.patient_phone) && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Contact Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {appointment.patient_email && (
                <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
                  <Mail className="h-4 w-4 text-gray-600" />
                  <span className="text-sm text-gray-700">{appointment.patient_email}</span>
                </div>
              )}
              {appointment.patient_phone && (
                <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
                  <Phone className="h-4 w-4 text-gray-600" />
                  <span className="text-sm text-gray-700">{appointment.patient_phone}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reason for Visit */}
        {appointment.reason && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 flex items-center space-x-2">
              <Stethoscope className="h-4 w-4" />
              <span>Reason for Visit</span>
            </h4>
            <div className="p-3 bg-amber-50 rounded-lg">
              <p className="text-sm text-amber-800">{appointment.reason}</p>
            </div>
          </div>
        )}

        {/* Notes */}
        {appointment.notes && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Notes</span>
            </h4>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">{appointment.notes}</p>
            </div>
          </div>
        )}

        {/* Consultation Notes (Dentist View) */}
        {isDentistView && appointment.consultation_notes && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Consultation Notes</span>
            </h4>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800 whitespace-pre-wrap">{appointment.consultation_notes}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {showActions && (
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewDetails}
                className="flex items-center space-x-2"
              >
                <Eye className="h-4 w-4" />
                <span>View Details</span>
              </Button>
            )}

            {onEdit && !isPast && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </Button>
            )}

            {onConfirm && appointment.status === 'pending' && !isPast && (
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={isLoading}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4" />
                <span>{isLoading ? "Confirming..." : "Confirm"}</span>
              </Button>
            )}

            {onCancel && appointment.status !== 'cancelled' && !isPast && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isLoading}
                className="flex items-center space-x-2 border-red-300 text-red-600 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" />
                <span>{isLoading ? "Cancelling..." : "Cancel"}</span>
              </Button>
            )}

            {isDentistView && appointment.status !== 'completed' && (
              <Button
                size="sm"
                onClick={onComplete}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Complete</span>
              </Button>
            )}

            {onDelete && isDentistView && (
              <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2 border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Appointment</DialogTitle>
                    <DialogDescription>This action is permanent and cannot be undone.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      Are you sure you want to delete this appointment? This action cannot be undone.
                    </p>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isLoading}
                      >
                        {isLoading ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}