import React from "react";
import { FolderOpen } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { PatientRecordsTimeline } from "@/components/patient/PatientRecordsTimeline";
import { LoadingCard } from "@/components/ui/polished-components";

export default function PatientTreatmentHistoryPage() {
  const { t } = useLanguage();
  const [patientId, setPatientId] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', data.user.id)
          .maybeSingle();
        if (profile?.id) setPatientId(profile.id);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Treatment Records</h1>
        </div>
        <p className="text-muted-foreground">View and manage your dental history</p>
      </div>

      {patientId ? (
        <PatientRecordsTimeline patientId={patientId} />
      ) : (
        <LoadingCard />
      )}
    </div>
  );
}

