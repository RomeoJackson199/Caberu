import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Calendar, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AppointmentSuccessWidgetProps {
  appointmentDetails: {
    date: string;
    time: string;
    dentistName: string;
    reason: string;
  };
  onBookAnother: () => void;
}

export const AppointmentSuccessWidget = ({ 
  appointmentDetails, 
  onBookAnother 
}: AppointmentSuccessWidgetProps) => {
  const navigate = useNavigate();

  return (
    <Card className="bg-success/5 border-success/20">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-success-foreground" />
          </div>

          <div>
            <h3 className="text-xl font-heading font-semibold text-foreground mb-2">
              Appointment Confirmed! 🎉
            </h3>
            <p className="text-sm text-muted-foreground">
              You'll receive a confirmation email shortly
            </p>
          </div>

          <div className="w-full p-4 bg-muted/50 rounded-lg space-y-2 text-left">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">{appointmentDetails.date}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Time:</span>
              <span className="font-medium">{appointmentDetails.time}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Dentist:</span>
              <span className="font-medium">{appointmentDetails.dentistName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Reason:</span>
              <span className="font-medium">{appointmentDetails.reason}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
            <Button 
              onClick={() => navigate('/patient/appointments')}
              className="flex-1"
              variant="default"
            >
              <Calendar className="w-4 h-4 mr-2" />
              View My Appointments
            </Button>
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              className="flex-1"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>

          <Button 
            onClick={onBookAnother}
            variant="ghost"
            className="text-sm"
          >
            Book Another Appointment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
