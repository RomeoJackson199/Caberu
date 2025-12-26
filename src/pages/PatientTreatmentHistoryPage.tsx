import React from "react";
import { FileText } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { PatientRecordsTimeline } from "@/components/patient/PatientRecordsTimeline";
import { AnimatedBackground, SectionHeader, LoadingCard } from "@/components/ui/polished-components";

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
      {/* Enhanced Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/20 dark:via-teal-950/20 dark:to-cyan-950/20 rounded-2xl p-6">
        <AnimatedBackground />

        <div className="relative z-10">
          <SectionHeader
            icon={FileText}
            title="Records"
            description="Your finalized medical records from completed appointments"
            gradient="from-emerald-600 to-teal-600"
          />
        </div>
      </div>

      {patientId ? (
        <PatientRecordsTimeline patientId={patientId} />
      ) : (
        <LoadingCard />
      )}
    </div>
  );
}

