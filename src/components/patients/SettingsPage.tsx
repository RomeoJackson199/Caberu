import React, { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { LanguageSettings } from "@/components/shared/LanguagePicker";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { saveProfileData, loadProfileData, ProfileData } from "@/lib/profileUtils";
import { useToast } from "@/hooks/use-toast";
import { ProfilePictureUploadWithCrop } from "@/components/ProfilePictureUploadWithCrop";
import { PatientSecuritySettings } from "@/components/patients/PatientSecuritySettings";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { PhoneNumberInput } from "@/components/ui/phone-input";
import { supabase } from "@/integrations/supabase/client";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface SettingsPageProps {
  user: User;
}

const SECTIONS = [
  'Profile & Personal Info',
  'Preferences',
  'Security',
  'Legal & Support',
] as const;

type Section = typeof SECTIONS[number];

export const SettingsPage: React.FC<SettingsPageProps> = ({ user }) => {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [active, setActive] = useState<Section>('Profile & Personal Info');
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    first_name: '', last_name: '', phone: '', date_of_birth: '', medical_history: '', address: '', address_street: '', address_postal_code: '', address_city: '', emergency_contact: '', ai_opt_out: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await loadProfileData(user);
        setProfile(data);
      } catch {
        // ignore profile load errors in settings
      }
    })();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveProfileData(user, profile);
      toast({
        title: "Success",
        description: "Your profile has been saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const mobile = (
    <Accordion type="single" collapsible className="md:hidden px-4 py-4">
      <AccordionItem value="profile">
        <AccordionTrigger>Profile & Personal Info</AccordionTrigger>
        <AccordionContent>
          <ProfileForm profile={profile} setProfile={setProfile} onSave={handleSave} saving={saving} email={user.email || ''} userId={user.id} />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="preferences">
        <AccordionTrigger>Preferences</AccordionTrigger>
        <AccordionContent>
          <Preferences theme={theme} setTheme={setTheme} />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="security">
        <AccordionTrigger>Security</AccordionTrigger>
        <AccordionContent>
          <Security />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="legal">
        <AccordionTrigger>Legal & Support</AccordionTrigger>
        <AccordionContent>
          <LegalSupport />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  const desktop = (
    <div className="hidden md:flex h-[calc(100vh-56px)]">
      <div className="w-64 border-r border-border p-4 space-y-2">
        {SECTIONS.map(s => (
          <Button key={s} variant={active === s ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={() => setActive(s)}>
            {s}
          </Button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {active === 'Profile & Personal Info' && (
          <ProfileForm profile={profile} setProfile={setProfile} onSave={handleSave} saving={saving} email={user.email || ''} userId={user.id} />
        )}
        {active === 'Preferences' && (
          <Preferences theme={theme} setTheme={setTheme} />
        )}
        {active === 'Security' && <Security />}
        {active === 'Legal & Support' && <LegalSupport />}
      </div>
    </div>
  );

  return (
    <div className="px-4 md:px-6 py-4">
      <h2 className="text-xl font-semibold mb-4">Settings</h2>
      {mobile}
      {desktop}
    </div>
  );
};

interface ProfileFormProps {
  email: string;
  profile: ProfileData;
  setProfile: (p: ProfileData) => void;
  onSave: () => Promise<void> | void;
  saving: boolean;
  userId: string;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ email, profile, setProfile, onSave, saving, userId }) => {
  const { toast } = useToast();
  const [deletingEmergencyContact, setDeletingEmergencyContact] = useState(false);
  const [deletingMedicalHistory, setDeletingMedicalHistory] = useState(false);

  const handleDeleteEmergencyContact = async () => {
    setDeletingEmergencyContact(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ emergency_contact: null })
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile({ ...profile, emergency_contact: '' });
      toast({
        title: "Emergency contact deleted",
        description: "Your emergency contact information has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete emergency contact",
        variant: "destructive",
      });
    } finally {
      setDeletingEmergencyContact(false);
    }
  };

  const handleDeleteMedicalHistory = async () => {
    setDeletingMedicalHistory(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ medical_history: null })
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile({ ...profile, medical_history: '' });
      toast({
        title: "Medical history deleted",
        description: "Your medical history information has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete medical history",
        variant: "destructive",
      });
    } finally {
      setDeletingMedicalHistory(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile & Personal Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ProfilePictureUploadWithCrop
          currentUrl={profile.profile_picture_url}
          userId={userId}
          onUploadComplete={(url) => setProfile({ ...profile, profile_picture_url: url })}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>First Name</Label>
            <Input value={profile.first_name} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} />
          </div>
          <div>
            <Label>Last Name</Label>
            <Input value={profile.last_name} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={email} disabled />
          </div>
          <div>
            <Label>Phone</Label>
            <PhoneNumberInput
              value={profile.phone}
              onChange={(val) => setProfile({ ...profile, phone: val || "" })}
              placeholder="Enter phone number"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Address</Label>
            <div className="space-y-3 mt-1">
              <div className="space-y-1">
                <Label htmlFor="address_street" className="text-sm text-muted-foreground">Street Address</Label>
                <AddressAutocomplete
                  value={profile.address_street}
                  onChange={(val) => {
                    // If a full address was selected from autocomplete, parse it into parts
                    const parts = val.split(", ");
                    if (parts.length >= 2) {
                      setProfile({
                        ...profile,
                        address_street: parts[0],
                        address_postal_code: parts.length >= 2 ? parts[1].split(" ")[0] || "" : "",
                        address_city: parts.length >= 2 ? parts[1].split(" ").slice(1).join(" ") || (parts[2] || "") : "",
                      });
                    } else {
                      setProfile({ ...profile, address_street: val });
                    }
                  }}
                  placeholder="Rue de la Loi 16"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="address_postal_code" className="text-sm text-muted-foreground">Postal Code</Label>
                  <Input
                    id="address_postal_code"
                    value={profile.address_postal_code}
                    onChange={(e) => setProfile({ ...profile, address_postal_code: e.target.value })}
                    placeholder="1000"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="address_city" className="text-sm text-muted-foreground">City</Label>
                  <Input
                    id="address_city"
                    value={profile.address_city}
                    onChange={(e) => setProfile({ ...profile, address_city: e.target.value })}
                    placeholder="Brussels"
                  />
                </div>
              </div>
            </div>
          </div>
          <div>
            <Label>Date of Birth</Label>
            <Input type="date" value={profile.date_of_birth} onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <Label>Emergency Contact</Label>
              {profile.emergency_contact && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-auto p-1"
                      disabled={deletingEmergencyContact}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {deletingEmergencyContact ? 'Deleting...' : 'Delete'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Emergency Contact</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete your emergency contact information? This action will take effect immediately.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteEmergencyContact}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <Input value={profile.emergency_contact} onChange={(e) => setProfile({ ...profile, emergency_contact: e.target.value })} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>Medical History</Label>
            {profile.medical_history && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive h-auto p-1"
                    disabled={deletingMedicalHistory}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {deletingMedicalHistory ? 'Deleting...' : 'Delete'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Medical History</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete your medical history? This action will take effect immediately.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteMedicalHistory}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <Textarea value={profile.medical_history} onChange={(e) => setProfile({ ...profile, medical_history: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => window.location.reload()}>Reset</Button>
          <Button type="button" onClick={onSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
        </div>
      </CardContent>
    </Card>
  );
};

const Preferences: React.FC<{ theme?: string; setTheme: (t: string) => void; }> = ({ theme, setTheme }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Language</Label>
          <div className="mt-2">
            <LanguageSettings />
          </div>
        </div>
        <div>
          <Label>Theme</Label>
          <div className="mt-2 flex gap-2">
            <Button variant={theme === 'light' ? 'default' : 'outline'} onClick={() => setTheme('light')}>Light</Button>
            <Button variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => setTheme('dark')}>Dark</Button>
          </div>
        </div>
        <div>
          <Label>Notifications</Label>
          <div className="text-sm text-muted-foreground mt-1">Manage notification settings in your device/system preferences.</div>
        </div>
      </CardContent>
    </Card>
  );
};

const Security: React.FC = () => {
  return <PatientSecuritySettings />;
};

const LegalSupport: React.FC = () => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const handleExportData = async () => {
    setExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch all user data
      const [
        { data: profile },
        { data: appointments },
        { data: prescriptions },
        { data: notes },
        { data: treatmentPlans },
        { data: invoices },
        { data: paymentRequests }
      ] = await Promise.all([
        supabase.from('secure_profiles_view').select('*').eq('user_id', user.id).single(),
        supabase.from('appointments_decrypted').select('*').eq('patient_id', user.id),
        supabase.from('prescriptions').select('*').eq('patient_id', user.id),
        supabase.from('notes_decrypted').select('*').eq('patient_id', user.id),
        supabase.from('treatment_plans_decrypted').select('*').eq('patient_id', user.id),
        supabase.from('invoices').select('*').eq('patient_id', user.id),
        supabase.from('payment_requests').select('*').eq('patient_id', user.id)
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.created_at
        },
        profile,
        appointments: appointments || [],
        prescriptions: prescriptions || [],
        notes: notes || [],
        treatmentPlans: treatmentPlans || [],
        invoices: invoices || [],
        paymentRequests: paymentRequests || []
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-dental-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data exported",
        description: "Your data has been downloaded as a JSON file.",
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Could not export your data",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      toast({
        title: "Password required",
        description: "Please enter your password to confirm account deletion.",
        variant: "destructive",
      });
      return;
    }

    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Not authenticated');

      // Verify password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword
      });

      if (signInError) {
        throw new Error('Incorrect password');
      }

      // Get profile ID first
      const { data: profile } = await supabase
        .from('secure_profiles_view')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        // Delete related data in order (respecting foreign keys)
        await supabase.from('notes').delete().eq('patient_id', profile.id);
        await supabase.from('prescriptions').delete().eq('patient_id', profile.id);
        await supabase.from('appointments').delete().eq('patient_id', profile.id);
        await supabase.from('treatment_plans').delete().eq('patient_id', profile.id);
        await supabase.from('invoices').delete().eq('patient_id', profile.id);
        await supabase.from('payment_requests').delete().eq('patient_id', profile.id);
        await supabase.from('profiles').delete().eq('id', profile.id);
      }

      // Delete auth user - this will sign them out
      const { error: deleteError } = await supabase.functions.invoke('delete-user-account', {
        body: { userId: user.id }
      });

      if (deleteError) {
        // If edge function doesn't exist, just sign out
        console.warn('Could not delete auth user, signing out:', deleteError);
      }

      // Sign out and redirect
      await supabase.auth.signOut();
      window.location.href = '/';

    } catch (error) {
      console.error('Delete account failed:', error);
      toast({
        title: "Could not delete account",
        description: error instanceof Error ? error.message : "Failed to delete your account",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeletePassword('');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Legal & Support</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span>Privacy Policy</span>
            <Button variant="outline" asChild>
              <a href="/privacy">View</a>
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <span>Terms of Service</span>
            <Button variant="outline" asChild>
              <a href="/terms">View</a>
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <span>Contact Support</span>
            <Button asChild>
              <a href="/support">Get Help</a>
            </Button>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium mb-3">Your Data</h4>
            <div className="flex items-center justify-between">
              <div>
                <span className="block">Export Your Data</span>
                <span className="text-sm text-muted-foreground">Download all your data as JSON</span>
              </div>
              <Button variant="outline" onClick={handleExportData} disabled={exporting}>
                {exporting ? 'Exporting...' : 'Export'}
              </Button>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-destructive mb-3">Danger Zone</h4>
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-destructive">Delete Account</span>
                <span className="text-sm text-muted-foreground">Permanently delete your account and all data</span>
              </div>
              <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                Delete Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-destructive">Delete Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This action is <strong>permanent</strong> and cannot be undone. All your data including appointments, prescriptions, and medical history will be deleted.
              </p>
              <div>
                <Label htmlFor="delete-password">Enter your password to confirm</Label>
                <Input
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Your password"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setDeletePassword(''); }}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting || !deletePassword.trim()}>
                  {deleting ? 'Deleting...' : 'Permanently Delete'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};