import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings as SettingsIcon, Calendar, Palette, Shield, User, LogOut, Mail, HelpCircle, UserCog, CheckCircle2, Briefcase, CreditCard, Bot } from "lucide-react";
import { AvailabilitySettings } from "@/components/settings/availability-settings";
import DentistAdminBranding from "./DentistAdminBranding";
import DentistAdminSecurity from "./DentistAdminSecurity";
import DentistAdminProfile from "./DentistAdminProfile";
import DentistAdminUsers from "./DentistAdminUsers";
import { ServiceManager } from "@/components/services/ServiceManager";
import { useCurrentDentist } from "@/hooks/useCurrentDentist";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCurrentBusinessId } from "@/lib/businessUtils";
import { logger } from '@/lib/logger';
import { Switch } from "@/components/ui/switch";
import { CancelSubscriptionSection } from "@/components/settings/CancelSubscriptionSection";
import { VoiceAICard } from "@/components/settings/VoiceAICard";
import { PhoneBookingFlowCard } from "@/components/settings/PhoneBookingFlowCard";
import { useLanguage } from "@/hooks/useLanguage";

export default function DentistSettings() {
  const { businessId, loading: businessLoading, membershipRole } = useBusinessContext();
  const { dentistId } = useCurrentDentist(businessId);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("appointments");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const isOwner = membershipRole === 'owner';
  const [requireApproval, setRequireApproval] = useState(false);
  const [appointmentLoading, setAppointmentLoading] = useState(true);
  const [savingAppointments, setSavingAppointments] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [leavePassword, setLeavePassword] = useState('');
  const [leavingClinic, setLeavingClinic] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['profile', 'services', 'appointments', 'schedule', 'branding', 'security', 'staff', 'support', 'voice', 'billing'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!dentistId) return;

    const loadAppointmentSettings = async () => {
      setAppointmentLoading(true);
      try {
        const { data, error } = await supabase
          .from('dentists')
          .select('require_appointment_approval')
          .eq('id', dentistId)
          .single();

        if (error) throw error;
        setRequireApproval(data?.require_appointment_approval || false);
      } catch (error) {
        logger.error('Failed to load appointment settings', error);
        toast({
          title: t.couldntLoadSettings || "Couldn't load appointment settings",
          description: t.refreshOrTryAgain || "Please refresh the page or try again in a moment.",
          variant: "destructive",
        });
      } finally {
        setAppointmentLoading(false);
      }
    };

    loadAppointmentSettings();
  }, [dentistId, toast]);

  const handleLeaveClinic = async () => {
    if (!leavePassword.trim()) {
      toast({
        title: t.passwordRequired || "Password required",
        description: t.enterPasswordLeave || "Please enter your password to confirm leaving the clinic.",
        variant: "destructive",
      });
      return;
    }

    setLeavingClinic(true);
    try {
      // Verify password first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Not authenticated');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: leavePassword
      });

      if (signInError) {
        throw new Error('Incorrect password');
      }

      // Password verified, now leave the clinic
      const currentBusinessId = await getCurrentBusinessId();
      const { data, error } = await supabase.rpc('leave_clinic', { p_business_id: currentBusinessId });
      if (error) throw error;

      const result = data as any;

      // Check if leave was blocked due to active subscription
      if (result?.success === false && result?.error === 'active_subscription') {
        toast({
          title: t.cannotLeave || "Cannot leave",
          description: result.message || "You cannot leave as the last member while the subscription is active. Please cancel your subscription first.",
          variant: "destructive",
        });
        setShowLeaveDialog(false);
        setLeavePassword('');
        return;
      }

      const remaining = result?.remaining_businesses ?? null;
      const businessDeleted = result?.business_deleted ?? false;
      const ownershipTransferred = result?.ownership_transferred ?? false;

      setShowLeaveDialog(false);
      setLeavePassword('');

      if (businessDeleted) {
        toast({
          title: t.businessDeleted || "Business deleted",
          description: t.lastMemberDeletedDesc || "You were the last member. The business has been permanently deleted.",
          variant: "default",
        });
      } else {
        let description = remaining === 0
          ? (t.leftRoleRemoved || "You left the clinic and your provider role was removed.")
          : (t.stillBelongOther || "You left the clinic. You still belong to other clinics.");
        if (ownershipTransferred) {
          description += " " + (t.ownershipTransferred || "Ownership has been transferred to another team member.");
        }
        toast({
          title: t.leftClinic || "Left clinic",
          description,
        });
      }

      // Navigate home to update role and UI
      navigate('/', { replace: true });
      window.location.reload();
    } catch (error) {
      logger.error('Error leaving clinic:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to leave clinic. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLeavingClinic(false);
    }
  };

  if (businessLoading || !dentistId) {
    return (
      <div className="container max-w-6xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg" />
          <Skeleton className="h-8 w-32" />
        </div>
        {/* Tabs skeleton */}
        <div className="overflow-x-auto">
          <div className="flex gap-2 p-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-20 rounded-md" />
            ))}
          </div>
        </div>
        {/* Content skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-2/3" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`?tab=${value}`, { replace: true });
  };

  return (
    <div className="container max-w-6xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <SettingsIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">{t.settings}</h1>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
          <TabsList className="inline-flex w-max gap-1 p-1">
            <TabsTrigger value="profile" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3 shrink-0">
              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t.profile || "Profile"}
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3 shrink-0">
              <Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t.services || "Services"}
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3 shrink-0">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t.hours || "Hours"}
            </TabsTrigger>
            <TabsTrigger value="appointments" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3 shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t.appts || "Appts"}
            </TabsTrigger>
            <TabsTrigger value="staff" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3 shrink-0">
              <UserCog className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t.team || "Team"}
            </TabsTrigger>
            {isOwner && (
              <TabsTrigger value="branding" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3 shrink-0">
                <Palette className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {t.brand || "Brand"}
              </TabsTrigger>
            )}
            {isOwner && (
              <TabsTrigger value="voice" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3 shrink-0">
                <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {"Voice AI"}
              </TabsTrigger>
            )}
            {isOwner && (
              <TabsTrigger value="billing" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3 shrink-0">
                <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {t.billing || "Billing"}
              </TabsTrigger>
            )}
            <TabsTrigger value="security" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3 shrink-0">
              <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t.security || "Security"}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="space-y-6">
          <DentistAdminProfile />
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <ServiceManager />
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <AvailabilitySettings dentistId={dentistId} />
        </TabsContent>

        <TabsContent value="appointments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.appointmentPreferences || "Appointment preferences"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border rounded-lg p-4">
                <div className="space-y-1">
                  <Label htmlFor="require-approval">{t.requireApprovalBefore || "Require approval before confirming"}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t.approveNewPatientRequests || "Approve new patient requests to prevent double booking or missing prep time."}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="require-approval"
                    checked={requireApproval}
                    disabled={appointmentLoading || savingAppointments}
                    onCheckedChange={setRequireApproval}
                  />
                  <span className="text-sm text-muted-foreground">
                    {requireApproval ? (t.manualReviewRequired || 'Manual review required') : (t.requestsAutoConfirmed || 'Requests auto-confirmed')}
                  </span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-muted-foreground">{t.saveImmediately || "Save changes so patients see the right booking rules immediately."}</p>
                <Button
                  onClick={async () => {
                    if (!dentistId) return;
                    setSavingAppointments(true);
                    const { error } = await supabase
                      .from('dentists')
                      .update({ require_appointment_approval: requireApproval })
                      .eq('id', dentistId);

                    if (error) {
                      toast({
                        title: t.couldntSaveSettings || "Couldn't save appointment settings",
                        description: error.message || (t.refreshOrTryAgain || "Try again in a moment."),
                        variant: "destructive",
                      });
                    } else {
                      toast({
                        title: t.appointmentRulesUpdated || "Appointment rules updated",
                        description: t.rulesUpdatedDesc || "Patients will see the new approval rules immediately.",
                      });
                    }
                    setSavingAppointments(false);
                  }}
                  disabled={appointmentLoading || savingAppointments}
                  className="min-w-[140px]"
                >
                  {savingAppointments ? (t.savingChanges || 'Saving...') : (t.saveChanges || 'Save changes')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.staffManagement || "Staff Management"}</CardTitle>
              <CardDescription>
                {t.manageTeamMembers || "Manage your team members and their access"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DentistAdminUsers />
            </CardContent>
          </Card>
        </TabsContent>

        {isOwner && (
          <TabsContent value="branding" className="space-y-6">
            <DentistAdminBranding />
          </TabsContent>
        )}

        {isOwner && (
          <TabsContent value="voice" className="space-y-6">
            <VoiceAICard />
            <PhoneBookingFlowCard />
          </TabsContent>
        )}

        {isOwner && (
          <TabsContent value="billing" className="space-y-6">
            <CancelSubscriptionSection />
          </TabsContent>
        )}

        <TabsContent value="security" className="space-y-6">
          <DentistAdminSecurity />

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">{t.dangerZone || "Danger Zone"}</CardTitle>
              <CardDescription>
                {t.irreversibleActions || "Irreversible actions that affect your clinic membership"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Button
                  variant="destructive"
                  onClick={() => setShowLeaveDialog(true)}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  {t.leaveClinic || "Leave Clinic"}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  {t.loseAccessWarning || "You will lose access to all clinic data and appointments."}
                  <br />
                  <strong>{t.lastMemberWarning || "Warning: If you are the last member, the entire business will be permanently deleted."}</strong>
                </p>
              </div>

              {isOwner && (
                <div className="pt-4 border-t">
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      if (!confirm(t.archiveBusinessConfirm || "Are you sure you want to archive this business?")) return;
                      try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) throw new Error('Not authenticated');
                        const currentBusinessId = await getCurrentBusinessId();
                        const { data, error } = await supabase.rpc('safe_archive_business', {
                          p_business_id: currentBusinessId,
                          p_actor_id: user.id,
                        });
                        if (error) throw error;
                        toast({
                          title: t.businessArchived || "Business Archived",
                          description: t.businessArchivedDesc || "The business has been archived. All historical data is preserved.",
                        });
                        navigate('/', { replace: true });
                        window.location.reload();
                      } catch (err) {
                        toast({
                          title: t.error || "Error",
                          description: err instanceof Error ? err.message : "Failed to archive business",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    {t.archiveBusiness || "Archive Business"}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t.archiveBusinessDesc || "This will archive the business, cancel all future appointments, and revoke team access. Historical data is preserved for compliance."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Leave Clinic Confirmation Dialog */}
      {showLeaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-destructive">{t.leaveClinic || "Leave Clinic"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t.leaveClinicConfirm || "This action is irreversible. You will lose access to all clinic data, appointments, and patient records."}
              </p>
              <p className="text-sm text-destructive font-medium">
                ⚠️ {t.lastMemberWarning || "If you are the last member, the entire business will be permanently deleted."}
              </p>
              <div>
                <Label htmlFor="leave-password">{t.enterPasswordConfirm || "Enter your password to confirm"}</Label>
                <Input
                  id="leave-password"
                  type="password"
                  value={leavePassword}
                  onChange={(e) => setLeavePassword(e.target.value)}
                  placeholder={t.yourPassword || "Your password"}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setShowLeaveDialog(false); setLeavePassword(''); }}>
                  {t.cancel}
                </Button>
                <Button variant="destructive" onClick={handleLeaveClinic} disabled={leavingClinic || !leavePassword.trim()}>
                  {leavingClinic ? (t.leaving || 'Leaving...') : (t.leaveClinic || 'Leave Clinic')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
