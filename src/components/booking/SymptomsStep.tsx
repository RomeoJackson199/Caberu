import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { DentistInfoHeader } from "./DentistInfoHeader";
import type { Dentist } from "./types";

interface SymptomsStepProps {
  dentist: Dentist | null;
  symptomSummary: string;
  onSymptomChange: (value: string) => void;
  onNext: () => void;
  onBack?: () => void;
}

export function SymptomsStep({
  dentist,
  symptomSummary,
  onSymptomChange,
  onNext,
  onBack,
}: SymptomsStepProps) {
  return (
    <div className="max-w-4xl mx-auto p-4 py-8">
      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      )}

      <Card>
        <CardContent className="p-6 space-y-6">
          {dentist && <DentistInfoHeader dentist={dentist} />}

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-orange-600" />
              <h3 className="font-semibold text-lg">Tell Us Your Reason for Visit</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Please describe your symptoms or reason for visiting the dentist. This helps us recommend the right service and prepare for your appointment.
            </p>
            <Textarea
              value={symptomSummary}
              onChange={(e) => onSymptomChange(e.target.value.slice(0, 500))}
              maxLength={500}
              placeholder="E.g., I have a toothache on my upper left molar, sensitivity to cold drinks, mild swelling..."
              className="min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground">
              {symptomSummary.length}/500 characters
            </p>
          </div>

          <Button onClick={onNext} className="w-full" size="lg">
            Continue to Select Service
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
