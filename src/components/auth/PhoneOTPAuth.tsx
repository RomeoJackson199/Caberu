import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PhoneNumberInput } from "@/components/ui/phone-input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, Phone, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface PhoneOTPAuthProps {
  /** Metadata to pass during signup (e.g. role_type) */
  signupMetadata?: Record<string, string>;
  /** Custom redirect after successful auth */
  redirectTo?: string;
  /** Visual variant for different contexts */
  variant?: "default" | "glass";
  /** Called on successful auth instead of navigating */
  onSuccess?: () => void;
}

type Step = "phone" | "otp";

export function PhoneOTPAuth({
  signupMetadata,
  redirectTo = "/auth-redirect",
  variant = "default",
  onSuccess,
}: PhoneOTPAuthProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState<string | undefined>();
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isGlass = variant === "glass";

  const handleSendOTP = async () => {
    if (!phone) {
      toast({
        title: "Phone number required",
        description: "Please enter your phone number to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          data: signupMetadata,
        },
      });

      if (error) throw error;

      setStep("otp");
      toast({
        title: "Code sent!",
        description: `We sent a verification code to ${phone}`,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to send code";
      toast({
        title: "Could not send code",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Accept the completed code directly from onComplete to avoid stale state.
  // When called from the button click, fall back to the otpCode state value.
  const handleVerifyOTP = async (completedCode?: string) => {
    const code = completedCode ?? otpCode;
    if (code.length < 6) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: phone!,
        token: code,
        type: "sms",
      });

      if (error) throw error;

      // Remember that user has signed in before
      localStorage.setItem("caberu_remembered_email", phone!);

      // If this is an owner signup via phone AND there's no onSuccess handler,
      // set the pending user type so AuthRedirectHandler routes to /create-business.
      // When onSuccess is provided (e.g., inside /create-business), the parent handles routing.
      if (signupMetadata?.role_type === 'owner' && !onSuccess) {
        sessionStorage.setItem('pending_signup_user_type', 'owner');
      }

      toast({
        title: "Welcome!",
        description: "You've been signed in successfully.",
      });

      if (onSuccess) {
        onSuccess();
      } else {
        navigate(redirectTo, { replace: true });
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Invalid code";
      toast({
        title: "Verification failed",
        description: msg,
        variant: "destructive",
      });
      setOtpCode("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setOtpCode("");
    await handleSendOTP();
  };

  const inputClass = isGlass
    ? "[&_.PhoneInputCountry]:mr-2 [&_.PhoneInputCountryIcon]:h-4 [&_.PhoneInputCountryIcon]:w-6 [&_.PhoneInputCountrySelect]:h-full [&_.PhoneInputCountrySelect]:w-full [&_.PhoneInputCountrySelect]:opacity-0 [&Input]:h-full [&Input]:w-full [&Input]:bg-transparent [&Input]:outline-none [&Input]:border-none"
    : "";

  return (
    <AnimatePresence mode="wait">
      {step === "phone" ? (
        <motion.div
          key="phone-step"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <PhoneNumberInput
              value={phone}
              onChange={setPhone}
              placeholder="Your phone number"
              className={isGlass ? "bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-2xl h-14" : "h-12"}
            />
          </div>

          <Button
            onClick={handleSendOTP}
            disabled={isLoading || !phone}
            className={
              isGlass
                ? "w-full h-14 text-base font-semibold rounded-2xl bg-white text-primary hover:bg-white/95 shadow-lg transition-all hover:scale-[1.02]"
                : "w-full h-12 text-base font-semibold"
            }
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Phone className="mr-2 h-5 w-5" />
                Continue with Phone
              </>
            )}
          </Button>
        </motion.div>
      ) : (
        <motion.div
          key="otp-step"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="space-y-5"
        >
          <div className={isGlass ? "text-center space-y-1" : "text-center space-y-1"}>
            <p className={isGlass ? "text-sm text-white/70" : "text-sm text-muted-foreground"}>
              Enter the 6-digit code sent to
            </p>
            <p className={isGlass ? "text-sm font-semibold text-white" : "text-sm font-semibold"}>
              {phone}
            </p>
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
                  <InputOTPSlot
                    key={index}
                    index={index}
                    className={
                      isGlass
                        ? "bg-white/10 border-white/30 text-white h-12 w-10"
                        : "h-12 w-10"
                    }
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            onClick={() => handleVerifyOTP()}
            disabled={isLoading || otpCode.length < 6}
            className={
              isGlass
                ? "w-full h-14 text-base font-semibold rounded-2xl bg-white text-primary hover:bg-white/95 shadow-lg transition-all hover:scale-[1.02]"
                : "w-full h-12 text-base font-semibold"
            }
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Verify & Continue"
            )}
          </Button>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setOtpCode("");
              }}
              className={
                isGlass
                  ? "text-sm text-white/70 hover:text-white flex items-center gap-1 transition-colors"
                  : "text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              }
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Change number
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={isLoading}
              className={
                isGlass
                  ? "text-sm text-white/70 hover:text-white transition-colors disabled:opacity-50"
                  : "text-sm text-primary hover:underline transition-colors disabled:opacity-50"
              }
            >
              Resend code
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
