import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, Mail, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/error-handling/formatting";
import { logger } from "@/lib/logger";

interface ForgotPasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultEmail?: string;
}

export function ForgotPasswordDialog({
    open,
    onOpenChange,
    defaultEmail = ""
}: ForgotPasswordDialogProps) {
    const [step, setStep] = useState<'email' | 'code' | 'success'>('email');
    const [email, setEmail] = useState(defaultEmail);
    const [otpCode, setOtpCode] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOtp({ email });
            if (error) throw error;

            toast({
                title: "Code Sent",
                description: `We sent a 6-digit code to ${email}`,
            });
            setStep('code');
        } catch (error: unknown) {
            logger.error("Account recovery OTP error:", error);
            toast({
                title: "Error",
                description: getErrorMessage(error),
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (completedCode?: string) => {
        const code = completedCode ?? otpCode;
        if (code.length < 6) return;

        setLoading(true);
        try {
            const { error } = await supabase.auth.verifyOtp({
                email,
                token: code,
                type: "email",
            });
            if (error) throw error;

            setStep('success');
        } catch (error: unknown) {
            logger.error("Account recovery verify error:", error);
            toast({
                title: "Error",
                description: getErrorMessage(error),
                variant: "destructive",
            });
            setOtpCode("");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        onOpenChange(false);
        setTimeout(() => {
            setStep('email');
            setOtpCode("");
            if (!defaultEmail) setEmail("");
        }, 300);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Account Recovery</DialogTitle>
                    <DialogDescription>
                        {step === 'email' && "Enter your email to receive a sign-in code."}
                        {step === 'code' && "Enter the 6-digit code sent to your email."}
                        {step === 'success' && "You've been signed in successfully."}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {step === 'email' && (
                        <form onSubmit={handleSendOTP} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="reset-email">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="reset-email"
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        Send Sign-in Code
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </form>
                    )}

                    {step === 'code' && (
                        <div className="space-y-4">
                            <div className="text-center space-y-1">
                                <p className="text-sm text-muted-foreground">
                                    Enter the 6-digit code sent to
                                </p>
                                <p className="text-sm font-semibold">{email}</p>
                            </div>

                            <div className="flex justify-center">
                                <InputOTP
                                    value={otpCode}
                                    onChange={setOtpCode}
                                    maxLength={6}
                                    onComplete={handleVerifyOTP}
                                >
                                    <InputOTPGroup>
                                        {[0, 1, 2, 3, 4, 5].map((index) => (
                                            <InputOTPSlot key={index} index={index} className="h-12 w-10" />
                                        ))}
                                    </InputOTPGroup>
                                </InputOTP>
                            </div>

                            <Button
                                type="button"
                                onClick={() => handleVerifyOTP()}
                                className="w-full"
                                disabled={loading || otpCode.length < 6}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    "Verify & Sign In"
                                )}
                            </Button>

                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep('email');
                                        setOtpCode("");
                                    }}
                                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                                >
                                    <ArrowLeft className="h-3.5 w-3.5" />
                                    Change email
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSendOTP({ preventDefault: () => {} } as React.FormEvent)}
                                    disabled={loading}
                                    className="text-sm text-primary hover:underline transition-colors disabled:opacity-50"
                                >
                                    Resend code
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="flex flex-col items-center justify-center space-y-4 text-center">
                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                You're now signed in. You can close this dialog.
                            </p>
                            <Button onClick={handleClose} className="w-full">
                                Continue
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
