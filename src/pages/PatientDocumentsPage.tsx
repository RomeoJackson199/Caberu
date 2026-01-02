import React from "react";
import { FolderOpen, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/useLanguage";
import { AnimatedBackground, SectionHeader, EmptyState } from "@/components/ui/polished-components";
import { HealthProgressDashboard } from "@/components/patients/HealthProgressDashboard";

export default function PatientDocumentsPage() {
  const { t } = useLanguage();
  return (
    <div className="space-y-6 pb-8">
      {/* Enhanced Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 dark:from-cyan-950/20 dark:via-blue-950/20 dark:to-indigo-950/20 rounded-2xl p-6">
        <AnimatedBackground />

        <div className="relative z-10">
          <SectionHeader
            icon={FolderOpen}
            title={t.pnav.docs.main}
            description="View your health progress, treatment history, and dental documents"
            gradient="from-cyan-600 to-blue-600"
          />
        </div>
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="progress" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="progress" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Health Progress
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Documents
          </TabsTrigger>
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
    </div>
  );
}

