import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Search, CalendarDays, CheckCircle2, MessageSquare, ArrowDown } from "lucide-react";

interface FlowStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
}

const FLOW_STEPS: FlowStep[] = [
  {
    icon: <Phone className="h-5 w-5" />,
    title: "Patient Calls",
    description: "Patient dials the AI agent number (+1 360 967 0625). The AI receptionist answers 24/7.",
    badge: "Inbound",
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Patient Identified",
    description: "AI looks up the caller by phone number or name. New patients are automatically registered.",
    badge: "Auto",
  },
  {
    icon: <CalendarDays className="h-5 w-5" />,
    title: "Availability Checked",
    description: "AI queries open appointment slots based on the patient's preferred date, time, and dentist.",
    badge: "Live",
  },
  {
    icon: <CheckCircle2 className="h-5 w-5" />,
    title: "Appointment Booked",
    description: "AI confirms the details with the patient and creates a confirmed appointment in the system.",
    badge: "Confirmed",
  },
  {
    icon: <MessageSquare className="h-5 w-5" />,
    title: "SMS Confirmation",
    description: "A confirmation SMS is sent to the patient with the appointment date, time, and dentist name.",
    badge: "Sent",
  },
];

export function PhoneBookingFlowCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Phone Booking Flow
        </CardTitle>
        <CardDescription>
          How your AI receptionist handles appointment bookings over the phone
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-0">
          {FLOW_STEPS.map((step, index) => (
            <div key={index}>
              <div className="flex items-start gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30">
                {/* Icon circle */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {step.icon}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {index + 1}. {step.title}
                    </span>
                    {step.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {step.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Connector arrow between steps */}
              {index < FLOW_STEPS.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowDown className="h-4 w-4 text-muted-foreground/50" />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
