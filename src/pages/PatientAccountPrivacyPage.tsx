import { useAuth } from "@/hooks/useAuth";
import { PatientPrivacyDashboard } from "@/components/gdpr/PatientPrivacyDashboard";
import { Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function PatientAccountPrivacyPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" /> Privacy & Data Rights
        </h1>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Please log in to manage your privacy settings.
          </CardContent>
        </Card>
      </div>
    );
  }

  return <PatientPrivacyDashboard patientId={user.id} userId={user.id} />;
}
