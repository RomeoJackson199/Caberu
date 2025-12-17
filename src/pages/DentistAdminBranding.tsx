import { useState, useEffect, useRef } from "react";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Palette, Upload, Image as ImageIcon, Briefcase, Package, Copy, Check, QrCode, Download, Mail } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { BusinessTemplateSelector } from "@/components/BusinessTemplateSelector";
import { TemplateType, getTemplateConfig } from "@/lib/businessTemplates";
import { useTemplate } from "@/contexts/TemplateContext";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AIBehaviorSettings } from "@/components/admin/AIBehaviorSettings";
import { AITestChatDialog } from "@/components/admin/AITestChatDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceManager } from "@/components/services/ServiceManager";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeCanvas } from "qrcode.react";
import { logger } from '@/lib/logger';
import { TemplatePreview } from "@/components/TemplatePreview";
import { EmailTemplateEditor } from "@/components/settings/EmailTemplateEditor";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { PhoneNumberInput } from "@/components/ui/phone-input";
import { StripeConnectSettings } from "@/components/settings/StripeConnectSettings";
import { CreditCard } from "lucide-react";

export default function DentistAdminBranding() {
  const { businessId, loading: businessLoading } = useBusinessContext();
  const { updateTemplate: updateTemplateContext } = useTemplate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [clinicName, setClinicName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugError, setSlugError] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [tagline, setTagline] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0EA5E9");
  const [secondaryColor, setSecondaryColor] = useState("#10B981");
  const [logoUrl, setLogoUrl] = useState("");
  const [templateType, setTemplateType] = useState<TemplateType>("healthcare");
  const [showTemplateWarning, setShowTemplateWarning] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<TemplateType | null>(null);
  const [aiSystemBehavior, setAiSystemBehavior] = useState("");
  const [aiGreeting, setAiGreeting] = useState("");
  const [aiPersonalityTraits, setAiPersonalityTraits] = useState<string[]>([]);
  const [showTestChat, setShowTestChat] = useState(false);
  const { toast } = useToast();
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const businessLink = slug
    ? baseOrigin
      ? `${baseOrigin}/${slug}`
      : `/${slug}`
    : baseOrigin;

  const [initialState, setInitialState] = useState({
    clinicName,
    slug,
    tagline,
    address,
    phone,
    primaryColor,
    secondaryColor,
    logoUrl,
    templateType,
    aiSystemBehavior,
    aiGreeting,
    aiPersonalityTraits,
  });

  useEffect(() => {
    if (businessId) {
      loadBrandingSettings();
    }
  }, [businessId]);

  const loadBrandingSettings = async () => {
    try {
      const { data: business, error } = await supabase
        .from('businesses')
        .select('name, slug, tagline, address, phone, logo_url, template_type, ai_system_behavior, ai_greeting, ai_personality_traits, custom_config')
        .eq('id', businessId)
        .single();

      if (error) throw error;

      if (business) {
        const template = getTemplateConfig((business.template_type as TemplateType) || "healthcare");
        const customConfig = (business.custom_config as Record<string, any>) || {};
        const aiBehaviorDefaults = template?.aiBehaviorDefaults || {
          systemBehavior: "",
          greeting: "",
          personalityTraits: []
        };
        
        const state = {
          clinicName: business.name || "",
          slug: business.slug || "",
          tagline: business.tagline || "",
          address: business.address || "",
          phone: business.phone || "",
          primaryColor: customConfig.primaryColor || "#0EA5E9",
          secondaryColor: customConfig.secondaryColor || "#10B981",
          logoUrl: business.logo_url || "",
          templateType: (business.template_type as TemplateType) || "healthcare",
          aiSystemBehavior: business.ai_system_behavior || aiBehaviorDefaults.systemBehavior,
          aiGreeting: business.ai_greeting || aiBehaviorDefaults.greeting,
          aiPersonalityTraits: (business.ai_personality_traits as string[]) || aiBehaviorDefaults.personalityTraits,
        };

        setClinicName(state.clinicName);
        setSlug(state.slug);
        setTagline(state.tagline);
        setAddress(state.address);
        setPhone(state.phone);
        setPrimaryColor(state.primaryColor);
        setSecondaryColor(state.secondaryColor);
        setLogoUrl(state.logoUrl);
        setTemplateType(state.templateType);
        setAiSystemBehavior(state.aiSystemBehavior);
        setAiGreeting(state.aiGreeting);
        setAiPersonalityTraits(state.aiPersonalityTraits);

        setInitialState(state);
        setHasChanges(false);
      }
    } catch (error: any) {
      logger.error('Error loading branding:', error);
      toast({
        title: t.error,
        description: `${t.couldntLoadSettings}${error?.code ? ` (${error.code})` : ''}`,
        variant: "destructive",
      });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t.invalidFile,
        description: t.uploadImageFile,
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: t.fileTooLarge,
        description: t.logoSizeLimit,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${businessId}-logo-${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('dental-photos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('dental-photos')
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);

      toast({
        title: t.logoUploaded,
        description: t.logoUploadedDesc,
      });
    } catch (error: any) {
      logger.error('Error uploading logo:', error);
      toast({
        title: t.uploadFailed,
        description: error.message || t.uploadFailed,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (newTemplateType: string) => {
    const newType = newTemplateType as TemplateType;
    if (newType !== templateType) {
      setPendingTemplate(newType);
      setShowTemplateWarning(true);
    }
  };

  const confirmTemplateChange = async () => {
    if (pendingTemplate) {
      setTemplateType(pendingTemplate);

      // Load AI defaults from new template
      const newTemplateConfig = getTemplateConfig(pendingTemplate);
      const aiConfig = newTemplateConfig.aiBehaviorDefaults;

      setAiSystemBehavior(aiConfig.systemBehavior);
      setAiGreeting(aiConfig.greeting);
      setAiPersonalityTraits(aiConfig.personalityTraits);

      setPendingTemplate(null);
      setShowTemplateWarning(false);

      // Auto-save the template change
      setLoading(true);
      try {
        const updateData: any = {
          name: clinicName,
          slug: slug,
          tagline: tagline,
          logo_url: logoUrl,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          template_type: pendingTemplate,
          ai_system_behavior: aiConfig.systemBehavior,
          ai_greeting: aiConfig.greeting,
          ai_personality_traits: aiConfig.personalityTraits,
        };

        const { error } = await supabase
          .from('businesses')
          .update(updateData)
          .eq('id', businessId);

        if (error) throw error;

        await updateTemplateContext(pendingTemplate);

        toast({
          title: t.templateSwitched,
          description: `${t.templateSwitchedDesc} ${newTemplateConfig.name} ${t.template}`,
        });

        // Update initial state to reflect saved changes
        setInitialState({
          clinicName,
          slug,
          tagline,
          address,
          primaryColor,
          secondaryColor,
          logoUrl,
          templateType: pendingTemplate,
          aiSystemBehavior: aiConfig.systemBehavior,
          aiGreeting: aiConfig.greeting,
          aiPersonalityTraits: aiConfig.personalityTraits,
          dailyRevenueGoal,
        });
      } catch (error: any) {
        logger.error('Error saving template:', error);
        toast({
          title: t.saveFailed,
          description: error.message || t.saveFailed,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const validateSlug = (value: string): boolean => {
    // Check for invalid characters
    if (value.includes('/')) {
      setSlugError("Slug cannot contain forward slashes (/)");
      return false;
    }
    if (value.includes(' ')) {
      setSlugError("Slug cannot contain spaces");
      return false;
    }
    // Count dots
    const dotCount = (value.match(/\./g) || []).length;
    if (dotCount > 1) {
      setSlugError("Slug can only contain one dot (.)");
      return false;
    }
    setSlugError("");
    return true;
  };

  const handleSlugChange = (value: string) => {
    setSlug(value);
    validateSlug(value);
  };

  const copyBusinessLink = async () => {
    if (!businessLink) return;
    try {
      await navigator.clipboard.writeText(businessLink);
      setCopiedLink(true);
      toast({
        title: t.linkCopied,
        description: t.linkCopiedDesc,
      });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      toast({
        title: t.failedToCopy,
        description: t.couldNotCopyLink,
        variant: "destructive",
      });
    }
  };

  const handleDownloadQr = () => {
    if (!businessLink) return;

    try {
      const canvas = qrCanvasRef.current;
      if (!canvas) {
        throw new Error("QR code is not ready yet");
      }

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${slug || "business"}-qr.png`;
      link.click();

      toast({
        title: t.qrDownloaded,
        description: t.qrDownloadedDesc,
      });
    } catch (error) {
      logger.error("Error downloading QR code", error);
      toast({
        title: t.downloadFailed,
        description: t.qrDownloadFailed,
        variant: "destructive",
      });
    }
  };

  const handleSaveBranding = async () => {
    if (!businessId) return;

    // Validate slug before saving
    if (!validateSlug(slug)) {
      toast({
        title: "Invalid Slug",
        description: slugError,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Get existing custom_config to merge with new values
      const { data: existingBusiness } = await supabase
        .from('businesses')
        .select('custom_config')
        .eq('id', businessId)
        .single();

      const existingConfig = (existingBusiness?.custom_config as Record<string, any>) || {};

      const updateData: any = {
        name: clinicName,
        slug: slug,
        tagline: tagline,
        address: address,
        phone: phone,
        custom_config: {
          ...existingConfig,
          primaryColor,
          secondaryColor,
        },
      };

      // Only add optional columns if they have values
      if (logoUrl) updateData.logo_url = logoUrl;
      if (templateType) updateData.template_type = templateType;
      if (aiSystemBehavior) updateData.ai_system_behavior = aiSystemBehavior;
      if (aiGreeting) updateData.ai_greeting = aiGreeting;
      if (aiPersonalityTraits?.length) updateData.ai_personality_traits = aiPersonalityTraits;

      const { error } = await supabase
        .from('businesses')
        .update(updateData)
        .eq('id', businessId);

      if (error) throw error;

      // Update template in context without page reload
      await updateTemplateContext(templateType);

      toast({
        title: t.settingsSaved,
        description: t.settingsSavedDesc,
      });

      setInitialState({
        clinicName,
        slug,
        tagline,
        address,
        phone,
        primaryColor,
        secondaryColor,
        logoUrl,
        templateType,
        aiSystemBehavior,
        aiGreeting,
        aiPersonalityTraits,
      });
      setHasChanges(false);
    } catch (error: any) {
      logger.error('Error saving branding:', error);
      toast({
        title: t.error,
        description: `${t.saveFailed}${error?.code ? ` (${error.code})` : ''}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const currentState = {
      clinicName,
      slug,
      tagline,
      address,
      phone,
      primaryColor,
      secondaryColor,
      logoUrl,
      templateType,
      aiSystemBehavior,
      aiGreeting,
      aiPersonalityTraits,
    };
    setHasChanges(JSON.stringify(currentState) !== JSON.stringify(initialState));
  }, [clinicName, slug, tagline, address, phone, primaryColor, secondaryColor, logoUrl, templateType, aiSystemBehavior, aiGreeting, aiPersonalityTraits, initialState]);

  const { ConfirmationDialog } = useUnsavedChanges({
    hasUnsavedChanges: hasChanges,
    onSave: handleSaveBranding,
  });

  if (businessLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <ConfirmationDialog />
      <div>
        <PageHeader
          title={t.brandingSettings}
          subtitle={t.brandingSubtitle}
          breadcrumbs={[
            { label: t.navDashboard, href: '/dentist' },
            { label: t.navAdmin },
            { label: t.brandingSettings }
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
            <Card className="hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  {t.businessTemplate}
                </CardTitle>
                <CardDescription>
                  {t.templateWarning}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BusinessTemplateSelector
                  selectedTemplate={templateType}
                  onSelect={handleTemplateSelect}
                />
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Current Template Features:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                    {Object.entries(getTemplateConfig(templateType).features).map(([feature, enabled]) => (
                      <div key={feature} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className="capitalize text-muted-foreground">
                          {feature.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  {t.uploadLogo}
                </CardTitle>
                <CardDescription>
                  {t.logoUploadDesc}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {logoUrl && (
                  <div className="flex justify-center p-4 bg-muted/30 rounded-lg">
                    <img
                      src={logoUrl}
                      alt="Clinic Logo"
                      className="h-32 w-32 object-contain rounded-lg"
                    />
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={loading}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <Button asChild disabled={loading} variant="outline">
                      <span>
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t.loading}
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            {t.chooseLogo}
                          </>
                        )}
                      </span>
                    </Button>
                  </Label>
                  {logoUrl && (
                    <Button
                      variant="ghost"
                      onClick={() => setLogoUrl("")}
                      disabled={loading}
                    >
                      {t.cancel}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.clinicInformation}</CardTitle>
                <CardDescription>
                  {t.brandingSubtitle}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clinic-name">{t.clinicName}</Label>
                  <Input
                    id="clinic-name"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    placeholder={t.clinicName}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">{t.businessSlug}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {baseOrigin ? `${baseOrigin}/` : "/"}
                    </span>
                    <Input
                      id="slug"
                      value={slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="your-business-name"
                      className={slugError ? "border-destructive" : ""}
                    />
                  </div>
                  {slugError && (
                    <p className="text-xs text-destructive">{slugError}</p>
                  )}
                  {!slugError && slug && (
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Your business link:</p>
                          <a
                            href={businessLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline font-mono"
                          >
                            {businessLink}
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            title={t.showQrCode}
                            className="flex items-center gap-2"
                            onClick={() => setShowQrDialog(true)}
                          >
                            <QrCode className="h-4 w-4" />
                            QR Code
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={copyBusinessLink}
                            className="h-8 w-8 p-0"
                          >
                            {copiedLink ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ⚠️ Cannot contain spaces or slashes (/) • Maximum one dot (.)
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tagline">{t.tagline}</Label>
                  <Input
                    id="tagline"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder={t.tagline}
                  />
                  <p className="text-xs text-muted-foreground">
                    ({t.optional})
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">{t.clinicAddress}</Label>
                  <AddressAutocomplete
                    value={address}
                    onChange={setAddress}
                    placeholder={t.clinicAddressPlaceholder}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{t.phoneNumber}</Label>
                  <PhoneNumberInput
                    value={phone}
                    onChange={(val) => setPhone(val || "")}
                    placeholder={t.enterPhoneNumber}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={loadBrandingSettings}>
                {t.cancel}
              </Button>
              <Button onClick={handleSaveBranding} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.savingChanges}
                  </>
                ) : (
                  t.saveChanges
                )}
              </Button>
            </div>
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
              systemBehavior={aiSystemBehavior}
              greeting={aiGreeting}
              personalityTraits={aiPersonalityTraits}
              businessId={businessId}
              onSystemBehaviorChange={setAiSystemBehavior}
              onGreetingChange={setAiGreeting}
              onPersonalityTraitsChange={setAiPersonalityTraits}
              onTestChat={() => setShowTestChat(true)}
            />

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={loadBrandingSettings}>
                {t.cancel}
              </Button>
              <Button onClick={handleSaveBranding} disabled={loading}>
                {loading ? (
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

        <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t.businessLinkQr}</DialogTitle>
              <DialogDescription>
                {t.businessLinkQr}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <QRCodeCanvas
                  ref={qrCanvasRef}
                  value={businessLink || baseOrigin || ""}
                  size={200}
                  level="H"
                  includeMargin
                  bgColor="#FFFFFF"
                  style={{ width: "200px", height: "200px" }}
                />
              </div>
              <Button onClick={handleDownloadQr} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                {t.downloadQr}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <AITestChatDialog
          open={showTestChat}
          onOpenChange={setShowTestChat}
          greeting={aiGreeting}
          systemBehavior={aiSystemBehavior}
          personalityTraits={aiPersonalityTraits}
          businessName={clinicName}
        />

        {pendingTemplate && (
          <TemplatePreview
            currentTemplate={templateType}
            previewTemplate={pendingTemplate}
            open={showTemplateWarning}
            onOpenChange={(open) => {
              setShowTemplateWarning(open);
              if (!open) setPendingTemplate(null);
            }}
            onConfirmSwitch={confirmTemplateChange}
          />
        )}
      </div >
    </>
  );
}

