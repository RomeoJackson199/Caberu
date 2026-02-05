import React from "react";
import { CreditCard, DollarSign, Receipt, FileText, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { PaymentsTab } from "@/components/patients/PaymentsTab";
import { emitAnalyticsEvent } from "@/lib/analyticsEvents";
import { AnimatedBackground, SectionHeader, EmptyState } from "@/components/ui/polished-components";
import { useBusinessTemplate } from "@/hooks/useBusinessTemplate";
import { useNavigate } from "react-router-dom";

export default function PatientBillingPage() {
  const { t } = useLanguage();
  const { hasFeature } = useBusinessTemplate();
  const navigate = useNavigate();
  const [user, setUser] = React.useState<User | null>(null);
  const [patientId, setPatientId] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<'unpaid' | 'paid' | 'statements'>('unpaid');
  const [totalDueCents, setTotalDueCents] = React.useState<number>(0);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user as any);
      if (data.user?.id) {
        const { data: profile } = await supabase.from('secure_profiles_view').select('id').eq('user_id', data.user.id).maybeSingle();
        if (profile?.id) setPatientId(profile.id);
      }
    })();
  }, []);

  React.useEffect(() => {
    (async () => {
      if (!patientId) return;
      const { data, error } = await supabase
        .from('payment_requests')
        .select('amount,status')
        .eq('patient_id', patientId);
      if (!error) {
        const open = (data || []).filter(r => ['pending', 'overdue'].includes(String(r.status)));
        setTotalDueCents(open.reduce((s, r: any) => s + (r.amount || 0), 0));
      }
    })();
  }, [patientId]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (status === 'unpaid') setTab('unpaid');
    if (status === 'paid') setTab('paid');
    if (status === 'statements') setTab('statements');
  }, []);

  React.useEffect(() => {
    if (tab === 'unpaid') {
      try { emitAnalyticsEvent('pnav_funnel_unpaid_open', '', { path: '/billing', status: 'unpaid' }); } catch { }
    }
  }, [tab]);

  // Feature gate: redirect if payment requests are disabled
  if (!hasFeature('paymentRequests')) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <EmptyState
              icon={AlertCircle}
              title={t.billingNotAvailable}
              description={t.billingNotAvailableDesc}
              action={{
                label: t.goToCareHome,
                onClick: () => navigate('/care')
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-red-950/20 rounded-2xl p-6">
        <AnimatedBackground />

        <div className="relative z-10 flex items-start justify-between">
          <SectionHeader
            icon={DollarSign}
            title={t.pnav.billing.main}
            description={t.managePaymentsDesc}
            gradient="from-amber-600 to-orange-600"
          />
          {totalDueCents > 0 && (
            <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg">
              ${(totalDueCents / 100).toFixed(2)} {t.amountDueLabel}
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="unpaid" className="gap-2">
            <CreditCard className="h-4 w-4" />
            {t.unpaid}
          </TabsTrigger>
          <TabsTrigger value="paid" className="gap-2">
            <Receipt className="h-4 w-4" />
            {t.paid}
          </TabsTrigger>
          <TabsTrigger value="statements" className="gap-2">
            <FileText className="h-4 w-4" />
            {t.statements}
          </TabsTrigger>
        </TabsList>
        <div className="mt-6">
          <TabsContent value="unpaid">
            {patientId && <PaymentsTab patientId={patientId} totalDueCents={totalDueCents} filter="unpaid" />}
          </TabsContent>
          <TabsContent value="paid">
            {patientId && <PaymentsTab patientId={patientId} filter="paid" />}
          </TabsContent>
          <TabsContent value="statements">
            <EmptyState
              icon={FileText}
              title={t.noStatementsAvailable}
              description={t.noStatementsDesc}
              action={{
                label: t.contactSupport,
                onClick: () => { }
              }}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

