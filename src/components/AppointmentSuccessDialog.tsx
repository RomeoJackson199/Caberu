import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Calendar, Home, Eye, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AppointmentSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentDetails?: {
    date: string;
    time: string;
    dentist?: string;
    reason?: string;
    location?: string;
    pendingApproval?: boolean;
  };
}

export function AppointmentSuccessDialog({
  open,
  onOpenChange,
  appointmentDetails
}: AppointmentSuccessDialogProps) {
  const navigate = useNavigate();
  const isPending = appointmentDetails?.pendingApproval === true;

  const handleViewAppointments = () => {
    onOpenChange(false);
    navigate('/dashboard?tab=appointments');
  };

  const handleGoToDashboard = () => {
    onOpenChange(false);
    navigate('/dashboard');
  };

  const handleAddToGoogleCalendar = () => {
    if (!appointmentDetails) return;

    const startDate = new Date(appointmentDetails.date + ' ' + appointmentDetails.time);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Dental Appointment')}&dates=${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(appointmentDetails.reason || 'Dental consultation')}&location=${encodeURIComponent(appointmentDetails.location || '')}`;

    window.open(googleCalendarUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            {isPending ? (
              <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-10 w-10 text-amber-600" />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
            )}
          </div>
          <DialogTitle className="text-center text-2xl">
            {isPending ? "Awaiting Approval" : "Appointment Confirmed!"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isPending
              ? "Your appointment request has been sent to your dentist for approval. You'll receive an email once it's confirmed."
              : "Your appointment has been successfully booked."}
          </DialogDescription>
        </DialogHeader>

        {appointmentDetails && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2 my-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">{appointmentDetails.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time:</span>
              <span className="font-medium">{appointmentDetails.time}</span>
            </div>
            {appointmentDetails.dentist && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dentist:</span>
                <span className="font-medium">{appointmentDetails.dentist}</span>
              </div>
            )}
            {appointmentDetails.location && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location:</span>
                <span className="font-medium text-right">{appointmentDetails.location}</span>
              </div>
            )}
            {appointmentDetails.reason && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reason:</span>
                <span className="font-medium">{appointmentDetails.reason}</span>
              </div>
            )}
            {isPending && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium text-amber-600">Pending Approval</span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Button onClick={handleViewAppointments} className="w-full gap-2">
            <Eye className="h-4 w-4" />
            View My Appointments
          </Button>

          {!isPending && (
            <Button onClick={handleAddToGoogleCalendar} variant="outline" className="w-full gap-2">
              <Calendar className="h-4 w-4" />
              Add to Google Calendar
            </Button>
          )}

          <Button onClick={handleGoToDashboard} variant="ghost" className="w-full gap-2">
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
