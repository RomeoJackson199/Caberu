import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, Shield, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-handling/formatting";

const ForgotPassword = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'code' | 'success'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;

      toast({
        title: "Code Sent",
        description: "Please check your email for the 6-digit code",
      });
      setStep('code');
    } catch (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (completedCode?: string) => {
    const code = completedCode ?? otpCode;
    if (code.length < 6) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });
      if (error) throw error;

      setStep('success');
      toast({
        title: "Account Recovered",
        description: "You've been signed in successfully.",
      });

      // Auto-redirect after a short delay
      setTimeout(() => navigate("/auth-redirect"), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      setOtpCode("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />

        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white w-full">
          <div className="max-w-md space-y-6 text-center">
            <div className="h-20 w-20 rounded-2xl bg-white/20 flex items-center justify-center mx-auto backdrop-blur-sm">
              <Shield className="h-10 w-10" />
            </div>
            <h2 className="text-4xl font-bold leading-tight">
              {step === 'email' && "Account Recovery"}
              {step === 'code' && "Verify Your Identity"}
              {step === 'success' && "All Set!"}
            </h2>
            <p className="text-lg text-white/90">
              {step === 'email' && "Enter your email address and we'll send you a code to recover your account."}
              {step === 'code' && "Enter the 6-digit code sent to your email to sign in."}
              {step === 'success' && "You've been signed in successfully. Redirecting..."}
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-6">
          {step === 'email' && (
            <div className="space-y-6">
              <div className="lg:hidden text-center space-y-2">
                <h1 className="text-2xl font-bold">Account Recovery</h1>
                <p className="text-muted-foreground">Enter your email to receive a sign-in code</p>
              </div>

              <div className="rounded-2xl border bg-card p-6 shadow-sm">
                <form onSubmit={handleSendOTP} className="space-y-4" role="form" aria-label="Account recovery form">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12"
                        required
                        autoFocus
                        autoComplete="email"
                        aria-label="Email address"
                        aria-required="true"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="h-12 w-full text-base font-semibold"
                    disabled={isLoading}
                    aria-label={isLoading ? "Sending code, please wait" : "Send recovery code"}
                    aria-busy={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                        <span className="sr-only">Sending code...</span>
                      </>
                    ) : (
                      "Send Recovery Code"
                    )}
                  </Button>
                </form>
              </div>
            </div>
          )}

          {step === 'code' && (
            <div className="space-y-6">
              <div className="lg:hidden text-center space-y-2">
                <h1 className="text-2xl font-bold">Verify Your Identity</h1>
                <p className="text-muted-foreground">Check your email for the code</p>
              </div>

              <div className="rounded-2xl border bg-card p-6 shadow-sm">
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
                    className="h-12 w-full text-base font-semibold"
                    disabled={isLoading || otpCode.length < 6}
                    aria-label={isLoading ? "Verifying code, please wait" : "Verify and sign in"}
                    aria-busy={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                        <span className="sr-only">Verifying...</span>
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
                      aria-label="Go back to email entry"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Change email
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendOTP({ preventDefault: () => {} } as React.FormEvent)}
                      disabled={isLoading}
                      className="text-sm text-primary hover:underline transition-colors disabled:opacity-50"
                    >
                      Resend code
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="space-y-6">
              <div className="rounded-2xl border bg-card p-8 shadow-sm text-center space-y-6">
                <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold">Account Recovered!</h2>
                  <p className="text-muted-foreground">
                    You've been signed in successfully. Redirecting to your dashboard...
                  </p>
                </div>
                <Link to="/auth-redirect">
                  <Button className="w-full h-12 text-base font-semibold">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {step !== 'success' && (
            <div className="text-center">
              <Link to="/login">
                <Button variant="ghost" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
