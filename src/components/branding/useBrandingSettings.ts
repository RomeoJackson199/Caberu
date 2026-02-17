import { useState, useEffect, useRef } from "react";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { useTemplate } from "@/contexts/TemplateContext";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { TemplateType, getTemplateConfig } from "@/lib/businessTemplates";
import { logger } from "@/lib/logger";
import type { BrandingState, UseBrandingSettingsReturn } from "./types";

export function useBrandingSettings(): UseBrandingSettingsReturn {
  const { businessId, loading: businessLoading } = useBusinessContext();
  const { updateTemplate: updateTemplateContext } = useTemplate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const qrCanvasRef = useRef<HTMLCanvasElement>(null!);

  // Core branding state
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [clinicName, setClinicName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugError, setSlugError] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [tagline, setTagline] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressHouseNumber, setAddressHouseNumber] = useState("");
  const [addressPostalCode, setAddressPostalCode] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [phone, setPhone] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0EA5E9");
  const [secondaryColor, setSecondaryColor] = useState("#10B981");
  const [logoUrl, setLogoUrl] = useState("");
  const [templateType, setTemplateType] = useState<TemplateType>("healthcare");
  const [pendingTemplate, setPendingTemplate] = useState<TemplateType | null>(null);
  const [aiSystemBehavior, setAiSystemBehavior] = useState("");
  const [aiGreeting, setAiGreeting] = useState("");
  const [aiPersonalityTraits, setAiPersonalityTraits] = useState<string[]>([]);
  const [showTestChat, setShowTestChat] = useState(false);

  const [initialState, setInitialState] = useState<BrandingState>({
    clinicName: "",
    slug: "",
    tagline: "",
    addressStreet: "",
    addressHouseNumber: "",
    addressPostalCode: "",
    addressCity: "",
    phone: "",
    primaryColor: "#0EA5E9",
    secondaryColor: "#10B981",
    logoUrl: "",
    templateType: "healthcare",
    aiSystemBehavior: "",
    aiGreeting: "",
    aiPersonalityTraits: [],
  });

  // Derived values
  const baseOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const businessLink = slug
    ? baseOrigin
      ? `${baseOrigin}/${slug}`
      : `/${slug}`
    : baseOrigin;

  // Load settings when business is ready
  useEffect(() => {
    if (businessId) {
      loadBrandingSettings();
    }
  }, [businessId]);

  // Track changes
  useEffect(() => {
    const currentState: BrandingState = {
      clinicName,
      slug,
      tagline,
      addressStreet,
      addressHouseNumber,
      addressPostalCode,
      addressCity,
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
  }, [clinicName, slug, tagline, addressStreet, addressHouseNumber, addressPostalCode, addressCity, phone, primaryColor, secondaryColor, logoUrl, templateType, aiSystemBehavior, aiGreeting, aiPersonalityTraits, initialState]);

  useUnsavedChanges({
    when: hasChanges,
    onNavigate: handleSaveBranding,
  });

  async function loadBrandingSettings() {
    try {
      const { data: business, error } = await supabase
        .from("businesses")
        .select("name, slug, tagline, address, phone, logo_url, template_type, ai_system_behavior, ai_greeting, ai_personality_traits, custom_config")
        .eq("id", businessId)
        .single();

      if (error) throw error;

      if (business) {
        const template = getTemplateConfig((business.template_type as TemplateType) || "healthcare");
        const customConfig = (business.custom_config as Record<string, any>) || {};
        const aiBehaviorDefaults = (template as unknown as { aiBehaviorDefaults?: { systemBehavior: string; greeting: string; personalityTraits: string[] } })?.aiBehaviorDefaults || {
          systemBehavior: "",
          greeting: "",
          personalityTraits: [],
        };

        // Parse address into separate fields: "Street HouseNumber, PostalCode City" format
        const rawAddress = business.address || "";
        let parsedStreet = "";
        let parsedHouseNumber = "";
        let parsedPostalCode = "";
        let parsedCity = "";
        if (rawAddress) {
          const parts = rawAddress.split(", ");
          if (parts.length >= 2) {
            const streetPart = parts[0];
            const streetMatch = streetPart.match(/^(.+?)\s+(\d+\S*)$/);
            parsedStreet = streetMatch ? streetMatch[1] : streetPart;
            parsedHouseNumber = streetMatch ? streetMatch[2] : "";
            const cityParts = parts.slice(1).join(", ").split(" ");
            parsedPostalCode = cityParts[0] || "";
            parsedCity = cityParts.slice(1).join(" ") || "";
          } else {
            parsedStreet = rawAddress;
          }
        }

        const state: BrandingState = {
          clinicName: business.name || "",
          slug: business.slug || "",
          tagline: business.tagline || "",
          addressStreet: parsedStreet,
          addressHouseNumber: parsedHouseNumber,
          addressPostalCode: parsedPostalCode,
          addressCity: parsedCity,
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
        setAddressStreet(state.addressStreet);
        setAddressHouseNumber(state.addressHouseNumber);
        setAddressPostalCode(state.addressPostalCode);
        setAddressCity(state.addressCity);
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
      logger.error("Error loading branding:", error);
      toast({
        title: t.error,
        description: `${t.couldntLoadSettings}${error?.code ? ` (${error.code})` : ""}`,
        variant: "destructive",
      });
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: t.invalidFile,
        description: t.uploadImageFile,
        variant: "destructive",
      });
      return;
    }

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
      const fileExt = file.name.split(".").pop();
      const filePath = `${businessId}/logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("company-logos")
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);

      toast({
        title: t.logoUploaded,
        description: t.logoUploadedDesc,
      });
    } catch (error: any) {
      logger.error("Error uploading logo:", error);
      toast({
        title: t.uploadFailed,
        description: error.message || t.uploadFailed,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleTemplateSelect(newTemplateType: string) {
    const newType = newTemplateType as TemplateType;
    if (newType !== templateType) {
      setPendingTemplate(newType);
    }
  }

  async function confirmTemplateChange() {
    if (!pendingTemplate) return;

    setTemplateType(pendingTemplate);

    const newTemplateConfig = getTemplateConfig(pendingTemplate);
    const aiConfig = (newTemplateConfig as unknown as { aiBehaviorDefaults: { systemBehavior: string; greeting: string; personalityTraits: string[] } }).aiBehaviorDefaults || {
      systemBehavior: "",
      greeting: "",
      personalityTraits: [],
    };

    setAiSystemBehavior(aiConfig.systemBehavior);
    setAiGreeting(aiConfig.greeting);
    setAiPersonalityTraits(aiConfig.personalityTraits);

    const savedTemplate = pendingTemplate;
    setPendingTemplate(null);

    setLoading(true);
    try {
      const updateData: any = {
        name: clinicName,
        slug,
        tagline,
        logo_url: logoUrl,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        template_type: savedTemplate,
        ai_system_behavior: aiConfig.systemBehavior,
        ai_greeting: aiConfig.greeting,
        ai_personality_traits: aiConfig.personalityTraits,
      };

      const { error } = await supabase
        .from("businesses")
        .update(updateData)
        .eq("id", businessId);

      if (error) throw error;

      await updateTemplateContext(savedTemplate);

      toast({
        title: t.templateSwitched,
        description: `${t.templateSwitchedDesc} ${savedTemplate} ${t.template}`,
      });

      setInitialState({
        clinicName,
        slug,
        tagline,
        addressStreet,
        addressHouseNumber,
        addressPostalCode,
        addressCity,
        phone,
        primaryColor,
        secondaryColor,
        logoUrl,
        templateType: savedTemplate,
        aiSystemBehavior: aiConfig.systemBehavior,
        aiGreeting: aiConfig.greeting,
        aiPersonalityTraits: aiConfig.personalityTraits,
      });
    } catch (error: any) {
      logger.error("Error saving template:", error);
      toast({
        title: t.saveFailed,
        description: error.message || t.saveFailed,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function cancelTemplateChange() {
    setPendingTemplate(null);
  }

  function validateSlug(value: string): boolean {
    if (value.includes("/")) {
      setSlugError("Slug cannot contain forward slashes (/)");
      return false;
    }
    if (value.includes(" ")) {
      setSlugError("Slug cannot contain spaces");
      return false;
    }
    const dotCount = (value.match(/\./g) || []).length;
    if (dotCount > 1) {
      setSlugError("Slug can only contain one dot (.)");
      return false;
    }
    setSlugError("");
    return true;
  }

  function handleSlugChange(value: string) {
    setSlug(value);
    validateSlug(value);
  }

  async function copyBusinessLink() {
    if (!businessLink) return;
    try {
      await navigator.clipboard.writeText(businessLink);
      setCopiedLink(true);
      toast({
        title: t.linkCopied,
        description: t.linkCopiedDesc,
      });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast({
        title: t.failedToCopy,
        description: t.couldNotCopyLink,
        variant: "destructive",
      });
    }
  }

  function handleDownloadQr() {
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
  }

  async function handleSaveBranding() {
    if (!businessId) return;

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
      const { data: existingBusiness } = await supabase
        .from("businesses")
        .select("custom_config")
        .eq("id", businessId)
        .single();

      const existingConfig = (existingBusiness?.custom_config as Record<string, any>) || {};

      // Combine address fields back into single string: "Street HouseNumber, PostalCode City"
      const streetWithNumber = [addressStreet, addressHouseNumber].filter(Boolean).join(" ");
      const combinedAddress = [
        streetWithNumber,
        [addressPostalCode, addressCity].filter(Boolean).join(" "),
      ].filter(Boolean).join(", ");

      const updateData: any = {
        name: clinicName,
        slug,
        tagline,
        address: combinedAddress,
        phone,
        custom_config: {
          ...existingConfig,
          primaryColor,
          secondaryColor,
        },
      };

      if (logoUrl) updateData.logo_url = logoUrl;
      if (templateType) updateData.template_type = templateType;
      if (aiSystemBehavior) updateData.ai_system_behavior = aiSystemBehavior;
      if (aiGreeting) updateData.ai_greeting = aiGreeting;
      if (aiPersonalityTraits?.length) updateData.ai_personality_traits = aiPersonalityTraits;

      const { error } = await supabase
        .from("businesses")
        .update(updateData)
        .eq("id", businessId);

      if (error) throw error;

      await updateTemplateContext(templateType);

      toast({
        title: t.settingsSaved,
        description: t.settingsSavedDesc,
      });

      setInitialState({
        clinicName,
        slug,
        tagline,
        addressStreet,
        addressHouseNumber,
        addressPostalCode,
        addressCity,
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
      logger.error("Error saving branding:", error);
      toast({
        title: t.error,
        description: `${t.saveFailed}${error?.code ? ` (${error.code})` : ""}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return {
    // State
    clinicName,
    slug,
    tagline,
    addressStreet,
    addressHouseNumber,
    addressPostalCode,
    addressCity,
    phone,
    primaryColor,
    secondaryColor,
    logoUrl,
    templateType,
    aiSystemBehavior,
    aiGreeting,
    aiPersonalityTraits,

    // Actions
    setClinicName,
    setSlug,
    setTagline,
    setAddressStreet,
    setAddressHouseNumber,
    setAddressPostalCode,
    setAddressCity,
    setPhone,
    setPrimaryColor,
    setSecondaryColor,
    setLogoUrl,
    setAiSystemBehavior,
    setAiGreeting,
    setAiPersonalityTraits,
    handleSlugChange,
    handleLogoUpload,
    handleTemplateSelect,
    confirmTemplateChange,
    cancelTemplateChange,
    handleSaveBranding,
    loadBrandingSettings,
    copyBusinessLink,
    handleDownloadQr,

    // Meta
    loading,
    businessLoading,
    hasChanges,
    slugError,
    copiedLink,
    showQrDialog,
    setShowQrDialog,
    showTestChat,
    setShowTestChat,
    pendingTemplate,
    businessLink,
    businessId,
    qrCanvasRef,
  };
}
