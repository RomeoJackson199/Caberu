import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, ArrowRight, Stethoscope, Edit2, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BookingReadyWidgetProps {
  conversationData: {
    symptoms?: string;
    urgency?: number;
    messages: any[];
    recommendedService?: string;
  };
}

export const BookingReadyWidget = ({ conversationData }: BookingReadyWidgetProps) => {
  const navigate = useNavigate();
  const [symptomSummary, setSymptomSummary] = useState(conversationData.symptoms || "");
  const [isEditingSymptoms, setIsEditingSymptoms] = useState(false);

  const handleProceed = () => {
    // Store conversation data in session storage for booking
    sessionStorage.setItem('aiBookingData', JSON.stringify({
      ...conversationData,
      symptoms: symptomSummary, // Use the potentially edited symptom summary
    }));

    // Navigate to AI booking page
    navigate('/book-appointment');
  };

  return (
    <Card className="max-w-md mx-auto my-4 border-primary/20 shadow-lg bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-3">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Ready to Book</h3>
              <p className="text-sm text-muted-foreground">
                I have all the information I need!
              </p>
            </div>
          </div>

          {/* Recommended Service */}
          {conversationData.recommendedService && (
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
              <div className="flex items-center gap-2 mb-1">
                <Stethoscope className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Recommended Service</span>
              </div>
              <p className="text-sm font-semibold">{conversationData.recommendedService}</p>
            </div>
          )}

          {/* Editable Symptom Summary */}
          <div className="bg-background/50 rounded-lg p-4 space-y-2 border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Your Symptoms (for the dentist)</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingSymptoms(!isEditingSymptoms)}
                className="h-7 px-2"
              >
                {isEditingSymptoms ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Done
                  </>
                ) : (
                  <>
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </>
                )}
              </Button>
            </div>
            {isEditingSymptoms ? (
              <Textarea
                value={symptomSummary}
                onChange={(e) => setSymptomSummary(e.target.value)}
                placeholder="Describe your symptoms..."
                className="min-h-[80px] text-sm"
              />
            ) : (
              <p className="text-sm">
                {symptomSummary || "No symptoms described"}
              </p>
            )}
          </div>

          <Button 
            onClick={handleProceed}
            className="w-full group"
            size="lg"
          >
            Proceed to Book Appointment
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
