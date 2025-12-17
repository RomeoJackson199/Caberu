import { useState, useEffect } from "react";
import { useCurrentDentist } from "@/hooks/useCurrentDentist";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Shield, Key, Clock, AlertTriangle, Users, UserPlus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { PageHeader } from "@/components/layout/PageHeader";
import { StaffInviteDialog } from "@/components/staff/StaffInviteDialog";
import { TwoFactorVerificationDialog } from "@/components/auth/TwoFactorVerificationDialog";
import { logger } from '@/lib/logger';

export default function DentistAdminSecurity() {
  const { businessId } = useBusinessContext();
  const { dentistId, loading: dentistLoading } = useCurrentDentist(businessId);
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [enablingTwoFactor, setEnablingTwoFactor] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (dentistId) {
      loadSessions();
      checkTwoFactorStatus();
      loadUserEmail();
    }
  }, [dentistId]);

  const loadUserEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    } catch (error) {
      logger.error('Error loading user email:', error);
    }
  };

  const checkTwoFactorStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check if user has 2FA enabled in metadata
        const enabled = user.user_metadata?.two_factor_enabled === true;
        setTwoFactorEnabled(enabled);
      }
    } catch (error) {
      logger.error('Error checking 2FA status:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('action', 'login')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      logger.error('Error loading sessions:', error);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: t.passwordsDontMatch,
        description: t.passwordsDontMatchDesc,
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: t.passwordTooShort,
        description: t.passwordMinLength,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Send password change notification email
      try {
        await supabase.functions.invoke('send-password-change-notification', {
          body: {
            email: userEmail,
            timestamp: new Date().toISOString(),
          }
        });
        logger.info('Password change notification sent');
      } catch (emailError) {
        // Don't fail the password change if email fails
        logger.error('Failed to send password change email:', emailError);
      }

      toast({
        title: `✅ ${t.passwordUpdated}`,
        description: t.passwordUpdatedDesc,
        duration: 8000,
        className: "bg-green-50 border-green-200 text-green-900 dark:bg-green-950 dark:border-green-800 dark:text-green-100",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      logger.error('Error updating password:', error);
      toast({
        title: `❌ ${t.error}`,
        description: error.message || t.error,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorToggle = async (enabled: boolean) => {
    if (!enabled) {
      // Disable 2FA
      setEnablingTwoFactor(true);
      try {
        // Remove 2FA settings from user metadata
        const { error } = await supabase.auth.updateUser({
          data: { two_factor_enabled: false }
        });

        if (error) throw error;

        // Log 2FA disable event
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('security_audit_logs').insert({
              user_id: user.id,
              event_type: '2fa_disabled',
              metadata: { timestamp: new Date().toISOString() }
            });
          }
        } catch (logError) {
          logger.error('Failed to log 2FA disable:', logError);
        }

        setTwoFactorEnabled(false);
        toast({
          title: t.twoFaDisabled,
          description: t.twoFaDisabledDesc,
        });
      } catch (error: any) {
        toast({
          title: t.error,
          description: error.message || t.error,
          variant: "destructive",
        });
      } finally {
        setEnablingTwoFactor(false);
      }
    } else {
      // Enable 2FA - show email verification dialog
      setShow2FADialog(true);
    }
  };

  const handle2FASuccess = async () => {
    try {
      // Save 2FA enabled status to user metadata
      const { error } = await supabase.auth.updateUser({
        data: { two_factor_enabled: true }
      });

      if (error) throw error;

      // Log 2FA enable event
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('security_audit_logs').insert({
            user_id: user.id,
            event_type: '2fa_enabled',
            metadata: { timestamp: new Date().toISOString() }
          });
        }
      } catch (logError) {
        logger.error('Failed to log 2FA enable:', logError);
      }

      setTwoFactorEnabled(true);
      checkTwoFactorStatus();
    } catch (error: any) {
      toast({
        title: t.error,
        description: error.message || t.error,
        variant: "destructive",
      });
    }
  };

  const handleExportData = async () => {
    try {
      setExportLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create a new export bundle
      const { data: bundle, error: bundleError } = await supabase
        .from('gdpr_export_bundles')
        .insert({
          patient_id: user.id,
          request_type: 'portability',
          status: 'pending'
        })
        .select()
        .single();

      if (bundleError) throw bundleError;

      // Trigger the edge function
      const { error } = await supabase.functions.invoke('generate-data-export', {
        body: {
          bundleId: bundle.id,
          exportType: 'portability'
        }
      });

      if (error) throw error;

      toast({
        title: t.exportStarted,
        description: t.exportStartedDesc,
      });

    } catch (error: any) {
      logger.error('Export error:', error);
      toast({
        title: t.exportFailed,
        description: error.message || t.exportFailed,
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleteLoading(true);
      const { error } = await supabase.functions.invoke('delete-user-account');

      if (error) throw error;

      toast({
        title: t.accountDeleted,
        description: t.accountDeletedDesc,
      });

      // Sign out and redirect
      await supabase.auth.signOut();
      window.location.href = '/';

    } catch (error: any) {
      logger.error('Delete error:', error);
      toast({
        title: t.deleteFailed,
        description: error.message || t.deleteFailed,
        variant: "destructive",
      });
      setShowDeleteDialog(false);
    } finally {
      setDeleteLoading(false);
    }
  };



  if (dentistLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!dentistId) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You are not registered as a dentist. Please contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t.securityAccess}
        subtitle={t.securitySubtitle}
        breadcrumbs={[
          { label: t.navDashboard, href: '/dentist' },
          { label: t.navAdmin },
          { label: t.security }
        ]}
      />

      <div className="space-y-6 max-w-4xl">

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              {t.changePassword}
            </CardTitle>
            <CardDescription>
              {t.changePasswordDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">{t.currentPassword}</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t.enterCurrentPassword}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">{t.newPassword}</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t.enterNewPasswordMin}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t.confirmNewPassword}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.confirmPasswordPlaceholder}
                  disabled={loading}
                  required
                />
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.updating}
                  </>
                ) : (
                  t.updatePassword
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t.twoFactorAuth}
            </CardTitle>
            <CardDescription>
              {t.twoFactorAuthDesc}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="two-factor-auth" className="font-medium cursor-pointer">{t.enable2fa}</Label>
                <p className="text-sm text-muted-foreground">
                  {t.require2faCode}
                </p>
              </div>
              <Switch
                id="two-factor-auth"
                checked={twoFactorEnabled}
                onCheckedChange={handleTwoFactorToggle}
                disabled={enablingTwoFactor || !userEmail}
              />
            </div>
            {twoFactorEnabled && (
              <Alert>
                <AlertDescription>
                  {t.twoFaEnabled}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <TwoFactorVerificationDialog
          open={show2FADialog}
          onOpenChange={setShow2FADialog}
          email={userEmail}
          onSuccess={handle2FASuccess}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t.staffRoles}
            </CardTitle>
            <CardDescription>
              {t.staffRolesDesc}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {staffMembers.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  {t.noStaffYet}
                </p>
                <StaffInviteDialog dentistId={dentistId} />
              </div>
            ) : (
              <div className="space-y-3">
                {staffMembers.map((member: any) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    <Select defaultValue={member.role}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dentist">Dentist</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="assistant">Assistant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                <div className="pt-3">
                  <StaffInviteDialog dentistId={dentistId} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t.history}
            </CardTitle>
            <CardDescription>
              {t.history}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noRecordsFound}</p>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(session.created_at).toLocaleString()}
                      </p>
                      {session.ip_address && (
                        <p className="text-xs text-muted-foreground">
                          IP: {session.ip_address}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {session.action}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.dataPrivacy}</CardTitle>
            <CardDescription>
              {t.dataPrivacyDesc}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">




            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t.exportYourData}</p>
                <p className="text-sm text-muted-foreground">
                  {t.exportDataDesc}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleExportData}
                disabled={exportLoading}
              >
                {exportLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.exporting}
                  </>
                ) : (
                  t.exportData
                )}
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-600">{t.deleteYourAccount}</p>
                <p className="text-sm text-muted-foreground">
                  {t.deleteAccountDesc}
                </p>
              </div>
              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">{t.deleteAccount}</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t.confirmDeleteAccount}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t.deleteAccountWarningDesc}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={deleteLoading}
                    >
                      {deleteLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t.deleting}
                        </>
                      ) : (
                        t.deleteAccount
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t.privacyPolicyLink}</p>
                <p className="text-sm text-muted-foreground">
                  {t.dataHandlingInfo}
                </p>
              </div>
              <Button variant="outline" onClick={() => window.open('/privacy', '_blank')}>
                {t.view}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
