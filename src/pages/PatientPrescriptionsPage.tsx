import React from "react";
import { Pill, Plus, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { PatientDashboard } from "@/components/PatientDashboard";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { AnimatedBackground, EmptyState, SectionHeader } from "@/components/ui/polished-components";

export default function PatientPrescriptionsPage() {
  const { t } = useLanguage();
  const [user, setUser] = React.useState<User | null>(null);
  React.useEffect(() => { (async () => { const { data } = await supabase.auth.getUser(); setUser(data.user as any) })() }, []);

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/20 dark:via-emerald-950/20 dark:to-teal-950/20 rounded-2xl p-6">
        <AnimatedBackground />

        <div className="relative z-10">
          <SectionHeader
            icon={Pill}
            title={t.pnav.care.prescriptions}
            description="View and manage your current medications and prescriptions"
            gradient="from-green-600 to-emerald-600"
          />
        </div>
      </div>

      <EmptyState
        icon={Pill}
        title="No Active Prescriptions"
        description={t.viewManageMedications || "You don't have any active prescriptions at the moment. Your prescriptions will appear here once your dentist prescribes medications."}
        action={{
          label: "Contact Dentist",
          onClick: () => {}
        }}
        secondaryAction={{
          label: "View History",
          onClick: () => {}
        }}
      />
    </div>
  );
}

