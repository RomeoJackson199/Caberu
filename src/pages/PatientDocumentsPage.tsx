import React from "react";
import { FolderOpen, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/useLanguage";
import { EmptyState } from "@/components/ui/polished-components";
import { PageHeaderWithGradient, IconTabTrigger, PageContainer } from "@/components/ui/layout-components";
import { HealthProgressDashboard } from "@/components/patients/HealthProgressDashboard";

export default function PatientDocumentsPage() {
  const { t } = useLanguage();
  return (
    <PageContainer>
      <PageHeaderWithGradient
        icon={FolderOpen}
        title={t.pnav.docs.main}
        description="View your health progress, treatment history, and dental documents"
        gradient="from-cyan-50 via-blue-50 to-indigo-50 dark:from-cyan-950/20 dark:via-blue-950/20 dark:to-indigo-950/20"
        iconGradient="from-cyan-600 to-blue-600"
      />

      <Tabs defaultValue="progress" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <IconTabTrigger value="progress" icon={TrendingUp} label="Health Progress" />
          <IconTabTrigger value="documents" icon={FolderOpen} label="Documents" />
        </TabsList>

        <TabsContent value="progress">
          <HealthProgressDashboard />
        </TabsContent>

        <TabsContent value="documents">
          <EmptyState
            icon={FolderOpen}
            title="No Documents Yet"
            description="You don't have any documents uploaded. Your treatment records, X-rays, and prescriptions will appear here."
          />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

