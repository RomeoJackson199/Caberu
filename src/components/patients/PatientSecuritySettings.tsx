import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Shield, Key, Lock, FileDown, Trash2, CheckCircle2, AlertTriangle, ChevronRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TwoFactorVerificationDialog } from "@/components/auth/TwoFactorVerificationDialog";
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
import { AnimatedBackground, StatusBadge } from "@/components/ui/polished-components";
import { motion } from "framer-motion";

export function PatientSecuritySettings() {
    const [loading, setLoading] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [enablingTwoFactor, setEnablingTwoFactor] = useState(false);
    const [show2FADialog, setShow2FADialog] = useState(false);
    const [userEmail, setUserEmail] = useState("");
    const [exportLoading, setExportLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        loadUserData();
        checkTwoFactorStatus();
    }, []);

    const loadUserData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
                setUserEmail(user.email);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    };

    const checkTwoFactorStatus = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const enabled = user.user_metadata?.two_factor_enabled === true;
                setTwoFactorEnabled(enabled);
            }
        } catch (error) {
            console.error('Error checking 2FA status:', error);
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
            } catch (emailError) {
                console.error('Failed to send password change email:', emailError);
            }

            toast({
                title: "✅ Password Updated",
                description: "Your password has been changed successfully.",
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

    return (
        <div className="relative space-y-8 max-w-5xl mx-auto pb-12">
            <AnimatedBackground />

            <div className="relative z-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                        Security Settings
                    </h1>
                    <p className="text-muted-foreground mt-2 text-lg">
                        Manage your password, 2FA, and account data
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Password Change Card */}
                    <GlassCard className="md:col-span-1" variant="interactive">
                        <GlassCardHeader>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                                    <Key className="h-5 w-5" />
                                </div>
                                <div>
                                    <GlassCardTitle>Password</GlassCardTitle>
                                    <GlassCardDescription>Update your login credentials</GlassCardDescription>
                                </div>
                            </div>
                        </GlassCardHeader>
                        <GlassCardContent>
                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="current-password">Current Password</Label>
                                    <Input
                                        id="current-password"
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="••••••••"
                                        disabled={loading}
                                        className="bg-white/50 dark:bg-black/20"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="new-password">New Password</Label>
                                    <Input
                                        id="new-password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Min 8 characters"
                                        disabled={loading}
                                        required
                                        className="bg-white/50 dark:bg-black/20"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirm-password">Confirm Password</Label>
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                        disabled={loading}
                                        required
                                        className="bg-white/50 dark:bg-black/20"
                                    />
                                </div>

                                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20">
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
                        </GlassCardContent>
                    </GlassCard>

                    <div className="space-y-6">
                        {/* Two-Factor Authentication Card */}
                        <GlassCard variant="interactive">
                            <GlassCardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                                            <Shield className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <GlassCardTitle>Two-Factor Auth</GlassCardTitle>
                                            <GlassCardDescription>Add extra security layer</GlassCardDescription>
                                        </div>
                                    </div>
                                    <StatusBadge
                                        status={twoFactorEnabled ? "success" : "warning"}
                                        label={twoFactorEnabled ? "Enabled" : "Disabled"}
                                    />
                                </div>
                            </GlassCardHeader>
                            <GlassCardContent className="space-y-4">
                                <div className="flex items-center justify-between p-4 border rounded-xl bg-white/30 dark:bg-black/10 backdrop-blur-sm">
                                    <div className="space-y-1">
                                        <Label htmlFor="two-factor-auth" className="font-medium cursor-pointer">Enable 2FA</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Secure your account with email verification
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
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        className="flex items-start gap-3 p-3 rounded-lg bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30"
                                    >
                                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                                        <p className="text-sm text-green-700 dark:text-green-400">
                                            Your account is protected with 2FA. We'll ask for a code when you sign in from a new device.
                                        </p>
                                    </motion.div>
                                )}
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

            {/* 2FA Verification Dialog */}
            <TwoFactorVerificationDialog
                open={show2FADialog}
                onOpenChange={setShow2FADialog}
                email={userEmail}
                onSuccess={handle2FASuccess}
                mode="setup"
            />
        </div>
    );
}
