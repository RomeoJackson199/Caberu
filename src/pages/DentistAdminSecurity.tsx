import { useState, useEffect } from "react";
import { useCurrentDentist } from "@/hooks/useCurrentDentist";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, Shield, Key, AlertTriangle } from "lucide-react";
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
import { logger } from '@/lib/logger';
import { SecuritySettingsSkeleton } from "@/components/ui/page-skeletons";

export default function DentistAdminSecurity() {
  const { businessId } = useBusinessContext();
  const { dentistId, loading: dentistLoading } = useCurrentDentist(businessId);
  const { t } = useLanguage();
  const [userEmail, setUserEmail] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (dentistId) {
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
    return <SecuritySettingsSkeleton />;
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

        {/* Auth Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              {t.security || "Sign-in Method"}
            </CardTitle>
            <CardDescription>
              How you access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">OTP-based authentication</p>
                <p className="text-xs text-blue-700/80 dark:text-blue-400/80 mt-1">
                  Your account uses secure one-time codes sent to your email or phone. No password is needed.
                </p>
              </div>
            </div>
            {userEmail && (
              <p className="text-sm text-muted-foreground mt-3">
                Signed in as <span className="font-medium text-foreground">{userEmail}</span>
              </p>
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
