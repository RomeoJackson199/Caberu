import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { Dentist } from "./types";

interface ConfirmationStepProps {
  dentist: Dentist;
  selectedDate: Date;
  selectedTime: string;
  isBooking: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

export function ConfirmationStep({
  dentist,
  selectedDate,
  selectedTime,
  isBooking,
  onConfirm,
  onBack,
}: ConfirmationStepProps) {
  return (
    <div className="max-w-2xl mx-auto p-4 py-8">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to time selection
      </Button>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Confirm Your Appointment</h2>
            <p className="text-muted-foreground">Review your booking details</p>
          </div>

          <div className="space-y-4 py-4 border-y">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dentist</span>
              <span className="font-medium">
                Dr. {dentist.first_name} {dentist.last_name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time</span>
              <span className="font-medium">{selectedTime}</span>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={onConfirm}
            disabled={isBooking}
            aria-busy={isBooking}
          >
            {isBooking ? (
              <>
                <Loader2
                  className="h-4 w-4 mr-2 animate-spin"
                  aria-hidden="true"
                />
                Booking...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                Confirm Booking
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
