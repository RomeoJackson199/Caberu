import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errorUtils";
import { validatePassword } from "@/utils/passwordValidation";

const ForgotPassword = () => {
  const { toast } = useToast();
  const [step, setStep] = useState<'email' | 'verify' | 'success'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-2fa-code', {
        body: { email, type: 'recovery' }
      });

      if (error) throw error;

      toast({
        title: "Code Sent",
        description: "Please check your email for the reset code",
      });
      setStep('verify');
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !newPassword) return;

    // SECURITY: Validate password strength before reset
    const passwordResult = validatePassword(newPassword);
    if (!passwordResult.isValid) {
      toast({
        title: "Weak Password",
        description: passwordResult.feedback.join(". "),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('reset-password-with-code', {
        body: { email, code, newPassword }
      });

      if (error) throw error;

      setStep('success');
      toast({
        title: "Password Reset",
        description: "Your password has been successfully updated.",
      });
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
              {step === 'email' && "Forgot your password?"}
              {step === 'verify' && "Verify & Reset"}
              {step === 'success' && "All Set!"}
            </h2>
            <p className="text-lg text-white/90">
              {step === 'email' && "Enter your email address and we'll send you a code to reset your password."}
              {step === 'verify' && "Enter the verification code sent to your email and choose a new password."}
              {step === 'success' && "Your password has been securely updated. You can now log in."}
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
                <h1 className="text-2xl font-bold">Forgot password?</h1>
                <p className="text-muted-foreground">Enter your email to receive a reset code</p>
              </div>

              <div className="rounded-2xl border bg-card p-6 shadow-sm">
                <form onSubmit={handleSendCode} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="h-12 w-full text-base font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      "Send Reset Code"
                    )}
                  </Button>
                </form>
              </div>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-6">
              <div className="lg:hidden text-center space-y-2">
                <h1 className="text-2xl font-bold">Verify & Reset</h1>
                <p className="text-muted-foreground">Check your email for the code</p>
              </div>

              <div className="rounded-2xl border bg-card p-6 shadow-sm">
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Verification Code</Label>
                    <Input
                      id="code"
                      placeholder="6-digit code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="text-center tracking-widest text-lg h-12"
                      maxLength={6}
                      required
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Sent to {email}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-12"
                      required
                      minLength={6}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="h-12 w-full text-base font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      "Reset Password"
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setStep('email')}
                    disabled={isLoading}
                  >
                    Back to Email
                  </Button>
                </form>
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
                  <h2 className="text-2xl font-semibold">Password Reset!</h2>
                  <p className="text-muted-foreground">
                    Your password has been successfully updated. You can now access your account.
                  </p>
                </div>
                <Link to="/login">
                  <Button className="w-full h-12 text-base font-semibold">
                    Return to Sign In
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
