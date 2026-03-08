import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, User, Globe } from "lucide-react";
import { useCurrentDentist } from "@/hooks/useCurrentDentist";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useUnsavedChangesGuard } from "@/contexts/UnsavedChangesContext";
import { ProfilePictureUploadWithCrop } from "@/components/ProfilePictureUploadWithCrop";

import { PhoneNumberInput } from "@/components/ui/phone-input";
import { LanguageSettings } from "@/components/shared/LanguagePicker";
import { useLanguage } from "@/hooks/useLanguage";


import { ProfileFormSkeleton } from "@/components/ui/page-skeletons";

export default function DentistAdminProfile() {
  const { businessId } = useBusinessContext();
  const { dentistId, profileId, loading: dentistLoading } = useCurrentDentist(businessId);
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    specialization: "",
    bio: "",
    profile_picture_url: "",
  });
  const [initialData, setInitialData] = useState(formData);

  useEffect(() => {
    if (dentistId && profileId) {
      loadProfile();
    }
  }, [dentistId, profileId]);

  const loadProfile = async () => {
    if (!dentistId || !profileId) return;

    setLoading(true);
    try {
      const [{ data: dentistData }, { data: profileData }] = await Promise.all([
        supabase.from('dentists').select('*').eq('id', dentistId).single(),
        supabase.from('secure_profiles_view').select('*').eq('id', profileId).single(),
      ]);

      if (dentistData && profileData) {
        const data = {
          first_name: dentistData.first_name || profileData.first_name || "",
          last_name: dentistData.last_name || profileData.last_name || "",
          email: dentistData.email || profileData.email || "",
          phone: profileData.phone || "",
          specialization: dentistData.specialization || "",
          bio: profileData.bio || "",
          profile_picture_url: dentistData.profile_picture_url || profileData.profile_picture_url || "",
        };
        setFormData(data);
        setInitialData(data);
        setHasChanges(false);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dentistId || !profileId) return;

    setSaving(true);
    try {
      const [dentistUpdate, profileUpdate] = await Promise.all([
        supabase
          .from('dentists')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            specialization: formData.specialization,
            profile_picture_url: formData.profile_picture_url,
          })
          .eq('id', dentistId),
        supabase
          .from('profiles')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            phone: formData.phone,
            bio: formData.bio,
            profile_picture_url: formData.profile_picture_url,
          })
          .eq('id', profileId),
      ]);

      if (dentistUpdate.error) throw dentistUpdate.error;
      if (profileUpdate.error) throw profileUpdate.error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setInitialData(formData);
      setHasChanges(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const { setHasUnsavedChanges } = useUnsavedChangesGuard();

  useEffect(() => {
    const changed = JSON.stringify(formData) !== JSON.stringify(initialData);
    setHasChanges(changed);
    setHasUnsavedChanges(changed);
    return () => setHasUnsavedChanges(false);
  }, [formData, initialData, setHasUnsavedChanges]);

  const handleSave = async () => {
    const fakeEvent = { preventDefault: () => { } } as React.FormEvent;
    await handleSubmit(fakeEvent);
  };

  useUnsavedChanges({
    when: hasChanges,
    onNavigate: handleSave,
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  // Auto-save profile picture immediately
  const handleProfilePictureChange = async (url: string) => {
    setFormData(prev => ({ ...prev, profile_picture_url: url }));
    if (!dentistId || !profileId) return;
    try {
      const [dentistResult, profileResult] = await Promise.all([
        supabase.from('dentists').update({ profile_picture_url: url || null }).eq('id', dentistId).select('id').maybeSingle(),
        supabase.from('profiles').update({ profile_picture_url: url || null }).eq('id', profileId).select('id').maybeSingle(),
      ]);

      if (dentistResult.error) throw dentistResult.error;
      if (profileResult.error) throw profileResult.error;
      setInitialData(prev => ({ ...prev, profile_picture_url: url }));
      toast({ title: "Profile picture updated" });
    } catch {
      toast({ title: "Failed to save profile picture", variant: "destructive" });
    }
  };

  if (dentistLoading || loading) {
    return <ProfileFormSkeleton />;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t.profileInformation || "Profile Information"}</CardTitle>
              <CardDescription>
                {t.profileInfoDesc || "Update your personal and professional details"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <ProfilePictureUploadWithCrop
              currentUrl={formData.profile_picture_url}
              userId={dentistId || ''}
              onUploadComplete={handleProfilePictureChange}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">{t.firstName}</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  placeholder={t.enterFirstName}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">{t.lastName}</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  placeholder={t.enterLastName}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t.email}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder={t.enterEmail}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t.phone}</Label>
                <PhoneNumberInput
                  value={formData.phone}
                  onChange={(val) => handleInputChange('phone', val || "")}
                  placeholder={t.enterPhoneNumber}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialization">{t.specialization || "Specialization"}</Label>
                <Input
                  id="specialization"
                  value={formData.specialization}
                  onChange={(e) => handleInputChange('specialization', e.target.value)}
                  placeholder={t.specializationPlaceholder || "General Dentistry, Orthodontics, etc."}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">{t.professionalBio || "Professional Bio"}</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder={t.bioPlaceholder || "Tell patients about yourself, your experience, and specializations..."}
                rows={4}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t.saving}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {t.save}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Language Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t.language}</CardTitle>
              <CardDescription>
                {t.selectPreferredLanguage}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <LanguageSettings />
        </CardContent>
      </Card>
    </>
  );
}
