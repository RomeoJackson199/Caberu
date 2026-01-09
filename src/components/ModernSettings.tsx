import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
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
import {
  Settings as SettingsIcon,
  LogOut,
  User as UserIcon,
  Sun,
  Moon,
  Globe,
  Heart,
  Bot,
  AlertCircle,
  Download,
  Trash2,
  Save,
  Shield,
  Stethoscope,
  MapPin,
  Phone,
  Calendar,
  Mail
} from "lucide-react";
import { saveProfileData, loadProfileData, ProfileData } from "@/lib/profileUtils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DentistManagement } from "@/components/DentistManagement";
import { logger } from '@/lib/logger';

interface ModernSettingsProps {
  user: User;
}

interface UserProfile extends ProfileData {
  ai_opt_out?: boolean;
}

const languages = [
  { code: 'en' as const, name: 'English', flag: '🇺🇸', label: 'English' },
  { code: 'fr' as const, name: 'Français', flag: '🇫🇷', label: 'Français' },
  { code: 'nl' as const, name: 'Nederlands', flag: '🇳🇱', label: 'Nederlands' },
];

export const ModernSettings = ({ user }: ModernSettingsProps) => {
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile>({
    first_name: '',
    last_name: '',
    phone: '',
    date_of_birth: '',
    medical_history: '',
    address: '',
    emergency_contact: '',
    ai_opt_out: false
  });
  const [loading, setLoading] = useState(false);
  const [hasIncompleteProfile, setHasIncompleteProfile] = useState(false);
  const [isDentist, setIsDentist] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [dentistClinicAddress, setDentistClinicAddress] = useState<string>('');
  const [dentistSpecialty, setDentistSpecialty] = useState<string>('');
  const [hasDentistRecord, setHasDentistRecord] = useState<boolean>(false);
  const [requireApproval, setRequireApproval] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const profileData = await loadProfileData(user);
      setProfile(profileData);

      const isIncomplete = !profileData.first_name || !profileData.last_name;
      setHasIncompleteProfile(isIncomplete);

      const { data: profRow, error: profErr } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('user_id', user.id)
        .single();
      if (profErr) throw profErr;

      setProfileId(profRow.id);
      const userIsDentist = profRow.role === 'dentist';
      setIsDentist(userIsDentist);

      if (userIsDentist) {
        const { data: dentistRow, error: dentistErr } = await supabase
          .from('dentists')
          .select('id, clinic_address, specialization, require_appointment_approval')
          .eq('profile_id', profRow.id)
          .maybeSingle();

        if (dentistRow) {
          setHasDentistRecord(true);
          setDentistClinicAddress(dentistRow.clinic_address || '');
          setDentistSpecialty(dentistRow.specialization || '');
          setRequireApproval(dentistRow.require_appointment_approval || false);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: t.error,
        description: "Failed to load profile data",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: t.error,
        description: "Error during sign out",
        variant: "destructive",
      });
    } else {
      toast({
        title: t.success,
        description: "You have been signed out successfully",
      });
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await saveProfileData(user, profile);

      if (isDentist && profileId) {
        const dentistPayload: any = {
          clinic_address: dentistClinicAddress?.trim() || null,
          specialization: dentistSpecialty?.trim() || null,
          require_appointment_approval: requireApproval,
        };

        if (hasDentistRecord) {
          const { error: updErr } = await supabase
            .from('dentists')
            .update(dentistPayload)
            .eq('profile_id', profileId);
          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await supabase
            .from('dentists')
            .insert({ profile_id: profileId, ...dentistPayload });
          if (insErr) throw insErr;
          setHasDentistRecord(true);
        }
      }

      toast({
        title: t.success,
        description: isDentist ? "Personal and dentist information saved successfully" : t.personalInfoUpdated,
      });

      fetchProfile();
    } catch (error) {
      console.error('Profile save error:', error);
      toast({
        title: t.error,
        description: "Failed to save profile information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (languageCode: 'en' | 'fr' | 'nl') => {
    setLanguage(languageCode);
    const languageObj = languages.find(lang => lang.code === languageCode);
    toast({
      title: t.languageUpdated,
      description: `${t.languageChangedTo} ${languageObj?.name}`,
    });
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    toast({
      title: t.themeUpdated,
      description: `${t.switchedToMode} ${newTheme} mode`,
    });
  };

  const handleDownloadData = async () => {
    const { data: profile } = await supabase
      .from('secure_profiles_view')
      .select('id,*')
      .eq('user_id', user.id)
      .single();
    const profileId = profile?.id;
    const { data: appointments } = profileId ? await supabase.from('appointments').select('*').eq('patient_id', profileId) : { data: [] } as any;
    const { data: notes } = profileId ? await supabase.from('notes').select('*').eq('patient_id', profileId) : { data: [] } as any;
    const exportData = { profile, appointments, notes };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dentibot_data.json';
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: t.success,
      description: t.downloadMyData + " completed",
    });
  };

  const handleDeleteAccount = async () => {
    const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
    const profileId = profile?.id;
    if (profileId) {
      await supabase.from('appointments').delete().eq('patient_id', profileId);
      await supabase.from('notes').delete().eq('patient_id', profileId);
      await supabase.from('profiles').delete().eq('user_id', user.id);
    }
    await supabase.auth.signOut();
    toast({
      title: t.success,
      description: 'Your account has been deleted.'
    });
  };

  const currentLanguage = languages.find(lang => lang.code === language);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="glass-card border-dental-primary/30 text-dental-primary hover:bg-dental-primary/10 hover:border-dental-primary/50 transition-all duration-300"
          >
            <SettingsIcon className="h-4 w-4" />
          </Button>
          {hasIncompleteProfile && (
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse" />
          )}
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center space-x-3 text-2xl">
            <SettingsIcon className="h-6 w-6 text-primary" />
            <span>{t.settings}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 h-[calc(90vh-8rem)] overflow-y-auto">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">{t.general}</span>
              </TabsTrigger>
              <TabsTrigger value="personal" className="flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.personal}</span>
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Privacy</span>
              </TabsTrigger>
              <TabsTrigger value="account" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">Account</span>
              </TabsTrigger>
            </TabsList>

            {/* General Settings Tab */}
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    {t.language}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={language} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{currentLanguage?.flag}</span>
                          <span className="font-medium">{currentLanguage?.label}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((languageItem) => (
                        <SelectItem key={languageItem.code} value={languageItem.code}>
                          <div className="flex items-center gap-3 w-full">
                            <span className="text-lg">{languageItem.flag}</span>
                            <span className="flex-1 font-medium">{languageItem.label}</span>
                            {language === languageItem.code && (
                              <Badge variant="secondary">Active</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sun className="h-5 w-5" />
                    {t.theme}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Button
                      variant={theme === 'light' ? 'default' : 'outline'}
                      onClick={() => handleThemeChange('light')}
                      className="flex-1 py-6 flex items-center justify-center gap-3"
                    >
                      <Sun className="h-5 w-5" />
                      <span>{t.light}</span>
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'default' : 'outline'}
                      onClick={() => handleThemeChange('dark')}
                      className="flex-1 py-6 flex items-center justify-center gap-3"
                    >
                      <Moon className="h-5 w-5" />
                      <span>{t.dark}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    AI Features
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Disable AI features</p>
                      <p className="text-sm text-muted-foreground">
                        When disabled, AI chat and analysis features will be unavailable
                      </p>
                    </div>
                    <Switch
                      checked={profile.ai_opt_out || false}
                      onCheckedChange={(checked) => setProfile(prev => ({ ...prev, ai_opt_out: checked }))}
                    />
                  </div>
                  {profile.ai_opt_out && (
                    <div className="mt-4 flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-yellow-800 dark:text-yellow-200">
                        <p className="font-medium">AI Features Disabled</p>
                        <p>You can re-enable them anytime in settings.</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Personal Information Tab */}
            <TabsContent value="personal" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5" />
                    {t.personalInformation}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">{t.firstName}</Label>
                      <Input
                        id="firstName"
                        placeholder={t.enterFirstName}
                        value={profile.first_name}
                        onChange={(e) => setProfile(prev => ({ ...prev, first_name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">{t.lastName}</Label>
                      <Input
                        id="lastName"
                        placeholder={t.enterLastName}
                        value={profile.last_name}
                        onChange={(e) => setProfile(prev => ({ ...prev, last_name: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {t.phoneNumber}
                      </Label>
                      <Input
                        id="phone"
                        placeholder={t.enterPhoneNumber}
                        value={profile.phone}
                        onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {t.dateOfBirth}
                      </Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={profile.date_of_birth}
                        onChange={(e) => setProfile(prev => ({ ...prev, date_of_birth: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {t.address}
                    </Label>
                    <Input
                      id="address"
                      placeholder={t.enterAddress}
                      value={profile.address}
                      onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact">{t.emergencyContact}</Label>
                    <Input
                      id="emergencyContact"
                      placeholder={t.enterEmergencyContact}
                      value={profile.emergency_contact}
                      onChange={(e) => setProfile(prev => ({ ...prev, emergency_contact: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="medicalHistory">{t.medicalHistory}</Label>
                    <Textarea
                      id="medicalHistory"
                      placeholder={t.enterMedicalHistory}
                      value={profile.medical_history}
                      onChange={(e) => setProfile(prev => ({ ...prev, medical_history: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  {isDentist && (
                    <>
                      <Separator />
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Stethoscope className="h-5 w-5" />
                        Dentist Information
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="specialty">Specialty</Label>
                          <Input
                            id="specialty"
                            placeholder="Enter your specialty"
                            value={dentistSpecialty}
                            onChange={(e) => setDentistSpecialty(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="clinicAddress">Clinic Address</Label>
                          <Input
                            id="clinicAddress"
                            placeholder="Enter clinic address"
                            value={dentistClinicAddress}
                            onChange={(e) => setDentistClinicAddress(e.target.value)}
                          />
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
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
                    </>
                  )}

                  <Button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="w-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? "Saving..." : t.save}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Privacy & Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {t.privacyNotice}
                    </p>
                  </div>

                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      {t.consentHealthData}
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      {t.childConsentNote}
                    </p>
                  </div>

                  {/* Dentist Management Section */}
                  {isDentist && profileId && (
                    <>
                      <Separator className="my-6" />
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold flex items-center gap-2">
                          <Stethoscope className="h-5 w-5" />
                          Dentist Management
                        </h4>
                        <DentistManagement currentDentistId={profileId} />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Account Tab */}
            <TabsContent value="account" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Data Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={handleDownloadData}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t.downloadMyData}
                  </Button>

                  <Separator />

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t.deleteAccount}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Account</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t.deleteAccountConfirm}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAccount}>
                          Delete Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LogOut className="h-5 w-5" />
                    Session
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleSignOut}
                    variant="outline"
                    className="w-full"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {t.signOut}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
