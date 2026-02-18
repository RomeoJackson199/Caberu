import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/lib/logger';

interface TwoFactorVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onSuccess: () => void;
  mode?: 'setup' | 'login'; // 'setup' for enabling 2FA, 'login' for login verification
}

export function TwoFactorVerificationDialog({
  open,
  onOpenChange,
  email,
  onSuccess,
  mode = 'setup' // Default to setup mode for backward compatibility
}: TwoFactorVerificationDialogProps) {
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { toast } = useToast();

  const isLoginMode = mode === 'login';

  const sendVerificationCode = async () => {
    if (resendCooldown > 0) {
      toast({
        title: "Please Wait",
        description: `You can resend the code in ${resendCooldown} seconds`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-2fa-code', {
        body: { email }
      });

      if (error) throw error;

      setCodeSent(true);

      // Start 60-second cooldown
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      toast({
        title: "Verification Code Sent",
        description: "Check your email for the 6-digit code",
      });
    } catch (error: any) {
      logger.error('Error sending code:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-2fa-code', {
        body: { email, code: verificationCode }
      });

      if (error) throw error;

      if (data?.verified) {
        toast({
          title: isLoginMode ? "Verified Successfully" : "2FA Enabled",
          description: isLoginMode
            ? "You have been successfully authenticated"
            : "Two-factor authentication has been enabled successfully",
        });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({
          title: "Invalid Code",
          description: "The verification code you entered is incorrect",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      logger.error('Error verifying code:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to verify code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {isLoginMode ? 'Two-Factor Authentication' : 'Enable Two-Factor Authentication'}
          </DialogTitle>
          <DialogDescription>
            {isLoginMode
              ? "Enter the verification code sent to your email to complete sign in"
              : "We'll send a verification code to your email to confirm setup"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!codeSent ? (
            <>
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email Address</p>
                  <p className="text-sm text-muted-foreground">{email}</p>
                </div>
              </div>

              <Button
                onClick={sendVerificationCode}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Verification Code
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code sent to {email}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={sendVerificationCode}
                  disabled={loading || resendCooldown > 0}
                  className="flex-1"
                >
                  {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}
                </Button>
                <Button
                  onClick={verifyCode}
                  disabled={loading || verificationCode.length !== 6}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    isLoginMode ? "Verify & Sign In" : "Verify & Enable"
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
