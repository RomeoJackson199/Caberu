import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Loader2, Key, Lock, FileDown, Trash2, CheckCircle2, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
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
import { AnimatedBackground } from "@/components/ui/polished-components";
import { logger } from "@/lib/logger";

export function PatientSecuritySettings() {
    const [userEmail, setUserEmail] = useState("");
    const [exportLoading, setExportLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
                setUserEmail(user.email);
            }
        } catch (error) {
            logger.error('Error loading user data:', error);
        }
    };

    const handleExportData = async () => {
        try {
            setExportLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

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

        } catch (error: unknown) {
            logger.error('Export error:', error);
            const msg = error instanceof Error ? error.message : "Failed to start data export";
            toast({
                title: "Export Failed",
                description: msg,
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

            await supabase.auth.signOut();
            window.location.href = '/';

        } catch (error: unknown) {
            logger.error('Delete error:', error);
            const msg = error instanceof Error ? error.message : "Failed to delete account";
            toast({
                title: "Delete Failed",
                description: msg,
                variant: "destructive",
            });
            setShowDeleteDialog(false);
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="relative space-y-8 max-w-5xl mx-auto pb-12">
            <AnimatedBackground />

            <div className="relative z-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                        Security Settings
                    </h1>
                    <p className="text-muted-foreground mt-2 text-lg">
                        Manage your account security and data
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Auth Info Card */}
                    <GlassCard className="md:col-span-1" variant="interactive">
                        <GlassCardHeader>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                                    <Key className="h-5 w-5" />
                                </div>
                                <div>
                                    <GlassCardTitle>Sign-in Method</GlassCardTitle>
                                    <GlassCardDescription>How you access your account</GlassCardDescription>
                                </div>
                            </div>
                        </GlassCardHeader>
                        <GlassCardContent>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                                    <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">OTP-based authentication</p>
                                        <p className="text-xs text-blue-700/80 dark:text-blue-400/80 mt-1">
                                            Your account uses secure one-time codes sent to your email or phone. No password is needed.
                                        </p>
                                    </div>
                                </div>
                                {userEmail && (
                                    <p className="text-sm text-muted-foreground">
                                        Signed in as <span className="font-medium text-foreground">{userEmail}</span>
                                    </p>
                                )}
                            </div>
                        </GlassCardContent>
                    </GlassCard>

                    {/* Data & Privacy Card */}
                    <GlassCard variant="interactive">
                        <GlassCardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <div>
                                    <GlassCardTitle>Data & Privacy</GlassCardTitle>
                                    <GlassCardDescription>Control your personal data</GlassCardDescription>
                                </div>
                            </div>
                        </GlassCardHeader>
                        <GlassCardContent className="space-y-4">
                            <div className="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={handleExportData}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600">
                                        <FileDown className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">Export Data</p>
                                        <p className="text-xs text-muted-foreground">Download a copy of your data</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" disabled={exportLoading}>
                                    {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                </Button>
                            </div>

                            <Separator className="bg-gray-100 dark:bg-white/10" />

                            <div className="flex items-center justify-between p-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600">
                                        <Trash2 className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm text-red-600">Delete Account</p>
                                        <p className="text-xs text-muted-foreground">Permanently remove your account</p>
                                    </div>
                                </div>
                                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                                            Delete
                                        </Button>
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
                        </GlassCardContent>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
