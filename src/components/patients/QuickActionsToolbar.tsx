import { Phone, Mail, MessageSquare, Calendar, CreditCard, FileText, MoreHorizontal, Video, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCommunicationLogs } from "@/hooks/useCommunicationLogs";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  icon: React.ElementType;
  label: string;
  shortLabel?: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

interface QuickActionsToolbarProps {
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
  };
  businessId: string;
  onBookAppointment: () => void;
  onSendPaymentRequest: () => void;
  onViewDocuments?: () => void;
  onSendReminder?: () => void;
  className?: string;
}

export function QuickActionsToolbar({
  patient,
  businessId,
  onBookAppointment,
  onSendPaymentRequest,
  onViewDocuments,
  onSendReminder,
  className,
}: QuickActionsToolbarProps) {
  const { addLog } = useCommunicationLogs({ patientId: patient.id, businessId });

  const handleCall = () => {
    if (patient.phone) {
      window.open(`tel:${patient.phone}`, '_self');
      addLog({
        patient_id: patient.id,
        business_id: businessId,
        channel: 'phone',
        direction: 'outbound',
        subject: 'Phone Call',
        content: `Called patient at ${patient.phone}`,
        status: 'initiated',
      });
    }
  };

  const handleEmail = () => {
    if (patient.email) {
      window.open(`mailto:${patient.email}`, '_blank');
      addLog({
        patient_id: patient.id,
        business_id: businessId,
        channel: 'email',
        direction: 'outbound',
        subject: 'Email',
        content: `Emailed patient at ${patient.email}`,
        status: 'sent',
      });
    }
  };

  const handleSMS = () => {
    if (patient.phone) {
      window.open(`sms:${patient.phone}`, '_self');
      addLog({
        patient_id: patient.id,
        business_id: businessId,
        channel: 'sms',
        direction: 'outbound',
        subject: 'SMS',
        content: `Sent SMS to ${patient.phone}`,
        status: 'sent',
      });
    }
  };

  const primaryActions: QuickAction[] = [
    {
      id: 'call',
      icon: Phone,
      label: 'Call Patient',
      shortLabel: 'Call',
      onClick: handleCall,
      variant: 'default',
    },
    {
      id: 'email',
      icon: Mail,
      label: 'Send Email',
      shortLabel: 'Email',
      onClick: handleEmail,
      variant: 'default',
    },
    {
      id: 'sms',
      icon: MessageSquare,
      label: 'Send SMS',
      shortLabel: 'SMS',
      onClick: handleSMS,
      variant: 'default',
    },
    {
      id: 'book',
      icon: Calendar,
      label: 'Book Appointment',
      shortLabel: 'Book',
      onClick: onBookAppointment,
      variant: 'primary',
    },
  ];

  const secondaryActions: QuickAction[] = [
    {
      id: 'payment',
      icon: CreditCard,
      label: 'Request Payment',
      onClick: onSendPaymentRequest,
    },
    ...(onViewDocuments ? [{
      id: 'documents',
      icon: FileText,
      label: 'View Documents',
      onClick: onViewDocuments,
    }] : []),
    ...(onSendReminder ? [{
      id: 'reminder',
      icon: Bell,
      label: 'Send Reminder',
      onClick: onSendReminder,
    }] : []),
  ];

  const variantStyles = {
    default: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
    primary: 'bg-indigo-500 hover:bg-indigo-600 text-white',
    success: 'bg-emerald-500 hover:bg-emerald-600 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
  };

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-1.5", className)}>
        {primaryActions.map((action) => {
          const Icon = action.icon;
          const isDisabled = (action.id === 'call' || action.id === 'sms') && !patient.phone;
          const isEmailDisabled = action.id === 'email' && !patient.email;
          
          return (
            <Tooltip key={action.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 px-2.5 gap-1.5",
                    variantStyles[action.variant || 'default'],
                    (isDisabled || isEmailDisabled) && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={action.onClick}
                  disabled={isDisabled || isEmailDisabled}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs">{action.shortLabel || action.label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isDisabled ? 'No phone number' : isEmailDisabled ? 'No email' : action.label}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {secondaryActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-slate-100 hover:bg-slate-200">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {secondaryActions.map((action) => {
                const Icon = action.icon;
                return (
                  <DropdownMenuItem key={action.id} onClick={action.onClick}>
                    <Icon className="h-4 w-4 mr-2" />
                    {action.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </TooltipProvider>
  );
}
