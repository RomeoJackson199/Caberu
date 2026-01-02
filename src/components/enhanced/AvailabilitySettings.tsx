import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AvailabilitySettingsProps {
  dentistId?: string;
  businessId?: string;
}

export function AvailabilitySettings({ dentistId, businessId }: AvailabilitySettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Availability Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Configure your availability settings here.
        </p>
      </CardContent>
    </Card>
  );
}

export default AvailabilitySettings;
