import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Image as ImageIcon, Briefcase, Copy, Check, QrCode } from "lucide-react";
import { BusinessTemplateSelector } from "@/components/BusinessTemplateSelector";
import { getTemplateConfig } from "@/lib/businessTemplates";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { PhoneNumberInput } from "@/components/ui/phone-input";
import type { UseBrandingSettingsReturn } from "./types";

interface BrandingTabContentProps {
  branding: UseBrandingSettingsReturn;
}

export function BrandingTabContent({ branding }: BrandingTabContentProps) {
  const { t } = useLanguage();
  const baseOrigin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-6">
      {/* Template Selection (hidden) */}
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
            selectedTemplate={branding.templateType}
            onSelectTemplate={branding.handleTemplateSelect}
          />
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Current Template Features:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
              {Object.entries(getTemplateConfig(branding.templateType).features).map(([feature, enabled]) => (
                <div key={feature} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${enabled ? "bg-green-500" : "bg-gray-300"}`} />
                  <span className="capitalize text-muted-foreground">
                    {feature.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logo Upload */}
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
          {branding.logoUrl && (
            <div className="flex justify-center p-4 bg-muted/30 rounded-lg">
              <img
                src={branding.logoUrl}
                alt="Clinic Logo"
                className="h-32 w-32 object-contain rounded-lg"
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <Input
              type="file"
              accept="image/*"
              onChange={branding.handleLogoUpload}
              disabled={branding.loading}
              className="hidden"
              id="logo-upload"
            />
            <Label htmlFor="logo-upload" className="cursor-pointer">
              <Button asChild disabled={branding.loading} variant="outline">
                <span>
                  {branding.loading ? (
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
            {branding.logoUrl && (
              <Button
                variant="ghost"
                onClick={() => branding.setLogoUrl("")}
                disabled={branding.loading}
              >
                {t.cancel}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Clinic Information */}
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
              value={branding.clinicName}
              onChange={(e) => branding.setClinicName(e.target.value)}
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
                value={branding.slug}
                onChange={(e) => branding.handleSlugChange(e.target.value)}
                placeholder="your-business-name"
                className={branding.slugError ? "border-destructive" : ""}
              />
            </div>
            {branding.slugError && (
              <p className="text-xs text-destructive">{branding.slugError}</p>
            )}
            {!branding.slugError && branding.slug && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Your business link:</p>
                    <a
                      href={branding.businessLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline font-mono"
                    >
                      {branding.businessLink}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      title={t.showQrCode}
                      className="flex items-center gap-2"
                      onClick={() => branding.setShowQrDialog(true)}
                    >
                      <QrCode className="h-4 w-4" />
                      QR Code
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={branding.copyBusinessLink}
                      className="h-8 w-8 p-0"
                    >
                      {branding.copiedLink ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {"\u26A0\uFE0F"} Cannot contain spaces or slashes (/) {"\u2022"} Maximum one dot (.)
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">{t.tagline}</Label>
            <Input
              id="tagline"
              value={branding.tagline}
              onChange={(e) => branding.setTagline(e.target.value)}
              placeholder={t.tagline}
            />
            <p className="text-xs text-muted-foreground">
              ({t.optional})
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">{t.clinicAddress}</Label>
            <AddressAutocomplete
              value={branding.address}
              onChange={branding.setAddress}
              placeholder={t.clinicAddressPlaceholder}
            />
            <p className="text-xs text-muted-foreground">
              ({t.optional})
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t.phoneNumber}</Label>
            <PhoneNumberInput
              value={branding.phone}
              onChange={(val) => branding.setPhone(val || "")}
              placeholder={t.enterPhoneNumber}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save/Cancel buttons */}
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
            t.saveChanges
          )}
        </Button>
      </div>
    </div>
  );
}
