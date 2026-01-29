import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccordionItem, AccordionContent, AccordionTrigger } from "@/components/ui/accordion";
import { ClipboardList as ClipboardListIcon } from "lucide-react";
import { sanitizeText } from '@/utils/sanitize';
import { Appointment } from "./types";

interface AppointmentOutcome {
  id: string;
  outcome: string;
  notes?: string;
  appointments: {
    id: string;
    appointment_date: string;
  };
}

interface AppointmentTreatment {
  id: string;
  code: string;
  quantity: number;
  patient_share: number;
}

interface OutcomesSectionProps {
  outcomes: AppointmentOutcome[];
  treatmentsByAppointment: Record<string, AppointmentTreatment[]>;
  lastAppointment: Appointment | null;
  onCompleteAppointment: () => void;
}

export function OutcomesSection({
  outcomes,
  treatmentsByAppointment,
  lastAppointment,
  onCompleteAppointment
}: OutcomesSectionProps) {
  const canComplete = lastAppointment &&
    Math.abs(new Date(lastAppointment.appointment_date).getTime() - Date.now()) < 24 * 60 * 60 * 1000;

  return (
    <AccordionItem value="outcomes">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardListIcon className="h-5 w-5 text-dental-primary" />
              <span>Appointment Outcomes</span>
              <Badge variant="outline">{outcomes.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              {canComplete && (
                <Button size="sm" onClick={onCompleteAppointment}>Complete Last Appointment</Button>
              )}
              <AccordionTrigger className="py-0" />
            </div>
          </CardTitle>
        </CardHeader>
        <AccordionContent>
          <CardContent>
            {outcomes.length > 0 ? (
              <div className="space-y-3">
                {outcomes.map((o) => (
                  <div key={o.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className="capitalize">{o.outcome}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(o.appointments.appointment_date).toLocaleString()}
                          </span>
                        </div>
                        {o.notes && (
                          <p className="text-sm mt-2 bg-muted p-2 rounded">{sanitizeText(o.notes)}</p>
                        )}
                        {treatmentsByAppointment[o.appointments.id] && (
                          <div className="mt-2 text-xs">
                            <div className="font-medium mb-1">Performed treatments</div>
                            <div className="space-y-1">
                              {treatmentsByAppointment[o.appointments.id].map((t) => (
                                <div key={t.id} className="flex justify-between">
                                  <span>{t.code} x{t.quantity}</span>
                                  <span>Patient €{(t.patient_share * t.quantity).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No outcomes recorded</p>
            )}
          </CardContent>
        </AccordionContent>
      </Card>
    </AccordionItem>
  );
}
