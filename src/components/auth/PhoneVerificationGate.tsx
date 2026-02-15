import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Phone, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PhoneNumberInput } from "@/components/ui/phone-input";
import { User } from "@supabase/supabase-js";

interface PhoneVerificationGateProps {
  user: User | null;
}

export function PhoneVerificationGate({ user }: PhoneVerificationGateProps) {
  const [open, setOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const { toast } = useToast();

  // Check if user needs phone verification
  useEffect(() => {
    if (!user) return;

    const checkPhoneVerification = async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone, phone_verified, onboarding_completed")
          .eq("user_id", user.id)
          .single();

        // Only show if onboarding is completed but phone is not verified
        // This prevents showing during the onboarding flow
        if (profile?.onboarding_completed && !profile?.phone_verified) {
          // Delay showing the dialog slightly to not be intrusive
          setTimeout(() => setOpen(true), 2000);

          // Pre-fill phone if available
          if (profile?.phone) {
            setPhoneNumber(profile.phone);
          }
        }
      } catch (error) {
        console.error("Error checking phone verification status:", error);
      }
    };

    checkPhoneVerification();
  }, [user]);

  const formatPhoneNumber = (value: string) => {
    let cleaned = value.replace(/[^\d+]/g, '');
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
        description: "Check your phone for the 6-digit SMS code",
      });
    } catch (error: unknown) {
      console.error('Error sending SMS code:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send verification code",
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
        body: { phoneNumber: formattedPhone, code: verificationCode, userId: user?.id }
      });

      if (error) throw error;

      if (data?.verified) {
        toast({
          title: "Phone Verified!",
          description: "You can now use voice calls with our AI assistant",
        });
        handleClose();
      } else {
        toast({
          title: "Invalid Code",
          description: data?.error || "The verification code you entered is incorrect",
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      console.error('Error verifying SMS code:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to verify code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setVerificationCode("");
    setCodeSent(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>

      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-blue-600" />
            Verify Your Phone Number
          </DialogTitle>
          <DialogDescription>
            Enable voice calls with our AI assistant
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info Banner */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex gap-3">
              <MessageSquare className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 text-sm">Why verify your phone?</h3>
                <p className="text-sm text-blue-700 mt-1">
                  With a verified phone, you can call our AI assistant to book appointments,
                  ask questions, and get help. You'll also receive SMS reminders.
                </p>
              </div>
            </div>
          </div>

          {!codeSent ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <PhoneNumberInput
                  value={phoneNumber}
                  onChange={(val) => setPhoneNumber(val || "")}
                  placeholder="Enter phone number"
                />
                <p className="text-xs text-muted-foreground">
                  We'll send a verification code to this number
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
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  maxLength={8}
                  className="text-center text-2xl tracking-widest"
                  autoFocus
                />
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
                    "Verify"
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
