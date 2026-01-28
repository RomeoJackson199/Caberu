import React from "react";
import { Pill } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { EmptyState } from "@/components/ui/polished-components";
import { PageHeaderWithGradient, PageContainer } from "@/components/ui/layout-components";

export default function PatientPrescriptionsPage() {
  const { t } = useLanguage();
  const [user, setUser] = React.useState<User | null>(null);
  React.useEffect(() => { (async () => { const { data } = await supabase.auth.getUser(); setUser(data.user as any) })() }, []);

  return (
    <PageContainer>
      <PageHeaderWithGradient
        icon={Pill}
        title={t.pnav.care.prescriptions}
        description="View and manage your current medications and prescriptions"
        gradient="from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/20 dark:via-emerald-950/20 dark:to-teal-950/20"
        iconGradient="from-green-600 to-emerald-600"
      />

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
    </PageContainer>
  );
}

