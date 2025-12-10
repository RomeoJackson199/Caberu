import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LanguageSettings } from "@/components/LanguageSettings";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Settings as SettingsIcon, 
  LogOut, 
  User as UserIcon, 
  Sun,
  Moon,
  Globe,
  Heart,
  Bot,
  AlertCircle
} from "lucide-react";
import { saveProfileData, loadProfileData, testDatabaseConnection, ProfileData } from "@/lib/profileUtils";
import { DentistManagement } from "@/components/DentistManagement";
import { logger } from '@/lib/logger';

interface SettingsProps {
  user: User;
}

interface UserProfile {
  first_name: string;
  last_name: string;
  phone: string;
  date_of_birth: string;
  medical_history: string;
  address: string;
  emergency_contact: string;
  ai_opt_out?: boolean;
}

type TabType = 'general' | 'theme' | 'personal';

export const Settings = ({ user }: SettingsProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [profile, setProfile] = useState<ProfileData>({
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
  const [showAiOptOutDialog, setShowAiOptOutDialog] = useState(false);
  const [isDentist, setIsDentist] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [dentistClinicAddress, setDentistClinicAddress] = useState<string>('');
  const [dentistSpecialty, setDentistSpecialty] = useState<string>('');
  const [hasDentistRecord, setHasDentistRecord] = useState<boolean>(false);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const profileData = await loadProfileData(user);
      setProfile(profileData);
      
      // Check if profile is incomplete (missing first or last name)
      const isIncomplete = !profileData.first_name || !profileData.last_name;
      setHasIncompleteProfile(isIncomplete);

      // Load role and dentist-specific fields
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
          .select('id, clinic_address, specialization')
          .eq('profile_id', profRow.id)
          .maybeSingle();
        if (dentistErr) {
          console.error('Error loading dentist record:', dentistErr);
        }
        if (dentistRow) {
          setHasDentistRecord(true);
          setDentistClinicAddress(dentistRow.clinic_address || '');
          setDentistSpecialty(dentistRow.specialization || '');
        } else {
          setHasDentistRecord(false);
          setDentistClinicAddress('');
          setDentistSpecialty('');
        }
      } else {
        setHasDentistRecord(false);
        setDentistClinicAddress('');
        setDentistSpecialty('');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Error during sign out",
        variant: "destructive",
      });
    } else {
      toast({
        title: t.signOut,
        description: "You have been signed out successfully",
      });
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const result = await saveProfileData(user, profile);

      // Save dentist-specific fields when applicable
      if (isDentist && profileId) {
        const dentistPayload: any = {
          clinic_address: dentistClinicAddress?.trim() || null,
          specialization: dentistSpecialty?.trim() || null,
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
        title: "Success",
        description: isDentist ? "Personal and dentist information saved successfully" : "Personal information saved successfully",
      });
      
      // Refresh profile to update incomplete status
      fetchProfile();
    } catch (error) {
      console.error('Profile save error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        if (error.message.includes('RLS')) {
          errorMessage = 'Authentication error. Please try logging in again.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: `Failed to save personal information: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAiOptOutChange = async (checked: boolean) => {
    if (checked) {
      setShowAiOptOutDialog(true);
    } else {
      await updateAiOptOut(false);
    }
  };

  const updateAiOptOut = async (optOut: boolean) => {
    try {
      // Re-enabled after migration applied
      const { error } = await supabase
        .from('profiles')
        .update({ ai_opt_out: optOut })
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile(prev => ({ ...prev, ai_opt_out: optOut }));
      
      toast({
        title: optOut ? "AI Features Disabled" : "AI Features Enabled",
        description: optOut 
          ? "AI features have been disabled for your account. You can re-enable them anytime in settings."
          : "AI features have been enabled for your account.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update AI settings",
        variant: "destructive",
      });
    }
  };

const handleDownloadData = async () => {
  const { data: profile } = await supabase.from('profiles').select('id,*').eq('user_id', user.id).single();
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
};

const handleDeleteAccount = async () => {
  const confirmed = window.confirm(t.deleteAccountConfirm);
  if (!confirmed) return;
  const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  const profileId = profile?.id;
  if (profileId) {
    await supabase.from('appointments').delete().eq('patient_id', profileId);
    await supabase.from('notes').delete().eq('patient_id', profileId);
    await supabase.from('profiles').delete().eq('user_id', user.id);
  }
  await supabase.auth.signOut();
  toast({ title: t.deleteAccount, description: 'Your account has been deleted.' });
};

  const tabs = [
    { id: 'general' as TabType, label: 'Languages', icon: Globe },
    { id: 'theme' as TabType, label: 'Theme', icon: Sun },
    { id: 'personal' as TabType, label: 'Personal', icon: UserIcon },
  ];

  return (
    <>
      <Dialog>
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-background border-border">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center space-x-3 text-2xl text-primary">
              <SettingsIcon className="h-6 w-6" />
              <span>Settings</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="px-6">
            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-muted/30 rounded-xl p-1 mb-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 flex-1 justify-center ${
                      activeTab === tab.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="px-6 pb-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Preferred Language</h3>
                  <div className="bg-muted/30 rounded-xl p-4">
                    <LanguageSettings />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center space-x-2">
                    <Bot className="h-5 w-5" />
                    <span>AI Features</span>
                  </h3>
                  <div className="bg-muted/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="font-medium">Disable AI features in my account</span>
                        <p className="text-sm text-muted-foreground mt-1">
                          When disabled, AI chat and photo analysis features will be unavailable
                        </p>
                      </div>
                      <Switch
                        checked={profile.ai_opt_out}
                        onCheckedChange={handleAiOptOutChange}
                      />
                    </div>
                    {profile.ai_opt_out && (
                      <div className="flex items-start space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-yellow-800 dark:text-yellow-200">
                          <p className="font-medium">AI Features Disabled</p>
                          <p>You have disabled AI features. You can re-enable them anytime in settings.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'theme' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Theme</h3>
                  <div className="flex space-x-4">
                    <Button
                      variant={theme === 'light' ? 'default' : 'outline'}
                      onClick={() => setTheme('light')}
                      className={`flex-1 py-6 flex items-center justify-center space-x-3 rounded-xl ${
                        theme === 'light' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted/30 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Sun className="h-5 w-5" />
                      <span className="font-medium">Light</span>
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'default' : 'outline'}
                      onClick={() => setTheme('dark')}
                      className={`flex-1 py-6 flex items-center justify-center space-x-3 rounded-xl ${
                        theme === 'dark' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted/30 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Moon className="h-5 w-5" />
                      <span className="font-medium">Dark</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'personal' && (
              <div className="space-y-6">
                <div className="bg-muted/20 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor="firstName" className="text-foreground font-medium">First Name</Label>
                      <Input
                        id="firstName"
                        placeholder="Enter your first name"
                        value={profile.first_name}
                        onChange={(e) => setProfile(prev => ({ ...prev, first_name: e.target.value }))}
                        className="mt-2 bg-muted/30 border-border rounded-xl"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-foreground font-medium">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Enter your last name"
                        value={profile.last_name}
                        onChange={(e) => setProfile(prev => ({ ...prev, last_name: e.target.value }))}
                        className="mt-2 bg-muted/30 border-border rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor="phone" className="text-foreground font-medium">Phone Number</Label>
                      <Input
                        id="phone"
                        placeholder="Enter your phone number"
                        value={profile.phone}
                        onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                        className="mt-2 bg-muted/30 border-border rounded-xl"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dateOfBirth" className="text-foreground font-medium">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={profile.date_of_birth}
                        onChange={(e) => setProfile(prev => ({ ...prev, date_of_birth: e.target.value }))}
                        className="mt-2 bg-muted/30 border-border rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <Label htmlFor="address" className="text-foreground font-medium">Address</Label>
                    <Input
                      id="address"
                      placeholder="Enter your address"
                      value={profile.address}
                      onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                      className="mt-2 bg-muted/30 border-border rounded-xl"
                    />
                  </div>

                  <div className="mb-4">
                    <Label htmlFor="emergencyContact" className="text-foreground font-medium">Emergency Contact</Label>
                    <Input
                      id="emergencyContact"
                      placeholder="Enter emergency contact information"
                      value={profile.emergency_contact}
                      onChange={(e) => setProfile(prev => ({ ...prev, emergency_contact: e.target.value }))}
                      className="mt-2 bg-muted/30 border-border rounded-xl"
                    />
                  </div>

                  <div className="mb-4">
                    <Label htmlFor="medicalHistory" className="text-foreground font-medium">Medical History</Label>
                    <Textarea
                      id="medicalHistory"
                      placeholder="Enter any relevant medical history"
                      value={profile.medical_history}
                      onChange={(e) => setProfile(prev => ({ ...prev, medical_history: e.target.value }))}
                      className="mt-2 bg-muted/30 border-border rounded-xl"
                      rows={4}
                    />
                  </div>

                  {/* Dentist-specific fields */}
                  {isDentist && (
                    <div className="space-y-4 pt-4 border-t border-border">
                      <h4 className="text-lg font-semibold text-foreground">Dentist Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="clinicAddress" className="text-foreground font-medium">Clinic Address</Label>
                          <Input
                            id="clinicAddress"
                            placeholder="Enter clinic address"
                            value={dentistClinicAddress}
                            onChange={(e) => setDentistClinicAddress(e.target.value)}
                            className="mt-2 bg-muted/30 border-border rounded-xl"
                          />
                        </div>
                        <div>
                          <Label htmlFor="specialty" className="text-foreground font-medium">Specialty</Label>
                          <Input
                            id="specialty"
                            placeholder="Enter specialty"
                            value={dentistSpecialty}
                            onChange={(e) => setDentistSpecialty(e.target.value)}
                            className="mt-2 bg-muted/30 border-border rounded-xl"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      onClick={handleSaveProfile}
                      disabled={loading}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      ) : (
                        <Heart className="h-4 w-4 mr-2" />
                      )}
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>

                {/* Dentist Management Section - Only for Dentists */}
                {isDentist && profileId && (
                  <div className="bg-muted/20 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Dentist Management</h3>
                    <DentistManagement currentDentistId={profileId} />
                  </div>
                )}

                <div className="pt-4 border-t border-border">
                  <Button 
                    onClick={handleDownloadData}
                    variant="outline"
                    className="w-full mb-4"
                  >
                    Download My Data
                  </Button>
                  
                  <Button 
                    onClick={handleDeleteAccount}
                    variant="destructive"
                    className="w-full mb-4"
                  >
                    Delete Account
                  </Button>
                  
                  <Button 
                    variant="destructive" 
                    onClick={handleSignOut}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 rounded-xl"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {t.signOut}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Opt-Out Confirmation Dialog */}
      <Dialog open={showAiOptOutDialog} onOpenChange={setShowAiOptOutDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Bot className="h-5 w-5" />
              <span>Disable AI Features</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to disable AI features? This will:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start space-x-2">
                <span className="text-red-500">•</span>
                <span>Disable AI chat functionality</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-red-500">•</span>
                <span>Disable photo analysis features</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-red-500">•</span>
                <span>Remove AI-powered appointment suggestions</span>
              </li>
            </ul>
            <p className="text-sm text-muted-foreground">
              You can re-enable AI features anytime in your settings.
            </p>
            <div className="flex space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAiOptOutDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  updateAiOptOut(true);
                  setShowAiOptOutDialog(false);
                }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              >
                Disable AI
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};