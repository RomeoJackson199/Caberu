import React from "react";
import { FolderOpen, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { PatientRecordsTimeline } from "@/components/patients/PatientRecordsTimeline";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/ui/layout-components";
import { EmptyState } from "@/components/ui/polished-components";

export default function PatientTreatmentHistoryPage() {
  const { t } = useLanguage();
  const [patientId, setPatientId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

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
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <PageContainer>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </CardContent>
        </Card>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <FolderOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Medical Records</h1>
          </div>
          <p className="text-muted-foreground">
            Your finalized medical records from completed appointments
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800">
          <ShieldCheck className="h-3.5 w-3.5" />
          Read-only
        </Badge>
      </div>

      {patientId ? (
        <PatientRecordsTimeline patientId={patientId} />
      ) : (
        <EmptyState
          icon={FolderOpen}
          title="Unable to load records"
          description="Please try again later or contact support if the issue persists."
        />
      )}
    </PageContainer>
  );
}

