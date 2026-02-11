import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccordionItem, AccordionContent, AccordionTrigger } from "@/components/ui/accordion";
import { CreditCard } from "lucide-react";
import { PatientPaymentHistory } from "@/components/PatientPaymentHistory";
import { PatientFlags } from "./types";

interface PaymentsSectionProps {
  patientId: string;
  patientFlags?: PatientFlags;
  onCreatePaymentRequest: () => void;
  onViewBalanceDetails?: () => void;
}

export function PaymentsSection({
  patientId,
  patientFlags,
  onCreatePaymentRequest,
  onViewBalanceDetails
}: PaymentsSectionProps) {
  return (
    <AccordionItem value="payments">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-dental-primary" />
              <span>Payments</span>
              {patientFlags?.hasUnpaidBalance && (
                <Badge
                  variant="destructive"
                  className={onViewBalanceDetails ? "cursor-pointer hover:bg-red-600 transition-colors" : ""}
                  onClick={(e) => {
                    if (onViewBalanceDetails) {
                      e.stopPropagation();
                      onViewBalanceDetails();
                    }
                  }}
                >
                  Due €{((patientFlags.outstandingCents || 0) / 100).toFixed(2)}
                </Badge>
              )}
            </div>
            <AccordionTrigger className="py-0" />
          </CardTitle>
        </CardHeader>
        <AccordionContent>
          <CardContent>
            <div className="mb-3">
              <Button size="sm" variant="outline" onClick={onCreatePaymentRequest}>
                <CreditCard className="h-4 w-4 mr-1" /> Create Payment Request
              </Button>
            </div>
            <PatientPaymentHistory patientId={patientId} />
          </CardContent>
        </AccordionContent>
      </Card>
    </AccordionItem>
  );
}
