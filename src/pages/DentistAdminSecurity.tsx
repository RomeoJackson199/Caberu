import { useState, useEffect } from "react";
import { useCurrentDentist } from "@/hooks/useCurrentDentist";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
      console.error('Error loading user email:', error);
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
      console.error('Error checking 2FA status:', error);
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
      console.error('Error loading sessions:', error);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure your new passwords match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long",
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
        title: "✅ Password Updated",
        description: "Your password has been changed successfully. A confirmation email has been sent to your inbox.",
        duration: 8000,
        className: "bg-green-50 border-green-200 text-green-900 dark:bg-green-950 dark:border-green-800 dark:text-green-100",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update password",
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
          console.error('Failed to log 2FA disable:', logError);
        }

        setTwoFactorEnabled(false);
        toast({
          title: "2FA Disabled",
          description: "Two-factor authentication has been disabled",
        });
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to disable 2FA",
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
        console.error('Failed to log 2FA enable:', logError);
      }

      setTwoFactorEnabled(true);
      checkTwoFactorStatus();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to enable 2FA",
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
        title: "Export Started",
        description: "Your data export has been started. You will receive an email when it is ready.",
      });

    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to start data export",
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
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });

      // Sign out and redirect
      await supabase.auth.signOut();
      window.location.href = '/';

    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete account",
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
        title="Security & Access"
        subtitle="Manage security settings and team access"
        breadcrumbs={[
          { label: 'Home', href: '/dentist' },
          { label: 'Admin' },
          { label: 'Security' }
        ]}
      />

      <div className="space-y-6 max-w-4xl">

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your password regularly to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 characters)"
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={loading}
                  required
                />
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="two-factor-auth" className="font-medium cursor-pointer">Enable 2FA</Label>
                <p className="text-sm text-muted-foreground">
                  Require a verification code in addition to your password
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
                  Two-factor authentication is enabled. You will receive a verification code via email when logging in.
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
              Staff & Roles
            </CardTitle>
            <CardDescription>
              Manage team members and their access levels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {staffMembers.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  No staff members added yet
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
              Recent Login Activity
            </CardTitle>
            <CardDescription>
              Review your recent login history
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No login history available</p>
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
            <CardTitle>Data & Privacy</CardTitle>
            <CardDescription>
              Manage your data and privacy settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">




            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Export Your Data</p>
                <p className="text-sm text-muted-foreground">
                  Download a copy of all your data
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
                    Exporting...
                  </>
                ) : (
                  "Export Data"
                )}
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-600">Delete Account</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all data
                </p>
              </div>
              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Delete Account</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your
                      account and remove your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={deleteLoading}
                    >
                      {deleteLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete Account"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Privacy Policy</p>
                <p className="text-sm text-muted-foreground">
                  Review our privacy policy and terms
                </p>
              </div>
              <Button variant="outline" onClick={() => window.open('/privacy', '_blank')}>
                View Policy
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
