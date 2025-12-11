import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, User, CalendarCheck } from "lucide-react";
import { useCurrentDentist } from "@/hooks/useCurrentDentist";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { ProfilePictureUpload } from "@/components/ProfilePictureUpload";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { PhoneNumberInput } from "@/components/ui/phone-input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export default function DentistAdminProfile() {
  const { businessId } = useBusinessContext();
  const { dentistId, profileId, loading: dentistLoading } = useCurrentDentist(businessId);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    specialization: "",
    clinic_address: "",
    bio: "",
    profile_picture_url: "",
  });
  const [requireApproval, setRequireApproval] = useState(false);
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
        supabase.from('profiles').select('*').eq('id', profileId).single(),
      ]);

      if (dentistData && profileData) {
        const data = {
          first_name: dentistData.first_name || profileData.first_name || "",
          last_name: dentistData.last_name || profileData.last_name || "",
          email: dentistData.email || profileData.email || "",
          phone: profileData.phone || "",
          specialization: dentistData.specialization || "",
          clinic_address: dentistData.clinic_address || "",
          bio: profileData.bio || "",
          profile_picture_url: dentistData.profile_picture_url || profileData.profile_picture_url || "",
        };
        setFormData(data);
        setInitialData(data);
        setRequireApproval(dentistData.require_appointment_approval || false);
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
            clinic_address: formData.clinic_address,
            profile_picture_url: formData.profile_picture_url,
            require_appointment_approval: requireApproval,
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

  useEffect(() => {
    setHasChanges(JSON.stringify(formData) !== JSON.stringify(initialData));
  }, [formData, initialData]);

  const handleSave = async () => {
    const fakeEvent = { preventDefault: () => { } } as React.FormEvent;
    await handleSubmit(fakeEvent);
  };

  const { ConfirmationDialog } = useUnsavedChanges({
    hasUnsavedChanges: hasChanges,
    onSave: handleSave,
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  if (dentistLoading || loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ConfirmationDialog />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal and professional details
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <ProfilePictureUpload
              currentUrl={formData.profile_picture_url}
              userId={dentistId || ''}
              onUploadComplete={(url) => handleInputChange('profile_picture_url', url)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  placeholder="John"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  placeholder="Smith"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <PhoneNumberInput
                  value={formData.phone}
                  onChange={(val) => handleInputChange('phone', val || "")}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Input
                  id="specialization"
                  value={formData.specialization}
                  onChange={(e) => handleInputChange('specialization', e.target.value)}
                  placeholder="General Dentistry, Orthodontics, etc."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clinic_address">Clinic Address</Label>
              <AddressAutocomplete
                value={formData.clinic_address}
                onChange={(val) => handleInputChange('clinic_address', val)}
                placeholder="123 Main Street, City, State, ZIP"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Professional Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell patients about yourself, your experience, and specializations..."
                rows={4}
              />
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CalendarCheck className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Appointment Settings</h3>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <p className="font-medium">Require Appointment Approval</p>
                  <p className="text-sm text-muted-foreground">
                    When enabled, patient appointments need your approval before confirmation
                  </p>
                </div>
                <Switch
                  checked={requireApproval}
                  onCheckedChange={setRequireApproval}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
