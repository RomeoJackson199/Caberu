import { Clock, User, FileText } from "lucide-react";
import { formatClinicTime } from "@/lib/timezone";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AppointmentCardProps {
  appointment: any;
  compact?: boolean;
  onClick?: () => void;
}

export function AppointmentCard({ appointment, compact = false, onClick }: AppointmentCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-500";
      case "completed": return "bg-blue-500";
      case "cancelled": return "bg-red-500";
      default: return "bg-yellow-500";
    }
  };

  if (compact) {
    return (
      <div 
        className="text-xs p-2 bg-primary/10 rounded cursor-pointer hover:bg-primary/20 transition-colors"
        onClick={onClick}
      >
        <div className="font-medium truncate">
          {formatClinicTime(appointment.appointment_date, "HH:mm")} - {appointment.patient?.first_name}
        </div>
      </div>
    );
  }

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(appointment.status)}>
                {appointment.status}
              </Badge>
              {appointment.urgency && appointment.urgency !== "medium" && (
                <Badge variant="outline">{appointment.urgency}</Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">
                {appointment.patient?.first_name} {appointment.patient?.last_name}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{formatClinicTime(appointment.appointment_date, "PPp")}</span>
            </div>

            {appointment.reason && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4" />
                <span>{appointment.reason}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
