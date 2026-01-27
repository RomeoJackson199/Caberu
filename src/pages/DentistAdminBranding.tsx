import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Loader2, Package, Mail, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AIBehaviorSettings } from "@/components/admin/AIBehaviorSettings";
import { AITestChatDialog } from "@/components/admin/AITestChatDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceManager } from "@/components/services/ServiceManager";
import { EmailTemplateEditor } from "@/components/settings/EmailTemplateEditor";
import { BrandingPageSkeleton } from "@/components/ui/page-skeletons";
import { StripeConnectSettings } from "@/components/settings/StripeConnectSettings";
import {
  useBrandingSettings,
  BrandingTabContent,
  QRCodeDialog,
  TemplateChangeDialog,
} from "@/components/branding";

export default function DentistAdminBranding() {
  const { t } = useLanguage();
  const branding = useBrandingSettings();

  if (branding.businessLoading) {
    return <BrandingPageSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title={t.brandingSettings}
        subtitle={t.brandingSubtitle}
        breadcrumbs={[
          { label: t.navDashboard, href: "/dentist" },
          { label: t.navAdmin },
          { label: t.brandingSettings },
        ]}
      />

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="branding">{t.branding}</TabsTrigger>
          <TabsTrigger value="services">
            <Package className="h-4 w-4 mr-2" />
            {t.services}
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="h-4 w-4 mr-2" />
            {t.payments}
          </TabsTrigger>
          <TabsTrigger value="emails">
            <Mail className="h-4 w-4 mr-2" />
            {t.emailTemplates}
          </TabsTrigger>
          <TabsTrigger value="ai">{t.aiAssistantConfig}</TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6">
          <BrandingTabContent branding={branding} />
        </TabsContent>

        <TabsContent value="services">
          <ServiceManager />
        </TabsContent>

        <TabsContent value="payments">
          <StripeConnectSettings />
        </TabsContent>

        <TabsContent value="emails">
          <EmailTemplateEditor />
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <AIBehaviorSettings
            systemBehavior={branding.aiSystemBehavior}
            greeting={branding.aiGreeting}
            personalityTraits={branding.aiPersonalityTraits}
            businessId={branding.businessId || undefined}
            onSystemBehaviorChange={branding.setAiSystemBehavior}
            onGreetingChange={branding.setAiGreeting}
            onPersonalityTraitsChange={branding.setAiPersonalityTraits}
            onTestChat={() => branding.setShowTestChat(true)}
          />

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={branding.loadBrandingSettings}>
              {t.cancel}
            </Button>
            <Button onClick={branding.handleSaveBranding} disabled={branding.loading}>
              {branding.loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.savingChanges}
                </>
              ) : (
                t.save
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <QRCodeDialog
        open={branding.showQrDialog}
        onOpenChange={branding.setShowQrDialog}
        businessLink={branding.businessLink}
        onDownload={branding.handleDownloadQr}
        qrCanvasRef={branding.qrCanvasRef}
      />

      <AITestChatDialog
        open={branding.showTestChat}
        onOpenChange={branding.setShowTestChat}
        greeting={branding.aiGreeting}
        systemBehavior={branding.aiSystemBehavior}
        personalityTraits={branding.aiPersonalityTraits}
        businessName={branding.clinicName}
      />

      <TemplateChangeDialog
        currentTemplate={branding.templateType}
        pendingTemplate={branding.pendingTemplate}
        onConfirm={branding.confirmTemplateChange}
        onCancel={branding.cancelTemplateChange}
      />
    </div>
  );
}
