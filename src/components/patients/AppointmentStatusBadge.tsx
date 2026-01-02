import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import { isPast, isFuture } from "date-fns";
import { cn } from "@/lib/utils";

interface AppointmentStatusBadgeProps {
  status: string;
  appointmentDate: string;
  className?: string;
}

export function AppointmentStatusBadge({ status, appointmentDate, className }: AppointmentStatusBadgeProps) {
  const date = new Date(appointmentDate);
  const now = new Date();
  
  // Fix status logic based on actual date
  let displayStatus = status;
  let displayText = status;
  let colorClass = "";
  let Icon = AlertCircle;
  
  // Determine actual status based on date and current status
  if (isPast(date) && status !== 'completed' && status !== 'cancelled') {
    // Past appointments that aren't marked completed or cancelled
    if (status === 'confirmed' || status === 'scheduled') {
      displayStatus = 'completed';
      displayText = 'Completed';
    } else {
      displayStatus = 'no-show';
      displayText = 'No Show';
    }
  } else if (isFuture(date) && status === 'completed') {
    // Future appointments incorrectly marked as completed
    displayStatus = 'scheduled';
    displayText = 'Scheduled';
  }
  
  // Apply colors based on corrected status
  switch (displayStatus) {
    case 'confirmed':
    case 'scheduled':
      colorClass = "bg-success-bg text-success border-success";
      Icon = CheckCircle;
      displayText = 'Confirmed';
      break;
    case 'pending':
      colorClass = "bg-warning-bg text-warning border-warning";
      Icon = Clock;
      displayText = 'Pending';
      break;
    case 'cancelled':
      colorClass = "bg-error-bg text-error border-error";
      Icon = XCircle;
      displayText = 'Cancelled';
      break;
    case 'completed':
      colorClass = "bg-info-bg text-info border-info";
      Icon = CheckCircle;
      displayText = 'Completed';
      break;
    case 'no-show':
      colorClass = "bg-error-bg text-error border-error";
      Icon = AlertCircle;
      displayText = 'No Show';
      break;
    default:
      colorClass = "bg-muted text-muted-foreground border-border";
      displayText = status;
  }
  
  return (
    <Badge className={cn(colorClass, "flex items-center gap-1 font-medium", className)}>
      <Icon className="h-3 w-3" />
      {displayText}
    </Badge>
  );
}
