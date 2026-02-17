import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Phone, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/lib/logger';

interface PhoneVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber?: string;
  onSuccess: (phoneNumber: string) => void;
  mode?: 'verify' | 'login';
  userId?: string;
}

export function PhoneVerificationDialog({
  open,
  onOpenChange,
  phoneNumber: initialPhoneNumber = "",
  onSuccess,
  mode = 'verify',
  userId: propUserId
}: PhoneVerificationDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [userId, setUserId] = useState<string | undefined>(propUserId);
  const { toast } = useToast();

  const isLoginMode = mode === 'login';

  // Get current user ID if not provided
  useEffect(() => {
    if (!propUserId && open) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setUserId(user.id);
        }
      });
    }
  }, [propUserId, open]);

  // Format phone number with country code
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters except +
    let cleaned = value.replace(/[^\d+]/g, '');

    // Ensure it starts with +
    if (cleaned && !cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  };

  const sendVerificationCode = async () => {
    if (resendCooldown > 0) {
      toast({
        title: "Please Wait",
        description: `You can resend the code in ${resendCooldown} seconds`,
        variant: "destructive",
      });
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Basic validation
    if (!formattedPhone || formattedPhone.length < 8) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number with country code (e.g., +32467881965)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms-verification', {
        body: { phoneNumber: formattedPhone }
      });

      if (error) throw error;

      setCodeSent(true);
      setMaskedPhone(data.maskedPhone || formattedPhone);

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
        description: "Check your phone for the 4 to 6-digit SMS code",
      });
    } catch (error: any) {
      logger.error('Error sending SMS code:', error);
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
    if (verificationCode.length < 4) {
      toast({
        title: "Invalid Code",
        description: "Please enter the code from your SMS",
        variant: "destructive",
      });
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-sms-code', {
        body: { phoneNumber: formattedPhone, code: verificationCode, userId }
      });

      if (error) throw error;

      if (data?.verified) {
        toast({
          title: "Phone Verified",
          description: "Your phone number has been verified successfully",
        });
        onSuccess(formattedPhone);
        onOpenChange(false);
        // Reset state
        setVerificationCode("");
        setCodeSent(false);
      } else {
        toast({
          title: "Invalid Code",
          description: data?.error || "The verification code you entered is incorrect",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      logger.error('Error verifying SMS code:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to verify code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setVerificationCode("");
      setCodeSent(false);
      if (!initialPhoneNumber) {
        setPhoneNumber("");
      }
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {isLoginMode ? 'Phone Verification' : 'Verify Phone Number'}
          </DialogTitle>
          <DialogDescription>
            {isLoginMode
              ? "Enter the verification code sent to your phone to complete sign in"
              : "We'll send an SMS with a verification code to confirm your phone number"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!codeSent ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+32467881965"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter your phone number with country code (e.g., +32 for Belgium)
                </p>
              </div>

              <Button
                onClick={sendVerificationCode}
                disabled={loading || !phoneNumber || phoneNumber.length < 8}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Phone className="mr-2 h-4 w-4" />
                    Send Verification Code
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">SMS sent to</p>
                  <p className="text-sm text-muted-foreground">{maskedPhone}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  placeholder="Enter code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Enter the 4 to 6-digit code from the SMS
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
                  disabled={loading || verificationCode.length < 4}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    isLoginMode ? "Verify & Sign In" : "Verify"
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
