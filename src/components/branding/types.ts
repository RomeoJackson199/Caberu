import type { TemplateType } from "@/lib/businessTemplates";

export interface BrandingState {
  clinicName: string;
  slug: string;
  tagline: string;
  addressStreet: string;
  addressHouseNumber: string;
  addressPostalCode: string;
  addressCity: string;
  phone: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  templateType: TemplateType;
  aiSystemBehavior: string;
  aiGreeting: string;
  aiPersonalityTraits: string[];
}

export interface BrandingActions {
  setClinicName: (value: string) => void;
  setSlug: (value: string) => void;
  setTagline: (value: string) => void;
  setAddressStreet: (value: string) => void;
  setAddressHouseNumber: (value: string) => void;
  setAddressPostalCode: (value: string) => void;
  setAddressCity: (value: string) => void;
  setPhone: (value: string) => void;
  setPrimaryColor: (value: string) => void;
  setSecondaryColor: (value: string) => void;
  setLogoUrl: (value: string) => void;
  setAiSystemBehavior: (value: string) => void;
  setAiGreeting: (value: string) => void;
  setAiPersonalityTraits: (value: string[]) => void;
  handleSlugChange: (value: string) => void;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTemplateSelect: (templateType: string) => void;
  confirmTemplateChange: () => Promise<void>;
  cancelTemplateChange: () => void;
  handleSaveBranding: () => Promise<void>;
  loadBrandingSettings: () => Promise<void>;
  copyBusinessLink: () => Promise<void>;
  handleDownloadQr: () => void;
}

export interface BrandingMeta {
  loading: boolean;
  businessLoading: boolean;
  hasChanges: boolean;
  slugError: string;
  copiedLink: boolean;
  showQrDialog: boolean;
  setShowQrDialog: (value: boolean) => void;
  showTestChat: boolean;
  setShowTestChat: (value: boolean) => void;
  pendingTemplate: TemplateType | null;
  businessLink: string;
  businessId: string | null;
  qrCanvasRef: React.RefObject<HTMLCanvasElement>;
}

export type UseBrandingSettingsReturn = BrandingState & BrandingActions & BrandingMeta;
