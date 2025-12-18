import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  UserPlus,
  FileText,
  MessageSquare,
  Zap,
  Settings,
  Camera,
  Phone,
  Mail,
  AlertTriangle
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  action: () => void;
  badge?: {
    text: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  };
}

interface ModernQuickActionsProps {
  onBookAppointment: () => void;
  onAddPatient: () => void;
  onCreateNote: () => void;
  onSendMessage: () => void;
  onEmergencyTriage: () => void;
  onSettings: () => void;
  onTakePhoto: () => void;
  onCallPatient: () => void;
  pendingCount?: number;
  urgentCount?: number;
}

export function ModernQuickActions({
  onBookAppointment,
  onAddPatient,
  onCreateNote,
  onSendMessage,
  onEmergencyTriage,
  onSettings,
  onTakePhoto,
  onCallPatient,
  pendingCount = 0,
  urgentCount = 0
}: ModernQuickActionsProps) {
  const { t } = useLanguage();
  const quickActions: QuickAction[] = [
    {
      id: "appointment",
      title: t.bookAppointment || "Book Appointment",
      description: t.scheduleNewPatientAppointment || "Schedule a new patient appointment",
      icon: Calendar,
      color: "text-dental-primary",
      bgColor: "bg-dental-primary/10",
      action: onBookAppointment
    },
    {
      id: "emergency",
      title: t.emergencyTriage || "Emergency Triage",
      description: t.startEmergencyAssessment || "Start emergency assessment",
      icon: Zap,
      color: "text-dental-error",
      bgColor: "bg-dental-error/10",
      action: onEmergencyTriage,
      badge: urgentCount > 0 ? {
        text: `${urgentCount} urgent`,
        variant: "destructive" as const
      } : undefined
    },
    {
      id: "patient",
      title: t.addPatient || "Add Patient",
      description: t.registerNewPatient || "Register a new patient",
      icon: UserPlus,
      color: "text-dental-secondary",
      bgColor: "bg-dental-secondary/10",
      action: onAddPatient
    },
    {
      id: "note",
      title: t.createNote || "Create Note",
      description: t.addPatientNotesOrMemo || "Add patient notes or memo",
      icon: FileText,
      color: "text-dental-accent",
      bgColor: "bg-dental-accent/10",
      action: onCreateNote
    },
    {
      id: "message",
      title: t.sendMessage || "Send Message",
      description: t.contactPatientOrTeam || "Contact patient or team",
      icon: MessageSquare,
      color: "text-dental-info",
      bgColor: "bg-dental-info/10",
      action: onSendMessage,
      badge: pendingCount > 0 ? {
        text: `${pendingCount} ${t.pending || 'pending'}`,
        variant: "secondary" as const
      } : undefined
    },
    {
      id: "photo",
      title: t.takePhoto || "Take Photo",
      description: t.captureDentalImages || "Capture dental images",
      icon: Camera,
      color: "text-dental-warning",
      bgColor: "bg-dental-warning/10",
      action: onTakePhoto
    },
    {
      id: "call",
      title: t.callPatient || "Call Patient",
      description: t.makePhoneCall || "Make a phone call",
      icon: Phone,
      color: "text-dental-success",
      bgColor: "bg-dental-success/10",
      action: onCallPatient
    },
    {
      id: "settings",
      title: t.settings || "Settings",
      description: t.configurePreferences || "Configure preferences",
      icon: Settings,
      color: "text-dental-muted-foreground",
      bgColor: "bg-dental-muted/10",
      action: onSettings
    }
  ];

  return (
    <Card className="glass-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-5 w-5 text-dental-primary" />
          <span>{t.quickActions || 'Quick Actions'}</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <Button
                key={action.id}
                variant="ghost"
                onClick={action.action}
                className="h-auto p-4 flex flex-col items-center space-y-2 hover:shadow-soft hover:scale-105 transition-all duration-200 group relative"
              >
                {/* Badge */}
                {action.badge && (
                  <Badge
                    variant={action.badge.variant}
                    className="absolute -top-1 -right-1 text-xs px-1.5 py-0.5 h-5"
                  >
                    {action.badge.text}
                  </Badge>
                )}

                {/* Icon */}
                <div className={`p-3 rounded-xl ${action.bgColor} group-hover:scale-110 transition-transform`}>
                  <Icon className={`h-6 w-6 ${action.color}`} />
                </div>

                {/* Content */}
                <div className="text-center space-y-1">
                  <p className="font-semibold text-sm text-dental-foreground group-hover:text-dental-primary transition-colors">
                    {action.title}
                  </p>
                  <p className="text-xs text-dental-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    {action.description}
                  </p>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}