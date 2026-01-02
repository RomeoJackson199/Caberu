import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardList, 
  MapPin, 
  Car, 
  Clock, 
  FileText,
  AlertCircle 
} from 'lucide-react';

interface PreparationProps {
  appointmentType?: string;
  preparationInstructions?: string;
  clinicAddress?: string;
  parkingInfo?: string;
  directions?: string;
  estimatedDuration?: number;
}

export function Preparation({
  appointmentType = "General",
  preparationInstructions,
  clinicAddress,
  parkingInfo,
  directions,
  estimatedDuration = 30,
}: PreparationProps) {
  const defaultInstructions = {
    "General": [
      "Bring your insurance card and ID",
      "Arrive 10 minutes early for check-in",
      "Update your medical history if anything has changed",
      "Bring a list of current medications",
    ],
    "Cleaning": [
      "Brush and floss before your appointment",
      "Avoid eating strong-smelling foods beforehand",
      "Bring your insurance information",
      "Inform us of any sensitivity issues",
    ],
    "Emergency": [
      "Call ahead if running late",
      "Bring any relevant X-rays or records",
      "Take pain medication as directed before arrival",
      "Avoid eating if procedure is expected",
    ],
  };

  const instructions = preparationInstructions 
    ? [preparationInstructions]
    : defaultInstructions[appointmentType as keyof typeof defaultInstructions] 
    || defaultInstructions.General;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            What to Bring
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {instructions.map((instruction, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="mt-0.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
              <p className="text-sm">{instruction}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Appointment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Estimated Duration</span>
            <Badge variant="outline">{estimatedDuration} minutes</Badge>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Please arrive 10 minutes early to complete any necessary paperwork
            </p>
          </div>
        </CardContent>
      </Card>

      {(clinicAddress || parkingInfo || directions) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location & Parking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {clinicAddress && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-medium text-sm">Address</h4>
                </div>
                <p className="text-sm text-muted-foreground ml-6">{clinicAddress}</p>
              </div>
            )}

            {parkingInfo && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-medium text-sm">Parking</h4>
                </div>
                <p className="text-sm text-muted-foreground ml-6">{parkingInfo}</p>
              </div>
            )}

            {directions && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-medium text-sm">Directions</h4>
                </div>
                <p className="text-sm text-muted-foreground ml-6">{directions}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-medium text-blue-900">Need to Reschedule?</h4>
              <p className="text-sm text-blue-700">
                If you need to cancel or reschedule, please do so at least 24 hours in advance
                to avoid any cancellation fees.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
